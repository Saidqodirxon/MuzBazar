const mongoose = require("mongoose");

/**
 * Settings Schema - Tizim sozlamalari
 */
const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    label: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    defaultValue: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    type: {
      type: String,
      enum: ["string", "number", "boolean", "json", "textarea", "text"],
      default: "text",
    },
    isEditable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Static method to get setting value
settingsSchema.statics.get = async function (key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set setting value
settingsSchema.statics.set = async function (key, value, description = "") {
  return await this.findOneAndUpdate(
    { key },
    { value, description, updatedAt: new Date() },
    { upsert: true, new: true }
  );
};

// Static method to initialize default settings
settingsSchema.statics.initDefaults = async function () {
  const defaults = [
    {
      key: "shop_name",
      label: "Do'kon nomi",
      value: "MUZ BAZAR",
      defaultValue: "MUZ BAZAR",
      description: "Botda ko'rinadigan do'kon nomi",
      type: "text",
    },
    {
      key: "shop_phone",
      label: "Aloqa telefoni",
      value: "+998 90 123 45 67",
      defaultValue: "+998 90 123 45 67",
      description: "Mijozlar uchun aloqa telefoni",
      type: "text",
    },
    {
      key: "shop_address",
      label: "Manzil",
      value: "Toshkent shahar",
      defaultValue: "Toshkent shahar",
      description: "Do'kon manzili",
      type: "text",
    },
    {
      key: "working_hours",
      label: "Ish vaqti",
      value: "08:00 - 20:00",
      defaultValue: "08:00 - 20:00",
      description: "Do'kon ish vaqti",
      type: "text",
    },
    {
      key: "welcome_message",
      label: "Xush kelibsiz xabari",
      value:
        "Salom! 🛍️ MUZ BAZARga xush kelibsiz!\n\nBizda eng sifatli muzqaymoq va muzlatilgan mahsulotlarni topasiz.",
      defaultValue:
        "Salom! 🛍️ MUZ BAZARga xush kelibsiz!\n\nBizda eng sifatli muzqaymoq va muzlatilgan mahsulotlarni topasiz.",
      description: "Botga start bosganida chiqadigan xabar",
      type: "textarea",
    },
    {
      key: "about_text",
      label: "Bot haqida",
      value:
        "🏢 MUZ BAZAR\n\nBiz 2020 yildan beri mijozlarimizga sifatli muzqaymoq va muzlatilgan mahsulotlarni yetkazib beramiz.\n\n✅ Sifatli mahsulotlar\n✅ Tez yetkazib berish\n✅ Qulay narxlar",
      defaultValue:
        "🏢 MUZ BAZAR\n\nBiz 2020 yildan beri mijozlarimizga sifatli muzqaymoq va muzlatilgan mahsulotlarni yetkazib beramiz.",
      description: "Bot haqida ma'lumot",
      type: "textarea",
    },
    {
      key: "contact_text",
      label: "Aloqa ma'lumotlari",
      value:
        "📞 Biz bilan bog'laning:\n\n🏢 MUZ BAZAR\n📱 Telefon: +998 90 123 45 67\n📍 Manzil: Toshkent shahar\n⏰ Ish vaqti: 08:00 - 20:00\n\n💬 Telegramda: @muzbazar_admin\n🌐 Sayt: www.muzbazar.uz",
      defaultValue:
        "📞 Biz bilan bog'laning:\n\n🏢 MUZ BAZAR\n📱 Telefon: +998 90 123 45 67",
      description: "Aloqa bo'limida chiqadigan matn",
      type: "textarea",
    },
    {
      key: "debt_notification_message",
      label: "Qarzdorlik eslatmasi",
      value:
        "🔔 Hurmatli mijoz!\n\nSizning qarzdorligingiz: {amount} so'm\n\nIltimos, to'lovni amalga oshiring.\n\n📞 Aloqa: @muzbazar_admin",
      defaultValue:
        "🔔 Hurmatli mijoz!\n\nSizning qarzdorligingiz: {amount} so'm\n\nIltimos, to'lovni amalga oshiring.",
      description: "Qarzdorlik eslatmasi xabari ({amount} - qarz miqdori)",
      type: "textarea",
    },
    {
      key: "order_confirmed_message",
      label: "Buyurtma tasdiqlandi xabari",
      value:
        "✅ Buyurtmangiz tasdiqlandi!\n\nTez orada sizga yetkazib beriladi.\n\nSavol bo'lsa: @muzbazar_admin",
      defaultValue:
        "✅ Buyurtmangiz tasdiqlandi!\n\nTez orada sizga yetkazib beriladi.",
      description: "Buyurtma tasdiqlanganida yuboriladigan xabar",
      type: "textarea",
    },
    {
      key: "min_order_amount",
      label: "Minimal buyurtma summasi",
      value: "0",
      defaultValue: "0",
      description: "Minimal buyurtma summasi (0 = cheklov yo'q)",
      type: "number",
    },
    {
      key: "debt_notification_text",
      label: "Qarzdorlik xabari matni",
      value:
        "Hurmatli mijoz! Sizda {summa} so'm qarzdorlik mavjud. Iltimos, to'lovni amalga oshiring. MUZ BAZAR",
      defaultValue:
        "Hurmatli mijoz! Sizda {summa} so'm qarzdorlik mavjud. Iltimos, to'lovni amalga oshiring. MUZ BAZAR",
      description: "{summa} - avtomatik almashtiriladi",
      type: "textarea",
    },
    {
      key: "welcome_message",
      label: "Xush kelibsiz xabari",
      value:
        "MUZ BAZARga xush kelibsiz! Bizda eng sifatli muzqaymoq va muzlatilgan mahsulotlarni topasiz.",
      defaultValue:
        "MUZ BAZARga xush kelibsiz! Bizda eng sifatli muzqaymoq va muzlatilgan mahsulotlarni topasiz.",
      description: "Botga kirganida ko'rinadigan xabar",
      type: "textarea",
    },
    {
      key: "debt_reminder_enabled",
      label: "Avtomatik qarzdorlik eslatmasi",
      value: false,
      defaultValue: false,
      description: "Avtomatik qarzdorlik eslatmasini yoqish/o'chirish",
      type: "boolean",
    },
    {
      key: "debt_reminder_interval_days",
      label: "Eslatma intervali (kunlarda)",
      value: 3,
      defaultValue: 3,
      description: "Necha kunda bir eslatma yuboriladi",
      type: "number",
    },
    {
      key: "debt_reminder_time",
      label: "Eslatma vaqti (soat)",
      value: "10:00",
      defaultValue: "10:00",
      description: "Eslatma qaysi vaqtda yuboriladi (masalan: 10:00)",
      type: "text",
    },
  ];

  for (const setting of defaults) {
    const exists = await this.findOne({ key: setting.key });
    if (!exists) {
      await this.create(setting);
    }
  }
};

module.exports = mongoose.model("Settings", settingsSchema);
