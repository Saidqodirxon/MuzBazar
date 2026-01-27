# Telegram Guruh Xabarlari - Admin Harakatlari

## Qanday harakatlar guruhga xabar yuboradi?

### 1. 📋 Buyurtma holati o'zgartirilganda
```
📋 Buyurtma holati o'zgartirildi

👤 Sotuvchi: Admin Ismi
👥 Mijoz: Anvar Aliyev
🆔 Buyurtma: ORD-001
📊 Holat: pending → ✅ Tasdiqlangan
💰 Summa: 150 000 so'm
🔴 Qarz: 50 000 so'm
```

**Qachon yuboriladi:**
- Status: pending, confirmed, delivered, cancelled ga o'zgartirilganda

---

### 2. 💰 To'lov qabul qilinganda
```
💰 To'lov qabul qilindi

👤 Sotuvchi: Admin Ismi
👥 Mijoz: Anvar Aliyev
🆔 Buyurtma: ORD-001
💵 To'lov: 50 000 so'm
📊 Jami: 150 000 so'm
✅ To'landi: 100 000 so'm
🔴 Qarz: 50 000 so'm
```

**Qachon yuboriladi:**
- Admin panel orqali to'lov qo'shilganda (qarzdan ayirish)

---

### 3. 💳 Qarz qo'shilganda
```
💳 Qarz qo'shildi

👤 Sotuvchi: Admin Ismi
👥 Mijoz: Anvar Aliyev
🆔 Buyurtma: ORD-001
➕ Qo'shildi: 20 000 so'm
📊 Jami: 170 000 so'm
🔴 Yangi qarz: 70 000 so'm
```

**Qachon yuboriladi:**
- Admin panel orqali qarz qo'shilganda (narx berish)

---

### 4. 🗑️ To'lov o'chirilganda
```
🗑️ To'lov o'chirildi

👤 Sotuvchi: Admin Ismi
👥 Mijoz: Anvar Aliyev
🆔 Buyurtma: ORD-001
💵 O'chirildi: 50 000 so'm
🔴 Yangi qarz: 100 000 so'm
```

**Qachon yuboriladi:**
- Admin panel orqali to'lov o'chirilganda

---

### 5. 🆕 Yangi buyurtma kelganda
```
🆕 Yangi buyurtma!

🆔 Buyurtma: ORD-002
👤 Klient: Anvar Aliyev
📱 Telegram: @anvar

📦 Mahsulotlar:
  • Muz 5kg x2 - 100 000 so'm
  • Suv 1.5L x5 - 50 000 so'm

💰 Jami summa: 150 000 so'm

🕐 Vaqt: 27.01.2026, 14:30
```

**Qachon yuboriladi:**
- Bot orqali yangi buyurtma yaratilganda

---

### 6. 🆕 Yangi mahsulot qo'shilganda
```
🆕 Yangi mahsulot qo'shildi

🔧 Admin: Admin Ismi
📦 Mahsulot: Muz 10kg
📊 Miqdor: 100 ta
💰 Narx: 50 000 so'm
💵 Tan narx: 40 000 so'm
```

**Qachon yuboriladi:**
- Admin panel orqali yangi mahsulot qo'shilganda

---

### 7. 👤 User blok holati o'zgartirilganda
```
👤 User holati o'zgartirildi

🔧 Admin: Admin Ismi
👥 User: Anvar Aliyev
📞 Telefon: +998901234567
📊 Holat: 🔒 bloklandi
```
yoki
```
📊 Holat: ✅ faollashtirildi
```

**Qachon yuboriladi:**
- User bloklanganda yoki faollashtirilganda

---

### 8. 🔄 User roli o'zgartirilganda
```
🔄 User roli o'zgartirildi

🔧 Admin: Admin Ismi
👤 User: Anvar Aliyev
📞 Telefon: +998901234567
📊 Rol: 👥 Mijoz → 👨‍💼 Sotuvchi
```

**Qachon yuboriladi:**
- User roli o'zgartirilganda (client → seller → admin)

---

### 9. 🔄 User holati o'zgartirilganda
```
🔄 User holati o'zgartirildi

🔧 Admin: Admin Ismi
👤 User: Anvar Aliyev
📞 Telefon: +998901234567
📊 Holat: ✅ faol
```
yoki
```
📊 Holat: ❌ nofaol
```

**Qachon yuboriladi:**
- User isActive maydoni o'zgartirilganda

---

## Sozlash

### 1. .env faylida guruh ID ni ko'rsating:
```env
NOTIFICATION_GROUP_ID=-1001234567890
```

### 2. Guruh ID ni topish:
1. Botni guruhga qo'shing
2. Guruhda biror xabar yuboring
3. Browserda ochiq: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
4. `chat.id` ni toping (manfiy raqam)

### 3. Botga guruhda admin huquqi bering:
- Bot guruhga xabar yuborishi uchun admin bo'lishi shart

---

## Xatoliklarni bartaraf qilish

### Xabar yuborilmayapti?
1. `NOTIFICATION_GROUP_ID` to'g'ri sozlanganligini tekshiring
2. Bot guruhga qo'shilganligini tekshiring
3. Botga admin huquqi berilganligini tekshiring
4. Terminal loglarini tekshiring:
```
✅ Group notification sent
```
yoki
```
❌ Failed to send group notification: ...
```

### Xabar formati noto'g'ri?
- Markdown format ishlatiladi
- Maxsus belgilar (`*`, `_`, `[`, `]`) avtomatik escape qilinadi

### Xabar yuborilmasligi kerak bo'lsa?
- `NOTIFICATION_GROUP_ID` ni `.env` faylidan o'chiring
- Yoki comment qiling:
```env
# NOTIFICATION_GROUP_ID=-1001234567890
```

---

## Xususiyatlar

✅ Barcha admin harakatlar kuzatiladi
✅ Seller nomi ko'rsatiladi
✅ To'liq ma'lumotlar (summa, mahsulot, user)
✅ Emoji bilan ranglilik
✅ Real-time xabarlar
✅ Xatoliklar loglanadi (lekin ishni to'xtatmaydi)

---

## Kelajakda qo'shish mumkin

- [ ] Xabar formatini sozlash (admin panel orqali)
- [ ] Turli harakatlar uchun turli guruhlar
- [ ] Xabar yuborishni yoqish/o'chirish (settings)
- [ ] Statistika (kunlik/haftalik hisobot)
- [ ] Xabar shablonlari (template system)
