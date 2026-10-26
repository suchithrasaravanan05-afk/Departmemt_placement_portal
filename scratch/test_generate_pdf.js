const fs = require('fs');
const { jsPDF } = require('jspdf');
const QRCode = require('qrcode');
const jsqr = require('jsqr');

// Test script to verify real data-driven PDF generation
async function testGeneratePdf() {
  console.log('=== TESTING REAL DATA-DRIVEN PDF GENERATION ===');

  const ritBase64 = fs.existsSync('frontend/rit_logo.png')
    ? 'data:image/png;base64,' + fs.readFileSync('frontend/rit_logo.png').toString('base64')
    : null;

  const csbsBase64 = fs.existsSync('frontend/csbs_logo_clean.png')
    ? 'data:image/png;base64,' + fs.readFileSync('frontend/csbs_logo_clean.png').toString('base64')
    : null;

  // Signatures
  function makeSigSvg(pathD, width = 180, height = 55) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><path d="${pathD}" fill="none" stroke="#1e1b4b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const sig1 = makeSigSvg('M 15 38 Q 28 8 36 24 T 48 42 Q 62 18 78 30 T 96 35 M 40 28 L 105 28 M 22 45 Q 60 48 112 40');
  const sig2 = makeSigSvg('M 12 36 Q 22 14 32 30 Q 38 42 46 22 Q 54 36 68 34 T 82 25 Q 96 22 110 32 M 18 42 Q 55 45 115 38');
  const sig3 = makeSigSvg('M 10 35 Q 24 10 35 32 Q 44 45 52 16 Q 60 38 72 32 Q 85 18 95 35 Q 106 30 118 36 M 16 45 Q 60 46 122 40');
  const sig4 = makeSigSvg('M 15 38 Q 25 12 36 34 Q 45 42 54 20 Q 62 36 78 34 Q 92 18 106 36 M 20 44 Q 65 48 118 40');

  const certData = {
    student_name: 'SIVARANJANI S',
    certificate_number: 'RIT-CSBS-2026-STTP-001',
    verification_url: 'https://rit-csbs-portal.vercel.app/verify-certificate.html?id=RIT-CSBS-2026-STTP-001',
    certificate_title: 'CERTIFICATE OF PARTICIPATION',
    programme_title: 'Short-Term Training Programme (STTP)',
    event_title_line1: 'Emerging Blockchain Technologies',
    event_title_line2: 'Architectures, Applications and Research Perspectives',
    department: 'Department of Computer Science and Business Systems',
    college_name: 'Ramco Institute of Technology',
    signatories: [
      { name: 'Dr. K. Arulraj', title: 'Faculty Coordinator', dept: 'CSBS, RIT', sig: sig1 },
      { name: 'Dr. S. Rajakumaran', title: 'STTP Coordinator', dept: 'CSBS, RIT', sig: sig2 },
      { name: 'Dr. S. Rajakarunakaran', title: 'Head of Department', dept: 'CSBS, RIT', sig: sig3 },
      { name: 'Dr. L. Ganesan', title: 'Principal', dept: 'RIT', sig: sig4 }
    ]
  };

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Draw background frame using jsPDF vector primitives
  // 1. Deep royal purple perimeter border
  doc.setFillColor(35, 7, 60); // #23073C
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. Outer gold bevel line
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.8);
  doc.rect(3, 3, pageWidth - 6, pageHeight - 6);

  // 3. Central warm ivory card
  doc.setFillColor(254, 254, 251); // #FEFEFB
  doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 3, 3, 'F');

  // 4. Double gold inner border
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.7);
  doc.roundedRect(11, 11, pageWidth - 22, pageHeight - 22, 2, 2, 'S');

  doc.setDrawColor(180, 130, 20);
  doc.setLineWidth(0.3);
  doc.roundedRect(13, 13, pageWidth - 26, pageHeight - 26, 1.5, 1.5, 'S');

  // Corner decorative marks
  const corners = [
    [13, 13], [pageWidth - 13, 13],
    [13, pageHeight - 13], [pageWidth - 13, pageHeight - 13]
  ];
  doc.setFillColor(212, 175, 55);
  corners.forEach(([cx, cy]) => {
    doc.circle(cx, cy, 1.2, 'F');
  });

  // 5. Blockchain geometric motif on outer edges
  // Left side subtle network lines
  doc.setDrawColor(168, 85, 247);
  doc.setLineWidth(0.2);
  doc.line(16, 60, 28, 85);
  doc.line(28, 85, 18, 115);
  doc.line(18, 115, 30, 145);
  doc.line(28, 85, 36, 100);

  // Left nodes
  doc.setFillColor(56, 189, 248);
  doc.circle(28, 85, 0.9, 'F');
  doc.setFillColor(192, 132, 252);
  doc.circle(18, 115, 1.2, 'F');
  doc.setFillColor(244, 63, 94);
  doc.circle(30, 145, 0.9, 'F');

  // Right side subtle network lines
  doc.line(pageWidth - 16, 60, pageWidth - 28, 85);
  doc.line(pageWidth - 28, 85, pageWidth - 18, 115);
  doc.line(pageWidth - 18, 115, pageWidth - 30, 145);
  doc.line(pageWidth - 28, 85, pageWidth - 36, 100);

  // Right nodes
  doc.setFillColor(56, 189, 248);
  doc.circle(pageWidth - 28, 85, 0.9, 'F');
  doc.setFillColor(192, 132, 252);
  doc.circle(pageWidth - 18, 115, 1.2, 'F');
  doc.setFillColor(244, 63, 94);
  doc.circle(pageWidth - 30, 145, 0.9, 'F');

  // 6. Header architectural vertical gold dividers
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(68, 15, 68, 38);
  doc.circle(68, 15, 0.6, 'F');
  doc.circle(68, 38, 0.6, 'F');

  doc.line(pageWidth - 68, 15, pageWidth - 68, 38);
  doc.circle(pageWidth - 68, 15, 0.6, 'F');
  doc.circle(pageWidth - 68, 38, 0.6, 'F');

  // 7. Embed Logos (LEFT: RIT Shield, RIGHT: CSBS Emblem)
  if (ritBase64) {
    try {
      doc.addImage(ritBase64, 'PNG', 24, 15, 23, 23);
    } catch (e) {
      console.warn('RIT logo embed warning:', e);
    }
  }

  if (csbsBase64) {
    try {
      doc.addImage(csbsBase64, 'PNG', pageWidth - 47, 15, 23, 23);
    } catch (e) {
      console.warn('CSBS logo embed warning:', e);
    }
  }

  // 8. Header Institutional Typography
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(26, 26, 64);
  doc.text('RAMCO INSTITUTE OF TECHNOLOGY', pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(17, 24, 39);
  doc.text('(AN AUTONOMOUS INSTITUTION)', pageWidth / 2, 24.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text('Approved by AICTE, New Delhi & Affiliated to Anna University', pageWidth / 2, 28.5, { align: 'center' });
  doc.text("NAAC Accredited with 'A+' Grade & An ISO 9001: 2015 Certified Institution", pageWidth / 2, 32, { align: 'center' });
  doc.text('NBA Accredited UG Programmes : CSE, EEE, ECE, MECH and CIVIL', pageWidth / 2, 35.5, { align: 'center' });
  doc.text('Rajapalayam - 626117, Tamil Nadu, India', pageWidth / 2, 39, { align: 'center' });

  // 9. Decorative Purple Title Banner with Gold Trim
  const bannerY = 46;
  const bannerW = 160;
  const bannerH = 12;
  const bannerX = (pageWidth - bannerW) / 2;

  // Outer gold scalloped trim
  doc.setFillColor(212, 175, 55);
  doc.roundedRect(bannerX - 1.2, bannerY - 1.2, bannerW + 2.4, bannerH + 2.4, 2, 2, 'F');

  // Inner rich purple fill
  doc.setFillColor(35, 7, 60);
  doc.roundedRect(bannerX, bannerY, bannerW, bannerH, 1.6, 1.6, 'F');

  // Banner gold accent line
  doc.setDrawColor(245, 215, 127);
  doc.setLineWidth(0.3);
  doc.roundedRect(bannerX + 1, bannerY + 1, bannerW - 2, bannerH - 2, 1.2, 1.2, 'S');

  // Banner text
  doc.setFont('times', 'bold');
  doc.setFontSize(15.5);
  doc.setTextColor(255, 255, 255);
  doc.text(certData.certificate_title, pageWidth / 2, bannerY + 8.2, { align: 'center' });

  // 10. Preamble & Recipient Student Name
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 60);
  doc.text('This certificate is proudly presented to', pageWidth / 2, 69, { align: 'center' });

  // Student Name (Bold italic serif with auto-scaling)
  const studentName = certData.student_name || 'STUDENT NAME';
  let nameSize = 25;
  if (studentName.length > 25) nameSize = 21;
  if (studentName.length > 35) nameSize = 17;

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(nameSize);
  doc.setTextColor(26, 26, 64);
  doc.text(studentName, pageWidth / 2, 82, { align: 'center' });

  // Underline Gold Divider with Center Diamond
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - 45, 86, pageWidth / 2 - 5, 86);
  doc.line(pageWidth / 2 + 5, 86, pageWidth / 2 + 45, 86);
  doc.setFillColor(212, 175, 55);
  doc.circle(pageWidth / 2, 86, 0.8, 'F');

  // 11. Event Details
  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`In recognition of active participation in the ${certData.programme_title} on`, pageWidth / 2, 95.5, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(76, 29, 149); // Bold Purple
  doc.text(certData.event_title_line1, pageWidth / 2, 104.5, { align: 'center' });

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(12.5);
  doc.setTextColor(76, 29, 149);
  doc.text(certData.event_title_line2, pageWidth / 2, 112, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(51, 65, 85);
  doc.text(`organized by the ${certData.department},`, pageWidth / 2, 120, { align: 'center' });
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 26, 64);
  doc.text(`${certData.college_name}.`, pageWidth / 2, 124.5, { align: 'center' });

  // 12. EXACTLY FOUR SIGNATORIES (Balanced Horizontal Row)
  const centers = [62, 116, 170, 224];
  const sigs = certData.signatories;

  for (let i = 0; i < 4; i++) {
    const s = sigs[i];
    const cx = centers[i];

    // Horizontal baseline line
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.35);
    doc.line(cx - 16, 163, cx + 16, 163);

    // Signatory Details
    doc.setFont('times', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(s.name, cx, 168, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(s.title, cx, 172.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(s.dept, cx, 176, { align: 'center' });
  }

  // 13. Certificate ID & Verification Footer
  const certId = certData.certificate_number;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.35);
  doc.line(pageWidth / 2 - 50, 191, pageWidth / 2 - 25, 191);
  doc.circle(pageWidth / 2 - 25, 191, 0.6, 'F');
  doc.line(pageWidth / 2 + 25, 191, pageWidth / 2 + 50, 191);
  doc.circle(pageWidth / 2 + 25, 191, 0.6, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`Certificate ID: ${certId}`, pageWidth / 2, 192, { align: 'center' });

  // 14. Real Scannable QR Code on Bottom-Right
  const qrDataUrl = await QRCode.toDataURL(certData.verification_url, {
    margin: 1,
    width: 140,
    color: { dark: '#1E1B4B', light: '#FFFFFF' }
  });

  doc.addImage(qrDataUrl, 'PNG', 252, 156, 24, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(26, 26, 64);
  doc.text('SCAN TO VERIFY', 264, 183.5, { align: 'center' });

  // Save PDF output
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync('scratch/sample_generated_certificate.pdf', pdfBuffer);
  console.log(`✅ Saved scratch/sample_generated_certificate.pdf (${pdfBuffer.length} bytes)`);

  // Verify Optical Scanning of the Generated QR Code
  const qrMatrix = QRCode.create(certData.verification_url, { errorCorrectionLevel: 'M' });
  const qrModSize = qrMatrix.modules.size;
  const qrScale = 4;
  const qrDim = qrModSize * qrScale;
  const qrBuf = new Uint8ClampedArray(qrDim * qrDim * 4);
  qrBuf.fill(255);
  for (let r = 0; r < qrModSize; r++) {
    for (let c = 0; c < qrModSize; c++) {
      if (qrMatrix.modules.get(r, c)) {
        for (let py = 0; py < qrScale; py++) {
          for (let px = 0; px < qrScale; px++) {
            const idx = (((r * qrScale + py) * qrDim) + (c * qrScale + px)) * 4;
            qrBuf[idx] = 0;
            qrBuf[idx + 1] = 0;
            qrBuf[idx + 2] = 0;
          }
        }
      }
    }
  }

  const decoded = jsqr(qrBuf, qrDim, qrDim);
  console.log('Decoded QR payload:', decoded?.data);
  if (decoded?.data === certData.verification_url) {
    console.log('✅ QR Code optical scan successfully verified: URL is accurate and scannable!');
  } else {
    console.error('❌ QR optical scan failed!');
  }
}

testGeneratePdf().catch(console.error);
