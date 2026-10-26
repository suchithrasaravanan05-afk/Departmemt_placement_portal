const fs = require('fs');

const sigs = JSON.parse(fs.readFileSync('scratch/signatures_base64.json', 'utf8'));
let assetsCode = fs.readFileSync('frontend/certificate_assets.js', 'utf8');

// 1. Add SIGNATURES to window.CERT_ASSETS
const sigsSnippet = `
window.CERT_ASSETS = {
  ...window.CERT_ASSETS,
  SIGNATURES: ${JSON.stringify(sigs, null, 2)}
};
`;

if (!assetsCode.includes('window.CERT_ASSETS.SIGNATURES') && !assetsCode.includes('SIGNATURES: {')) {
  assetsCode = assetsCode.replace(
    'window.CERT_ASSETS = {',
    `window.CERT_ASSETS = {\n  SIGNATURES: ${JSON.stringify(sigs, null, 2)},`
  );
}

// 2. Add drawIsometricCube and corner ribbons to createCertificatePdf
const cubeHelper = `
  function drawIsometricCube(cx, cy, s) {
    const w = s * 0.866;
    const h = s * 0.5;

    // Outer glow aura
    doc.setFillColor(88, 28, 135);
    doc.circle(cx, cy, s * 1.5, 'F');
    doc.setFillColor(126, 34, 206);
    doc.circle(cx, cy, s * 1.15, 'F');

    // Top face
    doc.setFillColor(147, 51, 234); // #9333EA
    doc.triangle(cx, cy - s, cx + w, cy - h, cx, cy, 'F');
    doc.triangle(cx, cy - s, cx, cy, cx - w, cy - h, 'F');

    // Left face
    doc.setFillColor(59, 7, 100); // #3B0764
    doc.triangle(cx - w, cy - h, cx, cy, cx, cy + s, 'F');
    doc.triangle(cx - w, cy - h, cx, cy + s, cx - w, cy + h, 'F');

    // Right face
    doc.setFillColor(79, 70, 229); // #4F46E5
    doc.triangle(cx, cy, cx + w, cy - h, cx + w, cy + h, 'F');
    doc.triangle(cx, cy, cx + w, cy + h, cx, cy + s, 'F');

    // Neon center core
    const cs = s * 0.45;
    const cw = cs * 0.866;
    const ch = cs * 0.5;
    doc.setFillColor(192, 132, 252);
    doc.triangle(cx, cy - cs, cx + cw, cy - ch, cx, cy, 'F');
    doc.triangle(cx, cy - cs, cx, cy, cx - cw, cy - ch, 'F');
    doc.setFillColor(56, 189, 248);
    doc.circle(cx, cy, cs * 0.4, 'F');

    // Edge lines
    doc.setDrawColor(216, 180, 254);
    doc.setLineWidth(0.2);
    doc.line(cx, cy - s, cx + w, cy - h);
    doc.line(cx + w, cy - h, cx + w, cy + h);
    doc.line(cx + w, cy + h, cx, cy + s);
    doc.line(cx, cy + s, cx - w, cy + h);
    doc.line(cx - w, cy + h, cx - w, cy - h);
    doc.line(cx - w, cy - h, cx, cy - s);
    doc.line(cx, cy, cx, cy + s);
    doc.line(cx, cy, cx + w, cy - h);
    doc.line(cx, cy, cx - w, cy - h);
  }

  // Draw 3D Isometric Blockchain Cubes on Left and Right borders
  drawIsometricCube(24, 72, 6.5);
  drawIsometricCube(34, 98, 4.8);
  drawIsometricCube(22, 124, 7.5);

  drawIsometricCube(pageWidth - 24, 72, 6.5);
  drawIsometricCube(pageWidth - 34, 98, 4.8);
  drawIsometricCube(pageWidth - 22, 124, 7.5);

  // Corner Ribbons (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
  doc.setFillColor(59, 7, 100);
  doc.triangle(0, 0, 36, 0, 0, 36, 'F');
  doc.setFillColor(212, 175, 55);
  doc.triangle(0, 0, 24, 0, 0, 24, 'F');
  doc.setFillColor(35, 7, 60);
  doc.triangle(0, 0, 14, 0, 0, 14, 'F');

  doc.setFillColor(59, 7, 100);
  doc.triangle(pageWidth, 0, pageWidth - 36, 0, pageWidth, 36, 'F');
  doc.setFillColor(212, 175, 55);
  doc.triangle(pageWidth, 0, pageWidth - 24, 0, pageWidth, 24, 'F');
  doc.setFillColor(35, 7, 60);
  doc.triangle(pageWidth, 0, pageWidth - 14, 0, pageWidth, 14, 'F');

  doc.setFillColor(59, 7, 100);
  doc.triangle(0, pageHeight, 32, pageHeight, 0, pageHeight - 32, 'F');
  doc.setFillColor(212, 175, 55);
  doc.triangle(0, pageHeight, 20, pageHeight, 0, pageHeight - 20, 'F');
  doc.setFillColor(35, 7, 60);
  doc.triangle(0, pageHeight, 10, pageHeight, 0, pageHeight - 10, 'F');

  doc.setFillColor(59, 7, 100);
  doc.triangle(pageWidth, pageHeight, pageWidth - 32, pageHeight, pageWidth, pageHeight - 32, 'F');
  doc.setFillColor(212, 175, 55);
  doc.triangle(pageWidth, pageHeight, pageWidth - 20, pageHeight, pageWidth, pageHeight - 20, 'F');
  doc.setFillColor(35, 7, 60);
  doc.triangle(pageWidth, pageHeight, pageWidth - 10, pageHeight, pageWidth, pageHeight - 10, 'F');
`;

// Insert cubeHelper right after constellation lines
assetsCode = assetsCode.replace(
  "doc.circle(pageWidth - 30, 145, 0.9, 'F');",
  "doc.circle(pageWidth - 30, 145, 0.9, 'F');\n" + cubeHelper
);

// 3. Update signature rendering to draw the signature image above the line
const oldSigDraw = `      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.35);
      doc.line(cx - 16, 163, cx + 16, 163);`;

const newSigDraw = `      // Render signature image if available
      if (s.sig) {
        try {
          doc.addImage(s.sig, 'PNG', cx - 13, 149, 26, 11);
        } catch (e) {
          console.warn('Signatory image embed warning:', e);
        }
      }

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.35);
      doc.line(cx - 16, 163, cx + 16, 163);`;

assetsCode = assetsCode.replace(oldSigDraw, newSigDraw);

fs.writeFileSync('frontend/certificate_assets.js', assetsCode);
console.log('Successfully updated frontend/certificate_assets.js with 3D isometric cubes, corner ribbons, and signatures!');
