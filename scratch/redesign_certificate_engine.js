const fs = require('fs');
const path = require('path');

const certAssetsPath = path.join(__dirname, '..', 'frontend', 'certificate_assets.js');
let content = fs.readFileSync(certAssetsPath, 'utf8');

// 1. Base64 of frontend/certificate_background.png
const bgBuf = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'certificate_background.png'));
const bgBase64 = 'data:image/png;base64,' + bgBuf.toString('base64');

// Replace BACKGROUND_IMAGE: "..."
const bgStart = content.indexOf('BACKGROUND_IMAGE:');
if (bgStart === -1) throw new Error('BACKGROUND_IMAGE not found');
const quoteStart = content.indexOf('"', bgStart);
const quoteEnd = content.indexOf('",', quoteStart + 1);
if (quoteStart === -1 || quoteEnd === -1) throw new Error('BACKGROUND_IMAGE quotes not found');

content = content.substring(0, quoteStart) + JSON.stringify(bgBase64) + content.substring(quoteEnd + 1);
console.log('Updated BACKGROUND_IMAGE in certificate_assets.js');

// 2. Locate createCertificatePdf
const createPdfStart = content.indexOf('async function createCertificatePdf');
const closingExport = content.indexOf('window.RIT_CERT_ASSETS');
if (createPdfStart === -1 || closingExport === -1) {
  throw new Error('createCertificatePdf boundaries not found');
}

const newCreatePdf = `async function createCertificatePdf(certData = {}) {
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
  const bgData = certData.background || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.BACKGROUND_IMAGE || window.CERT_ASSETS.BACKGROUND_SVG : null);
  if (bgData) {
    try {
      doc.addImage(bgData, 'PNG', 0, 0, pageWidth, pageHeight);
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

  // 2. Approved RIT College Shield Logo at Upper Left
  const ritLogo = certData.rit_logo || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.RIT_LOGO : null);
  if (ritLogo) {
    try {
      doc.addImage(ritLogo, 'PNG', 18, 13.5, 28, 28);
    } catch (e) {
      console.warn('RIT logo embed warning:', e);
    }
  }

  // 3. Centered Institutional Heading Area
  doc.setFont('times', 'bold');
  doc.setFontSize(18.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(sanitizePdfText(certData.college_name || 'RAMCO INSTITUTE OF TECHNOLOGY').toUpperCase(), pageWidth / 2, 19.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(maroon[0], maroon[1], maroon[2]);
  doc.text(sanitizePdfText(certData.autonomous_text || '(An Autonomous Institution)'), pageWidth / 2, 25.0, { align: 'center' });

  doc.setFontSize(8.2);
  doc.text(sanitizePdfText(certData.approval_text || 'Approved by AICTE, New Delhi & Affiliated to Anna University'), pageWidth / 2, 29.5, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(17, 24, 39);
  doc.text(sanitizePdfText(certData.naac_text || "NAAC Accredited with 'A+' Grade & An ISO 9001: 2015 Certified Institution"), pageWidth / 2, 34.0, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(maroon[0], maroon[1], maroon[2]);
  doc.text(sanitizePdfText(certData.nba_text || 'NBA Accredited UG Programs: CSE, EEE, and MECH.'), pageWidth / 2, 38.5, { align: 'center' });

  // 4. CSBS Department Logo Centered Beneath Institutional Heading
  const csbsLogo = certData.csbs_logo || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.CSBS_LOGO : null);
  if (csbsLogo) {
    try {
      const csbsW = 60;
      const csbsH = csbsW / 4.251;
      const csbsX = (pageWidth - csbsW) / 2;
      const csbsY = 41.5;
      doc.addImage(csbsLogo, 'PNG', csbsX, csbsY, csbsW, csbsH);
    } catch (e) {
      console.warn('CSBS logo embed warning:', e);
    }
  }

  // 5. Certificate Title
  doc.setFont('times', 'bold');
  doc.setFontSize(24.0);
  doc.setTextColor(74, 21, 75);
  doc.text(sanitizePdfText(certData.certificate_title || 'CERTIFICATE OF PARTICIPATION').toUpperCase(), pageWidth / 2, 67.5, { align: 'center' });

  // Vector Ornamental Arabesque Divider matching exact reference:
  function drawArabesque(cx, cy, width = 90) {
    const half = width / 2;
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.4);

    // Left line with end dot
    doc.line(cx - half + 4, cy, cx - 14, cy);
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.circle(cx - half + 3, cy, 0.6, 'F');

    // Right line with end dot
    doc.line(cx + 14, cy, cx + half - 4, cy);
    doc.circle(cx + half - 3, cy, 0.6, 'F');

    function drawDiamond(x, y, rx, ry, col) {
      doc.setFillColor(col[0], col[1], col[2]);
      doc.lines([[rx, ry], [-rx, ry], [-rx, -ry], [rx, -ry]], x - rx, y, [1, 1], 'F', true);
    }
    // Outer small gold diamonds
    drawDiamond(cx - 10, cy, 1.4, 1.4, gold);
    drawDiamond(cx + 10, cy, 1.4, 1.4, gold);

    // Flanking purple diamonds
    drawDiamond(cx - 5.2, cy, 2.0, 2.0, purple);
    drawDiamond(cx + 5.2, cy, 2.0, 2.0, purple);

    // Center large gold diamond & inner purple diamond
    drawDiamond(cx, cy, 3.2, 3.2, gold);
    drawDiamond(cx, cy, 1.8, 1.8, purple);
  }

  drawArabesque(pageWidth / 2, 73.5, 90);

  // 6. Recipient Section
  doc.setFont('times', 'normal');
  doc.setFontSize(12.0);
  doc.setTextColor(31, 41, 55);
  doc.text(sanitizePdfText(certData.preamble || 'This certificate is presented to'), pageWidth / 2, 82.5, { align: 'center' });

  const participantName = sanitizePdfText(certData.participant_name || certData.student_name || 'Participant Name');
  doc.setFont('times', 'bolditalic');
  let nameSize = 32;
  if (participantName.length > 26) nameSize = 26;
  if (participantName.length > 36) nameSize = 21;
  doc.setFontSize(nameSize);
  doc.setTextColor(deepPurple[0], deepPurple[1], deepPurple[2]);
  doc.text(participantName, pageWidth / 2, 96.5, { align: 'center' });

  drawArabesque(pageWidth / 2, 103.5, 90);

  // 7. Event Description Paragraph
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

  const pSize = 11.5;
  const progTitle = certData.programme_title || 'One Week Short-Term Training Programme (STTP)';
  const eventTopic = certData.event_name || certData.topic || 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives';
  const orgDept = certData.department || 'Department of Computer Science and Business Systems';
  const orgInst = certData.college_name || certData.institution || 'Ramco Institute of Technology,';
  const dates = certData.programme_dates || certData.dates || 'October 12, 2026, to October 18, 2026';

  renderStyledLine([
    { text: 'for active and enthusiastic participation in the', font: 'times', style: 'normal', size: pSize, color: darkGrey },
    { text: progTitle, font: 'times', style: 'bold', size: pSize, color: deepPurple },
    { text: 'on', font: 'times', style: 'normal', size: pSize, color: darkGrey }
  ], 114.0);

  renderStyledLine([
    { text: '“' + eventTopic + '”,', font: 'times', style: 'bold', size: pSize, color: deepPurple },
    { text: 'organized', font: 'times', style: 'normal', size: pSize, color: darkGrey }
  ], 121.2);

  renderStyledLine([
    { text: 'by the', font: 'times', style: 'normal', size: pSize, color: darkGrey },
    { text: orgDept, font: 'times', style: 'bold', size: pSize, color: deepPurple },
    { text: 'at', font: 'times', style: 'normal', size: pSize, color: darkGrey },
    { text: orgInst.endsWith(',') ? orgInst : (orgInst + ','), font: 'times', style: 'bold', size: pSize, color: deepPurple }
  ], 128.4);

  renderStyledLine([
    { text: 'Rajapalayam from', font: 'times', style: 'normal', size: pSize, color: darkGrey },
    { text: dates + (dates.endsWith('.') ? '' : '.'), font: 'times', style: 'bold', size: pSize, color: deepPurple }
  ], 135.6);

  // 8. Signatures Section in 4 Balanced Groups
  const sigLineY = 166.0;

  function renderSigBlock(sigSrc, cx, name, title) {
    const asset = getSignatoryAsset(sigSrc);
    if (asset) {
      try {
        const props = doc.getImageProperties(asset);
        const maxW = 28;
        const maxH = 14;
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
        doc.addImage(asset, 'PNG', cx - w / 2, sigLineY - h - 1.5, w, h);
      } catch (e) {
        console.warn('Sig render warning for', name, e);
      }
    }

    // Baseline Line
    doc.setDrawColor(purple[0], purple[1], purple[2]);
    doc.setLineWidth(0.4);
    doc.line(cx - 14, sigLineY, cx + 14, sigLineY);

    // Name
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(sanitizePdfText(name), cx, sigLineY + 5.0, { align: 'center' });

    // Optional individual title
    if (title) {
      doc.setFont('times', 'bold');
      doc.setFontSize(9.0);
      doc.setTextColor(74, 21, 75);
      doc.text(sanitizePdfText(title), cx, sigLineY + 10.5, { align: 'center' });
    }
  }

  function drawVerticalSep(x) {
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.4);
    doc.line(x, sigLineY - 10, x, sigLineY + 10);
  }

  // Group 1: Faculty Coordinators (3 blocks)
  renderSigBlock(certData.signatory_1_sig || certData.signatory_1_name || 'jeyasundari', 30, certData.signatory_1_name || 'Dr. M. Jeya Sundari');
  renderSigBlock(certData.signatory_2_sig || certData.signatory_2_name || 'rekha', 64, certData.signatory_2_name || 'M. Rekha');
  renderSigBlock(certData.signatory_3_sig || certData.signatory_3_name || 'ramakrishnan', 98, certData.signatory_3_name || 'M. Ramakrishnan');

  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Faculty Coordinators', 64, sigLineY + 12.5, { align: 'center' });

  // Separator 1
  drawVerticalSep(119);

  // Group 2: Convenor
  const cxConvenor = 143;
  renderSigBlock(certData.signatory_4_sig || certData.signatory_4_name || 'kesavaraja', cxConvenor, certData.signatory_4_name || 'Dr. D. Kesavaraja', 'Convenor');

  // Separator 2
  drawVerticalSep(168);

  // Group 3: Patron
  const cxPatron = 192;
  renderSigBlock(certData.signatory_5_sig || certData.signatory_5_name || 'rajakarunakaran', cxPatron, certData.signatory_5_name || 'Dr. S. Rajakumaran', 'Patron');

  // Separator 3
  drawVerticalSep(217);

  // Group 4: Chief Patron
  const cxChiefPatron = 241;
  renderSigBlock(certData.signatory_6_sig || certData.signatory_6_name || 'ganesan', cxChiefPatron, certData.signatory_6_name || 'Dr. L. Ganesan', 'Chief Patron');

  // 9. Dedicated QR Code in Bottom Right Area
  const certId = certData.certificate_number || certData.certificate_id || 'RIT-STTP-2026-0BDF';
  const qrTarget = certData.verification_url || ((typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://rit-csbs-portal.vercel.app') + '/verify-certificate.html?id=' + encodeURIComponent(certId);

  const qrX = 260;
  const qrY = 152;
  const qrSize = 24;

  let qrDataUrl = null;
  if (typeof window !== 'undefined' && window.QRCode && window.QRCode.toDataURL) {
    try {
      qrDataUrl = await window.QRCode.toDataURL(qrTarget, { width: 120, margin: 0 });
    } catch (e) {}
  } else if (typeof require !== 'undefined') {
    try {
      const qrMod = require('qrcode');
      qrDataUrl = await qrMod.toDataURL(qrTarget, { width: 120, margin: 0 });
    } catch (e) {}
  }

  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.rect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 9, 'F');
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(purple[0], purple[1], purple[2]);
    doc.text('SCAN TO VERIFY', qrX + qrSize / 2, qrY + qrSize + 4.5, { align: 'center' });
  }

  // 10. Official Certificate ID Pill at Bottom Center
  const pillY = 192.5;
  const pillW = 68;
  const pillH = 7.5;
  const pillX = (pageWidth - pillW) / 2;

  // Gold accent lines on sides
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(0.4);
  doc.line(pillX - 26, pillY + pillH / 2, pillX - 3, pillY + pillH / 2);
  doc.line(pillX + pillW + 3, pillY + pillH / 2, pillX + pillW + 26, pillY + pillH / 2);

  // Small diamonds
  function drawSmallDiamond(x, y) {
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.lines([[1.4, 1.4], [-1.4, 1.4], [-1.4, -1.4], [1.4, -1.4]], x - 1.4, y, [1, 1], 'F', true);
  }
  drawSmallDiamond(pillX - 14, pillY + pillH / 2);
  drawSmallDiamond(pillX + pillW + 14, pillY + pillH / 2);

  // Pill
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pillX, pillY, pillW, pillH, 3.5, 3.5, 'FD');

  doc.setFont('times', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(17, 24, 39);
  doc.text('Certificate ID: ' + certId, pageWidth / 2, pillY + 5.0, { align: 'center' });

  return doc;
}
`;

content = content.substring(0, createPdfStart) + newCreatePdf + content.substring(closingExport);

fs.writeFileSync(certAssetsPath, content, 'utf8');
console.log('Successfully updated frontend/certificate_assets.js with the exact reference design!');
