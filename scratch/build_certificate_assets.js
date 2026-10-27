const fs = require('fs');

const csbsBase64 = fs.existsSync('frontend/csbs_logo_clean.png')
  ? 'data:image/png;base64,' + fs.readFileSync('frontend/csbs_logo_clean.png').toString('base64')
  : '';

const ritBase64 = fs.existsSync('frontend/rit_logo.png')
  ? 'data:image/png;base64,' + fs.readFileSync('frontend/rit_logo.png').toString('base64')
  : '';

const bgImageBase64 = fs.existsSync('frontend/certificate_background.png')
  ? 'data:image/png;base64,' + fs.readFileSync('frontend/certificate_background.png').toString('base64')
  : '';

const bgSvg = fs.existsSync('frontend/certificate_background.svg')
  ? fs.readFileSync('frontend/certificate_background.svg', 'utf8')
  : '';

const bgSvgDataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(bgSvg);

const qrcodeBundleJs = fs.existsSync('frontend/qrcode.bundle.js')
  ? fs.readFileSync('frontend/qrcode.bundle.js', 'utf8')
  : '';

// Signatures read directly from transparent PNG assets in frontend/signature/
const getPngBase64 = (name) => {
  const p = `frontend/signature/${name}.png`;
  return fs.existsSync(p) ? 'data:image/png;base64,' + fs.readFileSync(p).toString('base64') : '';
};

const rawSigs = {
  jeyasundari: getPngBase64('jeyasundari'),
  rekha: getPngBase64('rekha'),
  ramakrishnan: getPngBase64('ramakrishnan'),
  kesavaraja: getPngBase64('kesavaraja'),
  rajakumaran: getPngBase64('rajakumaran'),
  ganesan: getPngBase64('ganesan')
};

const signaturesMap = {
  ...rawSigs,
  // Role & name aliases for backward compatibility and robust matching
  faculty_coordinator: rawSigs.jeyasundari,
  hod: rawSigs.kesavaraja,
  principal: rawSigs.rajakumaran,
  director: rawSigs.ganesan,
  arulraj: rawSigs.jeyasundari,
  rajakarunakaran: rawSigs.rajakumaran,
  ramesh: rawSigs.ganesan
};

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
  BACKGROUND_IMAGE: ${JSON.stringify(bgImageBase64)},
  BACKGROUND_SVG: ${JSON.stringify(bgSvgDataUrl)},
  SIGNATURES: ${JSON.stringify(signaturesMap, null, 2)}
};

if (!window.RIT_LOGO_BASE64) window.RIT_LOGO_BASE64 = window.CERT_ASSETS.RIT_LOGO;
if (!window.CSBS_LOGO_BASE64) window.CSBS_LOGO_BASE64 = window.CERT_ASSETS.CSBS_LOGO;

${engineCode}

window.RIT_CERT_ASSETS = {
  ...window.CERT_ASSETS,
  drawCertificate: drawRitCertificate,
  createCertificatePdf: createCertificatePdf,
  loadImage: ritLoadImage,
  renderQrCode: ritRenderQrCode,
  getSignatoryAsset: getSignatoryAsset
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ...window.RIT_CERT_ASSETS,
    drawRitCertificate,
    createCertificatePdf,
    getSignatoryAsset
  };
}
`;

fs.writeFileSync('frontend/certificate_assets.js', fileContent, 'utf8');
console.log('✅ Successfully compiled frontend/certificate_assets.js, total size:', fileContent.length);
