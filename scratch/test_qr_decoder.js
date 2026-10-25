const QRCode = require('qrcode');
const jsQR = require('jsqr');

async function testQrEncodingAndDecoding() {
  console.log('=== TESTING QR CODE GENERATION & SCANNING ACCURACY ===');
  const certId = 'RIT-STTP-2026-TEST999';
  const expectedUrl = `https://rit-csbs-portal.vercel.app/verify-certificate.html?id=${encodeURIComponent(certId)}`;

  console.log('Target Verification URL:', expectedUrl);

  // Generate QR as raw monochrome matrix via QRCode.create
  const qr = QRCode.create(expectedUrl, { errorCorrectionLevel: 'M' });
  const moduleCount = qr.modules.size;
  console.log(`QR Module Size: ${moduleCount}x${moduleCount}`);

  // Render to raw RGBA buffer (similar to HTML5 Canvas getImageData)
  const scale = 8;
  const margin = 4; // quiet zone
  const width = (moduleCount + margin * 2) * scale;
  const height = width;
  const rgbaBuffer = new Uint8ClampedArray(width * height * 4);

  // Fill with white
  rgbaBuffer.fill(255);

  // Draw black modules
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qr.modules.get(r, c)) {
        const startX = (c + margin) * scale;
        const startY = (r + margin) * scale;
        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            const idx = ((startY + py) * width + (startX + px)) * 4;
            rgbaBuffer[idx] = 0;     // R
            rgbaBuffer[idx + 1] = 0; // G
            rgbaBuffer[idx + 2] = 0; // B
            rgbaBuffer[idx + 3] = 255; // A
          }
        }
      }
    }
  }

  // Now scan using jsQR (exact optical scanner algorithm)
  const decoded = jsQR(rgbaBuffer, width, height);

  if (!decoded) {
    throw new Error('FAILED to scan/decode QR code!');
  }

  console.log('Scanned & Decoded URL:', decoded.data);

  if (decoded.data !== expectedUrl) {
    throw new Error(`Decoded URL mismatch: got "${decoded.data}", expected "${expectedUrl}"`);
  }

  console.log('✅ PASS: QR Code generated and optically scanned successfully!');
  console.log('✅ PASS: Decoded URL exactly matches deployed verification endpoint!');
}

testQrEncodingAndDecoding().catch(err => {
  console.error(err);
  process.exit(1);
});
