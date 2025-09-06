const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    category: 'oyunlar',
    data: new SlashCommandBuilder()
        .setName('soygun')
        .setDescription('Başka bir kullanıcıyı soymayı denersin. Yakalanıp hapse girebilirsin!')
        .addUserOption(option => option.setName('hedef').setDescription('Soymak istediğin kullanıcı.').setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('hedef');

        if (targetUser.id === interaction.user.id) return interaction.reply({ content:'Kendini soyamazsın, akıllı ol.', ephemeral: true });
        if (targetUser.bot) return interaction.reply({ content: 'Botları soyamazsın.', ephemeral: true });

        await interaction.deferReply();

        const authorProfile = await Profile.findOne({ userId: interaction.user.id });
        if (!authorProfile) return interaction.editReply('Bu işlere bulaşmadan önce bir kimliğin olmalı. `/profil`');
        if (authorProfile.jail.isInJail) return interaction.editReply('Hapishaneden soygun yapamazsın!');

        const minimumBalanceToRob = 2500;
        if (authorProfile.balance < minimumBalanceToRob) {
            return interaction.editReply(`Bu tehlikeli işlere bulaşmak için cüzdanında en az **${minimumBalanceToRob.toLocaleString()}** 💵 olmalı.`);
        }

        const targetProfile = await Profile.findOne({ userId: targetUser.id });
        if (!targetProfile || targetProfile.balance < 500) {
            return interaction.editReply(`**${targetUser.username}**'in cüzdanında para yok gibi, bu riske değmez.`);
        }

        const cooldown = 15 * 60 * 1000;
        if (authorProfile.lastRobberyAttempt && (Date.now() - authorProfile.lastRobberyAttempt.getTime()) < cooldown) {
            const timeLeft = cooldown - (Date.now() - authorProfile.lastRobberyAttempt.getTime());
            const minutes = Math.floor(timeLeft / 60000);
            return interaction.editReply(`Daha yeni bir iş çevirdin. Fark edilmemek için **${minutes} dakika** daha beklemen lazım.`);
        }

        authorProfile.lastRobberyAttempt = new Date();
        await authorProfile.save();

        const heistEmbed = new EmbedBuilder().setColor('#34495E').setAuthor({ name: `${interaction.user.username}, ${targetUser.username}'e karşı bir soygun planlıyor...`, iconURL: interaction.user.displayAvatarURL() }).setDescription('🤫 Plan yapılıyor...');
        await interaction.editReply({ embeds: [heistEmbed] });
        await delay(2500);
        heistEmbed.setDescription('🚶‍♂️ Ekip pozisyon alıyor, her şey sessiz...');
        await interaction.editReply({ embeds: [heistEmbed] });
        await delay(2500);

        const successChance = 45; // %45 başarı şansı
        const roll = Math.random() * 100;

        if (roll < successChance) {
            const amountToSteal = Math.floor(targetProfile.balance * (Math.random() * 0.4 + 0.1));
            authorProfile.balance += amountToSteal;
            targetProfile.balance -= amountToSteal;
            await Promise.all([authorProfile.save(), targetProfile.save()]);
            heistEmbed.setColor('#2ECC71').setTitle('✅ Başarılı Soygun!').setDescription(`**${interaction.user.username}**, **${targetUser.username}**'i gafil avladı ve cüzdanından **${amountToSteal.toLocaleString()}** 💵 çalarak kayıplara karıştı!`);
            await interaction.editReply({ embeds: [heistEmbed] });
        } else {
            // BAŞARISIZ SOYGUN
            const jailChance = 50; // Başarısız olunca %50 hapse girme şansı
            const jailRoll = Math.random() * 100;

            if (jailRoll < jailChance) {
                // HAPSE GİRDİ
                const sentenceMinutes = 30; // 30 dakika ceza
                authorProfile.jail.isInJail = true;
                authorProfile.jail.releaseDate = new Date(Date.now() + sentenceMinutes * 60000);
                await authorProfile.save();
                heistEmbed.setColor('#992D22').setTitle('🚨 YAKALANDIN! 🚨').setDescription(`İşler feci ters gitti! **${interaction.user.username}** soygun sırasında yakalandı ve **${sentenceMinutes} dakika** hapis cezasına çarptırıldı!`);
            } else {
                // Sadece para cezası
                const fineAmount = Math.floor(authorProfile.balance * 0.25);
                authorProfile.balance -= fineAmount;
                await authorProfile.save();
                heistEmbed.setColor('#E74C3C').setTitle('❌ Ucuz Yırttın!') .setDescription(`Polisler peşine düştü ama bir şekilde kaçmayı başardın! Yine de bu kaçış sana pahalıya patladı ve **${fineAmount.toLocaleString()}** 💵 kaybettin!`);
            }
            await interaction.editReply({ embeds: [heistEmbed] });
        }
    },
};
