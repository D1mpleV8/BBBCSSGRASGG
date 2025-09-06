const { createCanvas } = require('canvas');

// GERÇEK AVRUPA RULETİ SAYI SIRALAMASI
const ROULETTE_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

// Sayıların renklerini belirleyen harita
const ROULETTE_COLORS = {
    0: '#0C8346', // Yeşil
    'red': '#D92027',
    'black': '#2E3033'
};
const NUMBER_TO_COLOR_KEY = {
    0: 'green', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red', 10: 'black',
    11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red', 19: 'red', 20: 'black',
    21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
    31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

const TOTAL_NUMBERS = 37;

async function generateRouletteImage(winningNumber) {
    const width = 800;
    const height = 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const centerX = width / 2;
    const centerY = height / 2;

    // Arka plan
    ctx.fillStyle = '#1E2833';
    ctx.fillRect(0, 0, width, height);

    // Dış ahşap çerçeve
    const woodGradient = ctx.createRadialGradient(centerX, centerY, 300, centerX, centerY, 400);
    woodGradient.addColorStop(0, '#6B4F3A');
    woodGradient.addColorStop(1, '#4A3222');
    ctx.fillStyle = woodGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 390, 0, 2 * Math.PI);
    ctx.fill();


    // Çark dilimleri
    const radius = 350;
    const anglePerSlice = (2 * Math.PI) / TOTAL_NUMBERS;

    for (let i = 0; i < TOTAL_NUMBERS; i++) {
        const currentNumber = ROULETTE_ORDER[i];
        const startAngle = i * anglePerSlice - (Math.PI / 2) - (anglePerSlice / 2);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + anglePerSlice);
        ctx.closePath();

        const colorKey = NUMBER_TO_COLOR_KEY[currentNumber];
        ctx.fillStyle = ROULETTE_COLORS[colorKey === 'green' ? 0 : colorKey];
        ctx.fill();
    }

    // Dilim ayırıcı çizgiler (metalik)
    ctx.strokeStyle = '#D4AF37'; // Altın rengi
    ctx.lineWidth = 2;
    for (let i = 0; i < TOTAL_NUMBERS; i++) {
        const angle = i * anglePerSlice - (Math.PI / 2) - (anglePerSlice / 2);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
        ctx.stroke();
    }


    // Sayıları yazma
    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px Arial Black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < TOTAL_NUMBERS; i++) {
        const number = ROULETTE_ORDER[i];
        const angle = i * anglePerSlice - (Math.PI / 2);
        const textX = centerX + Math.cos(angle) * (radius - 50);
        const textY = centerY + Math.sin(angle) * (radius - 50);

        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(angle + Math.PI / 2);
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 5;
        ctx.fillText(number.toString(), 0, 0);
        ctx.restore();
    }

    // Ortadaki metalik topuz
    const metalGradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 80);
    metalGradient.addColorStop(0, '#EAEAEA');
    metalGradient.addColorStop(0.5, '#A7A7A7');
    metalGradient.addColorStop(1, '#595959');
    ctx.fillStyle = metalGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80, 0, 2 * Math.PI);
    ctx.fill();


    // Topu çizme
    const winningIndex = ROULETTE_ORDER.indexOf(winningNumber);
    const winningAngle = winningIndex * anglePerSlice - (Math.PI / 2);
    const ballRadius = radius - 120;
    const ballX = centerX + Math.cos(winningAngle) * ballRadius;
    const ballY = centerY + Math.sin(winningAngle) * ballRadius;

    ctx.shadowColor = 'black';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    const ballGradient = ctx.createRadialGradient(ballX - 5, ballY - 5, 2, ballX, ballY, 20);
    ballGradient.addColorStop(0, '#FFFFFF');
    ballGradient.addColorStop(1, '#E0E0E0');

    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ballX, ballY, 20, 0, 2 * Math.PI);
    ctx.fill();

    ctx.shadowColor = 'transparent'; // Diğer çizimler için gölgeyi kaldır

    // Kazanan sayıyı gösteren ok
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX - 25, 50);
    ctx.lineTo(centerX + 25, 50);
    ctx.closePath();
    ctx.fillStyle = '#F1C40F';
    ctx.fill();
    ctx.strokeStyle = '#B48A02';
    ctx.lineWidth = 3;
    ctx.stroke();

    return canvas.toBuffer('image/png');
}

module.exports = { generateRouletteImage };