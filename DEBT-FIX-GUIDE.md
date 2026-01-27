# Qarzdorlik Tizimini To'g'rilash - Hujjat

## O'zgarishlar ro'yxati

### 1. Order Model (Order.js)
- ✅ Post-save middleware qo'shildi - har safar order save bo'lganda user'ning totalDebt maydoni avtomatik yangilanadi
- ✅ Post-delete middleware qo'shildi - order o'chirilganda ham user qarzini yangilaydi

### 2. User Model (User.js)
- ✅ `updateUserTotalDebt` static metodi qo'shildi
- ✅ Cancelled buyurtmalar qarzdan istisno qilinadi
- ✅ Faqat active buyurtmalar qarziga kiritiladi

### 3. Admin Controller
#### updateOrderStatus funksiyasi
- ✅ Status "cancelled"ga o'zgartirilganda qarz 0 ga tenglashtiriladi
- ✅ User'ning totalDebt maydoni avtomatik yangilanadi
- ✅ Cancelled order reactivate qilinganda qarz qaytadan hisoblanadi
- ✅ Client'ga xabar yuborilganda "qarz hisobdan chiqarildi" deb ko'rsatiladi

#### addPayment funksiyasi
- ✅ To'lov qo'shilganda user'ning totalDebt avtomatik yangilanadi
- ✅ Qarz qo'shilganda ham user hisobiga qo'shiladi

#### deletePayment funksiyasi
- ✅ To'lov o'chirilganda user'ning totalDebt avtomatik yangilanadi

#### Statistika funksiyalari
- ✅ `getStatistics` - cancelled orderlarni istisno qiladi
- ✅ `getDetailedStatistics` - cancelled orderlarni istisno qiladi
- ✅ Bugungi savdo statistikasi qo'shildi
- ✅ Bugungi to'lovlar statistikasi qo'shildi
- ✅ Bugungi foyda statistikasi qo'shildi

#### Barcha aggregate query'lar
- ✅ `debts` - cancelled orderlarni istisno qiladi
- ✅ `sendDebtNotification` - cancelled orderlarni istisno qiladi
- ✅ `exportDebts` - cancelled orderlarni istisno qiladi
- ✅ `testDebtReminders` - cancelled orderlarni istisno qiladi
- ✅ `exportUserDebt` - cancelled orderlarni istisno qiladi
- ✅ `users` - cancelled orderlarni istisno qiladi
- ✅ `userDetails` - cancelled orderlarni istisno qiladi

### 4. Services (services/index.js)
- ✅ `calculateUserDebt` - cancelled orderlarni istisno qiladi
- ✅ `generateSalesReport` - cancelled orderlarni istisno qiladi

### 5. Bot (bot/index.js)
- ✅ Qarzdorlik ko'rsatishda cancelled orderlarni istisno qiladi

### 6. Scheduler (scheduler.js)
- ✅ `sendWeeklyDebtReminders` - cancelled orderlarni istisno qiladi
- ✅ `sendAutomatedDebtReminders` - cancelled orderlarni istisno qiladi

### 7. API Controller (apiController.js)
- ✅ `getSalesStats` - cancelled orderlarni istisno qiladi
- ✅ `getDebtStats` - cancelled orderlarni istisno qiladi

### 8. Notification Service (notificationService.js)
- ✅ `sendDebtNotification` - cancelled orderlarni istisno qiladi

### 9. Dashboard View (dashboard.ejs)
- ✅ Bugungi savdo ko'rsatkichi qo'shildi
- ✅ Bugungi to'lovlar ko'rsatkichi qo'shildi
- ✅ Bugungi foyda ko'rsatkichi qo'shildi

## Qanday ishlaydi?

### 1. Order bekor qilinganda:
```javascript
// Eski holat
Order status: cancelled
Order debt: 100 000 (qarz qolib ketadi) ❌
User totalDebt: 100 000 (userda qarz qolib ketadi) ❌

// Yangi holat
Order status: cancelled
Order debt: 0 (qarz 0 ga tenglashadi) ✅
User totalDebt: 0 (user hisobidan ham ayriladi) ✅
```

### 2. Order qayta faollashtirilganda:
```javascript
// Order: totalSum=100000, paidSum=30000
Order status: pending (cancelled'dan o'zgartirildi)
Order debt: 70 000 (qayta hisoblanadi) ✅
User totalDebt: 70 000 (userga qaytadan qo'shiladi) ✅
```

### 3. To'lov qabul qilinganda:
```javascript
// To'lov: 50 000
Order paidSum: 30000 + 50000 = 80000
Order debt: 100000 - 80000 = 20000 ✅
User totalDebt: avtomatik yangilanadi ✅
```

### 4. Qarz qo'shilganda:
```javascript
// Qarz: +20 000
Order totalSum: 100000 + 20000 = 120000
Order debt: 120000 - 80000 = 40000 ✅
User totalDebt: avtomatik yangilanadi ✅
```

## Statistikalar

### Dashboard'da ko'rsatiladigan statistikalar:
1. **Bugungi savdo** - bugungi barcha buyurtmalarning umumiy summasi (totalSum)
2. **Bugungi to'lovlar** - bugun qabul qilingan to'lovlar (paidSum)
3. **Bugungi foyda** - bugungi savdodan olingan foyda (sellPrice - costPrice)
4. **Umumiy qarzdorlik** - barcha faol buyurtmalarning qarzi (cancelled'siz)

### Hisobotlarda:
- Barcha hisobotlarda cancelled buyurtmalar istisno qilinadi
- Foyda hisoblanadi: sellPrice - costPrice
- To'lov statistikasi: naqd to'lovlar va qarz

## Test qilish

### 1. Order bekor qilish:
```
1. Qarzli order yarating (masalan, 100 000 so'm)
2. Order statusini "cancelled"ga o'zgartiring
3. User profilida qarzdorlik 0 bo'lishi kerak
4. Qarzdorlik bo'limida bu user ko'rinmasligi kerak
```

### 2. To'lov qo'shish:
```
1. Qarzli order yarating (masalan, 100 000 so'm)
2. 50 000 so'm to'lov qo'shing
3. Order debt: 50 000 bo'lishi kerak
4. User totalDebt: 50 000 bo'lishi kerak
5. Dashboard'da statistika to'g'ri ko'rsatilishi kerak
```

### 3. Qarz qo'shish:
```
1. Buyurtma yarating (masalan, 100 000 so'm)
2. +20 000 so'm qarz qo'shing
3. Order totalSum: 120 000 bo'lishi kerak
4. Order debt: 120 000 bo'lishi kerak (agar to'lov bo'lmasa)
5. User totalDebt: 120 000 bo'lishi kerak
```

## Muhim Eslatmalar

1. **Barcha joyda cancelled orderlar istisno qilinadi**
   - Qarzdorlik hisobi
   - Statistikalar
   - Hisobotlar
   - Export

2. **User totalDebt avtomatik yangilanadi**
   - Order save bo'lganda
   - Order o'chirilganda
   - Payment qo'shilganda
   - Payment o'chirilganda

3. **Xavfsizlik**
   - Hech qanday qarz "havoda" qolmaydi
   - Barcha o'zgarishlar log'lanadi
   - User hisobiga faqat active orderlar kiritiladi

## Kelajakda qo'shish mumkin

1. Order bekor qilish sabablari
2. Bekor qilingan orderlarni ko'rish bo'limi
3. Order tarixini ko'rish
4. Detalliroq statistika grafiklari
5. Export'larda cancelled orderlarni alohida ko'rsatish

## Xatolik yuzaga kelsa

Agar xatolik yuzaga kelsa:
1. Terminal'da log'larni tekshiring
2. User totalDebt ni qo'lda yangilash:
```javascript
const User = require('./src/server/models/User');
await User.updateUserTotalDebt(userId);
```

3. Barcha userlar uchun yangilash:
```javascript
const User = require('./src/server/models/User');
const users = await User.find();
for (const user of users) {
  await User.updateUserTotalDebt(user._id);
}
```
