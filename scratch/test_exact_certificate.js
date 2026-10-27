const fs = require('fs');
const { jsPDF } = require('jspdf');
const QRCode = require('qrcode');

async function testGenerateExactPdf() {
  console.log('=== GENERATING EXACT A4 LANDSCAPE CERTIFICATE PDF WITH AUTHENTIC BACKGROUND ===');

  const bgData = fs.existsSync('frontend/certificate_background.png')
    ? 'data:image/png;base64,' + fs.readFileSync('frontend/certificate_background.png').toString('base64')
    : null;

  const ritLogo = fs.existsSync('frontend/rit_logo.png')
    ? 'data:image/png;base64,' + fs.readFileSync('frontend/rit_logo.png').toString('base64')
    : null;

  const csbsLogo = fs.existsSync('frontend/csbs_logo_clean.png')
    ? 'data:image/png;base64,' + fs.readFileSync('frontend/csbs_logo_clean.png').toString('base64')
    : null;

  const sigs = JSON.parse(fs.readFileSync('scratch/signatures_base64.json', 'utf8'));

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // 1. Draw Decorative Background Asset (Pale Lavender + Wave Patterns + Double Purple Border + Corners)
  if (bgData) {
    doc.addImage(bgData, 'PNG', 0, 0, pageWidth, pageHeight);
  } else {
    doc.setFillColor(251, 248, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  }

  // 2. Approved RIT Logo at Upper Left
  // Positioned proportional and clear matching reference: X: 16mm, Y: 14mm, W: 24mm, H: 24mm
  if (ritLogo) {
    doc.addImage(ritLogo, 'PNG', 16, 14, 24, 24);
  }

  // 3. Centered Institutional Heading
  doc.setFont('times', 'bold');
  doc.setFontSize(16.5);
  doc.setTextColor(26, 26, 64);
  doc.text('RAMCO INSTITUTE OF TECHNOLOGY', pageWidth / 2, 17.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(185, 28, 28); // Crimson red
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
  if (csbsLogo) {
    doc.addImage(csbsLogo, 'PNG', pageWidth / 2 - 22, 36.5, 44, 11);
  }

  // 5. Certificate Heading
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(74, 21, 75); // Vibrant rich purple
  doc.text('CERTIFICATE OF PARTICIPATION', pageWidth / 2, 54.5, { align: 'center' });

  // Ornamental floral arabesque divider helper
  function drawArabesque(doc, cx, cy) {
    doc.setDrawColor(88, 28, 135);
    doc.setFillColor(88, 28, 135);
    doc.setLineWidth(0.35);

    // Center floral diamond cluster
    doc.circle(cx, cy, 0.9, 'F');
    doc.circle(cx - 2.5, cy, 0.5, 'F');
    doc.circle(cx + 2.5, cy, 0.5, 'F');
    doc.circle(cx, cy - 2, 0.5, 'F');
    doc.circle(cx, cy + 2, 0.5, 'F');

    // Horizontal wing lines with end dots
    doc.line(cx - 32, cy, cx - 4.5, cy);
    doc.line(cx + 4.5, cy, cx + 32, cy);
    doc.circle(cx - 32, cy, 0.5, 'F');
    doc.circle(cx + 32, cy, 0.5, 'F');

    // Small petal loops
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
  doc.text('This certificate is presented to', pageWidth / 2, 66.0, { align: 'center' });

  // Student Name
  const studentName = 'Keerthana Mohan';
  doc.setFont('times', 'bolditalic');
  let nameSize = 25;
  if (studentName.length > 28) nameSize = 20;
  if (studentName.length > 38) nameSize = 16;
  doc.setFontSize(nameSize);
  doc.setTextColor(59, 7, 100); // Deep Purple
  doc.text(studentName, pageWidth / 2, 77.0, { align: 'center' });

  drawArabesque(doc, pageWidth / 2, 81.5);

  // 7. Event Description Paragraph (Exactly Matching Reference)
  const pY = 89.0;
  const lineSpacing = 5.2;

  function renderStyledLine(doc, segments, y) {
    let totalW = 0;
    const computed = segments.map(seg => {
      doc.setFont(seg.font, seg.style);
      doc.setFontSize(seg.size);
      const w = doc.getTextWidth(seg.text);
      totalW += w;
      return { ...seg, width: w };
    });

    let curX = (pageWidth - totalW) / 2;
    computed.forEach(seg => {
      doc.setFont(seg.font, seg.style);
      doc.setFontSize(seg.size);
      doc.setTextColor(seg.color[0], seg.color[1], seg.color[2]);
      doc.text(seg.text, curX, y);
      curX += seg.width;
    });
  }

  const cBlack = [31, 41, 55];
  const cPurple = [74, 21, 75];

  // Line 1
  renderStyledLine(doc, [
    { text: 'for active and enthusiastic participation in the ', font: 'times', style: 'normal', size: 9.2, color: cBlack },
    { text: 'One Week Short-Term Training Programme (STTP)', font: 'times', style: 'bold', size: 9.2, color: cPurple },
    { text: ' on', font: 'times', style: 'normal', size: 9.2, color: cBlack }
  ], pY);

  // Line 2
  renderStyledLine(doc, [
    { text: '“', font: 'times', style: 'bold', size: 9.4, color: cPurple },
    { text: 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives', font: 'times', style: 'bold', size: 9.4, color: cPurple },
    { text: '”, organized', font: 'times', style: 'normal', size: 9.2, color: cBlack }
  ], pY + lineSpacing);

  // Line 3
  renderStyledLine(doc, [
    { text: 'by the ', font: 'times', style: 'normal', size: 9.2, color: cBlack },
    { text: 'Department of Computer Science and Business Systems', font: 'times', style: 'bold', size: 9.2, color: cPurple },
    { text: ' at ', font: 'times', style: 'normal', size: 9.2, color: cBlack },
    { text: 'Ramco Institute of Technology,', font: 'times', style: 'bold', size: 9.2, color: cPurple }
  ], pY + lineSpacing * 2);

  // Line 4
  renderStyledLine(doc, [
    { text: 'Rajapalayam from ', font: 'times', style: 'bold', size: 9.2, color: cPurple },
    { text: 'October 12, 2026, to October 18, 2026.', font: 'times', style: 'bold', size: 9.2, color: cPurple }
  ], pY + lineSpacing * 3);

  // 8. Exact Signature Structure (6 Signatures in 4 Groups)
  const sigLineY = 137.0;
  const purple = [88, 28, 135];

  function renderSigBlock(doc, sigKey, cx, name, title) {
    const sigData = sigs[sigKey];
    if (sigData) {
      try {
        const props = doc.getImageProperties(sigData);
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
        doc.addImage(sigData, 'PNG', cx - w / 2, sigLineY - h - 1, w, h);
      } catch (e) {
        console.warn('Sig image error for', name, e);
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

    // Individual role if needed
    if (title) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(75, 85, 99);
      doc.text(title, cx, sigLineY + 8.5, { align: 'center' });
    }
  }

  // Group 1: Faculty Coordinators (3 blocks)
  renderSigBlock(doc, 'jeyasundari', 33, 'Dr. M. Jeya Sundari');
  renderSigBlock(doc, 'rekha', 68, 'M. Rekha');
  renderSigBlock(doc, 'ramakrishnan', 103, 'M. Ramakrishnan');

  // Group label "Faculty Coordinators" centered beneath the 3 individual names
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(46, 16, 101);
  doc.text('Faculty Coordinators', 68, sigLineY + 11.5, { align: 'center' });

  // Group 2: Convenor
  const cxConvenor = 145;
  renderSigBlock(doc, 'kesavaraja', cxConvenor, 'Dr. D. Kesavaraja');
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(46, 16, 101);
  doc.text('Convenor', cxConvenor, sigLineY + 11.5, { align: 'center' });

  // Group 3: Patron
  const cxPatron = 192;
  renderSigBlock(doc, 'rajakumaran', cxPatron, 'Dr. S. Rajakumaran');
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(46, 16, 101);
  doc.text('Patron', cxPatron, sigLineY + 11.5, { align: 'center' });

  // Group 4: Chief Patron
  const cxChiefPatron = 238;
  renderSigBlock(doc, 'ganesan', cxChiefPatron, 'Dr. L. Ganesan');
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(46, 16, 101);
  doc.text('Chief Patron', cxChiefPatron, sigLineY + 11.5, { align: 'center' });

  // 9. QR Code at Bottom-Right
  const certId = 'RIT-STTP-2026-0001';
  const qrTarget = `https://rit-csbs-portal.vercel.app/verify-certificate.html?id=${encodeURIComponent(certId)}`;
  const qrDataUrl = await QRCode.toDataURL(qrTarget, {
    margin: 1,
    width: 140,
    color: { dark: '#1E1B4B', light: '#FFFFFF' }
  });

  doc.addImage(qrDataUrl, 'PNG', 264, 133, 17, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(88, 28, 135);
  doc.text('SCAN TO VERIFY', 272.5, 153.5, { align: 'center' });

  // 10. Unique Certificate ID in Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Certificate ID: ' + certId, pageWidth / 2, 196, { align: 'center' });

  const outPath = 'scratch/test_exact_certificate.pdf';
  fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));
  console.log('✅ Generated PDF saved to:', outPath);
}

testGenerateExactPdf().catch(console.error);
