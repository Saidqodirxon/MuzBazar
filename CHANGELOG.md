# MUZ BAZAR Bot - O'zgarishlar tarixi

## 2026-01-27 - To'lovlar tarixida seller ko'rsatish

### 🔧 Tuzatish: To'lovlar tarixida "System" o'rniga seller nomi

**Muammo:**
- Order details sahifasida to'lovlar tarixida "System" ko'rsatilardi
- Qaysi admin yoki seller to'lov qo'shganligini bilish qiyin edi

**Yechim:**
- ✅ Payment modeliga `adminName` maydoni qo'shildi
- ✅ To'lov qo'shilganda seller yoki admin nomi saqlanadi
- ✅ To'lovlar tarixida to'g'ri nom ko'rsatiladi

**O'zgargan fayllar:**
- `src/server/models/Payment.js` - adminName maydoni qo'shildi, seller Seller modeliga reference qiladi
- `src/server/controllers/adminController.js` - addPayment funksiyasida seller/admin nomini saqlash
- `src/views/admin/order-details.ejs` - seller/adminName ko'rsatish

**Natija:**
```
To'lovlar tarixi:
Sana                 | Summa        | Kim qo'shdi
27/01/2026 14:30    | 50 000 so'm  | Anvar Sotuvchi  ✅
27/01/2026 15:45    | 30 000 so'm  | Admin           ✅
```

---

## 2026-01-27 - Telegram Guruh Xabarlari qo'shildi

### 🔔 Yangi xususiyat: Admin harakatlari uchun guruh xabarlari

**Nimaga kerak:**
- Barcha admin harakatlari real-time kuzatiladi
- Qaysi seller, qanday harakat qilganligini bilish mumkin
- Transparency va accountability oshadi
- Tez javob berish imkoniyati

**Xabar yuboriladigan harakatlar:**
1. ✅ Buyurtma holati o'zgartirilganda
2. ✅ To'lov qabul qilinganda
3. ✅ Qarz qo'shilganda
4. ✅ To'lov o'chirilganda
5. ✅ Yangi buyurtma kelganda (allaqachon bor edi)
6. ✅ Yangi mahsulot qo'shilganda
7. ✅ User blok holati o'zgartirilganda
8. ✅ User roli o'zgartirilganda
9. ✅ User holati (active/inactive) o'zgartirilganda

**Xabar formati:**
```
💰 To'lov qabul qilindi

👤 Sotuvchi: Seller Ismi
👥 Mijoz: Anvar Aliyev
🆔 Buyurtma: ORD-001
💵 To'lov: 50 000 so'm
✅ To'landi: 100 000 so'm
🔴 Qarz: 50 000 so'm
```

**Sozlash:**
- `.env` faylida `NOTIFICATION_GROUP_ID` ni sozlang
- Botni guruhga admin sifatida qo'shing

**O'zgargan fayllar:**
- `src/server/controllers/adminController.js` - barcha funksiyalarga guruh xabari qo'shildi
  - updateOrderStatus
  - addPayment (to'lov qo'shish)
  - addPayment (qarz qo'shish)
  - deletePayment
  - createProduct
  - updateUserRole
  - toggleUserStatus
  - toggleUserBlock

**Hujjatlar:**
- ✅ `GROUP-NOTIFICATIONS.md` - To'liq yo'riqnoma va misolar

**Xususiyatlar:**
- Seller/Admin nomi ko'rsatiladi
- To'liq ma'lumotlar (summa, mahsulot, user)
- Emoji bilan tushunarli
- Xatoliklar ishni to'xtatmaydi
- Real-time xabarlar

---

## 2026-01-27 - Qarzdorlik tizimi to'g'rilandi va statistikalar kengaytirildi

### 🔥 Muhim tuzatishlar

#### 1. **Buyurtma bekor qilinganda qarz muammosi hal qilindi**

**Muammo:**
- Order statusini "cancelled" ga o'zgartirganda qarz user'da qolib ketardi
- User hisobida noto'g'ri ma'lumotlar ko'rsatilardi
- Qarzdorlik statistikasida bekor qilingan orderlar ham hisobga kiritilardi

**Yechim:**
- ✅ Order bekor qilinganda qarz 0 ga tenglashtiriladi
- ✅ User'ning totalDebt maydoni avtomatik yangilanadi
- ✅ Barcha aggregate query'larda cancelled orderlar istisno qilinadi
- ✅ Order qayta faollashtirilganda qarz to'g'ri hisoblanadi

**O'zgargan fayllar:**
- `src/server/models/Order.js` - Post-save va post-delete middleware'lar qo'shildi
- `src/server/models/User.js` - updateUserTotalDebt static metodi qo'shildi
- `src/server/controllers/adminController.js` - updateOrderStatus, addPayment, deletePayment yangilandi

#### 2. **To'lov va qarz boshqaruvi yaxshilandi**

**Yangi funksionallik:**
- ✅ To'lov qo'shilganda user qarzidan avtomatik ayriladi
- ✅ Qarz qo'shilganda user hisobiga avtomatik qo'shiladi
- ✅ To'lov o'chirilganda user qarziga qaytariladi
- ✅ Barcha o'zgarishlar real-time yangilanadi

**O'zgargan fayllar:**
- `src/server/controllers/adminController.js` - addPayment va deletePayment yangilandi

#### 3. **Dashboard statistikalari kengaytirildi**

**Yangi statistikalar:**
- 📊 **Bugungi savdo** - bugungi barcha buyurtmalarning umumiy summasi
- 💰 **Bugungi to'lovlar** - bugun qabul qilingan to'lovlar
- 📈 **Bugungi foyda** - bugungi savdodan olingan foyda (sellPrice - costPrice)
- 🔴 **Umumiy qarzdorlik** - faqat faol buyurtmalarning qarzi

**O'zgargan fayllar:**
- `src/server/controllers/adminController.js` - getStatistics va getDetailedStatistics yangilandi
- `src/views/admin/dashboard.ejs` - yangi statistika ko'rsatkichlari qo'shildi

#### 4. **Barcha qarzga oid query'lar yangilandi**

Cancelled orderlar istisno qilindi:
- ✅ Qarzdorlik bo'limi
- ✅ Foydalanuvchilar ro'yxati
- ✅ Hisobotlar
- ✅ Export funksiyalari
- ✅ Bot qarzdorlik ko'rsatish
- ✅ Scheduler eslatmalari
- ✅ API endpointlar
- ✅ Notification service

**O'zgargan fayllar:**
- `src/server/controllers/adminController.js` - debts, users, userDetails, exportDebts va boshqalar
- `src/server/services/index.js` - calculateUserDebt, generateSalesReport
- `src/bot/index.js` - qarzdorlik ko'rsatish
- `src/utils/scheduler.js` - sendWeeklyDebtReminders, sendAutomatedDebtReminders
- `src/utils/notificationService.js` - sendDebtNotification
- `src/server/controllers/apiController.js` - getSalesStats, getDebtStats

### 🛠️ Yangi xususiyatlar

1. **Avtomatik qarz yangilanishi**
   - Order save bo'lganda user totalDebt avtomatik yangilanadi
   - Order o'chirilganda user totalDebt avtomatik yangilanadi
   - Middleware orqali real-time yangilanish

2. **Qarzlarni qayta hisoblash skripti**
   - `fix-all-user-debts.js` - barcha userlarning qarzini qayta hisoblaydi
   - Xatoliklarni tuzatish uchun
   - Migratsiya uchun

### 📚 Hujjatlar

- ✅ `DEBT-FIX-GUIDE.md` - To'liq hujjat va test qilish yo'riqnomasi
- ✅ `fix-all-user-debts.js` - Qarzlarni qayta hisoblash skripti

### ⚠️ Breaking Changes

- Cancelled buyurtmalar endi qarz hisobiga kirmaydi
- User.totalDebt maydoni avtomatik yangilanadi (qo'lda yangilash kerak emas)

### 🔄 Migratsiya

Eski ma'lumotlarni yangilash uchun:
```bash
node fix-all-user-debts.js
```

---

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
