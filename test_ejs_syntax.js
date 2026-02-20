const ejs = require("ejs");
const fs = require("fs");
const path = require("path");

const filePath = "e:\\muzbazar\\src\\views\\admin\\user-details.ejs";
const content = fs.readFileSync(filePath, "utf-8");

try {
  const template = ejs.compile(content, {
    filename: filePath,
    async: true,
  });
  console.log("Compilation successful!");
} catch (error) {
  console.error("Compilation failed:");
  console.error(error);
}
