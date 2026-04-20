const sharp = require('sharp');
const fs = require('fs');

const svg = `<svg width="32" height="32" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <rect width="180" height="180" rx="37" fill="#111827"/>
  <line x1="90" y1="30" x2="90" y2="150" stroke="white" stroke-width="5" fill="none"/>
  <line x1="30" y1="90" x2="150" y2="90" stroke="white" stroke-width="5" fill="none"/>
  <circle cx="90" cy="90" r="25" stroke="white" stroke-width="4.5" fill="none"/>
  <circle cx="90" cy="90" r="48" stroke="white" stroke-width="4" fill="none"/>
  <circle cx="90" cy="90" r="8" fill="#6366f1"/>
  <path d="M90 42 A48 48 0 0 1 130 62" stroke="#6366f1" stroke-width="5" stroke-linecap="round" fill="none"/>
</svg>`;

async function run() {
  // Generate 32x32 PNG first
  const pngBuf = await sharp(Buffer.from(svg)).resize(32, 32).png().toBuffer();
  
  // ICO format: header + directory entry + PNG data
  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0);     // reserved
  iconDir.writeUInt16LE(1, 2);     // type: 1 = ICO
  iconDir.writeUInt16LE(1, 4);     // count: 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);         // width
  entry.writeUInt8(32, 1);         // height
  entry.writeUInt8(0, 2);          // color palette
  entry.writeUInt8(0, 3);          // reserved
  entry.writeUInt16LE(1, 4);       // color planes
  entry.writeUInt16LE(32, 6);      // bits per pixel
  entry.writeUInt32LE(pngBuf.length, 8);  // size
  entry.writeUInt32LE(22, 12);     // offset (6 + 16 = 22)

  const ico = Buffer.concat([iconDir, entry, pngBuf]);
  fs.writeFileSync('app/favicon.ico', ico);
  console.log('favicon.ico created in app/');
}

run().catch(console.error);
