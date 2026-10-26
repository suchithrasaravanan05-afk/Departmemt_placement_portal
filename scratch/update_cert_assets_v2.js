const fs = require('fs');

let content = fs.readFileSync('frontend/certificate_assets.js', 'utf8');

// 1. Add window.SIGNATORY_CONFIG and getSignatoryAsset right after window.CERT_ASSETS
const certAssetsEnd = content.indexOf('};\n\n// 3. Canvas 2D Certificate Renderer');
if (certAssetsEnd !== -1) {
  const configBlock = `};

// Centralized Official Signatory Configuration
window.SIGNATORY_CONFIG = {
  faculty_coordinator: {
    id: "faculty_coordinator",
    key: "jeyasundari",
    name: "Dr. M. Jeya Sundari",
    title: "Faculty Coordinator",
    dept: "CSBS, RIT",
    fileName: "Dr. M. Jeya Sundari_Faculty Coordinator.png",
    relativeUrl: "signature/Dr.%20M.%20Jeya%20Sundari_Faculty%20Coordinator.png",
    fallbackUrl: "/signature/Dr.%20M.%20Jeya%20Sundari_Faculty%20Coordinator.png"
  },
  hod: {
    id: "hod",
    key: "kesavaraja",
    name: "Dr. D. Kesavaraja",
    title: "Head of Department",
    dept: "CSBS, RIT",
    fileName: "Dr. D. Kesavaraja_HOD.png",
    relativeUrl: "signature/Dr.%20D.%20Kesavaraja_HOD.png",
    fallbackUrl: "/signature/Dr.%20D.%20Kesavaraja_HOD.png"
  },
  principal: {
    id: "principal",
    key: "rajakumaran",
    name: "Dr. S. Rajakumaran",
    title: "Principal",
    dept: "RIT",
    fileName: "Dr. S. Rajakarunagaran_Principal.png",
    relativeUrl: "signature/Dr.%20S.%20Rajakarunagaran_Principal.png",
    fallbackUrl: "/signature/Dr.%20S.%20Rajakarunagaran_Principal.png"
  },
  director: {
    id: "director",
    key: "ganesan",
    name: "Dr. L. Ganesan",
    title: "Director",
    dept: "RIT",
    fileName: "Dr. L. Ganesan_Director.png",
    relativeUrl: "signature/Dr.%20L.%20Ganesan_Director.png",
    fallbackUrl: "/signature/Dr.%20L.%20Ganesan_Director.png"
  }
};

window.DEFAULT_SIGNATORIES_ORDER = [
  "faculty_coordinator",
  "hod",
  "principal",
  "director"
];

function getSignatoryAsset(sigRef) {
  if (!sigRef) return null;
  if (typeof sigRef === 'string' && sigRef.startsWith('data:image/')) return sigRef;
  const assets = (typeof window !== 'undefined' && window.CERT_ASSETS) ? window.CERT_ASSETS : null;
  if (assets && assets.SIGNATURES && assets.SIGNATURES[sigRef]) {
    return assets.SIGNATURES[sigRef];
  }
  const config = (typeof window !== 'undefined' && window.SIGNATORY_CONFIG) ? window.SIGNATORY_CONFIG : null;
  if (config && config[sigRef]) {
    const entry = config[sigRef];
    if (assets && assets.SIGNATURES && assets.SIGNATURES[entry.key]) {
      return assets.SIGNATURES[entry.key];
    }
    return entry.relativeUrl;
  }
  if (typeof require !== 'undefined' && typeof __dirname !== 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const sigDir = path.join(__dirname, '..', 'frontend', 'signature');
      if (fs.existsSync(sigDir)) {
        for (const f of fs.readdirSync(sigDir)) {
          if (f.toLowerCase().includes(String(sigRef).toLowerCase())) {
            const buf = fs.readFileSync(path.join(sigDir, f));
            return 'data:image/png;base64,' + buf.toString('base64');
          }
        }
      }
    } catch (e) {}
  }
  return sigRef;
}
`;
  content = content.substring(0, certAssetsEnd) + configBlock + content.substring(certAssetsEnd + 2);
  console.log('Appended SIGNATORY_CONFIG & getSignatoryAsset');
} else {
  console.error('Could not find certAssetsEnd');
}

// 2. Update Canvas signatories (drawRitCertificate)
const canvasOldSigBlock = `  const signatories = [
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
  ];`;

const canvasNewSigBlock = `  const signatories = [
    {
      name: certData.signatory_1_name || 'Dr. M. Jeya Sundari',
      title: certData.signatory_1_title || 'Faculty Coordinator',
      dept: certData.signatory_1_dept || certData.signatory_1_org || 'CSBS, RIT',
      sig: certData.signatory_1_sig || getSignatoryAsset('faculty_coordinator')
    },
    {
      name: certData.signatory_2_name || 'Dr. D. Kesavaraja',
      title: certData.signatory_2_title || 'Head of Department',
      dept: certData.signatory_2_dept || certData.signatory_2_org || 'CSBS, RIT',
      sig: certData.signatory_2_sig || getSignatoryAsset('hod')
    },
    {
      name: certData.signatory_3_name || 'Dr. S. Rajakumaran',
      title: certData.signatory_3_title || 'Principal',
      dept: certData.signatory_3_dept || certData.signatory_3_org || 'RIT',
      sig: certData.signatory_3_sig || getSignatoryAsset('principal')
    },
    {
      name: certData.signatory_4_name || 'Dr. L. Ganesan',
      title: certData.signatory_4_title || 'Director',
      dept: certData.signatory_4_dept || certData.signatory_4_org || 'RIT',
      sig: certData.signatory_4_sig || getSignatoryAsset('director')
    },
    {
      name: certData.signatory_5_name || 'Dr. R. Ramesh',
      title: certData.signatory_5_title || 'Advisor',
      dept: certData.signatory_5_dept || certData.signatory_5_org || 'RIT',
      sig: certData.signatory_5_sig || (typeof window !== 'undefined' && window.CERT_ASSETS ? window.CERT_ASSETS.SIGNATURES?.ramesh : null)
    }
  ];`;

if (content.includes(canvasOldSigBlock)) {
  content = content.replace(canvasOldSigBlock, canvasNewSigBlock);
  console.log('Replaced Canvas signatories block');
} else {
  console.error('Canvas signatories block not matched');
}

// 3. Update jsPDF signatories (createCertificatePdf)
const pdfOldSigBlock = `  const signatories = [
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
  ];`;

if (content.includes(pdfOldSigBlock)) {
  content = content.replace(pdfOldSigBlock, canvasNewSigBlock);
  console.log('Replaced PDF signatories block');
} else {
  console.error('PDF signatories block not matched');
}

// 4. Update proportional aspect ratio drawing in Canvas
const oldCanvasDraw = `      const sigImg = await ritLoadImage(s.sig);
      if (sigImg) {
        ctx.drawImage(sigImg, cx - 80, 1020, 160, 65);
      }`;

const newCanvasDraw = `      const sigData = getSignatoryAsset(s.sig) || s.sig;
      const sigImg = await ritLoadImage(sigData);
      if (sigImg) {
        const maxW = 180;
        const maxH = 72;
        const baseY = 1084;
        const iW = sigImg.naturalWidth || sigImg.width || 1;
        const iH = sigImg.naturalHeight || sigImg.height || 1;
        const aspect = iW / iH;
        let rW = maxW;
        let rH = maxH;
        if (maxW / aspect <= maxH) {
          rW = maxW;
          rH = maxW / aspect;
        } else {
          rH = maxH;
          rW = maxH * aspect;
        }
        ctx.drawImage(sigImg, cx - rW / 2, baseY - rH, rW, rH);
      }`;

if (content.includes(oldCanvasDraw)) {
  content = content.replace(oldCanvasDraw, newCanvasDraw);
  console.log('Replaced Canvas signature drawing with aspect ratio preservation');
} else {
  console.error('Old Canvas draw not found');
}

// 5. Update proportional aspect ratio drawing in jsPDF
const oldPdfDraw = `      // Render signature image if available
      if (s.sig) {
        try {
          doc.addImage(s.sig, 'PNG', cx - 13, 149, 26, 11);
        } catch (e) {
          console.warn('Signatory image embed warning:', e);
        }
      }`;

const newPdfDraw = `      // Render signature image with preserved aspect ratio
      const sigData = getSignatoryAsset(s.sig) || s.sig;
      if (sigData) {
        try {
          const maxW = 30; // max mm width
          const maxH = 13; // max mm height
          const baseY = 161.5; // bottom baseline above the 163mm gold line
          let renderW = maxW;
          let renderH = maxH;
          let props = null;
          try {
            props = doc.getImageProperties(sigData);
          } catch (e) {}

          if (props && props.width && props.height) {
            const aspect = props.width / props.height;
            if (maxW / aspect <= maxH) {
              renderW = maxW;
              renderH = maxW / aspect;
            } else {
              renderH = maxH;
              renderW = maxH * aspect;
            }
          }
          const renderX = cx - (renderW / 2);
          const renderY = baseY - renderH;
          doc.addImage(sigData, 'PNG', renderX, renderY, renderW, renderH);
        } catch (e) {
          console.warn('Signatory image embed warning:', e);
        }
      }`;

if (content.includes(oldPdfDraw)) {
  content = content.replace(oldPdfDraw, newPdfDraw);
  console.log('Replaced PDF signature drawing with aspect ratio preservation');
} else {
  console.error('Old PDF draw not found');
}

fs.writeFileSync('frontend/certificate_assets.js', content, 'utf8');
console.log('Finished updating frontend/certificate_assets.js');
