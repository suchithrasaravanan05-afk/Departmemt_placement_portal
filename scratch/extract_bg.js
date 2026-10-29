const fs = require('fs');
const certAssets = require('./frontend/certificate_assets.js');

const bg = certAssets.BACKGROUND_IMAGE;
if (bg && bg.startsWith('data:image')) {
  const base64Data = bg.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync('./scratch/bg_from_js.png', Buffer.from(base64Data, 'base64'));
  console.log('Saved ./scratch/bg_from_js.png');
} else {
  console.log('bg is not data url:', typeof bg);
}
