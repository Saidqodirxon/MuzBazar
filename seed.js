const { connectDB, validateEnv } = require("./src/utils/config");
const { Category, Product, User, Settings } = require("./src/server/models");

/**
 * Initial data seeder for MUZ BAZAR
 */

const seedData = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    // Validate environment
    validateEnv();

    // Connect to database
    await connectDB();

    // Clear existing data (optional - comment out for production)
    console.log("🗑️ Clearing existing data...");
    await Category.deleteMany({});
    await Product.deleteMany({});

    // Create default categories
    console.log("📁 Creating default categories...");
    const categories = await Category.insertMany([
      {
        name: "Muzqaymoqlar",
        description: "Har xil tusdagi muzqaymoqlar",
        sortOrder: 1,
        isActive: true,
      },
      {
        name: "Go'sht mahsulotlari",
        description: "Muzlatilgan go'sht mahsulotlari",
        sortOrder: 2,
        isActive: true,
      },
      {
        name: "Yarim tayyor mahsulotlar",
        description: "Tez tayyorlanadigan mahsulotlar",
        sortOrder: 3,
        isActive: true,
      },
      {
        name: "Baliq mahsulotlari",
        description: "Muzlatilgan baliq va dengiz mahsulotlari",
        sortOrder: 4,
        isActive: true,
      },
      {
        name: "Sabzavot va mevalar",
        description: "Muzlatilgan sabzavot va mevalar",
        sortOrder: 5,
        isActive: true,
      },
    ]);

    // Create sample products
    console.log("📦 Creating sample products...");

    const [muzqaymoq, gosht, yarimTayyor, baliq, sabzavot] = categories;

    const products = [
      // Muzqaymoqlar
      {
        name: "Vanil muzqaymoq",
        category: muzqaymoq._id,
        description: "Premium vanil muzqaymoq",
        type: "piece",
        costPrice: 8000,
        sellPrice: 12000,
        stock: 50,
        minStock: 10,
        isActive: true,
      },
      {
        name: "Shokoladli muzqaymoq",
        category: muzqaymoq._id,
        description: "Shokolad va sutli muzqaymoq",
        type: "piece",
        costPrice: 9000,
        sellPrice: 13000,
        stock: 45,
        minStock: 10,
        isActive: true,
      },
      {
        name: "Qulupnay muzqaymoq",
        category: muzqaymoq._id,
        description: "Tabiiy qulupnay bilan",
        type: "piece",
        costPrice: 10000,
        sellPrice: 14000,
        stock: 30,
        minStock: 8,
        isActive: true,
      },

      // Go'sht mahsulotlari
      {
        name: "Muzlatilgan mol go'shti",
        category: gosht._id,
        description: "Sifatli mol go'shti",
        type: "kg",
        costPrice: 45000,
        sellPrice: 55000,
        stock: 100,
        minStock: 20,
        isActive: true,
      },
      {
        name: "Tovuq go'shti",
        category: gosht._id,
        description: "Tozalangan tovuq go'shti",
        type: "kg",
        costPrice: 25000,
        sellPrice: 32000,
        stock: 80,
        minStock: 15,
        isActive: true,
      },
      {
        name: "Qo'y go'shti",
        category: gosht._id,
        description: "Premium qo'y go'shti",
        type: "kg",
        costPrice: 60000,
        sellPrice: 75000,
        stock: 40,
        minStock: 10,
        isActive: true,
      },

      // Yarim tayyor mahsulotlar
      {
        name: "Muzlatilgan manti",
        category: yarimTayyor._id,
        description: "Go'sht bilan tayyorlangan manti",
        type: "box",
        costPrice: 15000,
        sellPrice: 22000,
        stock: 60,
        minStock: 12,
        isActive: true,
      },
      {
        name: "Pelmenlar",
        category: yarimTayyor._id,
        description: "Klassik pelmenlar",
        type: "box",
        costPrice: 12000,
        sellPrice: 18000,
        stock: 75,
        minStock: 15,
        isActive: true,
      },
      {
        name: "Chuchvara",
        category: yarimTayyor._id,
        description: "Milliy chuchvara",
        type: "box",
        costPrice: 14000,
        sellPrice: 20000,
        stock: 50,
        minStock: 10,
        isActive: true,
      },

      // Baliq mahsulotlari
      {
        name: "Muzlatilgan losos",
        category: baliq._id,
        description: "Import losos baliqi",
        type: "kg",
        costPrice: 80000,
        sellPrice: 95000,
        stock: 25,
        minStock: 5,
        isActive: true,
      },
      {
        name: "Krevetka",
        category: baliq._id,
        description: "Yirik krevetkalar",
        type: "kg",
        costPrice: 120000,
        sellPrice: 140000,
        stock: 15,
        minStock: 3,
        isActive: true,
      },

      // Sabzavot va mevalar
      {
        name: "Aralash sabzavotlar",
        category: sabzavot._id,
        description: "Sebzeli aralash",
        type: "box",
        costPrice: 8000,
        sellPrice: 12000,
        stock: 40,
        minStock: 8,
        isActive: true,
      },
      {
        name: "Muzlatilgan olcha",
        category: sabzavot._id,
        description: "Shirin olcha",
        type: "kg",
        costPrice: 18000,
        sellPrice: 25000,
        stock: 20,
        minStock: 5,
        isActive: true,
      },
    ];

    await Product.insertMany(products);

    // Create admin user if provided
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
    if (adminTelegramId) {
      console.log("👑 Creating admin user...");

      const existingAdmin = await User.findOne({
        telegramId: adminTelegramId.toString(),
        role: "admin",
      });

      if (!existingAdmin) {
        await User.create({
          telegramId: adminTelegramId.toString(),
          firstName: "Admin",
          lastName: "MUZ BAZAR",
          role: "admin",
          username: "muzbazar_admin",
        });
        console.log("✅ Admin user created");
      } else {
        console.log("ℹ️ Admin user already exists");
      }
    }

    // Create seller users if provided
    const sellerTelegramIds = process.env.SELLERS_TELEGRAM_IDS;
    if (sellerTelegramIds) {
      console.log("🤝 Creating seller users...");

      const sellerIds = sellerTelegramIds.split(",").map((id) => id.trim());

      for (let i = 0; i < sellerIds.length; i++) {
        const existingSeller = await User.findOne({
          telegramId: sellerIds[i].toString(),
        });

        if (!existingSeller) {
          await User.create({
            telegramId: sellerIds[i].toString(),
            firstName: "Sotuvchi",
            lastName: `#${i + 1}`,
            role: "seller",
            username: `seller_${i + 1}`,
          });
          console.log(`✅ Seller #${i + 1} created`);
        }
      }
    }

    console.log("🎉 Database seeding completed successfully!");
    console.log(`📁 Created ${categories.length} categories`);
    console.log(`📦 Created ${products.length} products`);

    // Initialize default settings
    console.log("⚙️ Initializing default settings...");
    await Settings.initDefaults();
    console.log("✅ Settings initialized");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

// Run seeder
seedData();
