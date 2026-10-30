const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

// Let's load the background and signatures from certificate_assets
const certAssets = require('../frontend/certificate_assets.js');

async function renderPatronVariation(filename, patronConfig) {
  const certData = {
    student_name: 'Keerthana Mohan',
    certificate_number: 'RITCB 01 0001',
    college_name: 'RAMCO INSTITUTE OF TECHNOLOGY',
    nba_text: 'NBA Accredited UG Programs: CSE, EEE, MECH, ECE and CIVIL.'
  };

  // Monkey patch or run jsPDF
  // Let's create a customized doc
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // Background
  const bgData = window.CERT_ASSETS ? window.CERT_ASSETS.BACKGROUND_IMAGE : null;
  if (bgData) {
    doc.addImage(bgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  }

  const purple = [88, 28, 135];
  const gold = [197, 155, 39];
  const darkNavy = [26, 26, 64];
  const maroon = [185, 28, 28];
  const darkGrey = [31, 41, 55];

  // Headings
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
  doc.text('NBA Accredited UG Programs: CSE, EEE, MECH, ECE and CIVIL.', pageWidth / 2, 46.8, { align: 'center' });

  // Signatures
  const sigLineY = 174.0;
  function drawVerticalSep(x) {
    doc.setDrawColor(gold[0], gold[1], gold[2]);
    doc.setLineWidth(0.45);
    doc.line(x, sigLineY - 10, x, sigLineY + 11.5);
  }

  drawVerticalSep(129.5); // Sep 1
  drawVerticalSep(171.8); // Sep 2
  drawVerticalSep(211.5); // Sep 3

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

  // Chief Patron
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

  // PATRON under test
  const sig5Asset = certAssets.getSignatoryAsset('rajakarunakaran');
  const sigCenterX = patronConfig.sigCenterX;
  const lineStartX = patronConfig.lineStartX;
  const lineEndX = patronConfig.lineEndX;
  const nameCenterX = patronConfig.nameCenterX;
  const desigCenterX = patronConfig.desigCenterX;

  if (sig5Asset) {
    const props = doc.getImageProperties(sig5Asset);
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
    doc.addImage(sig5Asset, 'PNG', sigCenterX - w / 2, sigLineY - h - 1.2, w, h);
  }

  doc.setDrawColor(purple[0], purple[1], purple[2]);
  doc.setLineWidth(0.45);
  doc.line(lineStartX, sigLineY, lineEndX, sigLineY);

  doc.setFont('times', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(17, 24, 39);
  doc.text('Dr. S. Rajakarunakaran', nameCenterX, sigLineY + 5.0, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Patron', desigCenterX, sigLineY + 11.0, { align: 'center' });

  fs.writeFileSync(filename, Buffer.from(doc.output('arraybuffer')));
}

async function main() {
  // Baseline (current)
  await renderPatronVariation('scratch/var0_baseline.pdf', {
    sigCenterX: 188.5,
    lineStartX: 188.5 - 25/2, // 176.0
    lineEndX: 188.5 + 25/2,   // 201.0
    nameCenterX: 188.5,
    desigCenterX: 188.5
  });

  // Var 1: Underline adjusted slightly left (lineWidth=28, line: 173.5 to 201.5), sig centered above line at 187.5, name/desig at 188.5
  await renderPatronVariation('scratch/var1.pdf', {
    sigCenterX: 187.5,
    lineStartX: 173.5,
    lineEndX: 201.5,
    nameCenterX: 188.5,
    desigCenterX: 187.5
  });

  // Var 2: Underline adjusted slightly left (lineWidth=27, line: 174.0 to 201.0), sig centered above line at 187.5, name/desig at 188.5
  await renderPatronVariation('scratch/var2.pdf', {
    sigCenterX: 187.5,
    lineStartX: 174.0,
    lineEndX: 201.0,
    nameCenterX: 188.5,
    desigCenterX: 187.5
  });

  // Var 3: Underline adjusted slightly left (lineWidth=26, line: 174.5 to 200.5), sig centered above line at 187.5, name/desig at 188.5
  await renderPatronVariation('scratch/var3.pdf', {
    sigCenterX: 187.5,
    lineStartX: 174.5,
    lineEndX: 200.5,
    nameCenterX: 188.5,
    desigCenterX: 188.5
  });

  // Var 4: Underline adjusted slightly left by 2mm (line: 174.0 to 199.0, len=25, center=186.5), sig centered at 186.5, name/desig at 188.5
  await renderPatronVariation('scratch/var4.pdf', {
    sigCenterX: 186.5,
    lineStartX: 174.0,
    lineEndX: 199.0,
    nameCenterX: 188.5,
    desigCenterX: 187.5
  });

  console.log('All variations rendered');
}
main();
