const { jsPDF } = require('jspdf');

const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
const pSize = 18.0;
const spaceGap = 1.8;

function measureSegments(segs) {
  let total = (segs.length - 1) * spaceGap;
  segs.forEach(s => {
    doc.setFont('times', s.style);
    doc.setFontSize(pSize);
    total += doc.getTextWidth(s.text);
  });
  return total;
}

const l1 = measureSegments([
  { text: 'for active participation in the', style: 'normal' },
  { text: 'One Week Online Short-Term Training Programme (STTP)', style: 'bold' },
  { text: 'on', style: 'normal' }
]);

const l2 = measureSegments([
  { text: '“Emerging Blockchain Technologies”,', style: 'bold' },
  { text: 'organized by the', style: 'normal' },
  { text: 'Department of Computer Science and', style: 'bold' }
]);

const l3 = measureSegments([
  { text: 'Business Systems (CSBS)', style: 'bold' },
  { text: 'at', style: 'normal' },
  { text: 'Ramco Institute of Technology, Rajapalayam', style: 'bold' },
  { text: 'from', style: 'normal' }
]);

const l4 = measureSegments([
  { text: 'October 12, 2026, to October 18, 2026.', style: 'bold' }
]);

console.log(`Line 1: width=${l1.toFixed(2)} mm (margin=${((297 - l1)/2).toFixed(2)} mm)`);
console.log(`Line 2: width=${l2.toFixed(2)} mm (margin=${((297 - l2)/2).toFixed(2)} mm)`);
console.log(`Line 3: width=${l3.toFixed(2)} mm (margin=${((297 - l3)/2).toFixed(2)} mm)`);
console.log(`Line 4: width=${l4.toFixed(2)} mm (margin=${((297 - l4)/2).toFixed(2)} mm)`);
