# MUZ BAZAR - Yangilanishlar va Server Muammolarini Hal Qilish

## ✅ Amalga Oshirilgan O'zgarishlar

### 1. Buyurtmalar (Orders)

- ✅ **Boshlang'ich qoldiq** ustuni qo'shildi (totalSum)
- ✅ **To'lov summasi** ustuni qo'shildi (paidSum)
- ✅ **Umumiy qoldiq** ustuni qo'shildi (debt)
- ✅ **Telefon** ustuni qo'shildi
- ✅ Excel eksport yangilandi

### 2. Foydalanuvchilar (Users)

- ✅ **Boshlang'ich qoldiq** ustuni qo'shildi
- ✅ **To'lov summasi** ustuni qo'shildi
- ✅ **Umumiy qoldiq** ustuni qo'shildi
- ✅ Controller balansni hisoblaydi
- ✅ Telefon raqami ko'rinadi

### 3. Qarzdorlik (Debts)

- ✅ Ustunlar qayta tartibga solindi
- ✅ **Boshlang'ich qoldiq** ko'rsatiladi
- ✅ **To'lov summasi** ko'rsatiladi
- ✅ **Umumiy qoldiq** ko'rsatiladi
- ✅ Excel eksport yangilandi

### 4. Sidebar

- ✅ Mobil versiyada scroll muammosi hal qilindi
- ✅ Sidebar ochilganda background scroll to'xtaydi
- ✅ Sidebar mustaqil scroll qiladi
- ✅ Layout buzilgan kod tuzatildi

### 5. Excel Export

- ✅ Buffer yozish qo'shildi (server xotira muammolari uchun)
- ✅ Xatoliklarni qayd qilish yaxshilandi
- ✅ `headersSent` tekshiruvi qo'shildi
- ✅ Bo'sh ma'lumotlar uchun tekshiruv

## 🔧 SERVER MUAMMOSINI HAL QILISH

### Excel yuklanmaslik sabablari va yechimlar:

#### 1️⃣ ExcelJS o'rnatilmaganmi?

```bash
# Serverda bajaring:
cd /path/to/muzbazar
npm install exceljs
# yoki
npm install
```

#### 2️⃣ Server xotirasi yetarli emasmi?

```bash
# Node.js xotira limitini oshiring
# package.json da scripts qismini yangilang:
"start": "node --max-old-space-size=2048 index.js"
```

#### 3️⃣ PM2 yoki boshqa process manager ishlatayotgan bo'lsangiz:

```bash
# PM2 ni qayta boshlang:
pm2 restart all
# yoki
pm2 restart muzbazar
```

#### 4️⃣ Server loglarini tekshiring:

```bash
# PM2 bilan
pm2 logs

# yoki Node.js loglarini o'qing
# Server console da Excel export paytida xatolik chiqarmaydi?
```

#### 5️⃣ Fayl ruxsatlari (permissions):

```bash
# Public papkasi yozish ruxsatiga ega ekanligini tekshiring
chmod -R 755 /path/to/muzbazar/public
chmod -R 755 /path/to/muzbazar/node_modules
```

#### 6️⃣ Node versiyasi:

```bash
# Node.js 16+ kerak
node --version
# Agar eskiroq bo'lsa, yangilang:
nvm install 16
nvm use 16
```

### Server deploy qilish uchun qadamlar:

1. **Kodni serverga yuklash:**

```bash
git pull origin main
# yoki
scp -r * user@server:/path/to/muzbazar/
```

2. **Dependencies o'rnatish:**

```bash
cd /path/to/muzbazar
npm install
```

3. **Serverni qayta ishga tushirish:**

```bash
# PM2 bilan
pm2 restart muzbazar

# yoki oddiy
npm start
```

4. **Test qilish:**

- Brauzerda admin panelga kiring
- Buyurtmalar sahifasiga o'ting
- "Excel" tugmasini bosing
- Fayl yuklanishi kerak

5. **Agar ishlamasa, loglarni tekshiring:**

```bash
pm2 logs muzbazar --lines 100
```

### Test script ishlatish:

```bash
cd /path/to/muzbazar
node test-excel.js
```

Agar test muvaffaqiyatli bo'lsa lekin hali ham yuklanmasa:

- Brauzerdagi console ni tekshiring (F12 > Console)
- Network tab ni tekshiring (F12 > Network)
- Server loglarida "Export" bilan bog'liq xatoliklarni qidiring

## 📝 Fayllar ro'yxati:

### O'zgartirilgan fayllar:

1. `src/views/admin/orders.ejs` - Buyurtmalar jadvali
2. `src/views/admin/users.ejs` - Foydalanuvchilar jadvali
3. `src/views/admin/debts.ejs` - Qarzdorlik jadvali
4. `src/views/admin/user-details.ejs` - Foydalanuvchi tafsilotlari
5. `src/views/layouts/layout.ejs` - Asosiy layout (sidebar fix)
6. `src/server/controllers/adminController.js` - Controller funksiyalari

### Yangi fayllar:

1. `test-excel.js` - Excel test script

## 🚀 Deployment Checklist:

- [ ] Kod serverga yuklandi
- [ ] `npm install` bajarildi
- [ ] ExcelJS o'rnatildi (`npm list exceljs`)
- [ ] Server qayta ishga tushirildi
- [ ] Test qilindi: Buyurtmalar Excel eksport
- [ ] Test qilindi: Foydalanuvchilar ko'rinishi
- [ ] Test qilindi: Qarzdorlik ko'rinishi
- [ ] Test qilindi: Sidebar mobil versiyada
- [ ] Server loglari tozalangan
- [ ] Barcha yangi ustunlar to'g'ri ko'rsatilmoqda

## 📞 Qo'shimcha yordam:

Agar muammolar davom etsa:

1. Server loglarini to'liq nusxasini oling
2. Brauzerdagi console xatoliklarini screenshot qiling
3. Network request ni tekshiring (Excel yuklanish so'rovini)

### Debug uchun qo'shimcha log:

Controller da allaqachon qo'shilgan:

- `console.log('📊 Starting orders export...')`
- `console.log('✅ Orders export completed successfully')`
- `console.error('❌ Export orders error:', error)`

Bu loglar PM2 yoki terminal loglarida ko'rinadi.
