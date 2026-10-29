const fs = require('fs');
const path = require('path');

console.log('Building clean frontend/certificate_assets.js...');

// 1. Read existing QR code generator bundle from original file
const origFile = fs.readFileSync(path.join(__dirname, '../frontend/certificate_assets.js'), 'utf8');
const qrMarker = '// 2. Official Branding & Vector Signatures';
const qrIndex = origFile.indexOf(qrMarker);
if (qrIndex === -1) {
  throw new Error('QR code section marker not found in original file');
}
const qrCodeSection = origFile.substring(0, qrIndex);

// 2. Read Assets
const collegeLogoBuf = fs.readFileSync(path.join(__dirname, '../frontend/certificate_logo/college_logo.png'));
const collegeLogoB64 = 'data:image/png;base64,' + collegeLogoBuf.toString('base64');

const csbsLogoBuf = fs.readFileSync(path.join(__dirname, '../frontend/certificate_logo/csbs_logo_clean.png'));
const csbsLogoB64 = 'data:image/png;base64,' + csbsLogoBuf.toString('base64');

const bgBuf = fs.readFileSync(path.join(__dirname, '../frontend/certificate_background.png'));
const bgB64 = 'data:image/png;base64,' + bgBuf.toString('base64');

const sigs = ['jeyasundari', 'rekha', 'ramakrishnan', 'kesavaraja', 'rajakarunakaran', 'ganesan'];
const sigMap = {};
sigs.forEach(s => {
  const buf = fs.readFileSync(path.join(__dirname, '../frontend/signature', s + '.png'));
  sigMap[s] = 'data:image/png;base64,' + buf.toString('base64');
});
// Aliases
sigMap['rajakumaran'] = sigMap['rajakarunakaran'];
sigMap['faculty_coordinator'] = sigMap['jeyasundari'];
sigMap['convenor'] = sigMap['kesavaraja'];
sigMap['patron'] = sigMap['rajakarunakaran'];
sigMap['chief_patron'] = sigMap['ganesan'];

// 3. Assemble Code
const jsCode = `${qrCodeSection}// 2. Official Branding & Vector Signatures
window.CERT_ASSETS = {
  RIT_LOGO: ${JSON.stringify(collegeLogoB64)},
  CSBS_LOGO: ${JSON.stringify(csbsLogoB64)},
  BACKGROUND_IMAGE: ${JSON.stringify(bgB64)},
  SIGNATURES: ${JSON.stringify(sigMap, null, 2)}
};

if (!window.RIT_LOGO_BASE64) window.RIT_LOGO_BASE64 = window.CERT_ASSETS.RIT_LOGO;
if (!window.CSBS_LOGO_BASE64) window.CSBS_LOGO_BASE64 = window.CERT_ASSETS.CSBS_LOGO;

/**
 * Ramco Institute of Technology — High-Fidelity Certificate Rendering Engine
 * Implements exact reference layout: A4 landscape, pale lavender background,
 * double purple-and-gold border, institutional branding, prominent typography,
 * ornamental dividers, 6 handwritten signatures in 4 groups, and plain-text QR code footer.
 */

// 1. Image loader helper
function ritLoadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('[Asset Warning] Failed to load image from source:', src ? src.substring(0, 60) : 'null');
      resolve(null);
    };
    img.src = src;
  });
}

// 2. Direct Canvas QR Code Renderer
function ritRenderQrCode(ctx, text, x, y, size) {
  try {
    const qrLib = (typeof QRCode !== 'undefined' && QRCode.create) ? QRCode : (typeof window !== 'undefined' && window.QRCode && window.QRCode.create ? window.QRCode : null);
    if (!qrLib) {
      console.warn('QRCode library not available for direct render');
      return false;
    }
    const qr = qrLib.create(text, { errorCorrectionLevel: 'M' });
    const numModules = qr.modules.size;
    const margin = 1;
    const totalModules = numModules + margin * 2;
    const cellSize = size / totalModules;

    // Crisp white background card
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 4, y - 4, size + 8, size + 28);

    // Render dark modules
    ctx.fillStyle = '#1E1B4B';
    for (let r = 0; r < numModules; r++) {
      for (let c = 0; c < numModules; c++) {
        if (qr.modules.get(r, c)) {
          ctx.fillRect(
            Math.round(x + (c + margin) * cellSize),
            Math.round(y + (r + margin) * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }
    ctx.restore();
    return true;
  } catch (err) {
    console.warn('Direct QR render exception:', err);
    return false;
  }
}

// 3. Centralized Logo Asset Resolver
function getLogoAsset(type) {
  const norm = String(type || '').toLowerCase().trim();
  if (norm.startsWith('data:image/')) return type;

  // Node.js environment filesystem candidate check
  if (typeof window === 'undefined' && typeof require !== 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      let diskFile = null;
      if (norm.includes('csbs') || norm.includes('dept')) {
        diskFile = 'csbs_logo_clean.png';
      } else {
        diskFile = 'college_logo.png';
      }

      const candidates = [
        path.join(__dirname, 'certificate_logo', diskFile),
        path.join(__dirname, '..', 'frontend', 'certificate_logo', diskFile),
        path.join(__dirname, diskFile),
        path.join(process.cwd(), 'frontend', 'certificate_logo', diskFile),
        path.join(process.cwd(), 'frontend', diskFile),
        path.join(process.cwd(), 'certificate_logo', diskFile)
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          const buf = fs.readFileSync(cand);
          return \`data:image/png;base64,\${buf.toString('base64')}\`;
        }
      }
    } catch (e) {
      console.warn('Node logo file read warning:', e);
    }
  }

  // Fallback to embedded memory assets
  const assets = (typeof window !== 'undefined' && window.CERT_ASSETS)
    ? window.CERT_ASSETS
    : (typeof CERT_ASSETS !== 'undefined' ? CERT_ASSETS : null);

  if (assets) {
    if (norm.includes('csbs') || norm.includes('dept')) {
      return assets.CSBS_LOGO;
    }
    return assets.RIT_LOGO;
  }

  console.error('[Asset Error] Required logo asset for "' + type + '" could not be found.');
  return null;
}

// 4. Centralized Signature Asset Mapper with Full Node / Browser Compatibility
function getSignatoryAsset(keyOrObj) {
  if (!keyOrObj) return null;
  if (typeof keyOrObj === 'object') {
    if (keyOrObj.sig) return getSignatoryAsset(keyOrObj.sig);
    if (keyOrObj.name) return getSignatoryAsset(keyOrObj.name);
  }
  const str = String(keyOrObj).toLowerCase().trim();
  if (str.startsWith('data:image/')) return keyOrObj;

  // In Node.js environment: read directly from frontend/signature/*.png on disk
  if (typeof window === 'undefined' && typeof require !== 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      let diskFile = null;
      if (str.includes('jeya') || str.includes('sundari') || str.includes('sig1') || str === '1') diskFile = 'jeyasundari.png';
      else if (str.includes('rekha') || str.includes('sig2') || str === '2') diskFile = 'rekha.png';
      else if (str.includes('ramakrishnan') || str.includes('rama') || str.includes('sig3') || str === '3') diskFile = 'ramakrishnan.png';
      else if (str.includes('kesavaraja') || str.includes('convenor') || str.includes('sig4') || str === '4') diskFile = 'kesavaraja.png';
      else if (str.includes('rajakarunakaran') || str.includes('rajakumaran') || str.includes('patron') && !str.includes('chief') || str.includes('sig5') || str === '5') diskFile = 'rajakarunakaran.png';
      else if (str.includes('ganesan') || str.includes('chief') || str.includes('sig6') || str === '6') diskFile = 'ganesan.png';

      if (diskFile) {
        const candidates = [
          path.join(__dirname, 'signature', diskFile),
          path.join(__dirname, '..', 'frontend', 'signature', diskFile),
          path.join(process.cwd(), 'frontend', 'signature', diskFile),
          path.join(process.cwd(), 'signature', diskFile)
        ];
        for (const cand of candidates) {
          if (fs.existsSync(cand)) {
            const buf = fs.readFileSync(cand);
            return \`data:image/png;base64,\${buf.toString('base64')}\`;
          }
        }
      }
    } catch (e) {
      console.warn('Node signature file read warning:', e);
    }
  }

  const sigMap = (typeof window !== 'undefined' && window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES)
    ? window.CERT_ASSETS.SIGNATURES
    : (typeof CERT_ASSETS !== 'undefined' && CERT_ASSETS.SIGNATURES ? CERT_ASSETS.SIGNATURES : {});

  // High-fidelity keyword matching for official CSBS signatories
  if (str.includes('jeya') || str.includes('sundari') || str.includes('sig1') || str === '1') {
    return sigMap.jeyasundari || 'signature/jeyasundari.png';
  }
  if (str.includes('rekha') || str.includes('sig2') || str === '2') {
    return sigMap.rekha || 'signature/rekha.png';
  }
  if (str.includes('ramakrishnan') || str.includes('rama') || str.includes('sig3') || str === '3') {
    return sigMap.ramakrishnan || 'signature/ramakrishnan.png';
  }
  if (str.includes('kesavaraja') || str.includes('convenor') || str.includes('sig4') || str === '4') {
    return sigMap.kesavaraja || 'signature/kesavaraja.png';
  }
  if (str.includes('rajakarunakaran') || str.includes('rajakumaran') || str.includes('patron') && !str.includes('chief') || str.includes('sig5') || str === '5') {
    return sigMap.rajakarunakaran || sigMap.rajakumaran || 'signature/rajakarunakaran.png';
  }
  if (str.includes('ganesan') || str.includes('chief') || str.includes('sig6') || str === '6') {
    return sigMap.ganesan || 'signature/ganesan.png';
  }

  if (sigMap[str]) return sigMap[str];

  console.error('[Asset Error] Required signature asset for "' + keyOrObj + '" could not be found.');
  return null;
}

// 5. Vector Ornamental Arabesque Divider for Canvas
function drawCanvasArabesque(ctx, cx, cy, width = 240) {
  const purple = '#581C87';
  const gold = '#C59B27';
  ctx.save();

  function drawDiamond(x, y, rx, ry, fillStyle, strokeStyle, lineWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(x, y - ry);
    ctx.lineTo(x + rx, y);
    ctx.lineTo(x, y + ry);
    ctx.lineTo(x - rx, y);
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  // 5 diamonds matching reference
  drawDiamond(cx - 36, cy, 5, 5, gold);
  drawDiamond(cx + 36, cy, 5, 5, gold);
  drawDiamond(cx - 18, cy, 7, 7, purple);
  drawDiamond(cx + 18, cy, 7, 7, purple);
  drawDiamond(cx, cy, 11, 11, purple, gold, 1.5);

  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 280, cy);
  ctx.lineTo(cx - 50, cy);
  ctx.moveTo(cx + 50, cy);
  ctx.lineTo(cx + 280, cy);
  ctx.stroke();

  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(cx - 282, cy, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + 282, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Helper: Sanitize unicode quotes and en-dashes for jsPDF compatibility
function sanitizePdfText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');
}

// 6. Canvas Renderer matching the reference design
async function drawRitCertificate(canvas, certData = {}, options = {}) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width || 2048;
  const height = canvas.height || 1448;
  canvas.width = width;
  canvas.height = height;

  // 1. High-Fidelity Official Background Asset
  const bgImgSrc = certData.background || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.BACKGROUND_IMAGE : null);
  const bgImg = await ritLoadImage(bgImgSrc);
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#FBF8FF';
    ctx.fillRect(0, 0, width, height);
  }

  // 2. College Logo at Upper Left
  const ritLogoSrc = getLogoAsset('rit_logo');
  const ritLogoImg = await ritLoadImage(ritLogoSrc);
  if (ritLogoImg) {
    const logoH = Math.round(height * 0.117);
    const logoW = Math.round(logoH * (172 / 210));
    ctx.drawImage(ritLogoImg, Math.round(width * 0.061), Math.round(height * 0.067), logoW, logoH);
  }  // 3. Institutional Heading
  let collegeName = sanitizePdfText(certData.college_name || certData.institution || 'RAMCO INSTITUTE OF TECHNOLOGY, RAJAPALAYAM').toUpperCase();
  if (collegeName.includes('DEPARTMENT') || collegeName.includes('CSBS') || !collegeName.includes('RAMCO')) {
    collegeName = 'RAMCO INSTITUTE OF TECHNOLOGY, RAJAPALAYAM';
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 38px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#1A1A40';
  ctx.fillText(collegeName, width / 2, Math.round(height * 0.093));

  ctx.font = 'bold 19px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#B91C1C';
  ctx.fillText('(An Autonomous Institution)', width / 2, Math.round(height * 0.119));

  ctx.font = 'normal 16px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#1F2937';
  ctx.fillText('Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai', width / 2, Math.round(height * 0.141));
  ctx.fillText("NAAC Accredited with 'A+' Grade & An ISO 9001:2015 Certified Institution", width / 2, Math.round(height * 0.162));
  ctx.fillText('NBA Accredited UG Programs: CSE, EEE, MECH, CIVIL, and ECE.', width / 2, Math.round(height * 0.183));

  // 4. CSBS Logo Centered Beneath Header
  const csbsLogoSrc = getLogoAsset('csbs_logo');
  const csbsLogoImg = await ritLoadImage(csbsLogoSrc);
  if (csbsLogoImg) {
    const csbsW = Math.round(width * 0.195);
    const csbsH = Math.round(csbsW / 4.251);
    ctx.drawImage(csbsLogoImg, Math.round((width - csbsW) / 2), Math.round(height * 0.20), csbsW, csbsH);
  }

  // 5. Title
  ctx.font = 'bold 54px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#4A154B';
  ctx.fillText(certData.certificate_title || 'CERTIFICATE OF PARTICIPATION', width / 2, Math.round(height * 0.314));

  // Arabesque divider
  drawCanvasArabesque(ctx, width / 2, Math.round(height * 0.342), 260);

  // 6. Preamble ("This is to certify that" at enlarged size)
  ctx.font = 'normal 40px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#1A1A40';
  ctx.fillText(certData.preamble || 'This is to certify that', width / 2, Math.round(height * 0.398));

  // 7. Recipient Participant Name
  const participantName = certData.participant_name || certData.student_name || 'Mr./Ms. PARTICIPANT NAME';
  let nameFontSize = 66;
  if (participantName.length > 26) nameFontSize = 52;
  if (participantName.length > 36) nameFontSize = 42;
  ctx.font = 'bold italic ' + nameFontSize + 'px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#3B0764';
  ctx.fillText(participantName, width / 2, Math.round(height * 0.474));

  // 8. Description Paragraph: 4-line balanced rendering
  const customWording = (certData.certificate_wording || '').trim();
  const isCustomDescription = customWording && !customWording.includes('Emerging Blockchain Technolo');

  ctx.font = 'normal 26px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#1F2937';
  if (isCustomDescription) {
    ctx.fillText(customWording, width / 2, Math.round(height * 0.58));
  } else {
    const lineY1 = Math.round(height * 0.545);
    const lineY2 = Math.round(height * 0.578);
    const lineY3 = Math.round(height * 0.611);
    const lineY4 = Math.round(height * 0.644);
    ctx.fillText('for active participation in the One Week Online Short-Term Training Programme (STTP) on', width / 2, lineY1);
    ctx.fillText('“Emerging Blockchain Technologies”, organized by the Department of Computer Science and', width / 2, lineY2);
    ctx.fillText('Business Systems (CSBS) at Ramco Institute of Technology, Rajapalayam from', width / 2, lineY3);
    ctx.fillText('October 12, 2026, to October 18, 2026.', width / 2, lineY4);
  }

  // 9. Signatures in 4 Groups with Vertical Separators
  const sigPositions = [
    Math.round(width * 0.121),
    Math.round(width * 0.236),
    Math.round(width * 0.350),
    Math.round(width * 0.495),
    Math.round(width * 0.633),
    Math.round(width * 0.764)
  ];
  const sigLineY = Math.round(height * 0.814);
  const defaultSigRoles = ['jeyasundari', 'rekha', 'ramakrishnan', 'kesavaraja', 'rajakarunakaran', 'ganesan'];
  const defaultSigNames = ['Dr. M. Jeya Sundari', 'Mrs. M. Rekha', 'Mr. M. Rama Krishnan', 'Dr. D. Kesavaraja', 'Dr. S. Rajakarunakaran', 'Dr. L. Ganesan'];

  for (let i = 1; i <= 6; i++) {
    const sigKey = certData['signatory_' + i + '_sig'] || defaultSigRoles[i - 1];
    const sigAsset = getSignatoryAsset(sigKey) || getSignatoryAsset(defaultSigRoles[i - 1]);
    const sigImg = await ritLoadImage(sigAsset);
    const cx = sigPositions[i - 1];

    if (sigImg) {
      const maxW = 120;
      const maxH = 60;
      let w = maxW;
      let h = maxH;
      if (sigImg.naturalWidth && sigImg.naturalHeight) {
        const aspect = sigImg.naturalWidth / sigImg.naturalHeight;
        if (maxW / aspect <= maxH) {
          h = maxW / aspect;
        } else {
          w = maxH * aspect;
        }
      }
      ctx.drawImage(sigImg, cx - w / 2, sigLineY - h - 6, w, h);
    }

    // Baseline Line
    ctx.strokeStyle = '#581C87';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 60, sigLineY);
    ctx.lineTo(cx + 60, sigLineY);
    ctx.stroke();

    // Name
    ctx.font = 'bold 16px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#111827';
    let sName = certData['signatory_' + i + '_name'] || certData['signatory' + i + '_name'] || defaultSigNames[i - 1];
    ctx.fillText(sName, cx, sigLineY + 20);
  }

  // Roles
  ctx.font = 'bold 17px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#4A154B';
  ctx.fillText('Faculty Coordinator(s)', sigPositions[1], sigLineY + 44);
  ctx.fillText('Convenor', sigPositions[3], sigLineY + 44);
  ctx.fillText('Patron', sigPositions[4], sigLineY + 44);
  ctx.fillText('Chief Patron', sigPositions[5], sigLineY + 44);

  // Vertical Separators
  ctx.strokeStyle = '#C59B27';
  ctx.lineWidth = 1.6;
  [Math.round(width * 0.423), Math.round(width * 0.564), Math.round(width * 0.699)].forEach(sepX => {
    ctx.beginPath();
    ctx.moveTo(sepX, sigLineY - 42);
    ctx.lineTo(sepX, sigLineY + 46);
    ctx.stroke();
  });

  // 10. Dedicated Plain-Text QR Code in Bottom Right Area
  const certId = certData.certificate_number || certData.certificate_id || 'RITCB 01 0001';
  const qrX = Math.round(width * 0.868);
  const qrY = Math.round(height * 0.764);
  const qrSize = Math.round(width * 0.079);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 42);

  // Render QR
  ritRenderQrCode(ctx, certId, qrX, qrY, qrSize);

  // Place Certificate ID cleanly underneath the QR code
  ctx.font = 'bold 16px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.fillText(certId, qrX + qrSize / 2, qrY + qrSize + 22);

  return canvas;
}

// 7. Universal jsPDF Generator matching exact reference layout
async function createCertificatePdf(certData = {}) {
  let jsPDFClass = null;
  if (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) {
    jsPDFClass = window.jspdf.jsPDF;
  } else if (typeof require !== 'undefined') {
    try {
      const mod = require('jspdf');
      jsPDFClass = mod.jsPDF || mod;
    } catch (e) {}
  }
  if (!jsPDFClass) {
    throw new Error('jsPDF library not available in runtime.');
  }

  const doc = new jsPDFClass({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // 1. Full-Bleed Decorative Background Asset
  const bgData = certData.background || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.BACKGROUND_IMAGE : null);
  if (bgData) {
    try {
      doc.addImage(bgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    } catch (e) {
      console.warn('BG embed warning:', e);
    }
  } else {
    doc.setFillColor(251, 248, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  }

  // Color Palette matching reference
  const purple = [88, 28, 135];       // #581C87
  const gold = [197, 155, 39];        // #C59B27
  const maroon = [185, 28, 28];       // #B91C1C
  const darkNavy = [26, 26, 64];      // #1A1A40
  const deepPurple = [59, 7, 100];    // #3B0764
  const darkGrey = [31, 41, 55];      // #1F2937

  // 2. Approved College Logo at Upper Left
  const ritLogo = getLogoAsset('rit_logo');
  if (ritLogo) {
    try {
      const logoH = 24.5;
      const logoW = logoH * (172 / 210); // 20.0mm
      doc.addImage(ritLogo, 'PNG', 15.0, 14.0, logoW, logoH);
    } catch (e) {
      console.error('[Asset Error] RIT logo embed failed:', e);
    }
  }

  // 3. Centered Institutional Heading Area
  let collegeName = sanitizePdfText(certData.college_name || certData.institution || 'RAMCO INSTITUTE OF TECHNOLOGY, RAJAPALAYAM').toUpperCase();
  if (collegeName.includes('DEPARTMENT') || collegeName.includes('CSBS') || !collegeName.includes('RAMCO')) {
    collegeName = 'RAMCO INSTITUTE OF TECHNOLOGY, RAJAPALAYAM';
  }
  doc.setFont('times', 'bold');
  doc.setFontSize(21.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(collegeName, pageWidth / 2, 22.8, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(maroon[0], maroon[1], maroon[2]);
  doc.text(sanitizePdfText(certData.autonomous_text || '(An Autonomous Institution)'), pageWidth / 2, 29.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
  doc.text(sanitizePdfText(certData.approval_text || 'Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai'), pageWidth / 2, 35.5, { align: 'center' });
  doc.text(sanitizePdfText(certData.naac_text || "NAAC Accredited with 'A+' Grade & An ISO 9001:2015 Certified Institution"), pageWidth / 2, 41.2, { align: 'center' });
  doc.text(sanitizePdfText(certData.nba_text || 'NBA Accredited UG Programs: CSE, EEE, MECH, CIVIL, and ECE.'), pageWidth / 2, 46.8, { align: 'center' });

  // 4. CSBS Logo Centered Beneath Accreditation Details
  const csbsLogo = getLogoAsset('csbs_logo');
  if (csbsLogo) {
    try {
      const csbsW = 92.0;
      const csbsH = csbsW / 4.251; // 21.6mm
      const csbsX = (pageWidth - csbsW) / 2;
      doc.addImage(csbsLogo, 'PNG', csbsX, 52.0, csbsW, csbsH);
    } catch (e) {
      console.error('[Asset Error] CSBS logo embed failed:', e);
    }
  }

  // 5. Title
  doc.setFont('times', 'bold');
  doc.setFontSize(34.0);
  doc.setTextColor(74, 21, 75);
  doc.text(sanitizePdfText(certData.certificate_title || 'CERTIFICATE OF PARTICIPATION').toUpperCase(), pageWidth / 2, 86.0, { align: 'center' });

  // Arabesque divider matching exact reference (5 diamonds)
  function drawRefArabesque(cx, cy, width = 120) {
    const half = width / 2;
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.45);

    // Left and right horizontal gold lines with end circles
    doc.line(cx - half, cy, cx - 18, cy);
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.circle(cx - half - 0.6, cy, 0.5, 'F');

    doc.line(cx + 18, cy, cx + half, cy);
    doc.circle(cx + half + 0.6, cy, 0.5, 'F');

    function drawDiamond(x, y, r, fillCol, strokeCol = null, strokeW = 0.3) {
      doc.setFillColor(fillCol[0], fillCol[1], fillCol[2]);
      if (strokeCol) {
        doc.setDrawColor(strokeCol[0], strokeCol[1], strokeCol[2]);
        doc.setLineWidth(strokeW);
        doc.lines([[r, r], [-r, r], [-r, -r], [r, -r]], x - r, y, [1, 1], 'FD', true);
      } else {
        doc.lines([[r, r], [-r, r], [-r, -r], [r, -r]], x - r, y, [1, 1], 'F', true);
      }
    }

    // 5 diamonds
    drawDiamond(cx - 14, cy, 1.5, gold);
    drawDiamond(cx + 14, cy, 1.5, gold);
    drawDiamond(cx - 7, cy, 2.2, purple);
    drawDiamond(cx + 7, cy, 2.2, purple);
    drawDiamond(cx, cy, 3.2, purple, gold, 0.45);
  }
  drawRefArabesque(pageWidth / 2, 93.0, 120);

  // 6. Preamble: 'This is to certify that'
  doc.setFont('times', 'normal');
  doc.setFontSize(21.0);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(sanitizePdfText(certData.preamble || 'This is to certify that'), pageWidth / 2, 104.5, { align: 'center' });

  // 7. Participant Name (Dynamic)
  const participantName = sanitizePdfText(certData.participant_name || certData.student_name || 'Mr./Ms. PARTICIPANT NAME');
  doc.setFont('times', 'bolditalic');
  let nameSize = 34.0;
  if (participantName.length > 26) nameSize = 28.0;
  if (participantName.length > 36) nameSize = 22.0;
  doc.setFontSize(nameSize);
  doc.setTextColor(deepPurple[0], deepPurple[1], deepPurple[2]);
  doc.text(participantName, pageWidth / 2, 119.5, { align: 'center' });

  // 8. Event Description Paragraph (Exact 17.0 pt font size matching reference)
  function renderStyledLine(segments, y, spaceGap = 1.8) {
    const computed = segments.map(seg => {
      doc.setFont(seg.font, seg.style);
      doc.setFontSize(seg.size);
      const cleanText = sanitizePdfText(seg.text).trim();
      let w = doc.getTextWidth(cleanText);
      if (seg.font === 'times' && (seg.style === 'bold' || seg.style === 'bolditalic')) {
        w += 0.8;
      }
      return { ...seg, cleanText, width: w };
    });

    const totalGaps = (segments.length - 1) * spaceGap;
    let totalW = computed.reduce((sum, s) => sum + s.width, 0) + totalGaps;
    let startX = (pageWidth - totalW) / 2;

    for (const seg of computed) {
      doc.setFont(seg.font, seg.style);
      doc.setFontSize(seg.size);
      doc.setTextColor(seg.color[0], seg.color[1], seg.color[2]);
      doc.text(seg.cleanText, startX, y);
      startX += seg.width + spaceGap;
    }
  }

  const customWording = (certData.certificate_wording || '').trim();
  const isCustomDescription = customWording && !customWording.includes('Emerging Blockchain Technolo');

  if (isCustomDescription) {
    const wrappedLines = doc.splitTextToSize(customWording, 240);
    let startY = 132.5;
    doc.setFont('times', 'normal');
    doc.setFontSize(15.0);
    doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
    wrappedLines.forEach((ln, idx) => {
      doc.text(ln, pageWidth / 2, startY + (idx * 8.0), { align: 'center' });
    });
  } else {
    const pSize = 17.0;
    const progTitle = 'One Week Online Short-Term Training Programme (STTP)';
    let eventTopic = certData.event_name || 'Emerging Blockchain Technologies';
    if (eventTopic.includes('Emerging Blockchain')) {
      eventTopic = 'Emerging Blockchain Technologies';
    }
    const orgDept = 'Department of Computer Science and';
    const orgInst = 'Ramco Institute of Technology, Rajapalayam';
    const dates = 'October 12, 2026, to October 18, 2026.';

    renderStyledLine([
      { text: 'for active participation in the', font: 'times', style: 'normal', size: pSize, color: darkGrey },
      { text: progTitle, font: 'times', style: 'bold', size: pSize, color: deepPurple },
      { text: 'on', font: 'times', style: 'normal', size: pSize, color: darkGrey }
    ], 132.5, 2.4);

    renderStyledLine([
      { text: '“' + eventTopic + '”,', font: 'times', style: 'bold', size: pSize, color: deepPurple },
      { text: 'organized by the', font: 'times', style: 'normal', size: pSize, color: darkGrey },
      { text: orgDept, font: 'times', style: 'bold', size: pSize, color: deepPurple }
    ], 141.0, 2.4);

    renderStyledLine([
      { text: 'Business Systems (CSBS)', font: 'times', style: 'bold', size: pSize, color: deepPurple },
      { text: 'at', font: 'times', style: 'normal', size: pSize, color: darkGrey },
      { text: orgInst, font: 'times', style: 'bold', size: pSize, color: deepPurple },
      { text: 'from', font: 'times', style: 'normal', size: pSize, color: darkGrey }
    ], 149.5, 2.4);

    renderStyledLine([
      { text: dates, font: 'times', style: 'bold', size: pSize, color: deepPurple }
    ], 157.5, 2.4);
  }

  // 9. Signatures Section with all 6 authentic handwritten signatures
  const sigLineY = 174.0;
  const sigPositions = [30.2, 68.3, 108.5, 152.6, 188.5, 235.1];
  const defaultSigRoles = ['jeyasundari', 'rekha', 'ramakrishnan', 'kesavaraja', 'rajakarunakaran', 'ganesan'];

  function renderSigBlock(sigKey, cx, name, lineWidth = 30) {
    const asset = getSignatoryAsset(sigKey);
    if (asset) {
      try {
        const props = doc.getImageProperties(asset);
        const maxW = 28;
        const maxH = 13.5;
        let w = maxW;
        let h = maxH;
        if (props && props.width && props.height) {
          const aspect = props.width / props.height;
          if (maxW / aspect <= maxH) {
            h = maxW / aspect;
          } else {
            w = maxH * aspect;
          }
        }
        doc.addImage(asset, 'PNG', cx - w / 2, sigLineY - h - 1.2, w, h);
      } catch (e) {
        console.error('[Asset Error] Signature image embed failed for ' + name + ':', e);
      }
    } else {
      console.error('[Asset Error] Signature asset missing for ' + name + ' (' + sigKey + ')');
    }

    // Baseline Line
    doc.setDrawColor(purple[0], purple[1], purple[2]);
    doc.setLineWidth(0.45);
    doc.line(cx - lineWidth / 2, sigLineY, cx + lineWidth / 2, sigLineY);

    // Name
    doc.setFont('times', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(17, 24, 39);
    doc.text(sanitizePdfText(name), cx, sigLineY + 5.0, { align: 'center' });
  }

  function drawVerticalSep(x) {
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.45);
    doc.line(x, sigLineY - 10, x, sigLineY + 11.5);
  }

  // 1, 2, 3: Faculty Coordinators
  const sig1Name = certData.signatory_1_name || certData.signatory1_name || 'Dr. M. Jeya Sundari';
  const sig2Name = certData.signatory_2_name || certData.signatory2_name || 'Mrs. M. Rekha';
  const sig3Name = certData.signatory_3_name || certData.signatory3_name || 'Mr. M. Rama Krishnan';

  renderSigBlock(certData.signatory_1_sig || defaultSigRoles[0], sigPositions[0], sig1Name, 31);
  renderSigBlock(certData.signatory_2_sig || defaultSigRoles[1], sigPositions[1], sig2Name, 29);
  renderSigBlock(certData.signatory_3_sig || defaultSigRoles[2], sigPositions[2], sig3Name, 36);

  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Faculty Coordinator(s)', sigPositions[1], sigLineY + 11.0, { align: 'center' });

  // Separator 1
  drawVerticalSep(129.5);

  // 4: Convenor
  const sig4Name = certData.signatory_4_name || certData.signatory4_name || 'Dr. D. Kesavaraja';
  renderSigBlock(certData.signatory_4_sig || defaultSigRoles[3], sigPositions[3], sig4Name, 29);
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Convenor', sigPositions[3], sigLineY + 11.0, { align: 'center' });

  // Separator 2
  drawVerticalSep(171.8);

  // 5: Patron
  const sig5Name = certData.signatory_5_name || certData.signatory5_name || 'Dr. S. Rajakarunakaran';
  renderSigBlock(certData.signatory_5_sig || defaultSigRoles[4], sigPositions[4], sig5Name, 25);
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Patron', sigPositions[4], sigLineY + 11.0, { align: 'center' });

  // Separator 3
  drawVerticalSep(211.5);

  // 6: Chief Patron
  const sig6Name = certData.signatory_6_name || certData.signatory6_name || 'Dr. L. Ganesan';
  renderSigBlock(certData.signatory_6_sig || defaultSigRoles[5], sigPositions[5], sig6Name, 31);
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Chief Patron', sigPositions[5], sigLineY + 11.0, { align: 'center' });

  // 10. QR Code in Bottom Right Area
  const certId = certData.certificate_number || certData.certificate_id || 'RITCB 01 0001';
  const qrTarget = certId;

  const qrX = 255.5;
  const qrY = 162.0;
  const qrSize = 23.0;

  let qrDataUrl = null;
  if (typeof QRCode !== 'undefined' && typeof QRCode.toDataURL === 'function') {
    try {
      qrDataUrl = await QRCode.toDataURL(qrTarget, { width: 140, margin: 0 });
    } catch (e) {}
  }
  if (!qrDataUrl && typeof require !== 'undefined') {
    try {
      const qrMod = require('qrcode');
      qrDataUrl = await qrMod.toDataURL(qrTarget, { width: 140, margin: 0 });
    } catch (e) {}
  }
  if (!qrDataUrl && typeof window !== 'undefined' && window.QRCode && window.QRCode.toDataURL) {
    try {
      qrDataUrl = await window.QRCode.toDataURL(qrTarget, { width: 140, margin: 0 });
    } catch (e) {}
  }

  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.rect(qrX - 2.0, qrY - 2.0, qrSize + 4.0, qrSize + 9.5, 'F');
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Certificate ID capsule outline underneath QR
    const capsuleW = qrSize + 2.0;
    const capsuleH = 4.8;
    const capsuleX = qrX + (qrSize - capsuleW) / 2;
    const capsuleY = qrY + qrSize + 1.2;

    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.3);
    doc.roundedRect(capsuleX, capsuleY, capsuleW, capsuleH, 1.0, 1.0, 'S');

    doc.setFont('times', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(17, 24, 39);
    doc.text(certId, qrX + qrSize / 2, capsuleY + 3.4, { align: 'center' });
  }

  return doc;
}

window.RIT_CERT_ASSETS = {
  ...window.CERT_ASSETS,
  drawCertificate: drawRitCertificate,
  drawRitCertificate: drawRitCertificate,
  createCertificatePdf: createCertificatePdf,
  loadImage: ritLoadImage,
  renderQrCode: ritRenderQrCode,
  getLogoAsset: getLogoAsset,
  getSignatoryAsset: getSignatoryAsset
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ...window.RIT_CERT_ASSETS,
    drawRitCertificate,
    createCertificatePdf,
    getLogoAsset,
    getSignatoryAsset
  };
}
`;

fs.writeFileSync(path.join(__dirname, '../frontend/certificate_assets.js'), jsCode, 'utf8');
console.log('Successfully wrote updated frontend/certificate_assets.js!');
