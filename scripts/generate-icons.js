const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const src = path.join(__dirname, '..', 'preview.png');
    const outDir = path.join(__dirname, '..', 'img');
    if (!fs.existsSync(src)) {
      console.error('Source preview.png not found at', src);
      process.exit(2);
    }
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    await sharp(src).resize(192, 192, { fit: 'cover' }).png().toFile(path.join(outDir, 'icon-192.png'));
    console.log('Wrote img/icon-192.png');

    await sharp(src).resize(512, 512, { fit: 'cover' }).png().toFile(path.join(outDir, 'icon-512.png'));
    console.log('Wrote img/icon-512.png');

    console.log('Icons generated successfully.');
  } catch (err) {
    console.error('Failed to generate icons:', err);
    process.exit(1);
  }
})();
