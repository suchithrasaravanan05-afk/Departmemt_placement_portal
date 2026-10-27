const fs = require('fs');
const path = require('path');

const certAssetsPath = path.join(__dirname, '..', 'frontend', 'certificate_assets.js');
let content = fs.readFileSync(certAssetsPath, 'utf8');

// Load new signatures
const newSigs = JSON.parse(fs.readFileSync(path.join(__dirname, 'new_signatures_base64.json'), 'utf8'));

// 1. Locate SIGNATURES: { ... }
const sigStart = content.indexOf('SIGNATURES: {');
if (sigStart === -1) {
  throw new Error('Could not find SIGNATURES: { in certificate_assets.js');
}

let braceCount = 0;
let started = false;
let sigEnd = -1;
for (let i = sigStart; i < content.length; i++) {
  if (content[i] === '{') {
    braceCount++;
    started = true;
  } else if (content[i] === '}') {
    braceCount--;
    if (started && braceCount === 0) {
      sigEnd = i + 1;
      break;
    }
  }
}

const formattedSigs = 'SIGNATURES: ' + JSON.stringify(newSigs, null, 2);
content = content.substring(0, sigStart) + formattedSigs + content.substring(sigEnd);

// 2. Replace getSignatoryAsset function
const getSigStart = content.indexOf('function getSignatoryAsset');
const arabesqueStart = content.indexOf('// 4. Vector Ornamental Arabesque Divider for Canvas');

if (getSigStart === -1 || arabesqueStart === -1) {
  throw new Error('Could not locate getSignatoryAsset boundaries');
}

const newGetSignatoryAsset = `function getSignatoryAsset(keyOrObj) {
  if (!keyOrObj) return null;
  if (typeof keyOrObj === 'object') {
    if (keyOrObj.sig) return getSignatoryAsset(keyOrObj.sig);
    if (keyOrObj.name) return getSignatoryAsset(keyOrObj.name);
  }
  const str = String(keyOrObj).toLowerCase().trim();
  if (str.startsWith('data:image/')) return keyOrObj;

  // In Node.js environment: read directly from frontend/signature/*.png on disk
  // This guarantees that any manual file alteration by the user immediately takes effect!
  if (typeof window === 'undefined' && typeof require !== 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      let diskFile = null;
      if (str.includes('jeya') || str.includes('sundari') || str.includes('faculty_coordinator')) diskFile = 'jeyasundari.png';
      else if (str.includes('rekha')) diskFile = 'rekha.png';
      else if (str.includes('ramakrishnan')) diskFile = 'ramakrishnan.png';
      else if (str.includes('kesavaraja') || str.includes('convenor')) diskFile = 'kesavaraja.png';
      else if (str.includes('rajakarunakaran') || str.includes('rajakumaran') || str.includes('patron')) diskFile = 'rajakarunakaran.png';
      else if (str.includes('ganesan') || str.includes('chief')) diskFile = 'ganesan.png';

      if (diskFile) {
        const candidates = [
          path.join(__dirname, 'signature', diskFile),
          path.join(__dirname, '..', 'frontend', 'signature', diskFile),
          path.join(process.cwd(), 'frontend', 'signature', diskFile),
          path.join(process.cwd(), 'signature', diskFile)
        ];
        for (const cand of candidates) {
          if (fs.existsSync(cand)) {
            const buf = fs.readFileSync(cand);
            return \`data:image/png;base64,\${buf.toString('base64')}\`;
          }
        }
      }
    } catch (e) {
      console.warn('Node signature file read warning:', e);
    }
  }

  const sigMap = (typeof window !== 'undefined' && window.CERT_ASSETS && window.CERT_ASSETS.SIGNATURES)
    ? window.CERT_ASSETS.SIGNATURES
    : (typeof CERT_ASSETS !== 'undefined' ? CERT_ASSETS.SIGNATURES : {});

  // High-fidelity keyword matching for official CSBS signatories
  if (str.includes('jeya') || str.includes('sundari') || str.includes('faculty_coordinator')) {
    return sigMap.jeyasundari || 'signature/jeyasundari.png';
  }
  if (str.includes('rekha')) {
    return sigMap.rekha || 'signature/rekha.png';
  }
  if (str.includes('ramakrishnan')) {
    return sigMap.ramakrishnan || 'signature/ramakrishnan.png';
  }
  if (str.includes('kesavaraja') || str.includes('convenor')) {
    return sigMap.kesavaraja || 'signature/kesavaraja.png';
  }
  if (str.includes('rajakarunakaran') || str.includes('rajakumaran') || str.includes('patron')) {
    return sigMap.rajakarunakaran || sigMap.rajakumaran || 'signature/rajakarunakaran.png';
  }
  if (str.includes('ganesan') || str.includes('chief')) {
    return sigMap.ganesan || 'signature/ganesan.png';
  }

  if (sigMap[str]) return sigMap[str];

  console.warn(\`[Configuration Warning] Required signature asset for "\${keyOrObj}" is missing from repository assets. Please verify approved signatory configuration.\`);
  return null;
}

`;

content = content.substring(0, getSigStart) + newGetSignatoryAsset + content.substring(arabesqueStart);

// 3. Update createCertificatePdf signature block render calls to support both name and key
content = content.replace(
  "renderSigBlock(doc, certData.signatory_1_sig || 'jeyasundari', 32, certData.signatory_1_name || 'Dr. M. Jeya Sundari');",
  "renderSigBlock(doc, certData.signatory_1_sig || certData.signatory_1_name || 'jeyasundari', 32, certData.signatory_1_name || 'Dr. M. Jeya Sundari');"
);
content = content.replace(
  "renderSigBlock(doc, certData.signatory_2_sig || 'rekha', 66, certData.signatory_2_name || 'M. Rekha');",
  "renderSigBlock(doc, certData.signatory_2_sig || certData.signatory_2_name || 'rekha', 66, certData.signatory_2_name || 'M. Rekha');"
);
content = content.replace(
  "renderSigBlock(doc, certData.signatory_3_sig || 'ramakrishnan', 100, certData.signatory_3_name || 'M. Ramakrishnan');",
  "renderSigBlock(doc, certData.signatory_3_sig || certData.signatory_3_name || 'ramakrishnan', 100, certData.signatory_3_name || 'M. Ramakrishnan');"
);
content = content.replace(
  "renderSigBlock(doc, certData.signatory_4_sig || 'kesavaraja', cxConvenor, certData.signatory_4_name || 'Dr. D. Kesavaraja', 'Convenor');",
  "renderSigBlock(doc, certData.signatory_4_sig || certData.signatory_4_name || 'kesavaraja', cxConvenor, certData.signatory_4_name || 'Dr. D. Kesavaraja', 'Convenor');"
);
content = content.replace(
  "renderSigBlock(doc, certData.signatory_5_sig || 'rajakumaran', cxPatron, certData.signatory_5_name || 'Dr. S. Rajakumaran', 'Patron');",
  "renderSigBlock(doc, certData.signatory_5_sig || certData.signatory_5_name || 'rajakarunakaran', cxPatron, certData.signatory_5_name || 'Dr. S. Rajakarunakaran', 'Patron');"
);
content = content.replace(
  "renderSigBlock(doc, certData.signatory_6_sig || 'ganesan', cxChiefPatron, certData.signatory_6_name || 'Dr. L. Ganesan', 'Chief Patron');",
  "renderSigBlock(doc, certData.signatory_6_sig || certData.signatory_6_name || 'ganesan', cxChiefPatron, certData.signatory_6_name || 'Dr. L. Ganesan', 'Chief Patron');"
);

// 4. Update canvas signatories array to use rajakarunakaran
content = content.replace(
  "{ name: certData.signatory_5_name || 'Dr. S. Rajakumaran', role: 'Patron', key: 'rajakumaran' }",
  "{ name: certData.signatory_5_name || 'Dr. S. Rajakarunakaran', role: 'Patron', key: 'rajakarunakaran' }"
);

fs.writeFileSync(certAssetsPath, content, 'utf8');
console.log('Successfully updated frontend/certificate_assets.js!');
