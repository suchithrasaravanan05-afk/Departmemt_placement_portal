const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const QRCode = require('qrcode');

async function testFinalDesign() {
  const certAssets = require('../frontend/certificate_assets.js');

  // Load User's provided background: frontend/certificate_background.png
  const userBgBuf = fs.readFileSync(path.join(__dirname, '../frontend/certificate_background.png'));
  const userBgB64 = 'data:image/png;base64,' + userBgBuf.toString('base64');

  // Logos from frontend/certificate_logo
  const collegeLogoBuf = fs.readFileSync(path.join(__dirname, '../frontend/certificate_logo/college_logo.png'));
  const collegeLogoB64 = 'data:image/png;base64,' + collegeLogoBuf.toString('base64');

  const csbsLogoBuf = fs.readFileSync(path.join(__dirname, '../frontend/certificate_logo/csbs_logo_clean.png'));
  const csbsLogoB64 = 'data:image/png;base64,' + csbsLogoBuf.toString('base64');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297;
  const pageHeight = 210;

  // 1. Full-Bleed User Background
  doc.addImage(userBgB64, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

  // Color Palette
  const purple = [88, 28, 135];       // #581C87
  const gold = [197, 155, 39];        // #C59B27
  const maroon = [185, 28, 28];       // #B91C1C
  const darkNavy = [26, 26, 64];      // #1A1A40
  const deepPurple = [59, 7, 100];    // #3B0764
  const darkGrey = [31, 41, 55];      // #1F2937

  // 2. Approved College Logo at Upper Left
  const logoH = 24.5;
  const logoW = logoH * (172 / 210); // 20.0mm
  doc.addImage(collegeLogoB64, 'PNG', 15.0, 14.0, logoW, logoH);

  // 3. Centered Institutional Heading Area
  doc.setFont('times', 'bold');
  doc.setFontSize(21.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('RAMCO INSTITUTE OF TECHNOLOGY, RAJAPALAYAM', pageWidth / 2, 22.8, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(maroon[0], maroon[1], maroon[2]);
  doc.text('(An Autonomous Institution)', pageWidth / 2, 29.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
  doc.text('Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai', pageWidth / 2, 35.5, { align: 'center' });
  doc.text("NAAC Accredited with 'A+' Grade & An ISO 9001:2015 Certified Institution", pageWidth / 2, 41.2, { align: 'center' });
  doc.text('NBA Accredited UG Programs: CSE, EEE, MECH, CIVIL, and ECE.', pageWidth / 2, 46.8, { align: 'center' });

  // 4. CSBS Logo Centered Beneath Accreditation Details
  const csbsW = 92.0;
  const csbsH = csbsW / 4.251; // 21.6mm
  const csbsX = (pageWidth - csbsW) / 2;
  doc.addImage(csbsLogoB64, 'PNG', csbsX, 52.0, csbsW, csbsH);

  // 5. Title
  doc.setFont('times', 'bold');
  doc.setFontSize(34.0);
  doc.setTextColor(74, 21, 75);
  doc.text('CERTIFICATE OF PARTICIPATION', pageWidth / 2, 86.0, { align: 'center' });

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
  doc.text('This is to certify that', pageWidth / 2, 104.5, { align: 'center' });

  // 7. Participant Name (Dynamic)
  const participantName = 'REEMA DANEEN S S';
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(34.0);
  doc.setTextColor(deepPurple[0], deepPurple[1], deepPurple[2]);
  doc.text(participantName, pageWidth / 2, 119.5, { align: 'center' });

  // 8. Description Paragraph (Exact 17.5 pt font size)
  function renderStyledLine(segments, y, spaceGap = 1.8) {
    const computed = segments.map(seg => {
      doc.setFont(seg.font, seg.style);
      doc.setFontSize(seg.size);
      const cleanText = seg.text.trim();
      let w = doc.getTextWidth(cleanText);
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

  const pSize = 17.0;
  renderStyledLine([
    { text: 'for active participation in the', font: 'times', style: 'normal', size: pSize, color: darkGrey },
    { text: 'One Week Online Short-Term Training Programme (STTP)', font: 'times', style: 'bold', size: pSize, color: deepPurple },
    { text: 'on', font: 'times', style: 'normal', size: pSize, color: darkGrey }
  ], 132.5, 1.8);

  renderStyledLine([
    { text: '“Emerging Blockchain Technologies”,', font: 'times', style: 'bold', size: pSize, color: deepPurple },
    { text: 'organized by the', font: 'times', style: 'normal', size: pSize, color: darkGrey },
    { text: 'Department of Computer Science and', font: 'times', style: 'bold', size: pSize, color: deepPurple }
  ], 141.0, 1.8);

  renderStyledLine([
    { text: 'Business Systems (CSBS)', font: 'times', style: 'bold', size: pSize, color: deepPurple },
    { text: 'at', font: 'times', style: 'normal', size: pSize, color: darkGrey },
    { text: 'Ramco Institute of Technology, Rajapalayam', font: 'times', style: 'bold', size: pSize, color: deepPurple },
    { text: 'from', font: 'times', style: 'normal', size: pSize, color: darkGrey }
  ], 149.5, 1.8);

  renderStyledLine([
    { text: 'October 12, 2026, to October 18, 2026.', font: 'times', style: 'bold', size: pSize, color: deepPurple }
  ], 157.5, 1.8);

  // 9. Signatures Section with all 6 authentic handwritten signatures
  const sigLineY = 174.0;
  const sigPositions = [30.2, 68.3, 108.5, 152.6, 188.5, 235.1];

  function renderSigBlock(sigKey, cx, name, lineWidth = 30) {
    const asset = certAssets.getSignatoryAsset(sigKey);
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
        console.warn('Signature error for', sigKey, e);
      }
    }

    // Baseline Line
    doc.setDrawColor(purple[0], purple[1], purple[2]);
    doc.setLineWidth(0.45);
    doc.line(cx - lineWidth / 2, sigLineY, cx + lineWidth / 2, sigLineY);

    // Name
    doc.setFont('times', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(17, 24, 39);
    doc.text(name, cx, sigLineY + 5.0, { align: 'center' });
  }

  function drawVerticalSep(x) {
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.45);
    doc.line(x, sigLineY - 10, x, sigLineY + 11.5);
  }

  // 1, 2, 3: Faculty Coordinators
  renderSigBlock('jeyasundari', sigPositions[0], 'Dr. M. Jeya Sundari', 31);
  renderSigBlock('rekha', sigPositions[1], 'Ms. M. Rekha', 29);
  renderSigBlock('ramakrishnan', sigPositions[2], 'Mr. M. Rama Krishnan', 36);

  // Group label
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Faculty Coordinator(s)', sigPositions[1], sigLineY + 11.0, { align: 'center' });

  // Separator 1
  drawVerticalSep(129.5);

  // 4: Convenor
  renderSigBlock('kesavaraja', sigPositions[3], 'Dr. D. Kesavaraja', 29);
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Convenor', sigPositions[3], sigLineY + 11.0, { align: 'center' });

  // Separator 2
  drawVerticalSep(171.8);

  // 5: Patron
  renderSigBlock('rajakarunakaran', sigPositions[4], 'Dr. S. Rajakarunakaran', 25);
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Patron', sigPositions[4], sigLineY + 11.0, { align: 'center' });

  // Separator 3
  drawVerticalSep(211.5);

  // 6: Chief Patron
  renderSigBlock('ganesan', sigPositions[5], 'Dr. L. Ganesan', 31);
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Chief Patron', sigPositions[5], sigLineY + 11.0, { align: 'center' });

  // 10. QR Code in Bottom Right Area
  const certId = 'RIT-STTP-2026-F1F4';
  const qrX = 255.5;
  const qrY = 162.0;
  const qrSize = 23.0;

  const qrDataUrl = await QRCode.toDataURL(certId, { width: 140, margin: 0 });
  
  // White card background
  doc.setFillColor(255, 255, 255);
  doc.rect(qrX - 2.0, qrY - 2.0, qrSize + 4.0, qrSize + 9.5, 'F');
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // Certificate ID capsule outline underneath QR
  const capsuleW = qrSize + 2.0;
  const capsuleH = 4.8;
  const capsuleX = qrX + (qrSize - capsuleW) / 2;
  const capsuleY = qrY + qrSize + 1.2;

  doc.setDrawColor(209, 213, 219); // subtle light border
  doc.setLineWidth(0.3);
  doc.roundedRect(capsuleX, capsuleY, capsuleW, capsuleH, 1.0, 1.0, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(17, 24, 39);
  doc.text(certId, qrX + qrSize / 2, capsuleY + 3.4, { align: 'center' });

  const pdfBytes = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(path.join(__dirname, 'test_final_design.pdf'), pdfBytes);
  console.log('Saved scratch/test_final_design.pdf successfully!');
}

testFinalDesign().catch(console.error);
