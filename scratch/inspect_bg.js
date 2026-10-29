const fs = require('fs');
const path = require('path');

const buf = fs.readFileSync(path.join(__dirname, '../frontend/certificate_background.png'));
// Read PNG width & height from header
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
console.log(`PNG dimensions: ${width} x ${height}, bytes: ${buf.length}`);
