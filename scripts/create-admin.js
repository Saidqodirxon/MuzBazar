/**
 * Super admin yaratish skripty
 * Ishlatish: node scripts/create-admin.js <username> <password> <ism>
 * Misol:    node scripts/create-admin.js admin2 parol123 "Sardor Toshmatov"
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ENV_PATH = path.join(__dirname, "../.env");

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) {
    console.error("❌ .env fayl topilmadi:", ENV_PATH);
    process.exit(1);
  }
  return fs.readFileSync(ENV_PATH, "utf8");
}

function setEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }
  return content.trimEnd() + `\n${key}=${value}\n`;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);

  let username = args[0];
  let password = args[1];
  let name     = args[2];

  // Agar argument berilmagan bo'lsa, so'raymiz
  if (!username) username = await prompt("Yangi admin username: ");
  if (!password) password = await prompt("Yangi admin parol:    ");
  if (!name)     name     = await prompt("Ism (ko'rsatish uchun): ");

  if (!username || !password) {
    console.error("❌ Username va parol majburiy!");
    process.exit(1);
  }

  let envContent = readEnv();

  // Mavjud ADMIN2 ni tekshirish
  const existing2 = envContent.match(/^ADMIN2_USERNAME=(.+)$/m);
  if (existing2 && existing2[1]) {
    console.log(`\n⚠️  ADMIN2 allaqachon mavjud: ${existing2[1]}`);
    const overwrite = await prompt("Ustiga yozilsinmi? (ha/yo'q): ");
    if (!["ha", "h", "yes", "y"].includes(overwrite.toLowerCase())) {
      console.log("❌ Bekor qilindi.");
      process.exit(0);
    }
  }

  envContent = setEnvVar(envContent, "ADMIN2_USERNAME", username);
  envContent = setEnvVar(envContent, "ADMIN2_PASSWORD", password);
  if (name) {
    envContent = setEnvVar(envContent, "ADMIN2_NAME", name);
  }

  fs.writeFileSync(ENV_PATH, envContent, "utf8");

  console.log("\n✅ Super admin muvaffaqiyatli yaratildi!");
  console.log("─".repeat(40));
  console.log(`   Username : ${username}`);
  console.log(`   Parol    : ${password}`);
  if (name) console.log(`   Ism      : ${name}`);
  console.log("─".repeat(40));
  console.log("\n🔄 O'zgarishlar kuchga kirishi uchun serverni restart qiling:");
  console.log("   pm2 restart MuzBazar\n");
}

main().catch((err) => {
  console.error("❌ Xatolik:", err.message);
  process.exit(1);
});
