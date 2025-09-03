const { createCanvas, registerFont } = require('canvas');
const path = require('path');

registerFont(path.join(__dirname, '../fonts/Exo2-Bold.ttf'), { family: 'Exo2 Bold' });
registerFont(path.join(__dirname, '../fonts/Exo2-Regular.ttf'), { family: 'Exo2 Regular' });

// Yardımcı fonksiyon: Köşeleri yuvarlak ve gölgeli kart çizer
const drawPremiumCard = (ctx, x, y, width, height, radius) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, 'rgba(46, 52, 64, 0.8)'); // Koyu arduvaz
    gradient.addColorStop(1, 'rgba(35, 41, 52, 0.8)');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)'; // Altın rengi çerçeve
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
};

async function generateMainMenuImage(client, commandData) {
    const canvas = createCanvas(1000, 800);
    const ctx = canvas.getContext('2d');

    // Arka plan
    const bgGradient = ctx.createLinearGradient(0, 0, 1000, 800);
    bgGradient.addColorStop(0, '#1d2127');
    bgGradient.addColorStop(1, '#111317');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1000, 800);

    // Başlık
    ctx.font = '56px "Exo2 Bold"';
    ctx.fillStyle = '#E0E0E0';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#D4AF37'; // Altın parlaması
    ctx.shadowBlur = 20;
    ctx.fillText(client.user.username, 500, 100);
    ctx.shadowBlur = 0;

    ctx.font = '26px "Exo2 Regular"';
    ctx.fillStyle = '#8A99A8';
    ctx.fillText('Komut Arayüzüne Hoş Geldiniz', 500, 150);

    const categories = Object.values(commandData);
    const boxWidth = 280, boxHeight = 110, gap = 30;
    const startX = (1000 - (3 * boxWidth + 2 * gap)) / 2;
    let currentX = startX, currentY = 220;

    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        drawPremiumCard(ctx, currentX, currentY, boxWidth, boxHeight, 15);
        ctx.font = '42px "Exo2 Bold"';
        ctx.fillStyle = '#D4AF37';
        ctx.textAlign = 'center';
        ctx.fillText(category.emoji, currentX + 50, currentY + 65);
        ctx.font = '28px "Exo2 Bold"';
        ctx.fillStyle = '#E0E0E0';
        ctx.textAlign = 'left';
        ctx.fillText(category.label, currentX + 95, currentY + 65);
        currentX += boxWidth + gap;
        if ((i + 1) % 3 === 0) { currentX = startX; currentY += boxHeight + gap; }
    }
    return canvas.toBuffer('image/png');
}

async function generateCategoryPageImage(category, client) {
    const canvas = createCanvas(1000, 750);
    const ctx = canvas.getContext('2d');

    const bgGradient = ctx.createLinearGradient(0, 0, 1000, 750);
    bgGradient.addColorStop(0, '#1d2127');
    bgGradient.addColorStop(1, '#111317');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1000, 750);

    ctx.font = '56px "Exo2 Bold"';
    ctx.fillStyle = '#E0E0E0';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#D4AF37';
    ctx.shadowBlur = 20;
    ctx.fillText(`${category.emoji} ${category.label}`, 500, 100);
    ctx.shadowBlur = 0;

    let startY = 220;
    for (const cmd of category.commands) {
        drawPremiumCard(ctx, 50, startY - 45, 900, 85, 15);
        ctx.font = '30px "Exo2 Bold"';
        ctx.fillStyle = '#D4AF37';
        ctx.textAlign = 'left';
        ctx.fillText(`/${cmd.name}`, 80, startY);
        ctx.font = '20px "Exo2 Regular"';
        ctx.fillStyle = '#a0b3c1';
        ctx.fillText(cmd.description, 80, startY + 30);
        startY += 115;
    }
    return canvas.toBuffer('image/png');
}

module.exports = { generateMainMenuImage, generateCategoryPageImage };