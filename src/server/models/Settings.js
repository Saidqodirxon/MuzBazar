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
      enum: [
        "string",
        "number",
        "boolean",
        "json",
        "textarea",
        "text",
        "datetime",
      ],
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
    {
      key: "blocked_user_message",
      label: "Bloklangan foydalanuvchi xabari",
      value:
        "⛔️ Sizning hisobingiz hozircha bloklangan.\n\n✅ Admin sizning hisobingizni ko'rib chiqib, tez orada ochib qo'yadi.\n\n📞 Yordam uchun: @muzbazar_admin",
      defaultValue:
        "⛔️ Sizning hisobingiz hozircha bloklangan.\n\n✅ Admin sizning hisobingizni ko'rib chiqib, tez orada ochib qo'yadi.\n\n📞 Yordam uchun: @muzbazar_admin",
      description: "Bloklangan foydalanuvchiga ko'rsatiladigan xabar",
      type: "textarea",
    },
    {
      key: "user_unblocked_message",
      label: "Hisobingiz faollashtirildi xabari",
      value:
        "✅ <b>Hisobingiz faollashtirildi!</b>\n\n🎉 Salom, {ism}! Sizning hisobingiz admin tomonidan tasdiqlandi.\n\n🛍️ Endi botdan to'liq foydalanishingiz mumkin!\n\n📱 /start buyrug'ini bosing va xarid qilishni boshlang!",
      defaultValue:
        "✅ <b>Hisobingiz faollashtirildi!</b>\n\n🎉 Salom, {ism}! Sizning hisobingiz admin tomonidan tasdiqlandi.\n\n🛍️ Endi botdan to'liq foydalanishingiz mumkin!\n\n📱 /start buyrug'ini bosing va xarid qilishni boshlang!",
      description:
        "User ochilganda yuboriladigan xabar. {ism} - user ismi bilan almashtiriladi",
      type: "textarea",
    },
    {
      key: "last_debt_reminder_date",
      label: "Oxirgi eslatma yuborilgan sana",
      value: null,
      defaultValue: null,
      description:
        "Avtomatik qarzdorlik eslatmasi oxirgi marta yuborilgan vaqt (faqat o'qish uchun)",
      type: "datetime",
      isEditable: true,
    },
    {
      key: "notification_group_id",
      label: "Admin guruhi ID (Telegram)",
      value: process.env.NOTIFICATION_GROUP_ID || "",
      defaultValue: "",
      description: "Adminlar uchun guruh ID (masalan: -100...) ",
      type: "text",
    },
    {
      key: "seller_group_id",
      label: "Sotuvchilar guruhi ID (Telegram)",
      value: process.env.SELLER_GROUP_ID || "",
      defaultValue: "",
      description: "Sotuvchilar uchun guruh ID (masalan: -100...) ",
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
