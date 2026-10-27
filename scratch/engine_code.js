/**
 * Ramco Institute of Technology — High-Fidelity Certificate Rendering Engine
 * Implements exact reference layout: A4 landscape, pale lavender background,
 * double purple border, institutional branding, purple typography, ornamental dividers,
 * 6 signatures in 4 groups, and verifiable QR code footer.
 */

// 1. Image loader helper
function ritLoadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
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
    ctx.fillRect(x - 4, y - 4, size + 8, size + 24);

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

    // QR Caption
    ctx.fillStyle = '#581C87';
    ctx.font = 'bold 11px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN TO VERIFY', x + size / 2, y + size + 14);
    ctx.restore();
    return true;
  } catch (err) {
    console.warn('Direct QR render exception:', err);
    return false;
  }
}

// 3. Centralized Signature Asset Mapper & Configuration Warning
function getSignatoryAsset(keyOrObj) {
  if (!keyOrObj) return null;
  if (typeof keyOrObj === 'object') {
    if (keyOrObj.sig) return getSignatoryAsset(keyOrObj.sig);
    if (keyOrObj.name) return getSignatoryAsset(keyOrObj.name);
  }
  const str = String(keyOrObj).toLowerCase().trim();
  if (str.startsWith('data:image/')) return keyOrObj;

  const sigMap = (typeof window !== 'undefined' && window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES)
    ? window.CERT_ASSETS.SIGNATURES
    : (typeof CERT_ASSETS !== 'undefined' ? CERT_ASSETS.SIGNATURES : {});

  if (str.includes('jeya') || str.includes('sundari')) return sigMap.jeyasundari || 'signature/jeyasundari.png';
  if (str.includes('rekha')) return sigMap.rekha || 'signature/rekha.png';
  if (str.includes('ramakrishnan')) return sigMap.ramakrishnan || 'signature/ramakrishnan.png';
  if (str.includes('kesavaraja')) return sigMap.kesavaraja || 'signature/kesavaraja.png';
  if (str.includes('rajakumaran')) return sigMap.rajakumaran || 'signature/rajakumaran.png';
  if (str.includes('ganesan')) return sigMap.ganesan || 'signature/ganesan.png';

  // Role keyword fallbacks
  if (str.includes('convenor')) return sigMap.kesavaraja || 'signature/kesavaraja.png';
  if (str.includes('patron') && !str.includes('chief')) return sigMap.rajakumaran || 'signature/rajakumaran.png';
  if (str.includes('chief')) return sigMap.ganesan || 'signature/ganesan.png';

  console.warn(`[Configuration Warning] Required signature asset for "${keyOrObj}" is missing from repository assets. Please verify approved signatory configuration.`);
  return null;
}

// 4. Vector Ornamental Arabesque Divider for Canvas
function drawCanvasArabesque(ctx, cx, cy, width = 240, color = '#581C87') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6;

  // Center floral diamond cluster
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - 9, cy, 2, 0, Math.PI * 2);
  ctx.arc(cx + 9, cy, 2, 0, Math.PI * 2);
  ctx.arc(cx, cy - 7, 2, 0, Math.PI * 2);
  ctx.arc(cx, cy + 7, 2, 0, Math.PI * 2);
  ctx.fill();

  // Small petal loops
  ctx.beginPath();
  ctx.arc(cx - 20, cy - 3, 2.5, 0, Math.PI * 2);
  ctx.arc(cx - 20, cy + 3, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + 20, cy - 3, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + 20, cy + 3, 2.5, 0, Math.PI * 2);
  ctx.stroke();

  // Horizontal tapered wing lines
  ctx.beginPath();
  ctx.moveTo(cx - 110, cy);
  ctx.lineTo(cx - 22, cy);
  ctx.moveTo(cx + 22, cy);
  ctx.lineTo(cx + 110, cy);
  ctx.stroke();

  // End terminal dots
  ctx.beginPath();
  ctx.arc(cx - 110, cy, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + 110, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 5. Canvas Renderer matching the reference design
async function drawRitCertificate(canvas, certData = {}, options = {}) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width || 2000;
  const height = canvas.height || 1414;
  canvas.width = width;
  canvas.height = height;

  // 1. Background
  const bgImgSrc = certData.background || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.BACKGROUND_IMAGE || window.CERT_ASSETS.BACKGROUND_SVG : null) || 'certificate_background.png';
  const bgImg = await ritLoadImage(bgImgSrc);
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#FBF8FF';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#581C87';
    ctx.lineWidth = 4;
    ctx.strokeRect(44, 32, width - 88, height - 64);
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 48, width - 120, height - 96);
  }

  // 2. Approved RIT Logo at Upper Left
  const ritLogoSrc = certData.rit_logo || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.RIT_LOGO : null) || 'rit_logo.png';
  const ritImg = await ritLoadImage(ritLogoSrc);
  if (ritImg) {
    ctx.drawImage(ritImg, 110, 95, 160, 160);
  }

  // 3. Centered Institutional Heading
  ctx.textAlign = 'center';
  ctx.font = 'bold 36px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#111827';
  ctx.fillText('RAMCO INSTITUTE OF TECHNOLOGY', width / 2, 120);

  ctx.font = 'normal 19px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#B91C1C';
  ctx.fillText('(An autonomous Institution)', width / 2, 150);

  ctx.font = 'normal 16px "Times New Roman", Georgia, serif';
  ctx.fillText('Approved by AICTE,New Delhi &Affiliated to Anna University', width / 2, 176);

  ctx.font = 'bold 16px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#111827';
  ctx.fillText("NAAC Accredited with 'A+' Grade & An ISO 9001: 2015 Certified Institution", width / 2, 202);

  ctx.font = 'normal 16px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#B91C1C';
  ctx.fillText('NBA Accredited UG Programs: CSE,EEE, and MECH.', width / 2, 228);

  // 4. Approved CSBS Department Logo Centered Beneath Institutional Heading
  const csbsLogoSrc = certData.csbs_logo || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.CSBS_LOGO : null) || 'csbs_logo_clean.png';
  const csbsImg = await ritLoadImage(csbsLogoSrc);
  if (csbsImg) {
    ctx.drawImage(csbsImg, width / 2 - 150, 248, 300, 75);
  }

  // 5. Certificate Heading
  ctx.font = 'bold 44px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#4A154B';
  ctx.fillText(certData.certificate_title || 'CERTIFICATE OF PARTICIPATION', width / 2, 368);

  // Ornamental floral divider below title
  drawCanvasArabesque(ctx, width / 2, 396, 260, '#581C87');

  // 6. Recipient Section
  ctx.font = 'normal 23px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#1F2937';
  ctx.fillText(certData.preamble || 'This certificate is presented to', width / 2, 448);

  // Recipient Student Name
  const studentName = certData.student_name || 'Keerthana Mohan';
  let nameFontSize = 56;
  if (studentName.length > 28) nameFontSize = 46;
  if (studentName.length > 38) nameFontSize = 38;
  ctx.font = `bold italic ${nameFontSize}px "Times New Roman", Georgia, serif`;
  ctx.fillStyle = '#3B0764';
  ctx.fillText(studentName, width / 2, 524);

  // Ornamental floral divider below recipient name
  drawCanvasArabesque(ctx, width / 2, 552, 260, '#581C87');

  // 7. Event Description Paragraph
  const pY = 604;
  const lineSpacing = 36;
  ctx.font = 'normal 20px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#1F2937';

  // Wording lines matching reference
  ctx.fillText('for active and enthusiastic participation in the One Week Short-Term Training Programme (STTP) on', width / 2, pY);
  ctx.font = 'bold 21px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#4A154B';
  ctx.fillText('“Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives”, organized', width / 2, pY + lineSpacing);
  ctx.fillText('by the Department of Computer Science and Business Systems at Ramco Institute of Technology,', width / 2, pY + lineSpacing * 2);
  ctx.fillText('Rajapalayam from October 12, 2026, to October 18, 2026.', width / 2, pY + lineSpacing * 3);

  // 8. Exactly Six Signatures in Four Sections
  const sigLineY = 925;
  const sigCenters = [225, 460, 695, 980, 1295, 1610];
  const sigConfigs = [
    { name: certData.signatory_1_name || 'Dr. M. Jeya Sundari', key: 'jeyasundari' },
    { name: certData.signatory_2_name || 'M. Rekha', key: 'rekha' },
    { name: certData.signatory_3_name || 'M. Ramakrishnan', key: 'ramakrishnan' },
    { name: certData.signatory_4_name || 'Dr. D. Kesavaraja', role: 'Convenor', key: 'kesavaraja' },
    { name: certData.signatory_5_name || 'Dr. S. Rajakumaran', role: 'Patron', key: 'rajakumaran' },
    { name: certData.signatory_6_name || 'Dr. L. Ganesan', role: 'Chief Patron', key: 'ganesan' }
  ];

  for (let i = 0; i < 6; i++) {
    const cx = sigCenters[i];
    const item = sigConfigs[i];
    const sigSrc = getSignatoryAsset(certData[`signatory_${i + 1}_sig`] || item.key);
    const sigImg = await ritLoadImage(sigSrc);
    if (sigImg) {
      const maxW = 175;
      const maxH = 80;
      let w = maxW;
      let h = maxH;
      if (sigImg.width && sigImg.height) {
        const aspect = sigImg.width / sigImg.height;
        if (maxW / aspect <= maxH) {
          h = maxW / aspect;
        } else {
          w = maxH * aspect;
        }
      }
      ctx.drawImage(sigImg, cx - w / 2, sigLineY - h - 6, w, h);
    }

    // Underline
    ctx.strokeStyle = '#581C87';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 90, sigLineY);
    ctx.lineTo(cx + 90, sigLineY);
    ctx.stroke();

    // Name
    ctx.font = 'bold 18px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.fillText(item.name, cx, sigLineY + 30);
  }

  // Group 1 label: "Faculty Coordinators"
  ctx.font = 'bold 19px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#2E1065';
  ctx.fillText('Faculty Coordinators', 460, sigLineY + 75);

  // Group 2 label: "Convenor"
  ctx.fillText('Convenor', 980, sigLineY + 75);

  // Group 3 label: "Patron"
  ctx.fillText('Patron', 1295, sigLineY + 75);

  // Group 4 label: "Chief Patron"
  ctx.fillText('Chief Patron', 1610, sigLineY + 75);

  // 9. QR Code at Bottom-Right
  const certId = certData.certificate_number || certData.certificate_id || 'RIT-STTP-2026-0001';
  const qrTarget = certData.verification_url || ((typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://rit-csbs-portal.vercel.app') + '/verify-certificate.html?id=' + encodeURIComponent(certId);
  ritRenderQrCode(ctx, qrTarget, 1780, 900, 115);

  // 10. Unique Certificate ID Footer
  ctx.font = 'normal 17px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#4B5563';
  ctx.fillText('Certificate ID: ' + certId, width / 2, 1330);

  return canvas;
}

// 6. Universal jsPDF Generator matching exact reference layout
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

  // 1. Decorative Background Asset (Pale Lavender + Wave Patterns + Double Purple Border + Corners)
  const bgData = certData.background || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.BACKGROUND_IMAGE || window.CERT_ASSETS.BACKGROUND_SVG : null);
  if (bgData) {
    try {
      doc.addImage(bgData, 'PNG', 0, 0, pageWidth, pageHeight);
    } catch (e) {
      console.warn('BG embed warning:', e);
    }
  } else {
    // Elegant vector fallback
    doc.setFillColor(251, 248, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setDrawColor(88, 28, 135);
    doc.setLineWidth(0.8);
    doc.rect(6.5, 5.0, pageWidth - 13, pageHeight - 10);
    doc.setLineWidth(0.4);
    doc.rect(8.8, 7.3, pageWidth - 17.6, pageHeight - 14.6);
  }

  // 2. Approved RIT Logo at Upper Left
  const ritLogo = certData.rit_logo || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.RIT_LOGO : null);
  if (ritLogo) {
    try {
      doc.addImage(ritLogo, 'PNG', 16, 14, 24, 24);
    } catch (e) {
      console.warn('RIT logo embed warning:', e);
    }
  }

  // 3. Centered Institutional Heading
  doc.setFont('times', 'bold');
  doc.setFontSize(16.5);
  doc.setTextColor(26, 26, 64);
  doc.text('RAMCO INSTITUTE OF TECHNOLOGY', pageWidth / 2, 17.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28);
  doc.text('(An autonomous Institution)', pageWidth / 2, 22.0, { align: 'center' });

  doc.setFontSize(7.2);
  doc.text('Approved by AICTE,New Delhi &Affiliated to Anna University', pageWidth / 2, 25.8, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(17, 24, 39);
  doc.text("NAAC Accredited with 'A+' Grade & An ISO 9001: 2015 Certified Institution", pageWidth / 2, 29.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(185, 28, 28);
  doc.text('NBA Accredited UG Programs: CSE,EEE, and MECH.', pageWidth / 2, 33.2, { align: 'center' });

  // 4. Approved CSBS Department Logo Centered Beneath Institutional Heading
  const csbsLogo = certData.csbs_logo || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.CSBS_LOGO : null);
  if (csbsLogo) {
    try {
      doc.addImage(csbsLogo, 'PNG', pageWidth / 2 - 22, 36.5, 44, 11);
    } catch (e) {
      console.warn('CSBS logo embed warning:', e);
    }
  }

  // 5. Certificate Heading
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(74, 21, 75);
  doc.text((certData.certificate_title || 'CERTIFICATE OF PARTICIPATION').toUpperCase(), pageWidth / 2, 54.5, { align: 'center' });

  // Helper for Ornamental floral divider
  function drawArabesque(doc, cx, cy) {
    doc.setDrawColor(88, 28, 135);
    doc.setFillColor(88, 28, 135);
    doc.setLineWidth(0.35);

    doc.circle(cx, cy, 0.9, 'F');
    doc.circle(cx - 2.5, cy, 0.5, 'F');
    doc.circle(cx + 2.5, cy, 0.5, 'F');
    doc.circle(cx, cy - 2, 0.5, 'F');
    doc.circle(cx, cy + 2, 0.5, 'F');

    doc.line(cx - 32, cy, cx - 4.5, cy);
    doc.line(cx + 4.5, cy, cx + 32, cy);
    doc.circle(cx - 32, cy, 0.5, 'F');
    doc.circle(cx + 32, cy, 0.5, 'F');

    doc.circle(cx - 6, cy - 1, 0.4, 'S');
    doc.circle(cx - 6, cy + 1, 0.4, 'S');
    doc.circle(cx + 6, cy - 1, 0.4, 'S');
    doc.circle(cx + 6, cy + 1, 0.4, 'S');
  }

  drawArabesque(doc, pageWidth / 2, 58.5);

  // 6. Recipient Section
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(31, 41, 55);
  doc.text(certData.preamble || 'This certificate is presented to', pageWidth / 2, 66.0, { align: 'center' });

  const studentName = certData.student_name || 'Keerthana Mohan';
  doc.setFont('times', 'bolditalic');
  let nameSize = 25;
  if (studentName.length > 28) nameSize = 20;
  if (studentName.length > 38) nameSize = 16;
  doc.setFontSize(nameSize);
  doc.setTextColor(59, 7, 100);
  doc.text(studentName, pageWidth / 2, 77.0, { align: 'center' });

  drawArabesque(doc, pageWidth / 2, 81.5);

  // 7. Event Description Paragraph
  const pY = 89.0;
  const lineSpacing = 5.2;

  function renderStyledLine(doc, segments, y, spaceGap = 1.6) {
    const computed = segments.map(seg => {
      doc.setFont(seg.font, seg.style);
      doc.setFontSize(seg.size);
      const cleanText = seg.text.trim();
      let w = doc.getTextWidth(cleanText);
      if (seg.font === 'times' && (seg.style === 'bold' || seg.style === 'bolditalic')) {
        w += 0.8;
      }
      return { ...seg, cleanText, width: w };
    });

    const totalGaps = (segments.length - 1) * spaceGap;
    let totalW = computed.reduce((sum, s) => sum + s.width, 0) + totalGaps;

    // Auto-scale font if text width exceeds printable area
    const maxAllowedWidth = 246;
    let effectiveGap = spaceGap;
    if (totalW > maxAllowedWidth) {
      const scaleFactor = maxAllowedWidth / totalW;
      effectiveGap = spaceGap * scaleFactor;
      computed.forEach(seg => {
        seg.size *= scaleFactor;
        doc.setFont(seg.font, seg.style);
        doc.setFontSize(seg.size);
        seg.width = doc.getTextWidth(seg.cleanText) + (seg.font === 'times' && (seg.style === 'bold' || seg.style === 'bolditalic') ? 0.6 : 0);
      });
      totalW = computed.reduce((sum, s) => sum + s.width, 0) + (segments.length - 1) * effectiveGap;
    }

    let curX = (pageWidth - totalW) / 2;
    computed.forEach((seg, i) => {
      doc.setFont(seg.font, seg.style);
      doc.setFontSize(seg.size);
      doc.setTextColor(seg.color[0], seg.color[1], seg.color[2]);
      doc.text(seg.cleanText, curX, y);
      curX += seg.width + (i < computed.length - 1 ? effectiveGap : 0);
    });
  }

  const cBlack = [31, 41, 55];
  const cPurple = [74, 21, 75];

  let collStr = (certData.college_name || 'Ramco Institute of Technology').replace(/,\s*Rajapalayam.*$/i, '').trim();
  let evName = (certData.event_name || 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives').replace(/^["“”]/, '').replace(/["“”]$/, '').trim();

  renderStyledLine(doc, [
    { text: 'for active and enthusiastic participation in the', font: 'times', style: 'normal', size: 9.2, color: cBlack },
    { text: certData.programme_title || 'One Week Short-Term Training Programme (STTP)', font: 'times', style: 'bold', size: 9.2, color: cPurple },
    { text: 'on', font: 'times', style: 'normal', size: 9.2, color: cBlack }
  ], pY);

  renderStyledLine(doc, [
    { text: '"' + evName + '",', font: 'times', style: 'bold', size: 9.4, color: cPurple },
    { text: 'organized', font: 'times', style: 'normal', size: 9.2, color: cBlack }
  ], pY + lineSpacing);

  renderStyledLine(doc, [
    { text: 'by the', font: 'times', style: 'normal', size: 9.2, color: cBlack },
    { text: certData.department || 'Department of Computer Science and Business Systems', font: 'times', style: 'bold', size: 9.2, color: cPurple },
    { text: 'at', font: 'times', style: 'normal', size: 9.2, color: cBlack },
    { text: collStr + ',', font: 'times', style: 'bold', size: 9.2, color: cPurple }
  ], pY + lineSpacing * 2);

  renderStyledLine(doc, [
    { text: 'Rajapalayam from', font: 'times', style: 'normal', size: 9.2, color: cBlack },
    { text: (certData.programme_dates || 'October 12, 2026, to October 18, 2026').replace(/\.$/, '') + '.', font: 'times', style: 'bold', size: 9.2, color: cPurple }
  ], pY + lineSpacing * 3);

  // 8. Exactly Six Signatures Grouped into Four Visual Sections
  const sigLineY = 137.0;
  const purple = [88, 28, 135];

  function renderSigBlock(doc, sigSrc, cx, name) {
    const asset = getSignatoryAsset(sigSrc);
    if (asset) {
      try {
        const props = doc.getImageProperties(asset);
        const maxW = 26;
        const maxH = 12;
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
        doc.addImage(asset, 'PNG', cx - w / 2, sigLineY - h - 1, w, h);
      } catch (e) {
        console.warn('Sig render warning for', name, e);
      }
    }

    // Underline
    doc.setDrawColor(purple[0], purple[1], purple[2]);
    doc.setLineWidth(0.35);
    doc.line(cx - 13, sigLineY, cx + 13, sigLineY);

    // Name
    doc.setFont('times', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(17, 24, 39);
    doc.text(name, cx, sigLineY + 4.5, { align: 'center' });
  }

  // Group 1: Faculty Coordinators (3 blocks)
  renderSigBlock(doc, certData.signatory_1_sig || 'jeyasundari', 33, certData.signatory_1_name || 'Dr. M. Jeya Sundari');
  renderSigBlock(doc, certData.signatory_2_sig || 'rekha', 68, certData.signatory_2_name || 'M. Rekha');
  renderSigBlock(doc, certData.signatory_3_sig || 'ramakrishnan', 103, certData.signatory_3_name || 'M. Ramakrishnan');

  // Group label "Faculty Coordinators" centered beneath the 3 individual names
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(46, 16, 101);
  doc.text('Faculty Coordinators', 68, sigLineY + 11.5, { align: 'center' });

  // Group 2: Convenor
  const cxConvenor = 145;
  renderSigBlock(doc, certData.signatory_4_sig || 'kesavaraja', cxConvenor, certData.signatory_4_name || 'Dr. D. Kesavaraja');
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(46, 16, 101);
  doc.text('Convenor', cxConvenor, sigLineY + 11.5, { align: 'center' });

  // Group 3: Patron
  const cxPatron = 192;
  renderSigBlock(doc, certData.signatory_5_sig || 'rajakumaran', cxPatron, certData.signatory_5_name || 'Dr. S. Rajakumaran');
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(46, 16, 101);
  doc.text('Patron', cxPatron, sigLineY + 11.5, { align: 'center' });

  // Group 4: Chief Patron
  const cxChiefPatron = 238;
  renderSigBlock(doc, certData.signatory_6_sig || 'ganesan', cxChiefPatron, certData.signatory_6_name || 'Dr. L. Ganesan');
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(46, 16, 101);
  doc.text('Chief Patron', cxChiefPatron, sigLineY + 11.5, { align: 'center' });

  // 9. QR Code at Bottom-Right
  const certId = certData.certificate_number || certData.certificate_id || 'RIT-STTP-2026-0001';
  const qrTarget = certData.verification_url || ((typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://rit-csbs-portal.vercel.app') + '/verify-certificate.html?id=' + encodeURIComponent(certId);

  let qrDataUrl = null;
  if (typeof document !== 'undefined' && typeof QRCode !== 'undefined' && QRCode.toDataURL) {
    try {
      qrDataUrl = await QRCode.toDataURL(qrTarget, { margin: 1, width: 140, color: { dark: '#1E1B4B', light: '#FFFFFF' } });
    } catch (e) {}
  }
  if (!qrDataUrl && typeof require !== 'undefined') {
    try {
      const nodeQr = require('qrcode');
      qrDataUrl = await nodeQr.toDataURL(qrTarget, { margin: 1, width: 140, color: { dark: '#1E1B4B', light: '#FFFFFF' } });
    } catch (e) {}
  }

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 264, 133, 17, 17);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(88, 28, 135);
      doc.text('SCAN TO VERIFY', 272.5, 153.5, { align: 'center' });
    } catch (e) {
      console.warn('PDF QR embed error:', e);
    }
  }

  // 10. Unique Certificate ID in Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Certificate ID: ' + certId, pageWidth / 2, 196, { align: 'center' });

  return doc;
}
