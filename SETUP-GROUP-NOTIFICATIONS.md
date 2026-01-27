# Telegram Guruh Xabarlarini Sozlash

## 1. Telegram guruhini yarating

1. Telegram'da yangi guruh yarating
2. Guruhga nom bering (masalan: "MuzBazar Admin")
3. Botingizni guruhga qo'shing

## 2. Botga admin huquqi bering

1. Guruh sozlamalariga kiring
2. "Administrators" bo'limiga o'ting
3. Botingizni admin qiling
4. Kerakli ruxsatlar:
   - ✅ Send Messages
   - ✅ Delete Messages (optional)
   - ✅ Pin Messages (optional)

## 3. Guruh ID ni toping

### Usul 1: getUpdates API orqali

1. Guruhda biror xabar yuboring (masalan: "test")
2. Browser'da quyidagi URL ni oching:

```
https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
```

`<BOT_TOKEN>` ni o'z bot tokeningiz bilan almashtiring

3. Natijada JSON ko'rinadi. Quyidagini qidiring:

```json
"chat": {
  "id": -1001234567890,
  "title": "MuzBazar Admin",
  "type": "supergroup"
}
```

4. `"id"` qiymatini copy qiling (manfiy raqam bo'ladi)

### Usul 2: Bot orqali

1. Guruhga quyidagi bot'ni qo'shing: @userinfobot
2. Bot avtomatik guruh ID ni yuboradi
3. @userinfobot ni guruhdan o'chirish mumkin

## 4. .env faylini sozlang

`.env` faylini oching va quyidagini qo'shing:

```env
NOTIFICATION_GROUP_ID=-1001234567890
```

Manfiy belgini unutmang!

## 5. Serverni qayta ishga tushiring

```bash
npm restart
```

yoki

```bash
nodemon index.js
```

## 6. Test qiling

### Admin paneldan:

1. Biror buyurtmaga to'lov qo'shing
2. Guruhda xabar paydo bo'lishi kerak:

```
💰 To'lov qabul qilindi

👤 Sotuvchi: Admin
👥 Mijoz: Test User
🆔 Buyurtma: ORD-001
💵 To'lov: 50 000 so'm
✅ To'landi: 50 000 so'm
🔴 Qarz: 50 000 so'm
```

### Bot orqali:

1. Bot orqali yangi buyurtma yarating
2. Guruhda buyurtma xabari ko'rinishi kerak

## Xatoliklarni bartaraf qilish

### ❌ "Group ID not configured"

**Sabab:** `NOTIFICATION_GROUP_ID` `.env` faylida yo'q

**Yechim:**

```env
NOTIFICATION_GROUP_ID=-1001234567890
```

---

### ❌ "Forbidden: bot is not a member of the supergroup chat"

**Sabab:** Bot guruhga qo'shilmagan

**Yechim:**

1. Botni guruhga qo'shing
2. Botga admin huquqi bering

---

### ❌ "Forbidden: bot was kicked from the supergroup chat"

**Sabab:** Bot guruhdan o'chirilgan

**Yechim:**

1. Botni qaytadan guruhga qo'shing
2. Botga admin huquqi bering

---

### ❌ "Bad Request: chat not found"

**Sabab:** Guruh ID noto'g'ri

**Yechim:**

1. Guruh ID ni qaytadan tekshiring
2. Manfiy belgini tekshiring
3. getUpdates API orqali qaytadan oling

---

### ❌ Xabar yuborilmayapti, lekin xatolik yo'q

**Sabab:** Bot admin emas yoki guruhda post qilish cheklangan

**Yechim:**

1. Botni admin qiling
2. Guruh sozlamalarida "All Members" postga ruxsat berilganligini tekshiring

---

## Terminal loglarini tekshirish

Xabar yuborilganda terminal'da ko'rinishi kerak:

```
✅ Group notification sent
```

Agar xatolik bo'lsa:

```
❌ Failed to send group notification: [error message]
```

## Ko'proq ma'lumot

- [GROUP-NOTIFICATIONS.md](GROUP-NOTIFICATIONS.md) - Barcha xabar turlari va formatlar
- [Telegram Bot API](https://core.telegram.org/bots/api) - Rasmiy hujjat
