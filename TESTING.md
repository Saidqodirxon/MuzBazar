# MUZ BAZAR - Test qilish yo'riqnomasi

## 🧪 Test qilish bosqichlari

### 1. Dastlabki sozlash

```bash
# Ma'lumotlar bazasini to'ldirish
node seed.js

# Serverni ishga tushirish
npm start
```

### 2. Admin panelni test qilish

#### 2.1 Kirish

- URL: `http://localhost:3000/admin/login`
- Login: `.env` faylidagi `ADMIN_USERNAME`
- Parol: `.env` faylidagi `ADMIN_PASSWORD`

#### 2.2 Mahsulot rasmlari yuklash

1. **Admin Panel** → **Mahsulotlar** → **Yangi mahsulot**
2. Barcha maydonlarni to'ldiring
3. **Rasm tanlang** tugmasini bosing
4. Rasm tanlang (JPEG, PNG, GIF yoki WebP, max 5MB)
5. **Saqlash** tugmasini bosing

**Test holatlari:**

- ✅ Rasm yuklandi va ko'rsatilmoqda
- ✅ Faqat rasm formatlarini qabul qiladi
- ❌ 5MB dan katta rasmni rad qiladi
- ❌ PDF yoki boshqa formatlarni rad qiladi

#### 2.3 Qidiruv

**Mahsulotlar:**

1. **Admin Panel** → **Mahsulotlar**
2. Qidiruv maydoniga mahsulot nomini kiriting
3. **Qidirish** tugmasini bosing
4. **Tozalash** tugmasi bilan natijalarni tozalash

**Buyurtmalar:**

1. **Admin Panel** → **Buyurtmalar**
2. Mijoz ismi yoki telefon raqamini kiriting
3. Qidirish natijalarini ko'ring

**Foydalanuvchilar:**

1. **Admin Panel** → **Foydalanuvchilar**
2. Ism, telefon yoki Telegram ID orqali qidiring

#### 2.4 Sozlamalarni tahrirlash

1. **Admin Panel** → **Sozlamalar**
2. Quyidagi sozlamalarni o'zgartiring:
   - Xush kelibsiz xabari
   - Bot haqida
   - Aloqa ma'lumotlari
   - Qarzdorlik eslatmasi
   - Buyurtma tasdiqlandi xabari
3. **Saqlash** tugmasini bosing
4. Botda o'zgarishlarni tekshiring

### 3. Telegram botni test qilish

#### 3.1 Start buyrug'i

1. Botni ochish
2. `/start` buyrug'ini bosing
3. **Kutilayotgan natija:**
   - Sozlamalardagi "Xush kelibsiz xabari" ko'rsatiladi
   - Telefon raqamini so'raydi
   - Klaviatura tugmalari paydo bo'ladi

#### 3.2 Mahsulot katalogi

1. **🛍️ Mahsulotlar** tugmasini bosing
2. Kategoriyani tanlang
3. Mahsulotni tanlang
4. **Kutilayotgan natija:**
   - Mahsulot rasmi ko'rsatiladi (agar yuklangan bo'lsa)
   - Narx probel bilan ko'rsatiladi: `1 000 000 so'm`
   - Miqdor tanlash tugmalari paydo bo'ladi

#### 3.3 Buyurtma berish

1. Mahsulotni savatchaga qo'shing
2. **📦 Buyurtmalarim** → **🛒 Savat**
3. **✅ Buyurtma berish** tugmasini bosing
4. **Kutilayotgan natija:**
   - Buyurtma raqami beriladi
   - Holat: "Kutilmoqda"
   - Summalar probel bilan ko'rsatiladi

#### 3.4 Aloqa bo'limi

1. **📞 Aloqa** tugmasini bosing
2. **Kutilayotgan natija:**
   - Sozlamalardagi "Aloqa ma'lumotlari" ko'rsatiladi
   - Telefon raqam va manzil to'g'ri

#### 3.5 Qarzdorlik tekshirish

1. **💰 Qarzdorlik** tugmasini bosing
2. **Kutilayotgan natija:**
   - Agar qarz bo'lsa: qarz miqdori probel bilan ko'rsatiladi
   - Agar qarz bo'lmasa: "✅ Sizda qarzdorlik yo'q!"

#### 3.6 Yordam (Help)

1. `/help` buyrug'ini bosing
2. **Kutilayotgan natija:**
   - Sozlamalardagi "Bot haqida" matni ko'rsatiladi

### 4. Sonlarni formatlash testi

**Kutilayotgan format:** `1 000 000 so'm` (probel bilan)

**Test joylari:**

- ✅ Mahsulot narxi botda
- ✅ Buyurtma summasi botda
- ✅ Qarzdorlik botda
- ✅ Admin paneldagi jadvallar
- ✅ Buyurtma detallari
- ✅ Dashboard statistikasi

### 5. Sotuvchi funksiyalari testi

#### 5.1 Yangi buyurtmalar

1. Sotuvchi hisobiga kirish
2. **📋 Yangi buyurtmalar** tugmasini bosing
3. **Kutilayotgan natija:**
   - Barcha "Kutilmoqda" holati buyurtmalari ko'rsatiladi
   - HTML formatida (to'g'ri belgilar)
   - Summalar probel bilan

#### 5.2 Buyurtmani tasdiqlash

1. Buyurtmani tanlang
2. **✅ Tasdiqlash** tugmasini bosing
3. **Kutilayotgan natija:**
   - Buyurtma holati "Tasdiqlangan"ga o'zgaradi
   - Mijozga xabar yuboriladi (agar sozlamada bor bo'lsa)

#### 5.3 To'lov qabul qilish

1. **💰 To'lov qabul qilish** tugmasini bosing
2. Buyurtmani tanlang
3. Summa kiriting
4. **Kutilayotgan natija:**
   - To'lov qayd qilinadi
   - Qarz kamayadi
   - Admin panelda ko'rinadi

### 6. Xatoliklarni tekshirish

#### 6.1 Bo'sh holatlar

- ✅ Mahsulotlar yo'q → Xabar ko'rsatiladi
- ✅ Buyurtmalar yo'q → Xabar ko'rsatiladi
- ✅ Qarzdorlik yo'q → "✅ Sizda qarzdorlik yo'q!"

#### 6.2 Validatsiya

- ❌ Rasm o'rniga PDF yuklash → Xatolik
- ❌ 5MB dan katta fayl → Xatolik
- ❌ Bo'sh maydonlar → Validatsiya xabari

### 7. Performance testi

#### 7.1 Katta ma'lumotlar

1. 100+ mahsulot qo'shing
2. 50+ buyurtma yarating
3. **Test:**
   - Qidiruv tezligi
   - Sahifa yuklash vaqti
   - Bot javob berish tezligi

#### 7.2 Rasm yuklash

1. Turli hajmdagi rasmlarni yuklang (500KB, 2MB, 5MB)
2. **Test:**
   - Yuklash tezligi
   - Botda ko'rsatish tezligi
   - Server xotirasi

---

## 🐛 Umumiy muammolar va yechimlar

### Muammo: Sozlamalar ishlamayapti

**Yechim:**

```bash
# Seed faylni qayta ishga tushiring
node seed.js

# Serverni qayta ishga tushiring
npm start
```

### Muammo: Rasmlar ko'rinmayapti

**Tekshirish:**

1. `public/uploads/products/` papkasi mavjudmi?
2. Fayl nomi to'g'rimi?
3. `.env` faylidagi `PORT` to'g'rimi?

**Yechim:**

```bash
# Papkani qo'lda yaratish
mkdir -p public/uploads/products
```

### Muammo: Sonlar noto'g'ri formatda

**Tekshirish:**

1. `src/utils/formatNumber.js` mavjudmi?
2. Barcha fayllar yangilanganmi?

**Yechim:** Git dan oxirgi versiyani tortib oling

### Muammo: Qidiruv ishlamayapti

**Tekshirish:**

1. MongoDB index yaratilganmi?
2. Controller yangilanganmi?

**Yechim:**

```bash
# MongoDB konsolida
db.products.createIndex({ name: "text", description: "text" })
```

---

## ✅ Test natijalari ro'yxati

- [ ] Admin kirish
- [ ] Mahsulot rasmi yuklash
- [ ] Qidiruv (Mahsulotlar)
- [ ] Qidiruv (Buyurtmalar)
- [ ] Qidiruv (Foydalanuvchilar)
- [ ] Sozlamalarni tahrirlash
- [ ] Bot start xabari
- [ ] Mahsulot katalogi
- [ ] Buyurtma berish
- [ ] Aloqa ma'lumotlari
- [ ] Qarzdorlik tekshirish
- [ ] Help buyrug'i
- [ ] Sonlarni formatlash (Bot)
- [ ] Sonlarni formatlash (Admin)
- [ ] Sotuvchi - Yangi buyurtmalar
- [ ] Sotuvchi - Tasdiqlash
- [ ] Sotuvchi - To'lov qabul qilish
- [ ] Bo'sh holatlar
- [ ] Validatsiya
- [ ] Performance

---

**Eslatma:** Barcha testlarni production serverga o'tkazishdan oldin bajarilishi shart!
