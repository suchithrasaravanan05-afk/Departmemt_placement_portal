const fs = require('fs');
const { jsPDF } = require('jspdf');
const certAssets = require('../frontend/certificate_assets.js');

async function testPatronLayout() {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  const pageWidth = 297;
  const pageHeight = 210;

  // Background from new template
  const bgBuf = fs.readFileSync('frontend/certificate_background.png');
  const bgB64 = 'data:image/png;base64,' + bgBuf.toString('base64');
  doc.addImage(bgB64, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

  const purple = [88, 28, 135];
  const gold = [197, 155, 39];
  const darkNavy = [26, 26, 64];
  const maroon = [185, 28, 28];
  const darkGrey = [31, 41, 55];

  // Heading
  doc.setFont('times', 'bold');
  doc.setFontSize(21.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('RAMCO INSTITUTE OF TECHNOLOGY', pageWidth / 2, 22.8, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(maroon[0], maroon[1], maroon[2]);
  doc.text('(An Autonomous Institution)', pageWidth / 2, 29.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(darkGrey[0], darkGrey[1], darkGrey[2]);
  doc.text('Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai', pageWidth / 2, 35.5, { align: 'center' });
  doc.text("NAAC Accredited with 'A+' Grade & An ISO 9001:2015 Certified Institution", pageWidth / 2, 41.2, { align: 'center' });
  // NBA text WITHOUT FULL STOP AT END
  doc.text('NBA Accredited UG Programs: CSE, EEE, MECH, ECE and CIVIL', pageWidth / 2, 46.8, { align: 'center' });

  // Signatures
  const sigLineY = 174.0;
  function drawVerticalSep(x) {
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.45);
    doc.line(x, sigLineY - 10, x, sigLineY + 11.5);
  }

  // Separator 1
  drawVerticalSep(129.5);

  // Convenor
  const sig4Asset = certAssets.getSignatoryAsset('kesavaraja');
  if (sig4Asset) {
    doc.addImage(sig4Asset, 'PNG', 152.6 - 28/2, sigLineY - 13.5 - 1.2, 28, 13.5);
  }
  doc.setDrawColor(purple[0], purple[1], purple[2]);
  doc.setLineWidth(0.45);
  doc.line(152.6 - 29/2, sigLineY, 152.6 + 29/2, sigLineY);
  doc.setFont('times', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(17, 24, 39);
  doc.text('Dr. D. Kesavaraja', 152.6, sigLineY + 5.0, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Convenor', 152.6, sigLineY + 11.0, { align: 'center' });

  // Separator 2 at 169.5
  drawVerticalSep(169.5);

  // Patron centered at 191.0
  const patronCenterX = 191.0;
  const sig5Asset = certAssets.getSignatoryAsset('rajakarunakaran');
  if (sig5Asset) {
    const props = doc.getImageProperties(sig5Asset);
    const maxW = 28;
    const maxH = 13.5;
    let w = maxW;
    let h = maxH;
    if (props && props.width && props.height) {
      const aspect = props.width / props.height;
      if (maxW / aspect <= maxH) h = maxW / aspect;
      else w = maxH * aspect;
    }
    doc.addImage(sig5Asset, 'PNG', patronCenterX - w / 2, sigLineY - h - 1.2, w, h);
  }

  const patronLineWidth = 28;
  doc.setDrawColor(purple[0], purple[1], purple[2]);
  doc.setLineWidth(0.45);
  doc.line(patronCenterX - patronLineWidth / 2, sigLineY, patronCenterX + patronLineWidth / 2, sigLineY);

  doc.setFont('times', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(17, 24, 39);
  doc.text('Dr. S. Rajakarunakaran', patronCenterX, sigLineY + 5.0, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Patron', patronCenterX, sigLineY + 11.0, { align: 'center' });

  // Separator 3 at 212.0
  drawVerticalSep(212.0);

  // Chief Patron at 235.1
  const sig6Asset = certAssets.getSignatoryAsset('ganesan');
  if (sig6Asset) {
    doc.addImage(sig6Asset, 'PNG', 235.1 - 28/2, sigLineY - 13.5 - 1.2, 28, 13.5);
  }
  doc.setDrawColor(purple[0], purple[1], purple[2]);
  doc.setLineWidth(0.45);
  doc.line(235.1 - 31/2, sigLineY, 235.1 + 31/2, sigLineY);
  doc.setFont('times', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(17, 24, 39);
  doc.text('Dr. L. Ganesan', 235.1, sigLineY + 5.0, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Chief Patron', 235.1, sigLineY + 11.0, { align: 'center' });

  fs.writeFileSync('scratch/test_new_layout.pdf', Buffer.from(doc.output('arraybuffer')));
  console.log('Saved scratch/test_new_layout.pdf');
}
testPatronLayout();

