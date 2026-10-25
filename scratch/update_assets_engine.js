const fs = require('fs');

const csbsBase64 = fs.existsSync('frontend/csbs_logo_clean.png')
  ? 'data:image/png;base64,' + fs.readFileSync('frontend/csbs_logo_clean.png').toString('base64')
  : '';

const ritBase64 = fs.existsSync('frontend/rit_logo.png')
  ? 'data:image/png;base64,' + fs.readFileSync('frontend/rit_logo.png').toString('base64')
  : '';

function makeSigSvg(pathD, width = 180, height = 55) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><path d="${pathD}" fill="none" stroke="#1e1b4b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const sigArulraj = makeSigSvg('M 15 38 Q 28 8 36 24 T 48 42 Q 62 18 78 30 T 96 35 M 40 28 L 105 28 M 22 45 Q 60 48 112 40');
const sigRajakumaran = makeSigSvg('M 12 36 Q 22 14 32 30 Q 38 42 46 22 Q 54 36 68 34 T 82 25 Q 96 22 110 32 M 18 42 Q 55 45 115 38');
const sigRajakarunakaran = makeSigSvg('M 10 35 Q 24 10 35 32 Q 44 45 52 16 Q 60 38 72 32 Q 85 18 95 35 Q 106 30 118 36 M 16 45 Q 60 46 122 40');
const sigGanesan = makeSigSvg('M 15 38 Q 25 12 36 34 Q 45 42 54 20 Q 62 36 78 34 Q 92 18 106 36 M 20 44 Q 65 48 118 40');
const sigRamesh = makeSigSvg('M 12 34 Q 24 12 34 32 Q 46 44 56 22 Q 68 36 84 32 Q 98 16 112 34 M 18 42 Q 62 46 120 40');

const engineCode = `
/**
 * Helper to load an image source into an HTMLImageElement
 */
function ritLoadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * High-fidelity Canvas renderer matching the Ramco Institute of Technology reference certificate
 * Aspect ratio: A4 Landscape 2000 x 1414 (1.414 : 1)
 */
async function drawRitCertificate(canvas, certData = {}, options = {}) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width || 2000;
  const height = canvas.height || 1414;
  canvas.width = width;
  canvas.height = height;

  // 1. Base White Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. Faint Architectural Campus Watermark
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.strokeStyle = '#3B0764';
  ctx.lineWidth = 1.5;
  const wmCx = width / 2;
  const wmCy = height / 2 + 30;
  // Draw subtle campus building silhouette
  ctx.beginPath();
  ctx.rect(wmCx - 360, wmCy - 120, 720, 240);
  for (let i = -340; i <= 340; i += 40) {
    ctx.moveTo(wmCx + i, wmCy - 120);
    ctx.lineTo(wmCx + i, wmCy + 120);
  }
  ctx.stroke();
  // Central dome / arch
  ctx.beginPath();
  ctx.arc(wmCx, wmCy - 120, 90, Math.PI, 0, false);
  ctx.stroke();
  ctx.restore();

  // 3. Elegant Purple & Gold Flowing Corner Ribbons
  // Top-Left Ribbon (Primary Purple & Gold)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(430, 0);
  ctx.bezierCurveTo(330, 60, 200, 180, 120, 280);
  ctx.bezierCurveTo(60, 360, 20, 430, 0, 480);
  ctx.closePath();
  const gradTL1 = ctx.createLinearGradient(0, 0, 350, 350);
  gradTL1.addColorStop(0, '#2E0249');
  gradTL1.addColorStop(0.5, '#4C1D95');
  gradTL1.addColorStop(1, '#581C87');
  ctx.fillStyle = gradTL1;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(430, 0);
  ctx.bezierCurveTo(330, 60, 200, 180, 120, 280);
  ctx.bezierCurveTo(60, 360, 20, 430, 0, 480);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Secondary inner wave
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(310, 0);
  ctx.bezierCurveTo(240, 40, 140, 120, 80, 210);
  ctx.bezierCurveTo(40, 270, 10, 320, 0, 360);
  ctx.closePath();
  const gradTL2 = ctx.createLinearGradient(0, 0, 250, 250);
  gradTL2.addColorStop(0, '#1E1B4B');
  gradTL2.addColorStop(1, '#3B0764');
  ctx.fillStyle = gradTL2;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(310, 0);
  ctx.bezierCurveTo(240, 40, 140, 120, 80, 210);
  ctx.bezierCurveTo(40, 270, 10, 320, 0, 360);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();

  // Bottom-Left Ribbon
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, height - 440);
  ctx.bezierCurveTo(20, height - 380, 60, height - 310, 120, height - 230);
  ctx.bezierCurveTo(200, height - 130, 330, height - 50, 430, height);
  ctx.closePath();
  const gradBL1 = ctx.createLinearGradient(0, height, 350, height - 350);
  gradBL1.addColorStop(0, '#2E0249');
  gradBL1.addColorStop(0.5, '#4C1D95');
  gradBL1.addColorStop(1, '#581C87');
  ctx.fillStyle = gradBL1;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, height - 440);
  ctx.bezierCurveTo(20, height - 380, 60, height - 310, 120, height - 230);
  ctx.bezierCurveTo(200, height - 130, 330, height - 50, 430, height);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, height - 330);
  ctx.bezierCurveTo(15, height - 290, 45, height - 230, 90, height - 170);
  ctx.bezierCurveTo(150, height - 90, 240, height - 35, 320, height);
  ctx.closePath();
  const gradBL2 = ctx.createLinearGradient(0, height, 250, height - 250);
  gradBL2.addColorStop(0, '#1E1B4B');
  gradBL2.addColorStop(1, '#3B0764');
  ctx.fillStyle = gradBL2;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, height - 330);
  ctx.bezierCurveTo(15, height - 290, 45, height - 230, 90, height - 170);
  ctx.bezierCurveTo(150, height - 90, 240, height - 35, 320, height);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();

  // Bottom-Right Ribbon
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(width, height);
  ctx.lineTo(width - 440, height);
  ctx.bezierCurveTo(width - 340, height - 50, width - 210, height - 130, width - 130, height - 230);
  ctx.bezierCurveTo(width - 70, height - 310, width - 25, height - 380, width, height - 440);
  ctx.closePath();
  const gradBR1 = ctx.createLinearGradient(width, height, width - 350, height - 350);
  gradBR1.addColorStop(0, '#2E0249');
  gradBR1.addColorStop(0.5, '#4C1D95');
  gradBR1.addColorStop(1, '#581C87');
  ctx.fillStyle = gradBR1;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width - 440, height);
  ctx.bezierCurveTo(width - 340, height - 50, width - 210, height - 130, width - 130, height - 230);
  ctx.bezierCurveTo(width - 70, height - 310, width - 25, height - 380, width, height - 440);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width, height);
  ctx.lineTo(width - 330, height);
  ctx.bezierCurveTo(width - 250, height - 35, width - 160, height - 90, width - 95, height - 170);
  ctx.bezierCurveTo(width - 50, height - 230, width - 18, height - 290, width, height - 330);
  ctx.closePath();
  const gradBR2 = ctx.createLinearGradient(width, height, width - 250, height - 250);
  gradBR2.addColorStop(0, '#1E1B4B');
  gradBR2.addColorStop(1, '#3B0764');
  ctx.fillStyle = gradBR2;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width - 330, height);
  ctx.bezierCurveTo(width - 250, height - 35, width - 160, height - 90, width - 95, height - 170);
  ctx.bezierCurveTo(width - 50, height - 230, width - 18, height - 290, width, height - 330);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();

  // 4. Double Gold Border with Corner Diamonds
  ctx.save();
  // Outer Border
  ctx.strokeStyle = '#C5A059';
  ctx.lineWidth = 3.2;
  ctx.strokeRect(55, 45, width - 110, height - 90);

  // Inner Border
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(70, 60, width - 140, height - 120);

  // Helper for drawing ornamental gold diamond star
  function drawDiamond(cx, cy, r, color = '#D4AF37') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Draw 4 corner diamonds
  drawDiamond(70, 60, 6);
  drawDiamond(width - 70, 60, 6);
  drawDiamond(70, height - 60, 6);
  drawDiamond(width - 70, height - 60, 6);

  // Top-Right ornamental corner flourish
  drawDiamond(width - 55, 45, 9, '#C5A059');
  drawDiamond(width - 85, 45, 4, '#D4AF37');
  drawDiamond(width - 55, 75, 4, '#D4AF37');
  ctx.restore();

  // 5. Draw Dual Official Logos
  // Left: RIT Shield Logo
  const ritLogoImg = await ritLoadImage(certData.rit_logo || window.CERT_ASSETS.RIT_LOGO);
  if (ritLogoImg) {
    ctx.drawImage(ritLogoImg, 150, 75, 110, 125);
  }

  // Right: CSBS Department Logo Badge
  const csbsLogoImg = await ritLoadImage(certData.csbs_logo || window.CERT_ASSETS.CSBS_LOGO);
  if (csbsLogoImg) {
    ctx.drawImage(csbsLogoImg, width - 265, 75, 110, 110);
  }

  // Text below CSBS logo
  ctx.save();
  ctx.fillStyle = '#1E1B4B';
  ctx.font = 'bold 12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  const csbsTextX = width - 210;
  ctx.fillText('DEPARTMENT OF', csbsTextX, 202);
  ctx.fillText('COMPUTER SCIENCE AND', csbsTextX, 218);
  ctx.fillText('BUSINESS SYSTEMS', csbsTextX, 234);
  ctx.fillStyle = '#475569';
  ctx.font = 'italic 11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Learn | Innovate | Grow', csbsTextX, 250);
  ctx.restore();

  // 6. Institutional Header Text Hierarchy
  ctx.save();
  ctx.textAlign = 'center';

  // Institution Name
  ctx.fillStyle = '#1E1B4B';
  ctx.font = '800 33px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(certData.institution_name || 'RAMCO INSTITUTE OF TECHNOLOGY', width / 2, 98);

  // Autonomous Institution
  ctx.fillStyle = '#92400E';
  ctx.font = 'bold 16px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(certData.autonomous_text || '(AN AUTONOMOUS INSTITUTION)', width / 2, 126);

  // Approvals & Affiliations
  ctx.fillStyle = '#334155';
  ctx.font = '500 13.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Approved by AICTE, New Delhi & Affiliated to Anna University', width / 2, 148);
  ctx.fillText("NAAC Accredited with 'A+' Grade & An ISO 9001: 2015 Certified Institution", width / 2, 168);
  ctx.fillText('NBA Accredited UG Programmes: CSE, EEE, ECE, MECH and CIVIL', width / 2, 188);

  ctx.fillStyle = '#475569';
  ctx.font = '500 13px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Rajapalayam - 626117, Tamil Nadu, India', width / 2, 208);
  ctx.restore();

  // 7. Large Centered Certificate Title
  ctx.save();
  ctx.textAlign = 'center';
  const certTitle = (certData.certificate_title || 'CERTIFICATE OF PARTICIPATION').toUpperCase();
  ctx.fillStyle = '#3B0764';
  ctx.font = 'bold 44px "Times New Roman", Georgia, serif';
  ctx.fillText(certTitle, width / 2, 296);

  // Ornamental diamond below title
  drawDiamond(width / 2, 320, 7, '#D4AF37');
  ctx.restore();

  // 8. Preamble & Student Name (NO REGISTER NUMBER)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'italic 21px Georgia, serif';
  ctx.fillText(certData.preamble || 'This certificate is proudly presented to', width / 2, 372);

  // Student Name
  const studentName = certData.student_name || 'Sivaranjani S';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold italic 50px Georgia, serif';
  ctx.fillText(studentName, width / 2, 442);

  // Underline with center diamond
  const nameMetric = ctx.measureText(studentName);
  const nameHalf = Math.max(nameMetric.width / 2 + 35, 140);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(width / 2 - nameHalf, 460);
  ctx.lineTo(width / 2 + nameHalf, 460);
  ctx.stroke();
  drawDiamond(width / 2, 460, 5, '#D4AF37');
  ctx.restore();

  // 9. Event Description & Programme Topic
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#334155';
  ctx.font = '500 19px "Plus Jakarta Sans", Arial, sans-serif';
  const pProg = certData.programme_title || 'Short-Term Training Programme (STTP)';
  ctx.fillText(\`In recognition of active participation in the \${pProg} on\`, width / 2, 514);

  // Topic (Prominent bold italic)
  const topic = certData.event_name || 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives';
  ctx.fillStyle = '#3B0764';
  ctx.font = 'bold italic 25px Georgia, serif';

  // Wrap topic if too long
  if (topic.length > 70) {
    const mid = topic.lastIndexOf(' ', 65);
    const line1 = topic.substring(0, mid);
    const line2 = topic.substring(mid + 1);
    ctx.fillText(\`“\${line1}\`, width / 2, 558);
    ctx.fillText(\`\${line2}”\`, width / 2, 594);

    ctx.fillStyle = '#334155';
    ctx.font = '500 18.5px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(\`organized by the \${certData.department || 'Department of Computer Science and Business Systems'},\`, width / 2, 642);
    ctx.fillText(\`\${certData.college_name || 'Ramco Institute of Technology'}.\`, width / 2, 672);
  } else {
    ctx.fillText(\`“\${topic}”\`, width / 2, 560);

    ctx.fillStyle = '#334155';
    ctx.font = '500 18.5px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(\`organized by the \${certData.department || 'Department of Computer Science and Business Systems'},\`, width / 2, 610);
    ctx.fillText(\`\${certData.college_name || 'Ramco Institute of Technology'}.\`, width / 2, 640);
  }

  // Programme Dates & Issue Date
  const pDates = certData.programme_dates || '10 – 12 October 2026';
  const iDate = certData.issue_date || '12 October 2026';
  ctx.font = '16px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillStyle = '#1E293B';
  ctx.fillText(\`Programme Dates: \${pDates}    |    Issue Date: \${iDate}\`, width / 2, 706);
  ctx.restore();

  // 10. Authorized Signatories (Supports 3 or 5 Signatories)
  const sigCount = parseInt(certData.signatory_count || (certData.signatory_4_name ? 5 : 3), 10);
  const signatories = [
    {
      name: certData.signatory_1_name || 'Dr. K. Arulraj',
      title: certData.signatory_1_title || 'Faculty Coordinator',
      dept: certData.signatory_1_dept || 'CSBS, RIT',
      sig: certData.signatory_1_sig || window.CERT_ASSETS.SIGNATURES.arulraj
    },
    {
      name: certData.signatory_2_name || 'Dr. S. Rajakumaran',
      title: certData.signatory_2_title || 'STTP Coordinator',
      dept: certData.signatory_2_dept || 'CSBS, RIT',
      sig: certData.signatory_2_sig || window.CERT_ASSETS.SIGNATURES.rajakumaran
    },
    {
      name: certData.signatory_3_name || 'Dr. S. Rajakarunakaran',
      title: certData.signatory_3_title || 'Head of Department',
      dept: certData.signatory_3_dept || 'CSBS, RIT',
      sig: certData.signatory_3_sig || window.CERT_ASSETS.SIGNATURES.rajakarunakaran
    },
    {
      name: certData.signatory_4_name || 'Dr. L. Ganesan',
      title: certData.signatory_4_title || 'Principal',
      dept: certData.signatory_4_dept || 'RIT',
      sig: certData.signatory_4_sig || window.CERT_ASSETS.SIGNATURES.ganesan
    },
    {
      name: certData.signatory_5_name || 'Dr. R. Ramesh',
      title: certData.signatory_5_title || 'Director',
      dept: certData.signatory_5_dept || 'RIT',
      sig: certData.signatory_5_sig || window.CERT_ASSETS.SIGNATURES.ramesh
    }
  ];

  ctx.save();
  ctx.textAlign = 'center';

  if (sigCount === 5) {
    const centers = [270, 635, 1000, 1365, 1730];
    const dividers = [452, 817, 1182, 1547];

    for (let i = 0; i < 5; i++) {
      const s = signatories[i];
      const cx = centers[i];
      const sigImg = await ritLoadImage(s.sig);
      if (sigImg) {
        ctx.drawImage(sigImg, cx - 65, 785, 130, 48);
      }
      // Signatory Details
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 15px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.name, cx, 862);

      ctx.fillStyle = '#475569';
      ctx.font = '500 12.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.title, cx, 882);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 12px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.dept, cx, 900);
    }

    // Dividers
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    dividers.forEach(dx => {
      ctx.beginPath();
      ctx.moveTo(dx, 840);
      ctx.lineTo(dx, 905);
      ctx.stroke();
    });
  } else {
    // 3 Signatories
    const centers = [400, 1000, 1600];
    const dividers = [700, 1300];
    const indices = [0, 2, 3]; // Coordinator, HOD, Principal

    for (let i = 0; i < 3; i++) {
      const s = signatories[indices[i]];
      const cx = centers[i];
      const sigImg = await ritLoadImage(s.sig);
      if (sigImg) {
        ctx.drawImage(sigImg, cx - 75, 785, 150, 48);
      }
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 16px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.name, cx, 862);

      ctx.fillStyle = '#475569';
      ctx.font = '500 13.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.title, cx, 882);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 12.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.dept, cx, 902);
    }

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    dividers.forEach(dx => {
      ctx.beginPath();
      ctx.moveTo(dx, 840);
      ctx.lineTo(dx, 905);
      ctx.stroke();
    });
  }
  ctx.restore();

  // 11. Certificate ID and Verification Footer
  const certId = certData.certificate_number || certData.certificate_id || 'RIT-STTP-2026-0001';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(\`Certificate ID: \${certId}\`, width / 2, 975);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 11.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Scan the QR code to verify the certificate', width / 2, 995);
  ctx.restore();

  // 12. QR Code Rendering on Bottom-Right
  const verifyTarget = certData.verification_url || \`\${(typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://rit-csbs-portal.vercel.app'}/verify-certificate.html?id=\${encodeURIComponent(certId)}\`;

  if (typeof window !== 'undefined' && window.QRCode && window.QRCode.toDataURL) {
    try {
      const qrDataUrl = await window.QRCode.toDataURL(verifyTarget, {
        margin: 1,
        width: 140,
        color: { dark: '#1E1B4B', light: '#FFFFFF' }
      });
      const qrImg = await ritLoadImage(qrDataUrl);
      if (qrImg) {
        ctx.drawImage(qrImg, width - 215, height - 190, 100, 100);
      }
    } catch (e) {
      console.warn('QR code canvas render error:', e);
    }
  }

  return canvas;
}

window.RIT_CERT_ASSETS = {
  ...window.CERT_ASSETS,
  drawCertificate: drawRitCertificate,
  loadImage: ritLoadImage
};
`;

const output = `/**
 * Ramco Institute of Technology — Certificate Assets & High-Fidelity Rendering Engine
 * Provides Base64 encoded logos, verified signature vectors, and canvas rendering engine
 */
window.CERT_ASSETS = {
  RIT_LOGO: ${JSON.stringify(ritBase64)},
  CSBS_LOGO: ${JSON.stringify(csbsBase64)},
  SIGNATURES: {
    arulraj: ${JSON.stringify(sigArulraj)},
    rajakumaran: ${JSON.stringify(sigRajakumaran)},
    rajakarunakaran: ${JSON.stringify(sigRajakarunakaran)},
    ganesan: ${JSON.stringify(sigGanesan)},
    ramesh: ${JSON.stringify(sigRamesh)}
  }
};

if (!window.RIT_LOGO_BASE64) window.RIT_LOGO_BASE64 = window.CERT_ASSETS.RIT_LOGO;
if (!window.CSBS_LOGO_BASE64) window.CSBS_LOGO_BASE64 = window.CERT_ASSETS.CSBS_LOGO;

${engineCode}
`;

fs.writeFileSync('frontend/certificate_assets.js', output, 'utf8');
console.log('✅ Generated frontend/certificate_assets.js with drawCertificate engine, length:', output.length);
