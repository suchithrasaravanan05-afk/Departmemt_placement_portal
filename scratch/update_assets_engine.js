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
 * Clean design: White background, purple & gold corner ribbons, double gold borders,
 * prominent student name, comfortable line spacing, 5 aligned signatories,
 * NO vertical lines, NO dates, NO register numbers.
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

  // 2. Faint Architectural Campus Watermark (Smooth dome arch only, NO vertical lines or grids)
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#3B0764';
  ctx.lineWidth = 2;
  const wmCx = width / 2;
  const wmCy = height / 2 + 50;
  ctx.beginPath();
  ctx.arc(wmCx, wmCy - 60, 160, Math.PI, 0, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(wmCx, wmCy - 60, 120, Math.PI, 0, false);
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
  ctx.lineTo(width, height - 420);
  ctx.bezierCurveTo(width - 25, height - 360, width - 70, height - 290, width - 130, height - 220);
  ctx.bezierCurveTo(width - 210, height - 130, width - 330, height - 50, width - 420, height);
  ctx.closePath();
  const gradBR1 = ctx.createLinearGradient(width, height, width - 350, height - 350);
  gradBR1.addColorStop(0, '#2E0249');
  gradBR1.addColorStop(0.5, '#4C1D95');
  gradBR1.addColorStop(1, '#581C87');
  ctx.fillStyle = gradBR1;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width, height - 420);
  ctx.bezierCurveTo(width - 25, height - 360, width - 70, height - 290, width - 130, height - 220);
  ctx.bezierCurveTo(width - 210, height - 130, width - 330, height - 50, width - 420, height);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width, height);
  ctx.lineTo(width, height - 310);
  ctx.bezierCurveTo(width - 20, height - 270, width - 50, height - 210, width - 100, height - 160);
  ctx.bezierCurveTo(width - 160, height - 90, width - 240, height - 35, width - 310, height);
  ctx.closePath();
  const gradBR2 = ctx.createLinearGradient(width, height, width - 250, height - 250);
  gradBR2.addColorStop(0, '#1E1B4B');
  gradBR2.addColorStop(1, '#3B0764');
  ctx.fillStyle = gradBR2;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width, height - 310);
  ctx.bezierCurveTo(width - 20, height - 270, width - 50, height - 210, width - 100, height - 160);
  ctx.bezierCurveTo(width - 160, height - 90, width - 240, height - 35, width - 310, height);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();

  // 4. Double Gold Border with Corner Diamonds
  ctx.save();
  ctx.strokeStyle = '#C5A059';
  ctx.lineWidth = 3.2;
  ctx.strokeRect(55, 45, width - 110, height - 90);

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
    ctx.drawImage(ritLogoImg, 145, 75, 115, 130);
  }

  // Right: CSBS Department Logo Badge
  const csbsLogoImg = await ritLoadImage(certData.csbs_logo || window.CERT_ASSETS.CSBS_LOGO);
  if (csbsLogoImg) {
    ctx.drawImage(csbsLogoImg, width - 275, 75, 115, 115);
  }

  // Text below CSBS logo
  ctx.save();
  ctx.fillStyle = '#1E1B4B';
  ctx.font = 'bold 12.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.textAlign = 'center';
  const csbsTextX = width - 218;
  ctx.fillText('DEPARTMENT OF', csbsTextX, 206);
  ctx.fillText('COMPUTER SCIENCE AND', csbsTextX, 222);
  ctx.fillText('BUSINESS SYSTEMS', csbsTextX, 238);
  ctx.fillStyle = '#475569';
  ctx.font = 'italic 11.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Learn | Innovate | Grow', csbsTextX, 255);
  ctx.restore();

  // 6. Institutional Header Text Hierarchy
  ctx.save();
  ctx.textAlign = 'center';

  // Institution Name
  ctx.fillStyle = '#1E1B4B';
  ctx.font = '800 34px "Plus Jakarta Sans", Arial, sans-serif';
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
  ctx.font = 'bold 46px "Times New Roman", Georgia, serif';
  ctx.fillText(certTitle, width / 2, 310);

  // Ornamental diamond below title
  drawDiamond(width / 2, 336, 7, '#D4AF37');
  ctx.restore();

  // 8. Preamble & Student Name (NO REGISTER NUMBER)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#475569';
  ctx.font = 'italic 23px Georgia, serif';
  ctx.fillText(certData.preamble || 'This certificate is proudly presented to', width / 2, 405);

  // Student Name (Prominent bold italic serif with safe auto-scaling)
  const studentName = (certData.student_name || 'Sivaranjani S').trim();
  ctx.fillStyle = '#0F172A';
  let nameFontSize = 54;
  ctx.font = 'bold italic ' + nameFontSize + 'px Georgia, serif';
  let nameMetric = ctx.measureText(studentName);
  while (nameMetric.width > 1250 && nameFontSize > 32) {
    nameFontSize -= 2;
    ctx.font = 'bold italic ' + nameFontSize + 'px Georgia, serif';
    nameMetric = ctx.measureText(studentName);
  }
  ctx.fillText(studentName, width / 2, 480);

  // Elegant gold underline with center diamond
  const nameHalf = Math.max(nameMetric.width / 2 + 40, 150);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(width / 2 - nameHalf, 502);
  ctx.lineTo(width / 2 + nameHalf, 502);
  ctx.stroke();
  drawDiamond(width / 2, 502, 5, '#D4AF37');
  ctx.restore();

  // 9. Event Description & Programme Topic (Comfortable line spacing, NO dates)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#334155';
  ctx.font = '500 21px "Plus Jakarta Sans", Arial, sans-serif';
  const pProg = certData.programme_title || 'One Week STTP';
  ctx.fillText(\`In recognition of active participation in the \${pProg} on\`, width / 2, 570);

  // Topic formatting
  const topic = certData.event_name || 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives';
  ctx.fillStyle = '#3B0764';

  // Support splitting clean topic lines for STTP reference
  if (topic.includes('–') || topic.includes(' - ') || topic.length > 55) {
    let line1 = topic;
    let line2 = '';
    if (topic.includes('–')) {
      const parts = topic.split('–');
      line1 = parts[0].trim();
      line2 = parts.slice(1).join('–').trim();
    } else if (topic.includes(' - ')) {
      const parts = topic.split(' - ');
      line1 = parts[0].trim();
      line2 = parts.slice(1).join(' - ').trim();
    } else {
      const mid = topic.lastIndexOf(' ', 50);
      line1 = topic.substring(0, mid).trim();
      line2 = topic.substring(mid + 1).trim();
    }

    ctx.font = 'bold italic 29px Georgia, serif';
    ctx.fillText(\`“\${line1}\`, width / 2, 625);
    ctx.fillStyle = '#4C1D95';
    ctx.font = 'bold italic 25px Georgia, serif';
    ctx.fillText(\`\${line2}”\`, width / 2, 668);

    ctx.fillStyle = '#334155';
    ctx.font = '500 20px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(\`organized by the \${certData.department || 'Department of Computer Science and Business Systems'},\`, width / 2, 730);
    ctx.fillStyle = '#1E1B4B';
    ctx.font = '600 20px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(\`\${certData.college_name || 'Ramco Institute of Technology'}.\`, width / 2, 762);
  } else {
    ctx.font = 'bold italic 29px Georgia, serif';
    ctx.fillText(\`“\${topic}”\`, width / 2, 630);

    ctx.fillStyle = '#334155';
    ctx.font = '500 20px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(\`organized by the \${certData.department || 'Department of Computer Science and Business Systems'},\`, width / 2, 695);
    ctx.fillStyle = '#1E1B4B';
    ctx.font = '600 20px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(\`\${certData.college_name || 'Ramco Institute of Technology'}.\`, width / 2, 728);
  }
  ctx.restore();

  // 10. Authorized Signatories (5 Evenly Distributed & Aligned, NO vertical dividers)
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

    for (let i = 0; i < 5; i++) {
      const s = signatories[i];
      const cx = centers[i];
      const sigImg = await ritLoadImage(s.sig);
      if (sigImg) {
        ctx.drawImage(sigImg, cx - 75, 875, 150, 58);
      }
      // Signatory Details
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 17px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.name, cx, 965);

      ctx.fillStyle = '#475569';
      ctx.font = '600 13.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.title, cx, 988);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 12.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.dept, cx, 1008);
    }
  } else {
    // 3 Signatories
    const centers = [420, 1000, 1580];
    const indices = [0, 2, 3]; // Coordinator, HOD, Principal

    for (let i = 0; i < 3; i++) {
      const s = signatories[indices[i]];
      const cx = centers[i];
      const sigImg = await ritLoadImage(s.sig);
      if (sigImg) {
        ctx.drawImage(sigImg, cx - 85, 875, 170, 58);
      }
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 18px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.name, cx, 965);

      ctx.fillStyle = '#475569';
      ctx.font = '600 14px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.title, cx, 988);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 13px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.dept, cx, 1008);
    }
  }
  ctx.restore();

  // 11. Certificate ID and Verification Footer
  const certId = certData.certificate_number || certData.certificate_id || 'RIT-STTP-2026-0001';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(\`Certificate ID: \${certId}\`, width / 2, 1140);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 13px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Scan the QR code to verify the authenticity of this certificate', width / 2, 1165);
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
        ctx.drawImage(qrImg, width - 235, height - 215, 120, 120);
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
console.log('✅ Generated frontend/certificate_assets.js with redesigned drawCertificate engine, length:', output.length);
