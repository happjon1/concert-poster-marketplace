const fs = require('fs');
const path = require('path');

// Path to the generated ngsw.json file
const ngswPath = path.join(__dirname, 'dist', 'frontend', 'ngsw.json');

// Check if the file exists
if (!fs.existsSync(ngswPath)) {
  console.error(`Error: ngsw.json not found at ${ngswPath}`);
  process.exit(1);
}

// Read the ngsw.json file
const ngsw = JSON.parse(fs.readFileSync(ngswPath, 'utf8'));

// Add a timestamp to force cache busting
ngsw.timestamp = new Date().getTime();

// Write the updated ngsw.json file back to disk
fs.writeFileSync(ngswPath, JSON.stringify(ngsw, null, 2), 'utf8');

console.log(`✅ Updated ngsw.json with timestamp: ${ngsw.timestamp}`);
