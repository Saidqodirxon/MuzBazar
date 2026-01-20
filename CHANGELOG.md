# MUZ BAZAR Bot - O'zgarishlar tarixi

## 2024 - Oxirgi yangilanishlar

### ✅ Bajarilgan ishlar

#### 1. **Mahsulot rasmlari yuklash tizimi**

- Multer middleware orqali rasm yuklash
- Faqat rasm formatlarini qabul qilish (JPEG, PNG, GIF, WebP)
- Maksimal hajm: 5MB
- Rasmlar: `public/uploads/products/` papkasida saqlanadi
- URL orqali rasm qo'shish o'chirildi (faqat fayl yuklash)

**O'zgargan fayllar:**

- `src/server/middlewares/upload.js` - Multer konfiguratsiyasi
- `src/server/routes/admin.js` - Yuklash middleware qo'shildi
- `src/server/controllers/adminController.js` - Fayl yuklashni qayta ishlash
- `src/views/admin/product-form.ejs` - Fayl yuklash formasi
- `src/bot/handlers/catalog.js` - Rasm ko'rsatish logikasi

#### 2. **Qidiruv va filtrlash**

Admin panelga qidiruv qo'shildi:

- **Mahsulotlar**: Nom va tavsif bo'yicha qidiruv
- **Buyurtmalar**: Mijoz ismi, telefon, buyurtma raqami bo'yicha
- **Foydalanuvchilar**: Ism, telefon, Telegram ID bo'yicha
- Qidiruv natijalarini tozalash tugmasi

**O'zgargan fayllar:**

- `src/server/controllers/adminController.js` - Qidiruv logikasi
- `src/views/admin/products.ejs` - Qidiruv formasi
- `src/views/admin/orders.ejs` - Qidiruv formasi
- `src/views/admin/users.ejs` - Qidiruv formasi

#### 3. **Settings modeli kengaytirildi**

Bot matnlarini admin paneldan boshqarish:

**Yangi sozlamalar:**

- `welcome_message` - Xush kelibsiz xabari (start bosganda)
- `about_text` - Bot haqida ma'lumot (/help buyrug'i)
- `contact_text` - Aloqa ma'lumotlari
- `debt_notification_message` - Qarzdorlik eslatmasi
- `order_confirmed_message` - Buyurtma tasdiqlandi xabari

**O'zgargan fayllar:**

- `src/server/models/Settings.js` - Yangi maydonlar qo'shildi
- `src/bot/index.js` - Sozlamalardan foydalanish
- `src/utils/notificationService.js` - Eslatmalarda sozlamalar

#### 4. **Sonlarni formatlash standarti**

Barcha summalar 3 raqamdan keyin probel bilan ko'rsatiladi:

- Eski format: `1,000,000` ❌
- Yangi format: `1 000 000` ✅

**Sabab:** O'zbek formatida o'qish qulayroq

**O'zgargan fayllar:**

- `src/utils/formatNumber.js` - Yangi utility yaratildi
- `src/bot/handlers/catalog.js` - Probel bilan formatlash
- `src/bot/handlers/order.js` - Probel bilan formatlash
- `src/bot/handlers/seller.js` - Probel bilan formatlash
- `src/utils/notificationService.js` - Probel bilan formatlash
- `src/views/admin/orders.ejs` - Probel bilan formatlash
- `src/views/admin/products.ejs` - Probel bilan formatlash
- `src/views/admin/debts.ejs` - Probel bilan formatlash
- `src/views/admin/order-details.ejs` - Probel bilan formatlash
- `src/views/admin/dashboard.ejs` - Probel bilan formatlash

#### 5. **Bug fixlar**

- `settings.ejs` - Variable nomi tuzatildi (settingsObj → settings)
- `debts.ejs` - Bo'sh ma'lumotlar uchun xatoliklar bartaraf qilindi
- `seller.js` - Markdown → HTML formatga o'tkazildi
- `order.js` - Buyurtma holati matnlari qo'shildi

---

## 📋 Keyingi bosqich rejalari

### Tugallanishi kerak:

1. ✅ Admin panelda sozlamalar UI (mavjud)
2. ✅ Botda sozlamalardan foydalanish (bajarildi)
3. ⏳ Mahsulot rasmlarini tahrirlash (rasm almashtirilishi)
4. ⏳ Botda /about buyrug'i qo'shish
5. ⏳ Qarzdorlik eslatmalarini sozlamalar bilan bog'lash

---

## 🔧 Texnik ma'lumotlar

### Fayl yuklash

```javascript
// Multer konfiguratsiyasi
const storage = multer.diskStorage({
  destination: "./public/uploads/products/",
  filename: (req, file, cb) => {
    const uniqueName = `product-${Date.now()}-${Math.random()}.${ext}`;
    cb(null, uniqueName);
  },
});

// Validatsiya
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Faqat rasm fayllari (JPEG, PNG, GIF, WebP)"));
  }
};
```

### Sonlarni formatlash

```javascript
// formatNumber.js
function formatNumber(amount) {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatCurrency(amount) {
  return `${formatNumber(amount)} so'm`;
}
```

### Sozlamalar

```javascript
// Sozlamalarni olish
const welcomeMsg = await Settings.get("welcome_message", "Default matn");

// Sozlamalarni o'rnatish
await Settings.set("welcome_message", "Yangi matn");
```

---

## 📝 Eslatma

- Barcha o'zgarishlar production serverda test qilinishi kerak
- Seed faylni ishga tushirib, standart sozlamalarni yuklang:
  ```bash
  node seed.js
  ```
- Admin panel: `/admin/settings` - sozlamalarni tahrirlash
- Bot sozlamalari real vaqtda yangilanadi (qayta ishga tushirish shart emas)

---

**Oxirgi yangilanish:** 2024
**Versiya:** 1.2.0
