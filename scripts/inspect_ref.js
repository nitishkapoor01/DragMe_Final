import sharp from 'sharp';

const uiImg = 'C:\\Users\\nitis\\.gemini\\antigravity-ide\\brain\\43ac5bc4-aca5-4f0b-9a45-0fe2c5d7e852\\.user_uploaded\\media_1791096187544.png';
const sheetImg = 'C:\\Users\\nitis\\.gemini\\antigravity-ide\\brain\\43ac5bc4-aca5-4f0b-9a45-0fe2c5d7e852\\.user_uploaded\\media_1791096677753.jpg';

async function cropMascots() {
  // 1. From UI screenshot (media_1791096187544.png, 1024x562)
  // Left sidebar is x: 0 to 180, mascot is at bottom left
  // Mascot in UI is approx x: 10 to 175, y: 360 to 555
  await sharp(uiImg)
    .extract({ left: 10, top: 360, width: 170, height: 195 })
    .toFile('crop_ui_sidebar_mascot.png');

  // Also crop just the mascot character from the UI (excluding speech bubble)
  await sharp(uiImg)
    .extract({ left: 12, top: 405, width: 160, height: 150 })
    .toFile('crop_ui_mascot_only.png');

  // 2. From Sheet (01 Front View Default)
  await sharp(sheetImg)
    .extract({ left: 24, top: 68, width: 170, height: 130 })
    .toFile('crop_sheet_card1.png');

  console.log('Crops generated successfully.');
}

cropMascots();
