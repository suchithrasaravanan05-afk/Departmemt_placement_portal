const fs = require('fs');

const csbsBase64 = fs.existsSync('frontend/csbs_logo_clean.png')
  ? 'data:image/png;base64,' + fs.readFileSync('frontend/csbs_logo_clean.png').toString('base64')
  : '';

const ritBase64 = fs.existsSync('frontend/rit_logo.png')
  ? 'data:image/png;base64,' + fs.readFileSync('frontend/rit_logo.png').toString('base64')
  : '';

const qrcodeBundleJs = fs.existsSync('frontend/qrcode.bundle.js')
  ? fs.readFileSync('frontend/qrcode.bundle.js', 'utf8')
  : '';

function makeSigSvg(pathD, width = 180, height = 55) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><path d="${pathD}" fill="none" stroke="#1e1b4b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const sigArulraj = makeSigSvg('M 15 38 Q 28 8 36 24 T 48 42 Q 62 18 78 30 T 96 35 M 40 28 L 105 28 M 22 45 Q 60 48 112 40');
const sigRajakumaran = makeSigSvg('M 12 36 Q 22 14 32 30 Q 38 42 46 22 Q 54 36 68 34 T 82 25 Q 96 22 110 32 M 18 42 Q 55 45 115 38');
const sigRajakarunakaran = makeSigSvg('M 10 35 Q 24 10 35 32 Q 44 45 52 16 Q 60 38 72 32 Q 85 18 95 35 Q 106 30 118 36 M 16 45 Q 60 46 122 40');
const sigGanesan = makeSigSvg('M 15 38 Q 25 12 36 34 Q 45 42 54 20 Q 62 36 78 34 Q 92 18 106 36 M 20 44 Q 65 48 118 40');
const sigRamesh = makeSigSvg('M 12 34 Q 24 12 34 32 Q 46 44 56 22 Q 68 36 84 32 Q 98 16 112 34 M 18 42 Q 62 46 120 40');

const backgroundSvg = fs.existsSync('frontend/certificate_background.svg')
  ? fs.readFileSync('frontend/certificate_background.svg', 'utf8')
  : '';

const backgroundSvgDataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(backgroundSvg);

const engineCode = fs.readFileSync('scratch/engine_code.js', 'utf8');

const fileContent = `/**
 * Ramco Institute of Technology — Certificate Assets & High-Fidelity Rendering Engine
 * Provides Base64 encoded logos, verified signature vectors, bundled QR code generator,
 * canvas rendering engine, and universal data-driven PDF generation pipeline.
 */

if (typeof window === 'undefined') {
  global.window = global;
}

// 1. Standalone Bundled QR Code Generator
${qrcodeBundleJs}

if (typeof window !== 'undefined' && !window.QRCode && typeof QRCode !== 'undefined') {
  window.QRCode = QRCode;
}

// 2. Official Branding & Vector Signatures
window.CERT_ASSETS = {
  RIT_LOGO: ${JSON.stringify(ritBase64)},
  CSBS_LOGO: ${JSON.stringify(csbsBase64)},
  BACKGROUND_SVG: ${JSON.stringify(backgroundSvgDataUrl)},
  SIGNATURES: {
    arulraj: ${JSON.stringify(sigArulraj)},
    rajakumaran: ${JSON.stringify(sigRajakumaran)},
    rajakarunakaran: ${JSON.stringify(sigRajakarunakaran)},
    ganesan: ${JSON.stringify(sigGanesan)},
    ramesh: ${JSON.stringify(sigRamesh)}
  }
};

if (!window.RIT_LOGO_BASE64) window.RIT_LOGO_BASE64 = window.CERT_ASSETS.RIT_LOGO;
if (!window.CSBS_LOGO_BASE64) window.CSBS_LOGO_BASE64 = window.CERT_ASSETS.CSBS_LOGO;

${engineCode}

window.RIT_CERT_ASSETS = {
  ...window.CERT_ASSETS,
  drawCertificate: drawRitCertificate,
  createCertificatePdf: createCertificatePdf,
  loadImage: ritLoadImage,
  renderQrCode: ritRenderQrCode
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ...window.RIT_CERT_ASSETS,
    drawRitCertificate,
    createCertificatePdf
  };
}
`;

fs.writeFileSync('frontend/certificate_assets.js', fileContent, 'utf8');
console.log('✅ Successfully created frontend/certificate_assets.js, total size:', fileContent.length);
