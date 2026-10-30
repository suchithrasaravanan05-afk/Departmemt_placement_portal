import base64
import re

# 1. Read new background image
with open('frontend/certificate_background.png', 'rb') as f:
    bg_bytes = f.read()
new_bg_b64 = 'data:image/png;base64,' + base64.b64encode(bg_bytes).decode('utf-8')
print(f'New background image encoded: {len(new_bg_b64)} chars')

# 2. Read certificate_assets.js
with open('frontend/certificate_assets.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace BACKGROUND_IMAGE
old_bg_pattern = r'BACKGROUND_IMAGE:\s*"data:image/png;base64,[^"]+"'
if not re.search(old_bg_pattern, content):
    raise ValueError("BACKGROUND_IMAGE pattern not found")

content = re.sub(old_bg_pattern, f'BACKGROUND_IMAGE: "{new_bg_b64}"', content, count=1)
print("Updated BACKGROUND_IMAGE base64 in certificate_assets.js")

# 3. Add getBackgroundAsset helper
get_bg_code = '''
// Centralized Background Asset Resolver
function getBackgroundAsset() {
  if (typeof window === 'undefined' && typeof require !== 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const candidates = [
        path.join(__dirname, 'certificate_background.png'),
        path.join(__dirname, '..', 'frontend', 'certificate_background.png'),
        path.join(process.cwd(), 'frontend', 'certificate_background.png'),
        path.join(process.cwd(), 'certificate_background.png')
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          const buf = fs.readFileSync(cand);
          return `data:image/png;base64,${buf.toString('base64')}`;
        }
      }
    } catch (e) {
      console.warn('Node bg file read warning:', e);
    }
  }
  return (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.BACKGROUND_IMAGE : null);
}
'''

if 'function getBackgroundAsset' not in content:
    # insert before getLogoAsset
    idx = content.find('function getLogoAsset')
    if idx != -1:
        content = content[:idx] + get_bg_code + '\n' + content[idx:]
        print("Added getBackgroundAsset helper")
    else:
        print("Warning: getLogoAsset marker not found")

# Replace bgImgSrc and bgData references to use getBackgroundAsset()
content = content.replace(
    'const bgImgSrc = certData.background || (typeof window !== \'undefined\' && window.CERT_ASSETS ? window.CERT_ASSETS.BACKGROUND_IMAGE : null);',
    'const bgImgSrc = certData.background || getBackgroundAsset();'
)
content = content.replace(
    'const bgData = certData.background || (typeof window !== \'undefined\' && window.CERT_ASSETS ? window.CERT_ASSETS.BACKGROUND_IMAGE : null);',
    'const bgData = certData.background || getBackgroundAsset();'
)

# 4. Update Canvas NBA text (no period)
content = content.replace(
    "ctx.fillText('NBA Accredited UG Programs: CSE, EEE, MECH, ECE and CIVIL.', width / 2, Math.round(height * 0.183));",
    "ctx.fillText('NBA Accredited UG Programs: CSE, EEE, MECH, ECE and CIVIL', width / 2, Math.round(height * 0.183));"
)
content = content.replace(
    "ctx.fillText('NBA Accredited UG Programs: CSE, EEE, MECH, CIVIL, and ECE.', width / 2, Math.round(height * 0.183));",
    "ctx.fillText('NBA Accredited UG Programs: CSE, EEE, MECH, ECE and CIVIL', width / 2, Math.round(height * 0.183));"
)

# 5. Update jsPDF NBA text (no period)
old_jspdf_nba = """  let nbaText = certData.nba_text || 'NBA Accredited UG Programs: CSE, EEE, MECH, ECE and CIVIL.';
  if (nbaText.includes('CIVIL, and ECE')) {
    nbaText = nbaText.replace('CIVIL, and ECE', 'ECE and CIVIL');
  }
  doc.text(sanitizePdfText(nbaText), pageWidth / 2, 46.8, { align: 'center' });"""

new_jspdf_nba = """  let nbaText = certData.nba_text || 'NBA Accredited UG Programs: CSE, EEE, MECH, ECE and CIVIL';
  if (nbaText.includes('CIVIL, and ECE')) {
    nbaText = nbaText.replace('CIVIL, and ECE', 'ECE and CIVIL');
  }
  if (nbaText.endsWith('.')) {
    nbaText = nbaText.slice(0, -1);
  }
  doc.text(sanitizePdfText(nbaText), pageWidth / 2, 46.8, { align: 'center' });"""

if old_jspdf_nba in content:
    content = content.replace(old_jspdf_nba, new_jspdf_nba)
    print("Updated jsPDF NBA text")
else:
    print("Warning: old_jspdf_nba not found exact match")

# 6. Update jsPDF Separators and Patron position
# In jsPDF:
# const sigPositions = [30.2, 68.3, 108.5, 152.6, 188.5, 235.1];
# should be:
# const sigPositions = [30.2, 68.3, 108.5, 152.6, 191.0, 235.1];
content = content.replace(
    'const sigPositions = [30.2, 68.3, 108.5, 152.6, 188.5, 235.1];',
    'const sigPositions = [30.2, 68.3, 108.5, 152.6, 191.0, 235.1];'
)

# Separator 2 and 3
content = content.replace(
    'drawVerticalSep(171.8);',
    'drawVerticalSep(169.5);'
)
content = content.replace(
    'drawVerticalSep(211.5);',
    'drawVerticalSep(212.0);'
)

# Patron block in jsPDF
old_patron_block = """  // 5: Patron
  const sig5Name = certData.signatory_5_name || certData.signatory5_name || 'Dr. S. Rajakarunakaran';
  // Adjust horizontal signature underline slightly towards the left with signature centered above its underline
  const patronLineCenter = 187.5;
  const patronLineWidth = 28;
  renderSigBlock(certData.signatory_5_sig || defaultSigRoles[4], sigPositions[4], sig5Name, patronLineWidth, patronLineCenter, patronLineCenter);
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Patron', 188.0, sigLineY + 11.0, { align: 'center' });"""

new_patron_block = """  // 5: Patron
  const sig5Name = certData.signatory_5_name || certData.signatory5_name || 'Dr. S. Rajakarunakaran';
  const patronCenter = sigPositions[4]; // 191.0 mm (centered symmetrically between Sep 2 at 169.5 and Sep 3 at 212.0)
  const patronLineWidth = 28;
  renderSigBlock(certData.signatory_5_sig || defaultSigRoles[4], patronCenter, sig5Name, patronLineWidth, patronCenter, patronCenter);
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(74, 21, 75);
  doc.text('Patron', patronCenter, sigLineY + 11.0, { align: 'center' });"""

if old_patron_block in content:
    content = content.replace(old_patron_block, new_patron_block)
    print("Updated Patron jsPDF block")
else:
    print("Warning: old_patron_block not found exact match")

# 7. Update Canvas Separators and Patron position
# Canvas sigPositions:
content = content.replace(
    'Math.round(width * 0.633),',
    'Math.round(width * 0.643),'
)
# Canvas vertical separators:
content = content.replace(
    '[Math.round(width * 0.423), Math.round(width * 0.564), Math.round(width * 0.699)]',
    '[Math.round(width * 0.423), Math.round(width * 0.556), Math.round(width * 0.701)]'
)

# Canvas Patron i === 5 block:
old_canvas_patron = """    let sigCenterX = cx;
    let lineCenterX = cx;
    let lineWidth = 120;
    if (i === 5) {
      // Patron: adjust line slightly towards the left with signature centered above its underline
      lineCenterX = cx - 7;
      sigCenterX = cx - 7;
      lineWidth = 126;
    }"""

new_canvas_patron = """    let sigCenterX = cx;
    let lineCenterX = cx;
    let lineWidth = 120;
    if (i === 5) {
      // Patron: centered cleanly between Separator 2 and Separator 3
      lineCenterX = cx;
      sigCenterX = cx;
      lineWidth = 126;
    }"""

if old_canvas_patron in content:
    content = content.replace(old_canvas_patron, new_canvas_patron)
    print("Updated Canvas Patron block")
else:
    print("Warning: old_canvas_patron not found exact match")

with open('frontend/certificate_assets.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully written updated frontend/certificate_assets.js")

