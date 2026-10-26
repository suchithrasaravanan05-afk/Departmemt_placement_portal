const fs = require('fs');

const sigs = JSON.parse(fs.readFileSync('scratch/signatures_base64.json', 'utf8'));
let code = fs.readFileSync('frontend/certificate_assets.js', 'utf8');

// Replace SIGNATURES: { ... } in CERT_ASSETS with real PNG Base64 data URLs
const startIdx = code.indexOf('SIGNATURES: {');
if (startIdx !== -1) {
  // Find the closing brace of SIGNATURES
  const endIdx = code.indexOf('},', startIdx);
  const before = code.substring(0, startIdx);
  const after = code.substring(endIdx + 2);
  const newSignaturesBlock = `SIGNATURES: ${JSON.stringify(sigs, null, 2)},`;
  code = before + newSignaturesBlock + after;
  fs.writeFileSync('frontend/certificate_assets.js', code);
  console.log('Successfully replaced SVG signatures with PNG Base64 signatures in frontend/certificate_assets.js');
} else {
  console.log('SIGNATURES: { block not found');
}
