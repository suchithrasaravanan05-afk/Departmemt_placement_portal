const fs = require('fs');
const { jsPDF } = require('jspdf');
const path = require('path');

// 1. Load background image base64
const bgBuf = fs.readFileSync('frontend/certificate_background.png');
const bgBase64 = 'data:image/png;base64,' + bgBuf.toString('base64');

// 2. Load assets
global.window = {};
eval(fs.readFileSync('frontend/certificate_assets.js', 'utf8'));
const assets = global.window.CERT_ASSETS;

async function testLayout() {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // 1. Background
  doc.addImage(bgBase64, 'PNG', 0, 0, pageWidth, pageHeight);

  // 2. RIT College Logo
  doc.addImage(assets.RIT_LOGO, 'PNG', 18, 14, 28, 28);

  // 3. Header Text
  const purple = [88, 28, 135];
  const gold = [197, 155, 39];
  const maroon = [185, 28, 28];
  const darkNavy = [26, 26, 64];

  doc.setFont('times', 'bold');
  doc.setFontSize(18.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('RAMCO INSTITUTE OF TECHNOLOGY', pageWidth / 2, 20.0, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(maroon[0], maroon[1], maroon[2]);
  doc.text('(An Autonomous Institution)', pageWidth / 2, 25.5, { align: 'center' });

  doc.setFontSize(8.2);
  doc.text('Approved by AICTE, New Delhi & Affiliated to Anna University', pageWidth / 2, 30.0, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(17, 24, 39);
  doc.text("NAAC Accredited with 'A+' Grade & An ISO 9001: 2015 Certified Institution", pageWidth / 2, 34.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(maroon[0], maroon[1], maroon[2]);
  doc.text('NBA Accredited UG Programs: CSE, EEE, and MECH.', pageWidth / 2, 39.0, { align: 'center' });

  // 4. CSBS Logo
  const csbsW = 60;
  const csbsH = csbsW / 4.251;
  doc.addImage(assets.CSBS_LOGO, 'PNG', (pageWidth - csbsW) / 2, 43.0, csbsW, csbsH);

  // 5. Title
  doc.setFont('times', 'bold');
  doc.setFontSize(24.0);
  doc.setTextColor(74, 21, 75);
  doc.text('CERTIFICATE OF PARTICIPATION', pageWidth / 2, 69.5, { align: 'center' });

  // Arabesque helper matching exact reference
  function drawArabesque(cx, cy, width = 85) {
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

    // Outer small gold diamonds
    function drawDiamond(x, y, rx, ry, col) {
      doc.setFillColor(col[0], col[1], col[2]);
      doc.lines([[rx, ry], [-rx, ry], [-rx, -ry], [rx, -ry]], x - rx, y, [1, 1], 'F', true);
    }
    drawDiamond(cx - 10, cy, 1.4, 1.4, gold);
    drawDiamond(cx + 10, cy, 1.4, 1.4, gold);

    // Flanking purple diamonds
    drawDiamond(cx - 5.2, cy, 2.0, 2.0, purple);
    drawDiamond(cx + 5.2, cy, 2.0, 2.0, purple);

    // Center large gold diamond
    drawDiamond(cx, cy, 3.2, 3.2, gold);
    // Center inner purple diamond
    drawDiamond(cx, cy, 1.8, 1.8, purple);
  }

  // Upper Arabesque
  drawArabesque(pageWidth / 2, 75.5, 90);

  // 6. Preamble
  doc.setFont('times', 'normal');
  doc.setFontSize(12.0);
  doc.setTextColor(31, 41, 55);
  doc.text('This certificate is presented to', pageWidth / 2, 84.5, { align: 'center' });

  // 7. Participant Name
  const participantName = 'Participant Name';
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(32);
  doc.setTextColor(59, 7, 100);
  doc.text(participantName, pageWidth / 2, 99.0, { align: 'center' });

  // Lower Arabesque
  drawArabesque(pageWidth / 2, 106.0, 90);

  // 8. Body Paragraph
  function renderStyledLine(segments, y, spaceGap = 1.8) {
    const computed = segments.map(seg => {
      doc.setFont(seg.font, seg.style);
      doc.setFontSize(seg.size);
      let w = doc.getTextWidth(seg.text);
      if (seg.font === 'times' && (seg.style === 'bold' || seg.style === 'bolditalic')) {
        w += 0.8;
      }
      return { ...seg, width: w };
    });

    const totalGaps = (segments.length - 1) * spaceGap;
    const totalW = computed.reduce((sum, s) => sum + s.width, 0) + totalGaps;
    let startX = (pageWidth - totalW) / 2;

    for (const seg of computed) {
      doc.setFont(seg.font, seg.style);
      doc.setFontSize(seg.size);
      doc.setTextColor(seg.color[0], seg.color[1], seg.color[2]);
      doc.text(seg.text, startX, y);
      startX += seg.width + spaceGap;
    }
  }

  const pSize = 11.5;
  const darkGrey = [31, 41, 55];
  const deepPurple = [59, 7, 100];

  renderStyledLine([
    { text: 'for active and enthusiastic participation in the', font: 'times', style: 'normal', size: pSize, color: darkGrey },
    { text: 'One Week Short-Term Training Programme (STTP)', font: 'times', style: 'bold', size: pSize, color: deepPurple },
    { text: 'on', font: 'times', style: 'normal', size: pSize, color: darkGrey }
  ], 117.0);

  renderStyledLine([
    { text: '“Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives”,', font: 'times', style: 'bold', size: pSize, color: deepPurple },
    { text: 'organized', font: 'times', style: 'normal', size: pSize, color: darkGrey }
  ], 124.2);

  renderStyledLine([
    { text: 'by the', font: 'times', style: 'normal', size: pSize, color: darkGrey },
    { text: 'Department of Computer Science and Business Systems', font: 'times', style: 'bold', size: pSize, color: deepPurple },
    { text: 'at', font: 'times', style: 'normal', size: pSize, color: darkGrey },
    { text: 'Ramco Institute of Technology,', font: 'times', style: 'bold', size: pSize, color: deepPurple }
  ], 131.4);

  renderStyledLine([
    { text: 'Rajapalayam from', font: 'times', style: 'normal', size: pSize, color: darkGrey },
    { text: 'October 12, 2026, to October 18, 2026.', font: 'times', style: 'bold', size: pSize, color: deepPurple }
  ], 138.6);

  // 9. Signatures Row
  const sigLineY = 168.0;

  function renderSig(sigKey, cx, name, title) {
    const { getSignatoryAsset } = require('../frontend/certificate_assets.js');
    const asset = getSignatoryAsset(sigKey);
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
        console.warn('Sig render warn:', e);
      }
    }

    // Baseline
    doc.setDrawColor(purple[0], purple[1], purple[2]);
    doc.setLineWidth(0.4);
    doc.line(cx - 14, sigLineY, cx + 14, sigLineY);

    // Name
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(name, cx, sigLineY + 5.0, { align: 'center' });

    // Individual title
    if (title) {
      doc.setFont('times', 'bold');
      doc.setFontSize(9.0);
      doc.setTextColor(74, 21, 75);
      doc.text(title, cx, sigLineY + 10.5, { align: 'center' });
    }
  }

  function drawVerticalSep(x) {
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.4);
    doc.line(x, sigLineY - 10, x, sigLineY + 10);
  }

  // 6 signatures in 4 groups
  renderSig('jeyasundari', 30, 'Dr. M. Jeya Sundari');
  renderSig('rekha', 64, 'M. Rekha');
  renderSig('ramakrishnan', 98, 'M. Ramakrishnan');

  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Faculty Coordinators', 64, sigLineY + 12.5, { align: 'center' });

  drawVerticalSep(119);
  renderSig('kesavaraja', 143, 'Dr. D. Kesavaraja', 'Convenor');

  drawVerticalSep(168);
  renderSig('rajakarunakaran', 192, 'Dr. S. Rajakumaran', 'Patron');

  drawVerticalSep(217);
  renderSig('ganesan', 241, 'Dr. L. Ganesan', 'Chief Patron');

  // 10. QR Code at bottom-right
  const qrX = 260;
  const qrY = 152;
  const qrSize = 24;

  const QRCode = require('qrcode');
    const qrDataUrl = await QRCode.toDataURL('https://rit-csbs-portal.vercel.app/verify-certificate.html?id=RIT-STTP-2026-0BDF', { width: 120, margin: 0 });
    doc.setFillColor(255, 255, 255);
    doc.rect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 9, 'F');
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.0);
    doc.setTextColor(purple[0], purple[1], purple[2]);
    doc.text('SCAN TO VERIFY', qrX + qrSize / 2, qrY + qrSize + 4.5, { align: 'center' });

  // 11. Certificate ID pill at bottom
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
  doc.text('Certificate ID: RIT-STTP-2026-0BDF', pageWidth / 2, pillY + 5.0, { align: 'center' });

  // Save
  const buf = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync('scratch/test_exact_ref_cert.pdf', buf);
  console.log('Saved scratch/test_exact_ref_cert.pdf');
}

testLayout();
