const { jsPDF } = require('jspdf');
const fs = require('fs');

const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
const pageWidth = 297;

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
  const totalW = computed.reduce((sum, s) => sum + s.width, 0) + totalGaps;

  let curX = (pageWidth - totalW) / 2;
  computed.forEach((seg, i) => {
    doc.setFont(seg.font, seg.style);
    doc.setFontSize(seg.size);
    doc.setTextColor(seg.color[0], seg.color[1], seg.color[2]);
    doc.text(seg.cleanText, curX, y);
    curX += seg.width + (i < computed.length - 1 ? spaceGap : 0);
  });
}

const cBlack = [31, 41, 55];
const cPurple = [74, 21, 75];
const pY = 89.0;
const lineSpacing = 5.2;

const certData = {
  programme_title: 'One Week Short-Term Training Programme (STTP)',
  event_name: 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives',
  department: 'Department of Computer Science and Business Systems',
  college_name: 'Ramco Institute of Technology, Rajapalayam',
  programme_dates: 'October 12, 2026, to October 18, 2026'
};

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

fs.writeFileSync('scratch/test_styled_block.pdf', Buffer.from(doc.output('arraybuffer')));
console.log('Saved scratch/test_styled_block.pdf');
