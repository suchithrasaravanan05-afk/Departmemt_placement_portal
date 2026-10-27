const fs = require('fs');

const content = fs.readFileSync('frontend/certificate_assets.js', 'utf8');

// Load window.CERT_ASSETS
global.window = {};
eval(content);

console.log('CERT_ASSETS keys:', Object.keys(global.window.CERT_ASSETS));
const sigs = global.window.CERT_ASSETS.SIGNATURES;
console.log('SIGNATURES keys:', Object.keys(sigs));
for (const k of Object.keys(sigs)) {
  console.log(k, sigs[k].substring(0, 60), 'length:', sigs[k].length);
}
