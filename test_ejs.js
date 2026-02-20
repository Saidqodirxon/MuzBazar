const ejs = require("ejs");
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src/views/admin/dashboard.ejs");
const content = fs.readFileSync(filePath, "utf8");

// Try to find the problematic line by testing line by line
const lines = content.split("\n");
console.log("Total lines:", lines.length);

// Check for problematic characters
for (var i = 0; i < lines.length; i++) {
  var line = lines[i];
  // Check for non-printable or unusual characters
  for (var j = 0; j < line.length; j++) {
    var code = line.charCodeAt(j);
    if (code > 127 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      console.log(
        "Line " +
          (i + 1) +
          ", col " +
          (j + 1) +
          ": unusual char code=" +
          code +
          " char=" +
          JSON.stringify(line.charAt(j))
      );
    }
  }
}

// Try compiling just the scriptlet block
var scriptStart = content.indexOf("<%");
var scriptEnd = content.indexOf("-%>");
if (scriptStart >= 0 && scriptEnd >= 0) {
  var scriptContent = content.substring(scriptStart + 2, scriptEnd);
  console.log("\nScript block length:", scriptContent.length);

  // Try to evaluate just the JS
  try {
    new Function(scriptContent);
    console.log("JS syntax: OK");
  } catch (e) {
    console.log("JS syntax error:", e.message);
    // Try to narrow down
    var jsLines = scriptContent.split("\n");
    for (var k = 0; k < jsLines.length; k++) {
      try {
        new Function(jsLines.slice(0, k + 1).join("\n"));
      } catch (e2) {
        console.log(
          "Error appears at scriptlet line " +
            (k + 1) +
            ": " +
            jsLines[k].trim().substring(0, 80)
        );
        break;
      }
    }
  }
}
