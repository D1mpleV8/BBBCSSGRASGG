const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Profile = require('../../models/Profile');
const Jackpot = require('../../models/Jackpot'); // Yeni Jackpot modelimiz
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Yardımcı fonksiyon: Jackpot dökümanını bulur veya oluşturur
async function getJackpot() {
    let jackpot = await Jackpot.findOne({ jackpotId: 'global_jackpot' });
    if (!jackpot) {
        jackpot = new Jackpot();
        await jackpot.save();
    }
    return jackpot;
}

module.exports = {
    category: 'oyunlar',
    data: new SlashCommandBuilder()
        .setName('slot')
        .setDescription('Efsanevi slot makinesi (Jackpot ve Free Spin özellikli).')
        .addIntegerOption(option =>
            option.setName('bahis')
                .setDescription('Oynamak istediğiniz miktar.')
                .setRequired(true)
                .setMinValue(10)), // Minimum bahis

    async execute(interaction) {
        const betAmount = interaction.options.getInteger('bahis');

        await interaction.deferReply();

        try {
            const userProfile = await Profile.findOne({ userId: interaction.user.id });
            const jackpot = await getJackpot();

            if (!userProfile) return interaction.editReply('Oynamak için bir profilin olmalı. `/profil`');
            if (userProfile.balance < betAmount) return interaction.editReply(`Bu bahsi oynamak için cüzdanında yeterli para yok.`);

            // Bahsi düş ve Jackpot'a küçük bir pay ekle
            userProfile.balance -= betAmount;
            const jackpotContribution = Math.max(1, Math.floor(betAmount * 0.01)); // Bahsin %1'i (en az 1)
            jackpot.currentAmount += jackpotContribution;
            await Promise.all([userProfile.save(), jackpot.save()]);

            const symbols = ['🍒', '🍊', '🍋', '🍇', '💎', '💰', '🔔', '🎁']; // SCATTER EKLENDİ

            const finalReels = [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]];

            // Animasyon...
            let reelDisplay = ['❓', '❓', '❓'];
            const createEmbed = (desc = `**> [ ${reelDisplay.join(' | ')} ] <**`) => new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎰 Slot Makinesi Çevriliyor... 🎰')
                .setDescription(desc)
                .addFields({ name: 'GLOBAL JACKPOT', value: `> 💎 **${jackpot.currentAmount.toLocaleString()}** 💵` })
                .setFooter({ text: `${interaction.user.username}, ${betAmount.toLocaleString()} 💵 ile oynuyor...` });

            await interaction.editReply({ embeds: [createEmbed()] });
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 5; j++) { reelDisplay[i] = symbols[Math.floor(Math.random() * symbols.length)]; await interaction.editReply({ embeds: [createEmbed()] }); await delay(100); }
                reelDisplay[i] = finalReels[i];
                await interaction.editReply({ embeds: [createEmbed()] });
                await delay(500);
            }

            // Sonuçları değerlendirme
            let winnings = 0;
            let resultText = `Tüh! Kaybettin. **${betAmount.toLocaleString()}** 💵 gitti.`;
            let resultColor = '#E74C3C';
            const [r1, r2, r3] = finalReels;

            const scatterCount = finalReels.filter(s => s === '🎁').length;

            if (scatterCount >= 3) {
                resultText = `🎁 SCATTER! 🎁 10 ÜCRETSİZ ÇEVİRME HAKKI KAZANDIN!`;
                resultColor = '#3498DB';
                await interaction.editReply({ embeds: [createEmbed(resultText).setColor(resultColor)] });
                await delay(2000);
                return executeFreeSpins(interaction, userProfile);
            }
            if (r1 === '💎' && r2 === '💎' && r3 === '💎') {
                winnings = jackpot.currentAmount;
                resultText = `👑 MİLYONER OLDUN! 👑 GLOBAL JACKPOT'U KAZANDIN!`;
                resultColor = '#FFD700';
                jackpot.currentAmount = 1000000;
                await jackpot.save();
            }
            else if (r1 === r2 && r2 === r3) {
                if (r1 === '💰') { winnings = betAmount * 10; } else { winnings = betAmount * 5; }
                resultText = `🎉 JACKPOT! 🎉 Üç tane **${r1}** buldun ve **${winnings.toLocaleString()}** 💵 kazandın!`;
                resultColor = '#2ECC71';
            } else if (r1 === r2 || r2 === r3 || r1 === r3) {
                winnings = betAmount * 2;
                resultText = `İyi deneme! İki tane aynı sembol buldun ve **${winnings.toLocaleString()}** 💵 kazandın!`;
                resultColor = '#F1C40F';
            }

            if (winnings > 0) {
                await Profile.updateOne({ userId: interaction.user.id }, { $inc: { balance: winnings } });
                resultText += `\nKazanılan: **+${winnings.toLocaleString()}** 💵`;
            }

            const finalEmbed = new EmbedBuilder().setColor(resultColor).setTitle('🎰 Slot Makinesi Sonucu 🎰').setDescription(`**> [ ${finalReels.join(' | ')} ] <**`).addFields({ name: 'Sonuç', value: resultText });
            await delay(1000);
            await interaction.editReply({ embeds: [finalEmbed] });

        } catch (error) {
            console.error('Slot komutunda hata:', error);
            if (interaction.deferred || interaction.replied) await interaction.editReply('Slot makinesini çalıştırırken bir hata oluştu.');
        }
    },
};

async function executeFreeSpins(interaction, userProfile) {
    const freeSpins = 10;
    let totalWinnings = 0;
    const symbols = ['🍒', '🍊', '🍋', '🍇', '💎', '💰', '🔔'];

    for (let i = 1; i <= freeSpins; i++) {
        const spinEmbed = new EmbedBuilder().setColor('#3498DB').setTitle(`🎁 Ücretsiz Çevirme Turu (${i}/${freeSpins}) 🎁`);
        let reelDisplay = ['❓', '❓', '❓'];
        await interaction.editReply({ embeds: [spinEmbed.setDescription(`**> [ ${reelDisplay.join(' | ')} ] <**`)] });
        await delay(500);

        const finalReels = [symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]];

        for (let k = 0; k < 3; k++) {
            for (let j = 0; j < 2; j++) { reelDisplay[k] = symbols[Math.floor(Math.random() * symbols.length)]; await interaction.editReply({ embeds: [spinEmbed.setDescription(`**> [ ${reelDisplay.join(' | ')} ] <**`)] }); await delay(100); }
            reelDisplay[k] = finalReels[k];
            await interaction.editReply({ embeds: [spinEmbed.setDescription(`**> [ ${reelDisplay.join(' | ')} ] <**`)] });
        }

        let spinWinnings = 0;
        const [r1, r2, r3] = finalReels;
        if (r1 === r2 && r2 === r3) spinWinnings = 50000;
        else if (r1 === r2 || r2 === r3 || r1 === r3) spinWinnings = 5000;

        totalWinnings += spinWinnings;
        spinEmbed.addFields({ name: 'Tur Kazancı', value: `+${spinWinnings.toLocaleString()} 💵`, inline: true }, { name: 'Toplam Kazanç', value: `${totalWinnings.toLocaleString()} 💵`, inline: true });
        await interaction.editReply({ embeds: [spinEmbed] });
        await delay(1500);
    }

    if (totalWinnings > 0) {
        await Profile.updateOne({ userId: userProfile.userId }, { $inc: { balance: totalWinnings } });
    }

    const finalBonusEmbed = new EmbedBuilder()
        .setColor('#2ECC71')
        .setTitle('🎁 Bonus Turu Tamamlandı! 🎁')
        .setDescription(`Ücretsiz çevirmelerden toplam **${totalWinnings.toLocaleString()}** 💵 kazandın ve cüzdanına eklendi!`);
    await interaction.editReply({ embeds: [finalBonusEmbed] });
}
