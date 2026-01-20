const cron = require("node-cron");
const NotificationService = require("./notificationService");

/**
 * Scheduled tasks for the application
 */

class TaskScheduler {
  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Initialize all scheduled tasks
   */
  init() {
    console.log("🕐 Initializing scheduled tasks...");

    // Check low stock every day at 9 AM
    cron.schedule("0 9 * * *", async () => {
      console.log("📦 Running daily stock check...");
      await this.checkLowStockAndNotify();
    });

    // Send automated debt reminders (configurable from settings)
    cron.schedule("*/10 * * * *", async () => {
      // Check every 10 minutes if it's time to send reminders
      await this.checkAndSendDebtReminders();
    });

    // Generate daily reports every day at 11 PM
    cron.schedule("0 23 * * *", async () => {
      console.log("📊 Running daily reports...");
      await this.generateDailyReports();
    });

    // Generate monthly reports on 1st day of month at 9 AM
    cron.schedule("0 9 1 * *", async () => {
      console.log("📈 Running monthly reports...");
      await this.sendMonthlySummary();
    });

    console.log("✅ Scheduled tasks initialized");
  }

  /**
   * Check low stock and notify
   */
  async checkLowStockAndNotify() {
    try {
      const { Product } = require("../server/models");

      const lowStockProducts = await Product.find({
        $expr: { $lte: ["$stock", "$minStock"] },
        isActive: true,
      });

      if (lowStockProducts.length > 0) {
        await this.notificationService.notifyLowStock(lowStockProducts);
        console.log(
          `📦 Low stock notification sent for ${lowStockProducts.length} products`
        );
      } else {
        console.log("📦 All products have sufficient stock");
      }
    } catch (error) {
      console.error("❌ Low stock check error:", error);
    }
  }

  /**
   * Send weekly debt reminders
   */
  async sendWeeklyDebtReminders() {
    try {
      const { Order, User } = require("../server/models");

      // Find clients with debt
      const debts = await Order.aggregate([
        { $match: { debt: { $gt: 0 } } },
        {
          $group: {
            _id: "$client",
            totalDebt: { $sum: "$debt" },
            orderCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        { $match: { "client.role": "client" } },
      ]);

      if (debts.length === 0) {
        console.log("💰 No debt reminders needed - all clients paid");
        return;
      }

      // Send reminders
      let sentCount = 0;
      for (const debt of debts) {
        const result = await this.notificationService.sendDebtNotification(
          debt._id,
          `Hurmatli mijoz! Sizning haftalik qarzdorlik eslatmasi: {amount} so'm. Iltimos, to'lovni amalga oshiring. 📞 Aloqa: @muzbazar_admin`
        );

        if (result.success) {
          sentCount++;
        }

        // Delay between messages
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log(
        `💰 Debt reminders sent to ${sentCount}/${debts.length} clients`
      );
    } catch (error) {
      console.error("❌ Weekly debt reminder error:", error);
    }
  }

  /**
   * Check settings and send automated debt reminders
   */
  async checkAndSendDebtReminders() {
    try {
      const { Settings, Order } = require("../server/models");

      // Check if reminders are enabled
      const enabled = await Settings.get("debt_reminder_enabled", false);
      if (!enabled) {
        // Don't log every 10 minutes - too noisy
        return;
      }

      // Get settings
      const intervalDays = await Settings.get("debt_reminder_interval_days", 3);
      const reminderTime = await Settings.get("debt_reminder_time", "10:00");

      // Check if current time matches reminder time (check hour and within 10 min window)
      const now = new Date();
      const [targetHour] = reminderTime.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      
      // Only run at the specified hour and within first 10 minutes (cron runs every 10 min)
      if (currentHour !== targetHour || currentMin >= 10) return;

      console.log(`💰 Debt reminder check: hour=${currentHour}, target=${targetHour}`);

      // Check last reminder date
      const lastReminder = await Settings.get("last_debt_reminder_date", null);
      if (lastReminder) {
        const daysSinceLastReminder = Math.floor(
          (now - new Date(lastReminder)) / (1000 * 60 * 60 * 24)
        );
        console.log(`💰 Days since last reminder: ${daysSinceLastReminder}, interval: ${intervalDays}`);
        if (daysSinceLastReminder < intervalDays) {
          console.log("💰 Skipping - interval not reached yet");
          return;
        }
      }

      console.log("💰 Running automated debt reminders...");

      // Find clients with debt
      const debts = await Order.aggregate([
        { $match: { debt: { $gt: 0 } } },
        {
          $group: {
            _id: "$client",
            totalDebt: { $sum: "$debt" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
      ]);

      if (debts.length === 0) {
        console.log("💰 No debts to remind");
        return;
      }

      // Send reminders
      let sentCount = 0;
      for (const debt of debts) {
        const result = await this.notificationService.sendDebtNotification(
          debt._id
        );
        if (result.success) sentCount++;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Update last reminder date
      await Settings.set("last_debt_reminder_date", now.toISOString());

      console.log(
        `💰 Automated debt reminders sent to ${sentCount}/${debts.length} clients`
      );
    } catch (error) {
      console.error("❌ Automated debt reminder error:", error);
    }
  }

  /**
   * Generate daily reports
   */
  async generateDailyReports() {
    try {
      const { Order, Product, User } = require("../server/models");

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Daily statistics
      const [todayOrders, todayRevenue, pendingOrders, totalDebt] =
        await Promise.all([
          Order.countDocuments({
            createdAt: { $gte: startOfDay, $lt: endOfDay },
          }),
          Order.aggregate([
            { $match: { createdAt: { $gte: startOfDay, $lt: endOfDay } } },
            { $group: { _id: null, total: { $sum: "$totalSum" } } },
          ]),
          Order.countDocuments({ status: "pending" }),
          Order.aggregate([
            { $group: { _id: null, total: { $sum: "$debt" } } },
          ]),
        ]);

      const revenue = todayRevenue[0]?.total || 0;
      const debt = totalDebt[0]?.total || 0;

      // Send report to admins
      const admins = await User.find({ role: "admin", isActive: true });

      if (admins.length > 0) {
        const reportMessage = [
          "📊 **Kunlik hisobot**",
          `📅 ${startOfDay.toLocaleDateString("uz-UZ")}`,
          "",
          `📦 Bugungi buyurtmalar: **${todayOrders}** ta`,
          `💰 Bugungi daromad: **${revenue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm**`,
          `⏳ Kutilayotgan buyurtmalar: **${pendingOrders}** ta`,
          `🔴 Umumiy qarzdorlik: **${debt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm**`,
          "",
          "🌐 Batafsil ma'lumot uchun admin panelni ko'ring.",
        ].join("\\n");

        for (const admin of admins) {
          await this.notificationService.sendToUser(
            admin.telegramId,
            reportMessage
          );
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      console.log(
        `📊 Daily report generated - Orders: ${todayOrders}, Revenue: ${revenue}`
      );
    } catch (error) {
      console.error("❌ Daily report error:", error);
    }
  }

  /**
   * Send monthly summary
   */
  async sendMonthlySummary() {
    try {
      // This can be called manually or scheduled monthly
      const { ReportService } = require("../server/services");
      const reportService = new ReportService();

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();

      const salesReport = await reportService.getSalesReport(
        startOfMonth,
        endOfMonth
      );
      const profitReport = await reportService.getProfitReport();

      // Send to admins
      const { User } = require("../server/models");
      const admins = await User.find({ role: "admin", isActive: true });

      const summaryMessage = [
        "📈 **Oylik xulosalar**",
        `📅 ${startOfMonth.toLocaleDateString("uz-UZ")} - ${endOfMonth.toLocaleDateString("uz-UZ")}`,
        "",
        `📦 Buyurtmalar: **${salesReport.summary.totalOrders || 0}** ta`,
        `💰 Daromad: **${(salesReport.summary.totalRevenue || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm**`,
        `✅ To'langan: **${(salesReport.summary.totalPaid || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm**`,
        `🔴 Qarzdorlik: **${(salesReport.summary.totalDebt || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm**`,
        `📈 Foyda: **${(profitReport.totalProfit || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} so'm**`,
        "",
        "🎯 Davom etishda muvaffaqiyat tilaymiz!",
      ].join("\\n");

      for (const admin of admins) {
        await this.notificationService.sendToUser(
          admin.telegramId,
          summaryMessage
        );
      }

      console.log("📈 Monthly summary sent to admins");
    } catch (error) {
      console.error("❌ Monthly summary error:", error);
    }
  }
}

// Initialize scheduler
const scheduler = new TaskScheduler();

module.exports = scheduler;
