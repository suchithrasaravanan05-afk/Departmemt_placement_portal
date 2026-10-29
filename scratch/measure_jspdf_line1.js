const { jsPDF } = require('jspdf');

const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

// We want to test line 1 width:
// Line 1: "for active participation in the One Week Online Short-Term Training Programme (STTP) on"
// where "for active participation in the " is normal, "One Week Online Short-Term Training Programme (STTP)" is bold, " on" is normal.

function measureLine(pSize, spaceGap = 1.5) {
  doc.setFont('times', 'normal');
  doc.setFontSize(pSize);
  const w1 = doc.getTextWidth('for active participation in the');
  
  doc.setFont('times', 'bold');
  doc.setFontSize(pSize);
  const w2 = doc.getTextWidth('One Week Online Short-Term Training Programme (STTP)');
  
  doc.setFont('times', 'normal');
  doc.setFontSize(pSize);
  const w3 = doc.getTextWidth('on');
  
  return w1 + w2 + w3 + (2 * spaceGap);
}

for (let s = 14; s <= 22; s += 0.5) {
  const w = measureLine(s);
  console.log(`Font size ${s.toFixed(1)} pt -> Line 1 total width = ${w.toFixed(2)} mm (margin on 297mm: ${((297 - w) / 2).toFixed(2)} mm)`);
}
