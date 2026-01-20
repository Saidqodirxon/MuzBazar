# MUZ BAZAR - Ishga tushirish yo'riqnomasi

## 🚀 Botni ishga tushirish

### Development rejimi (avtomatik qayta yuklash bilan)

```bash
npm run dev
```

Bu rejimda:

- ✅ Kod o'zgarganda avtomatik qayta yuklanadi
- ✅ Botni qayta ishga tushirishga hojat yo'q
- ✅ `.env`, `.js`, `.ejs` fayllar kuzatiladi
- ✅ 2 soniya kechikish bilan qayta yuklanadi

### Production rejimi

```bash
npm start
```

### Faqat bot qismi uchun

```bash
npm run dev:bot
```

## 📊 Yangi funksiyalar

### 1. Excel eksport

**Qarzdorlik ma'lumotlarini Excel ga yuklash:**

- Admin Panel → Qarzdorlik → **Excel** tugmasi
- Fayl yuklab olinadi: `qarzdorlik-[timestamp].xlsx`
- Ichida: Ism, Telefon, Qarzdorlik, Buyurtmalar soni, Oxirgi buyurtma

### 2. Avtomatik qarzdorlik eslatmalari

**Sozlash:**

1. Admin Panel → Sozlamalar
2. **Avtomatik qarzdorlik eslatmasi** - Yoqish
3. **Eslatma intervali** - Necha kunda bir (masalan: 3)
4. **Eslatma vaqti** - Soat (masalan: 10:00)

**Qanday ishlaydi:**

- Har 10 daqiqada sozlamalar tekshiriladi
- Belgilangan vaqtda eslatmalar yuboriladi
- Interval kunlari o'tgandan keyin takrorlanadi
- Avtomatik ravishda barcha qarzdorlarga yuboriladi

### 3. Oylik hisobotlar

**Avtomatik yuboriladi:**

- Har oyning 1-kunida soat 09:00 da
- Barcha admin foydalanuvchilarga
- Telegram orqali yuboriladi

**Hisobot tarkibi:**

- 📦 Oylik buyurtmalar soni
- 💰 Oylik daromad
- ✅ To'langan summalar
- 🔴 Qarzdorlik
- 📈 Foyda

### 4. Kunlik hisobotlar

**Avtomatik yuboriladi:**

- Har kuni soat 23:00 da
- Barcha admin foydalanuvchilarga

**Hisobot tarkibi:**

- 📦 Kunlik buyurtmalar
- 💰 Kunlik daromad
- ⏳ Kutilayotgan buyurtmalar
- 🔴 Umumiy qarzdorlik

## 🔧 Muammolarni hal qilish

### Bot ishlamayapti?

```bash
# 1. Portni tekshiring (.env faylida)
PORT=3000

# 2. MongoDB ulanganmi?
MONGODB_URI=mongodb://localhost:27017/muzbazar

# 3. Bot tokenini tekshiring
BOT_TOKEN=your_bot_token_here

# 4. Loglarni ko'ring
npm run dev
```

### Avtomatik qayta yuklash ishlamayapti?

```bash
# nodemon o'rnatilganmi?
npm install --save-dev nodemon

# Dev rejimida ishga tushiring
npm run dev
```

### Eslatmalar yuborilmayapti?

1. Sozlamalarni tekshiring (Admin → Sozlamalar)
2. `debt_reminder_enabled` = true bo'lishi kerak
3. Bot ishlab turishini tekshiring
4. Telegram bot tokeni to'g'rimi?

## 📋 Tizimli tekshiruv

```bash
# 1. Dependencies o'rnatish
npm install

# 2. Ma'lumotlar bazasini to'ldirish
npm run seed

# 3. Serverni ishga tushirish (dev rejimida)
npm run dev

# 4. Admin panelga kirish
http://localhost:3000/admin
```

## 🎯 Maslahatlar

1. **Development** - Doim `npm run dev` dan foydalaning
2. **Production** - `npm start` va PM2 ishlatish tavsiya etiladi
3. **Backup** - Har kuni MongoDB backup oling
4. **Monitoring** - Loglarni kuzating
5. **Updates** - Kod o'zgartirilganda avtomatik qayta yuklanadi

## 🔐 Xavfsizlik

- `.env` faylini hech qachon Git ga qo'shmang
- Admin parolini murakkab qiling
- MongoDB ga tashqi kirish uchun autentifikatsiya qo'shing
- HTTPS ishlatish tavsiya etiladi

## 📞 Yordam

Muammo bo'lsa:

1. Loglarni tekshiring
2. `.env` faylini to'g'ri sozlang
3. `npm install` qayta bajaring
4. MongoDB ishlab turganini tekshiring
