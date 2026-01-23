/**
 * Test script to verify ExcelJS works correctly
 * Run with: node test-excel.js
 */

const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

async function testExcelExport() {
  try {
    console.log("🧪 Testing ExcelJS installation...");

    // Create a simple workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Test");

    // Add some data
    worksheet.columns = [
      { header: "Name", key: "name", width: 20 },
      { header: "Value", key: "value", width: 15 },
    ];

    worksheet.addRow({ name: "Test 1", value: 100 });
    worksheet.addRow({ name: "Test 2", value: 200 });
    worksheet.addRow({ name: "Test 3", value: 300 });

    // Test buffer writing (used in production)
    console.log("📝 Testing buffer write...");
    const buffer = await workbook.xlsx.writeBuffer();
    console.log(`✅ Buffer created: ${buffer.length} bytes`);

    // Save to file for verification
    const testFile = path.join(__dirname, "test-export.xlsx");
    await workbook.xlsx.writeFile(testFile);
    console.log(`✅ File saved: ${testFile}`);

    // Check file exists and has size
    const stats = fs.statSync(testFile);
    console.log(`✅ File size: ${stats.size} bytes`);

    // Clean up
    fs.unlinkSync(testFile);
    console.log("✅ Test file cleaned up");

    console.log("\n✅ All tests passed! ExcelJS is working correctly.");
    console.log("\nIf Excel export still fails on server, check:");
    console.log("1. Server has enough memory");
    console.log("2. ExcelJS is installed: npm install exceljs");
    console.log("3. Server logs for specific error messages");
    console.log("4. File permissions on server");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("❌ Error stack:", error.stack);
    process.exit(1);
  }
}

testExcelExport();
