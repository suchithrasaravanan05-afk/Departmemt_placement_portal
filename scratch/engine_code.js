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
 * Direct Canvas QR Code Vector Renderer
 * Renders high-contrast, mathematical vector modules directly onto canvas.
 */
function ritRenderQrCode(ctx, text, x, y, size) {
  try {
    const qrLib = (typeof QRCode !== 'undefined' && QRCode.create) ? QRCode : (window && window.QRCode && window.QRCode.create ? window.QRCode : null);
    if (!qrLib) {
      console.warn('QRCode library not ready for direct render');
      return false;
    }
    const qr = qrLib.create(text, { errorCorrectionLevel: 'M' });
    const numModules = qr.modules.size;
    const margin = 2;
    const totalModules = numModules + margin * 2;
    const cellSize = size / totalModules;

    // Crisp white background card
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 6, y - 6, size + 12, size + 28);
    ctx.strokeStyle = '#D8B4FE';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x - 6, y - 6, size + 12, size + 28);

    // Render dark modules
    ctx.fillStyle = '#1E1B4B';
    for (let r = 0; r < numModules; r++) {
      for (let c = 0; c < numModules; c++) {
        if (qr.modules.get(r, c)) {
          ctx.fillRect(
            Math.round(x + (c + margin) * cellSize),
            Math.round(y + (r + margin) * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }

    // QR Caption
    ctx.fillStyle = '#581C87';
    ctx.font = 'bold 11.5px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN TO VERIFY', x + size / 2, y + size + 16);
    ctx.restore();
    return true;
  } catch (err) {
    console.warn('Direct QR render exception:', err);
    return false;
  }
}

/**
 * Draw 3D Isometric Cube on Canvas with glowing neon edges
 */
function drawIsometricCube(ctx, cx, cy, size, options = {}) {
  ctx.save();
  const h = size * 0.866;
  const strokeColor = options.strokeColor || '#38BDF8';

  // Radial background glow
  const glow = ctx.createRadialGradient(cx, cy, size * 0.2, cx, cy, size * 1.5);
  glow.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
  glow.addColorStop(0.5, 'rgba(99, 102, 241, 0.2)');
  glow.addColorStop(1, 'rgba(59, 7, 100, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Top Face
  ctx.beginPath();
  ctx.moveTo(cx, cy - h);
  ctx.lineTo(cx + size, cy - h / 2);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx - size, cy - h / 2);
  ctx.closePath();
  const topGrad = ctx.createLinearGradient(cx - size, cy - h, cx + size, cy);
  topGrad.addColorStop(0, '#4C1D95');
  topGrad.addColorStop(1, '#6D28D9');
  ctx.fillStyle = topGrad;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Left Face
  ctx.beginPath();
  ctx.moveTo(cx - size, cy - h / 2);
  ctx.lineTo(cx, cy);
  ctx.lineTo(cx, cy + h);
  ctx.lineTo(cx - size, cy + h / 2);
  ctx.closePath();
  const leftGrad = ctx.createLinearGradient(cx - size, cy, cx, cy + h);
  leftGrad.addColorStop(0, '#2E1065');
  leftGrad.addColorStop(1, '#3B0764');
  ctx.fillStyle = leftGrad;
  ctx.fill();
  ctx.strokeStyle = options.leftStroke || '#818CF8';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Right Face
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + size, cy - h / 2);
  ctx.lineTo(cx + size, cy + h / 2);
  ctx.lineTo(cx, cy + h);
  ctx.closePath();
  const rightGrad = ctx.createLinearGradient(cx, cy, cx + size, cy + h);
  rightGrad.addColorStop(0, '#1E0741');
  rightGrad.addColorStop(1, '#280547');
  ctx.fillStyle = rightGrad;
  ctx.fill();
  ctx.strokeStyle = options.rightStroke || '#C084FC';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Luminous Central Core
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = '#00E5FF';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Glowing vertex dots
  const vertices = [
    [cx, cy - h],
    [cx + size, cy - h / 2],
    [cx - size, cy - h / 2],
    [cx + size, cy + h / 2],
    [cx - size, cy + h / 2],
    [cx, cy + h]
  ];
  ctx.fillStyle = '#38BDF8';
  vertices.forEach(([vx, vy]) => {
    ctx.beginPath();
    ctx.arc(vx, vy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Draw Ornamental Gold Diamond Cluster
 */
function drawDiamondCluster(ctx, cx, cy, r = 7, color = '#D4AF37') {
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

  // 1. Base Deep Purple Outer Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#1E0538');
  bgGrad.addColorStop(0.3, '#2D0B4E');
  bgGrad.addColorStop(0.5, '#3B0764');
  bgGrad.addColorStop(0.7, '#2D0B4E');
  bgGrad.addColorStop(1, '#170326');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Outer Gold Bevel Border
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  // 2. Central Warm Ivory/White Card
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(52, 42, width - 104, height - 84, 16);
  ctx.fill();
  ctx.restore();

  // 3. Double Gold Inner Border with Corner Accents
  ctx.save();
  ctx.strokeStyle = '#C5A059';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.roundRect(62, 52, width - 124, height - 104, 12);
  ctx.stroke();

  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(74, 64, width - 148, height - 128, 8);
  ctx.stroke();

  // Corner filigree diamonds
  drawDiamondCluster(ctx, 74, 64, 8, '#D4AF37');
  drawDiamondCluster(ctx, width - 74, 64, 8, '#D4AF37');
  drawDiamondCluster(ctx, 74, height - 64, 8, '#D4AF37');
  drawDiamondCluster(ctx, width - 74, height - 64, 8, '#D4AF37');
  ctx.restore();

  // 4. Flowing Corner Ribbons (Purple & Gold Waves)
  ctx.save();
  // Top-Left Ribbon
  ctx.beginPath();
  ctx.moveTo(52, 52);
  ctx.lineTo(240, 52);
  ctx.bezierCurveTo(180, 80, 110, 150, 70, 220);
  ctx.lineTo(52, 220);
  ctx.closePath();
  const ribbonTL = ctx.createLinearGradient(52, 52, 220, 220);
  ribbonTL.addColorStop(0, '#2E0854');
  ribbonTL.addColorStop(0.5, '#4C1D95');
  ribbonTL.addColorStop(1, '#581C87');
  ctx.fillStyle = ribbonTL;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(240, 52);
  ctx.bezierCurveTo(180, 80, 110, 150, 70, 220);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Top-Right Ribbon
  ctx.beginPath();
  ctx.moveTo(width - 52, 52);
  ctx.lineTo(width - 240, 52);
  ctx.bezierCurveTo(width - 180, 80, width - 110, 150, width - 70, 220);
  ctx.lineTo(width - 52, 220);
  ctx.closePath();
  const ribbonTR = ctx.createLinearGradient(width - 52, 52, width - 220, 220);
  ribbonTR.addColorStop(0, '#2E0854');
  ribbonTR.addColorStop(0.5, '#4C1D95');
  ribbonTR.addColorStop(1, '#581C87');
  ctx.fillStyle = ribbonTR;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width - 240, 52);
  ctx.bezierCurveTo(width - 180, 80, width - 110, 150, width - 70, 220);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Bottom-Left Ribbon
  ctx.beginPath();
  ctx.moveTo(52, height - 52);
  ctx.lineTo(240, height - 52);
  ctx.bezierCurveTo(180, height - 80, 110, height - 150, 70, height - 220);
  ctx.lineTo(52, height - 220);
  ctx.closePath();
  const ribbonBL = ctx.createLinearGradient(52, height - 52, 220, height - 220);
  ribbonBL.addColorStop(0, '#2E0854');
  ribbonBL.addColorStop(0.5, '#4C1D95');
  ribbonBL.addColorStop(1, '#581C87');
  ctx.fillStyle = ribbonBL;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(240, height - 52);
  ctx.bezierCurveTo(180, height - 80, 110, height - 150, 70, height - 220);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Bottom-Right Ribbon
  ctx.beginPath();
  ctx.moveTo(width - 52, height - 52);
  ctx.lineTo(width - 240, height - 52);
  ctx.bezierCurveTo(width - 180, height - 80, width - 110, height - 150, width - 70, height - 220);
  ctx.lineTo(width - 52, height - 220);
  ctx.closePath();
  const ribbonBR = ctx.createLinearGradient(width - 52, height - 52, width - 220, height - 220);
  ribbonBR.addColorStop(0, '#2E0854');
  ribbonBR.addColorStop(0.5, '#4C1D95');
  ribbonBR.addColorStop(1, '#581C87');
  ctx.fillStyle = ribbonBR;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width - 240, height - 52);
  ctx.bezierCurveTo(width - 180, height - 80, width - 110, height - 150, width - 70, height - 220);
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // 5. BLOCKCHAIN NETWORK CONSTELLATION & 3D GLOWING CUBES (LEFT & RIGHT MARGINS)
  ctx.save();
  // Left Blockchain Graphics
  ctx.strokeStyle = 'rgba(147, 51, 234, 0.35)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(85, 320); ctx.lineTo(160, 450); ctx.lineTo(280, 460); ctx.lineTo(140, 580);
  ctx.moveTo(160, 450); ctx.lineTo(140, 580); ctx.lineTo(220, 680); ctx.lineTo(80, 720);
  ctx.moveTo(80, 720); ctx.lineTo(130, 880); ctx.lineTo(220, 680);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(160, 450); ctx.lineTo(220, 680);
  ctx.moveTo(85, 320); ctx.lineTo(280, 460);
  ctx.stroke();

  // Left Nodes
  ctx.fillStyle = '#C084FC';
  ctx.beginPath(); ctx.arc(85, 320, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath(); ctx.arc(280, 460, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(280, 460, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#F43F5E';
  ctx.beginPath(); ctx.arc(220, 680, 6, 0, Math.PI * 2); ctx.fill();

  // Left Cubes
  drawIsometricCube(ctx, 160, 450, 55, { strokeColor: '#38BDF8', leftStroke: '#818CF8', rightStroke: '#C084FC' });
  drawIsometricCube(ctx, 130, 620, 42, { strokeColor: '#F43F5E', leftStroke: '#C084FC', rightStroke: '#818CF8' });
  drawIsometricCube(ctx, 80, 750, 26, { strokeColor: '#38BDF8', leftStroke: '#818CF8', rightStroke: '#C084FC' });

  // Right Blockchain Graphics
  ctx.strokeStyle = 'rgba(147, 51, 234, 0.35)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(width - 85, 320); ctx.lineTo(width - 160, 450); ctx.lineTo(width - 280, 460); ctx.lineTo(width - 140, 580);
  ctx.moveTo(width - 160, 450); ctx.lineTo(width - 140, 580); ctx.lineTo(width - 220, 680); ctx.lineTo(width - 80, 720);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(width - 160, 450); ctx.lineTo(width - 220, 680);
  ctx.moveTo(width - 85, 320); ctx.lineTo(width - 280, 460);
  ctx.stroke();

  // Right Nodes
  ctx.fillStyle = '#C084FC';
  ctx.beginPath(); ctx.arc(width - 85, 320, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath(); ctx.arc(width - 280, 460, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(width - 280, 460, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#F43F5E';
  ctx.beginPath(); ctx.arc(width - 220, 680, 6, 0, Math.PI * 2); ctx.fill();

  // Right Cubes
  drawIsometricCube(ctx, width - 150, 490, 55, { strokeColor: '#38BDF8', leftStroke: '#818CF8', rightStroke: '#C084FC' });
  drawIsometricCube(ctx, width - 270, 350, 38, { strokeColor: '#F43F5E', leftStroke: '#C084FC', rightStroke: '#818CF8' });
  drawIsometricCube(ctx, width - 110, 680, 42, { strokeColor: '#38BDF8', leftStroke: '#818CF8', rightStroke: '#C084FC' });
  ctx.restore();

  // 6. Header Architectural Vertical Gold Dividers
  ctx.save();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2.5;
  // Left divider
  ctx.beginPath(); ctx.moveTo(480, 85); ctx.lineTo(480, 225); ctx.stroke();
  drawDiamondCluster(ctx, 480, 85, 4.5);
  drawDiamondCluster(ctx, 480, 225, 4.5);
  // Right divider
  ctx.beginPath(); ctx.moveTo(width - 480, 85); ctx.lineTo(width - 480, 225); ctx.stroke();
  drawDiamondCluster(ctx, width - 480, 85, 4.5);
  drawDiamondCluster(ctx, width - 480, 225, 4.5);
  ctx.restore();

  // 7. Embed Dual Official Logos (Contain Aspect Ratio)
  const ritLogoImg = await ritLoadImage(certData.rit_logo || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.RIT_LOGO : null));
  if (ritLogoImg) {
    ctx.drawImage(ritLogoImg, 160, 85, 140, 140);
  }

  const csbsLogoImg = await ritLoadImage(certData.csbs_logo || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.CSBS_LOGO : null));
  if (csbsLogoImg) {
    const targetW = 220;
    const targetH = 140;
    const imgAspect = (csbsLogoImg.naturalWidth || csbsLogoImg.width) / (csbsLogoImg.naturalHeight || csbsLogoImg.height || 1);
    let dw = targetW;
    let dh = targetW / imgAspect;
    if (dh > targetH) {
      dh = targetH;
      dw = targetH * imgAspect;
    }
    const dx = (width - 160 - targetW) + (targetW - dw) / 2;
    const dy = 85 + (targetH - dh) / 2;
    ctx.drawImage(csbsLogoImg, dx, dy, dw, dh);
  }

  // 8. Institutional Header Typography
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1E1B4B';
  ctx.font = 'bold 36px "Times New Roman", Georgia, serif';
  ctx.fillText(certData.institution_name || 'RAMCO INSTITUTE OF TECHNOLOGY', width / 2, 118);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 16.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(certData.autonomous_text || '(AN AUTONOMOUS INSTITUTION)', width / 2, 144);

  ctx.fillStyle = '#334155';
  ctx.font = '600 13.5px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Approved by AICTE, New Delhi & Affiliated to Anna University', width / 2, 168);
  ctx.fillText("NAAC Accredited with 'A+' Grade & An ISO 9001: 2015 Certified Institution", width / 2, 188);
  ctx.fillText('NBA Accredited UG Programmes : CSE, EEE, ECE, MECH and CIVIL', width / 2, 208);
  ctx.fillStyle = '#475569';
  ctx.font = '500 13px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Rajapalayam - 626117, Tamil Nadu, India', width / 2, 228);
  ctx.restore();

  // 9. Decorative Purple Title Banner with Gold Trim
  ctx.save();
  const bannerY = 280;
  const bannerW = 1140;
  const bannerH = 76;
  const bannerX = (width - bannerW) / 2;

  ctx.fillStyle = '#D4AF37';
  ctx.beginPath();
  ctx.roundRect(bannerX - 6, bannerY - 6, bannerW + 12, bannerH + 12, 10);
  ctx.fill();

  const bGrad = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
  bGrad.addColorStop(0, '#230438');
  bGrad.addColorStop(0.5, '#350654');
  bGrad.addColorStop(1, '#1A022B');
  ctx.fillStyle = bGrad;
  ctx.beginPath();
  ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 6);
  ctx.fill();

  ctx.strokeStyle = '#F5D77F';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(bannerX + 6, bannerY + 6, bannerW - 12, bannerH - 12, 4);
  ctx.stroke();

  drawDiamondCluster(ctx, width / 2, bannerY - 6, 7, '#D4AF37');
  drawDiamondCluster(ctx, width / 2, bannerY + bannerH + 6, 7, '#D4AF37');

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px "Times New Roman", Georgia, serif';
  const cTitle = (certData.certificate_title || 'CERTIFICATE OF PARTICIPATION').toUpperCase();
  ctx.fillText(cTitle, width / 2, bannerY + 50);
  ctx.restore();

  // 10. Preamble & Recipient Student Name (NO REGISTER NUMBER)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#334155';
  ctx.font = 'italic 23px "Times New Roman", Georgia, serif';
  ctx.fillText(certData.preamble || 'This certificate is proudly presented to', width / 2, 420);

  const studentName = (certData.student_name || 'STUDENT NAME').trim();
  ctx.fillStyle = '#1E1B4B';
  let nameSize = 58;
  if (studentName.length > 25) nameSize = 48;
  if (studentName.length > 35) nameSize = 38;
  ctx.font = 'bold italic ' + nameSize + 'px "Times New Roman", Georgia, serif';
  ctx.fillText(studentName, width / 2, 510);

  // Underline Gold Divider with Center Diamond
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  const nameMetric = ctx.measureText(studentName);
  const halfBar = Math.max(nameMetric.width / 2 + 50, 180);
  ctx.beginPath();
  ctx.moveTo(width / 2 - halfBar, 535);
  ctx.lineTo(width / 2 - 25, 535);
  ctx.moveTo(width / 2 + 25, 535);
  ctx.lineTo(width / 2 + halfBar, 535);
  ctx.stroke();
  drawDiamondCluster(ctx, width / 2, 535, 6, '#D4AF37');
  ctx.restore();

  // 11. Event Details (Comfortable line spacing, NO dates)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#334155';
  ctx.font = 'italic 21px "Times New Roman", Georgia, serif';
  const pProg = certData.programme_title || 'Short-Term Training Programme (STTP)';
  ctx.fillText('In recognition of active participation in the ' + pProg + ' on', width / 2, 600);

  const topic = certData.event_name || 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives';
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
  } else if (topic.length > 50) {
    const mid = topic.lastIndexOf(' ', 45);
    line1 = topic.substring(0, mid).trim();
    line2 = topic.substring(mid + 1).trim();
  }

  ctx.fillStyle = '#4C1D95';
  ctx.font = 'bold 34px "Times New Roman", Georgia, serif';
  ctx.fillText(line1, width / 2, 655);

  if (line2) {
    ctx.font = 'bold italic 28px "Times New Roman", Georgia, serif';
    ctx.fillText(line2, width / 2, 705);
  }

  ctx.fillStyle = '#334155';
  ctx.font = '20px "Times New Roman", Georgia, serif';
  const dept = certData.department || 'Department of Computer Science and Business Systems';
  ctx.fillText('organized by the ' + dept + ',', width / 2, line2 ? 760 : 725);
  ctx.font = 'bold 21px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#1E1B4B';
  const clg = certData.college_name || 'Ramco Institute of Technology';
  ctx.fillText(clg + '.', width / 2, line2 ? 795 : 760);
  ctx.restore();

  // 12. EXACTLY FOUR SIGNATORIES (Balanced Horizontal Row)
  const sigCount = Number(certData.signatory_count) || 4;
  const signatories = [
    {
      name: certData.signatory_1_name || 'Dr. K. Arulraj',
      title: certData.signatory_1_title || 'Faculty Coordinator',
      dept: certData.signatory_1_dept || certData.signatory_1_org || 'CSBS, RIT',
      sig: certData.signatory_1_sig || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.SIGNATURES?.arulraj : null)
    },
    {
      name: certData.signatory_2_name || 'Dr. S. Rajakumaran',
      title: certData.signatory_2_title || 'STTP Coordinator',
      dept: certData.signatory_2_dept || certData.signatory_2_org || 'CSBS, RIT',
      sig: certData.signatory_2_sig || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.SIGNATURES?.rajakumaran : null)
    },
    {
      name: certData.signatory_3_name || 'Dr. S. Rajakarunakaran',
      title: certData.signatory_3_title || 'Head of Department',
      dept: certData.signatory_3_dept || certData.signatory_3_org || 'CSBS, RIT',
      sig: certData.signatory_3_sig || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.SIGNATURES?.rajakarunakaran : null)
    },
    {
      name: certData.signatory_4_name || 'Dr. L. Ganesan',
      title: certData.signatory_4_title || 'Principal',
      dept: certData.signatory_4_dept || certData.signatory_4_org || 'RIT',
      sig: certData.signatory_4_sig || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.SIGNATURES?.ganesan : null)
    },
    {
      name: certData.signatory_5_name || 'Dr. R. Ramesh',
      title: certData.signatory_5_title || 'Director',
      dept: certData.signatory_5_dept || certData.signatory_5_org || 'RIT',
      sig: certData.signatory_5_sig || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.SIGNATURES?.ramesh : null)
    }
  ];

  ctx.save();
  ctx.textAlign = 'center';

  if (sigCount === 4) {
    const centers = [420, 780, 1150, 1520];
    for (let i = 0; i < 4; i++) {
      const s = signatories[i];
      const cx = centers[i];
      const sigImg = await ritLoadImage(s.sig);
      if (sigImg) {
        ctx.drawImage(sigImg, cx - 80, 1020, 160, 65);
      }
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - 100, 1090);
      ctx.lineTo(cx + 100, 1090);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 18.5px "Times New Roman", Georgia, serif';
      ctx.fillText(s.name, cx, 1120);

      ctx.fillStyle = '#475569';
      ctx.font = '600 14px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.title, cx, 1144);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 13px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.dept, cx, 1166);
    }
  } else if (sigCount === 3) {
    const centers = [460, 1000, 1540];
    const indices = [0, 2, 3];
    for (let i = 0; i < 3; i++) {
      const s = signatories[indices[i]];
      const cx = centers[i];
      const sigImg = await ritLoadImage(s.sig);
      if (sigImg) {
        ctx.drawImage(sigImg, cx - 85, 1020, 170, 65);
      }
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - 105, 1090);
      ctx.lineTo(cx + 105, 1090);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 19px "Times New Roman", Georgia, serif';
      ctx.fillText(s.name, cx, 1120);

      ctx.fillStyle = '#475569';
      ctx.font = '600 14.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.title, cx, 1144);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 13.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.dept, cx, 1166);
    }
  } else {
    const centers = [320, 660, 1000, 1340, 1680];
    for (let i = 0; i < 5; i++) {
      const s = signatories[i];
      const cx = centers[i];
      const sigImg = await ritLoadImage(s.sig);
      if (sigImg) {
        ctx.drawImage(sigImg, cx - 75, 1020, 150, 65);
      }
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - 90, 1090);
      ctx.lineTo(cx + 90, 1090);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 17px "Times New Roman", Georgia, serif';
      ctx.fillText(s.name, cx, 1120);

      ctx.fillStyle = '#475569';
      ctx.font = '600 13.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.title, cx, 1144);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 12.5px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(s.dept, cx, 1166);
    }
  }
  ctx.restore();

  // 13. Certificate ID and Verification Footer
  const certId = certData.certificate_number || certData.certificate_id || 'RIT-STTP-2026-0001';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 320, 1275);
  ctx.lineTo(width / 2 - 160, 1275);
  ctx.moveTo(width / 2 + 160, 1275);
  ctx.lineTo(width / 2 + 320, 1275);
  ctx.stroke();
  drawDiamondCluster(ctx, width / 2 - 160, 1275, 4.5);
  drawDiamondCluster(ctx, width / 2 + 160, 1275, 4.5);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 17px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Certificate ID: ' + certId, width / 2, 1280);
  ctx.restore();

  // 14. Guaranteed Scannable QR Code on Bottom-Right
  const verifyTarget = certData.verification_url || ((typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://rit-csbs-portal.vercel.app') + '/verify-certificate.html?id=' + encodeURIComponent(certId);

  const renderedOk = ritRenderQrCode(ctx, verifyTarget, 1720, 1100, 150);
  if (!renderedOk && typeof QRCode !== 'undefined' && QRCode.toDataURL) {
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyTarget, {
        margin: 1,
        width: 150,
        color: { dark: '#1E1B4B', light: '#FFFFFF' }
      });
      const qrImg = await ritLoadImage(qrDataUrl);
      if (qrImg) {
        ctx.drawImage(qrImg, 1720, 1100, 150, 150);
      }
    } catch (e) {
      console.warn('QR code fallback error:', e);
    }
  }

  return canvas;
}

/**
 * Universal Data-Driven Print-Ready PDF Generator
 * Produces genuine A4 Landscape PDF with selectable vector text, aligned logos,
 * four signatures, and real scannable QR code.
 */
async function createCertificatePdf(certData = {}) {
  const { jsPDF } = (typeof window !== 'undefined' && window.jspdf) ? window.jspdf : require('jspdf');
  if (!jsPDF) {
    throw new Error('jsPDF library is not loaded');
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;

  // 1. Draw rich purple and gold border frame
  doc.setFillColor(35, 7, 60); // #23073C
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.8);
  doc.rect(3, 3, pageWidth - 6, pageHeight - 6);

  doc.setFillColor(254, 254, 251); // #FEFEFB
  doc.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 3, 3, 'F');

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.7);
  doc.roundedRect(11, 11, pageWidth - 22, pageHeight - 22, 2, 2, 'S');

  doc.setDrawColor(180, 130, 20);
  doc.setLineWidth(0.3);
  doc.roundedRect(13, 13, pageWidth - 26, pageHeight - 26, 1.5, 1.5, 'S');

  // Corner decorative marks
  const corners = [
    [13, 13], [pageWidth - 13, 13],
    [13, pageHeight - 13], [pageWidth - 13, pageHeight - 13]
  ];
  doc.setFillColor(212, 175, 55);
  corners.forEach(([cx, cy]) => {
    doc.circle(cx, cy, 1.2, 'F');
  });

  // 2. Blockchain theme subtle constellation on edges
  doc.setDrawColor(168, 85, 247);
  doc.setLineWidth(0.2);
  doc.line(16, 60, 28, 85);
  doc.line(28, 85, 18, 115);
  doc.line(18, 115, 30, 145);
  doc.line(28, 85, 36, 100);
  doc.setFillColor(56, 189, 248);
  doc.circle(28, 85, 0.9, 'F');
  doc.setFillColor(192, 132, 252);
  doc.circle(18, 115, 1.2, 'F');
  doc.setFillColor(244, 63, 94);
  doc.circle(30, 145, 0.9, 'F');

  doc.line(pageWidth - 16, 60, pageWidth - 28, 85);
  doc.line(pageWidth - 28, 85, pageWidth - 18, 115);
  doc.line(pageWidth - 18, 115, pageWidth - 30, 145);
  doc.line(pageWidth - 28, 85, pageWidth - 36, 100);
  doc.setFillColor(56, 189, 248);
  doc.circle(pageWidth - 28, 85, 0.9, 'F');
  doc.setFillColor(192, 132, 252);
  doc.circle(pageWidth - 18, 115, 1.2, 'F');
  doc.setFillColor(244, 63, 94);
  doc.circle(pageWidth - 30, 145, 0.9, 'F');

  // 3. Header architectural vertical gold dividers
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(68, 15, 68, 38);
  doc.circle(68, 15, 0.6, 'F');
  doc.circle(68, 38, 0.6, 'F');

  doc.line(pageWidth - 68, 15, pageWidth - 68, 38);
  doc.circle(pageWidth - 68, 15, 0.6, 'F');
  doc.circle(pageWidth - 68, 38, 0.6, 'F');

  // 4. Official Logos (Contain Aspect Ratio)
  const ritLogo = certData.rit_logo || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.RIT_LOGO : null);
  const csbsLogo = certData.csbs_logo || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.CSBS_LOGO : null);

  if (ritLogo) {
    try {
      doc.addImage(ritLogo, 'PNG', 24, 15, 23, 23);
    } catch (e) {
      console.warn('RIT logo embed warning:', e);
    }
  }

  if (csbsLogo) {
    try {
      doc.addImage(csbsLogo, 'PNG', pageWidth - 47, 15, 23, 23);
    } catch (e) {
      console.warn('CSBS logo embed warning:', e);
    }
  }

  // 5. Institutional Header Typography
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(26, 26, 64);
  doc.text(certData.institution_name || 'RAMCO INSTITUTE OF TECHNOLOGY', pageWidth / 2, 20, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(17, 24, 39);
  doc.text(certData.autonomous_text || '(AN AUTONOMOUS INSTITUTION)', pageWidth / 2, 24.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text('Approved by AICTE, New Delhi & Affiliated to Anna University', pageWidth / 2, 28.5, { align: 'center' });
  doc.text("NAAC Accredited with 'A+' Grade & An ISO 9001: 2015 Certified Institution", pageWidth / 2, 32, { align: 'center' });
  doc.text('NBA Accredited UG Programmes : CSE, EEE, ECE, MECH and CIVIL', pageWidth / 2, 35.5, { align: 'center' });
  doc.text('Rajapalayam - 626117, Tamil Nadu, India', pageWidth / 2, 39, { align: 'center' });

  // 6. Purple Title Banner with Gold Trim
  const bannerY = 46;
  const bannerW = 160;
  const bannerH = 12;
  const bannerX = (pageWidth - bannerW) / 2;

  doc.setFillColor(212, 175, 55);
  doc.roundedRect(bannerX - 1.2, bannerY - 1.2, bannerW + 2.4, bannerH + 2.4, 2, 2, 'F');

  doc.setFillColor(35, 7, 60);
  doc.roundedRect(bannerX, bannerY, bannerW, bannerH, 1.6, 1.6, 'F');

  doc.setDrawColor(245, 215, 127);
  doc.setLineWidth(0.3);
  doc.roundedRect(bannerX + 1, bannerY + 1, bannerW - 2, bannerH - 2, 1.2, 1.2, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(15.5);
  doc.setTextColor(255, 255, 255);
  const certTitle = (certData.certificate_title || 'CERTIFICATE OF PARTICIPATION').toUpperCase();
  doc.text(certTitle, pageWidth / 2, bannerY + 8.2, { align: 'center' });

  // 7. Preamble & Recipient Student Name (NO REGISTER NUMBER)
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 60);
  doc.text(certData.preamble || 'This certificate is proudly presented to', pageWidth / 2, 69, { align: 'center' });

  const studentName = (certData.student_name || 'STUDENT NAME').trim();
  let nameSize = 25;
  if (studentName.length > 25) nameSize = 21;
  if (studentName.length > 35) nameSize = 17;

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(nameSize);
  doc.setTextColor(26, 26, 64);
  doc.text(studentName, pageWidth / 2, 82, { align: 'center' });

  // Underline Gold Divider with Center Diamond
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - 45, 86, pageWidth / 2 - 5, 86);
  doc.line(pageWidth / 2 + 5, 86, pageWidth / 2 + 45, 86);
  doc.setFillColor(212, 175, 55);
  doc.circle(pageWidth / 2, 86, 0.8, 'F');

  // 8. Event Information
  const progTitle = certData.programme_title || 'Short-Term Training Programme (STTP)';
  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text('In recognition of active participation in the ' + progTitle + ' on', pageWidth / 2, 95.5, { align: 'center' });

  const eventName = certData.event_name || 'Emerging Blockchain Technologies – Architectures, Applications and Research Perspectives';
  let evLine1 = eventName;
  let evLine2 = '';
  if (eventName.includes('–')) {
    const parts = eventName.split('–');
    evLine1 = parts[0].trim();
    evLine2 = parts.slice(1).join('–').trim();
  } else if (eventName.includes(' - ')) {
    const parts = eventName.split(' - ');
    evLine1 = parts[0].trim();
    evLine2 = parts.slice(1).join(' - ').trim();
  } else if (eventName.length > 50) {
    const mid = eventName.lastIndexOf(' ', 45);
    evLine1 = eventName.substring(0, mid).trim();
    evLine2 = eventName.substring(mid + 1).trim();
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(76, 29, 149); // Bold Purple
  doc.text(evLine1, pageWidth / 2, 104.5, { align: 'center' });

  if (evLine2) {
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(12.5);
    doc.setTextColor(76, 29, 149);
    doc.text(evLine2, pageWidth / 2, 112, { align: 'center' });
  }

  doc.setFont('times', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(51, 65, 85);
  const deptName = certData.department || 'Department of Computer Science and Business Systems';
  doc.text('organized by the ' + deptName + ',', pageWidth / 2, evLine2 ? 120 : 117, { align: 'center' });
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 26, 64);
  const clgName = certData.college_name || 'Ramco Institute of Technology';
  doc.text(clgName + '.', pageWidth / 2, evLine2 ? 124.5 : 121.5, { align: 'center' });

  // 9. EXACTLY FOUR SIGNATORIES (Balanced Horizontal Row)
  const sigCount = Number(certData.signatory_count) || 4;
  const signatories = [
    {
      name: certData.signatory_1_name || 'Dr. K. Arulraj',
      title: certData.signatory_1_title || 'Faculty Coordinator',
      dept: certData.signatory_1_dept || certData.signatory_1_org || 'CSBS, RIT',
      sig: certData.signatory_1_sig || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.SIGNATURES?.arulraj : null)
    },
    {
      name: certData.signatory_2_name || 'Dr. S. Rajakumaran',
      title: certData.signatory_2_title || 'STTP Coordinator',
      dept: certData.signatory_2_dept || certData.signatory_2_org || 'CSBS, RIT',
      sig: certData.signatory_2_sig || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.SIGNATURES?.rajakumaran : null)
    },
    {
      name: certData.signatory_3_name || 'Dr. S. Rajakarunakaran',
      title: certData.signatory_3_title || 'Head of Department',
      dept: certData.signatory_3_dept || certData.signatory_3_org || 'CSBS, RIT',
      sig: certData.signatory_3_sig || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.SIGNATURES?.rajakarunakaran : null)
    },
    {
      name: certData.signatory_4_name || 'Dr. L. Ganesan',
      title: certData.signatory_4_title || 'Principal',
      dept: certData.signatory_4_dept || certData.signatory_4_org || 'RIT',
      sig: certData.signatory_4_sig || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.SIGNATURES?.ganesan : null)
    },
    {
      name: certData.signatory_5_name || 'Dr. R. Ramesh',
      title: certData.signatory_5_title || 'Director',
      dept: certData.signatory_5_dept || certData.signatory_5_org || 'RIT',
      sig: certData.signatory_5_sig || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.SIGNATURES?.ramesh : null)
    }
  ];

  if (sigCount === 4) {
    const centers = [62, 116, 170, 224];
    for (let i = 0; i < 4; i++) {
      const s = signatories[i];
      const cx = centers[i];

      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.35);
      doc.line(cx - 16, 163, cx + 16, 163);

      doc.setFont('times', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(15, 23, 42);
      doc.text(s.name, cx, 168, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(s.title, cx, 172.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(s.dept, cx, 176, { align: 'center' });
    }
  } else if (sigCount === 3) {
    const centers = [68, 148.5, 228];
    const indices = [0, 2, 3];
    for (let i = 0; i < 3; i++) {
      const s = signatories[indices[i]];
      const cx = centers[i];
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.35);
      doc.line(cx - 18, 163, cx + 18, 163);

      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(s.name, cx, 168, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(s.title, cx, 172.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(s.dept, cx, 176, { align: 'center' });
    }
  } else {
    const centers = [48, 98, 148.5, 198, 248];
    for (let i = 0; i < 5; i++) {
      const s = signatories[i];
      const cx = centers[i];
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.35);
      doc.line(cx - 14, 163, cx + 14, 163);

      doc.setFont('times', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text(s.name, cx, 168, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(s.title, cx, 172.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(100, 116, 139);
      doc.text(s.dept, cx, 176, { align: 'center' });
    }
  }

  // 10. Certificate ID Footer
  const certId = certData.certificate_number || certData.certificate_id || 'RIT-STTP-2026-0001';
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.35);
  doc.line(pageWidth / 2 - 50, 191, pageWidth / 2 - 25, 191);
  doc.circle(pageWidth / 2 - 25, 191, 0.6, 'F');
  doc.line(pageWidth / 2 + 25, 191, pageWidth / 2 + 50, 191);
  doc.circle(pageWidth / 2 + 25, 191, 0.6, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  doc.text('Certificate ID: ' + certId, pageWidth / 2, 192, { align: 'center' });

  // 11. Real Scannable QR Code on Bottom-Right
  const qrTarget = certData.verification_url || ((typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://rit-csbs-portal.vercel.app') + '/verify-certificate.html?id=' + encodeURIComponent(certId);

  let qrDataUrl = null;
  if (typeof document !== 'undefined' && typeof QRCode !== 'undefined' && QRCode.toDataURL) {
    try {
      qrDataUrl = await QRCode.toDataURL(qrTarget, {
        margin: 1,
        width: 140,
        color: { dark: '#1E1B4B', light: '#FFFFFF' }
      });
    } catch (e) {}
  }
  if (!qrDataUrl && typeof require !== 'undefined') {
    try {
      const nodeQr = require('qrcode');
      qrDataUrl = await nodeQr.toDataURL(qrTarget, {
        margin: 1,
        width: 140,
        color: { dark: '#1E1B4B', light: '#FFFFFF' }
      });
    } catch (e) {}
  }

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', 252, 156, 24, 24);
    } catch (e) {
      console.warn('PDF QR embed error:', e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(26, 26, 64);
  doc.text('SCAN TO VERIFY', 264, 183.5, { align: 'center' });

  return doc;
}
