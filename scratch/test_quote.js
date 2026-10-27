const { jsPDF } = require('jspdf');
const fs = require('fs');

const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
doc.setFont('times', 'bold');
doc.setFontSize(9.4);
doc.text('"Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives", organized', 148.5, 50, { align: 'center' });
fs.writeFileSync('scratch/test_quote.pdf', Buffer.from(doc.output('arraybuffer')));
console.log('Saved test_quote.pdf');
