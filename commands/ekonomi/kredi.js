const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');

// Repütasyona göre kredi şartlarını hesaplayan yardımcı fonksiyon
function getLoanTerms(reputation) {
    // Faiz oranı: Repütasyon düştükçe artar, yükseldikçe azalır. Min %5, Max %35.
    const interestRate = Math.max(0.05, 0.35 - (reputation / 500));
    // Kredi Limiti: Repütasyon arttıkça artar.
    const maxLoan = 50000 + (reputation * 1000);
    return { interestRate, maxLoan };
}

module.exports = {
    category: 'ekonomi',
    data: new SlashCommandBuilder()
        .setName('kredi')
        .setDescription('Gelişmiş kredi (borç) işlemlerini yönetir.')
        .addSubcommand(sub => sub.setName('durum').setDescription('Kredi skorunuzu ve mevcut borcunuzu gösterir.'))
        .addSubcommand(sub => sub.setName('cek').setDescription('Bankadan faizli kredi çekersiniz.')
            .addIntegerOption(opt => opt.setName('miktar').setDescription('Çekmek istediğiniz miktar.').setRequired(true).setMinValue(1000)))
        .addSubcommand(sub => sub.setName('ode').setDescription('Kredi borcunuzu ödersiniz.')
            .addStringOption(opt => opt.setName('miktar').setDescription('Ödemek istediğiniz miktar veya "hepsi".').setRequired(true))),

    async execute(interaction) {
        const userProfile = await Profile.findOne({ userId: interaction.user.id });
        if (!userProfile) return interaction.reply({ content: 'Bu işlemi yapmak için bir profilin olmalı. `/profil`', ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply();

        try {
            if (subcommand === 'durum') {
                const terms = getLoanTerms(userProfile.reputation);
                const embed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('Finansal Durum Raporu')
                    .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                    .addFields(
                        { name: 'Kredi Skoru (Repütasyon)', value: `> **${userProfile.reputation.toFixed(0)}** Puan`},
                        { name: 'Mevcut Faiz Oranın', value: `> **%${(terms.interestRate * 100).toFixed(1)}**`},
                        { name: 'Maksimum Kredi Limitin', value: `> **${terms.maxLoan.toLocaleString()}** 💵`}
                    );

                if (userProfile.loan && userProfile.loan.principal > 0) {
                    const totalDebt = Math.floor(userProfile.loan.principal * (1 + userProfile.loan.interestRate));
                    embed.addFields(
                        { name: 'Aktif Kredi Borcu', value: `> Toplam **${totalDebt.toLocaleString()}** 💵`, inline: true },
                        { name: 'Son Ödeme Tarihi', value: `> <t:${Math.floor(userProfile.loan.dueDate.getTime() / 1000)}:R>`, inline: true }
                    );
                } else {
                    embed.addFields({ name: 'Aktif Kredi Borcu', value: '> Bulunmuyor ✅' });
                }
                return interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'cek') {
                if (userProfile.loan && userProfile.loan.principal > 0) return interaction.editReply('Zaten ödenmemiş bir kredin varken yenisini çekemezsin.');

                const terms = getLoanTerms(userProfile.reputation);
                const amount = interaction.options.getInteger('miktar');

                if (amount > terms.maxLoan) return interaction.editReply(`Kredi skorun bu miktarı çekmek için yeterli değil. Maksimum limitin: **${terms.maxLoan.toLocaleString()}** 💵`);

                userProfile.balance += amount;
                userProfile.loan.principal = amount;
                userProfile.loan.interestRate = terms.interestRate;
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 7);
                userProfile.loan.dueDate = dueDate;
                await userProfile.save();

                const totalDebt = Math.floor(amount * (1 + terms.interestRate));
                const embed = new EmbedBuilder().setColor('#2ECC71').setTitle('✅ Kredi Çekildi!').setDescription(`Cüzdanına **${amount.toLocaleString()}** 💵 eklendi.`).addFields(
                    { name: 'Geri Ödenecek Toplam Tutar', value: `> **${totalDebt.toLocaleString()}** 💵`},
                    { name: 'Son Ödeme Tarihi', value: `> <t:${Math.floor(dueDate.getTime() / 1000)}:F>` }
                );
                return interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'ode') {
                if (!userProfile.loan || userProfile.loan.principal <= 0) return interaction.editReply('Ödenecek bir kredi borcun bulunmuyor.');

                const amountStr = interaction.options.getString('miktar');
                const totalDebt = Math.floor(userProfile.loan.principal * (1 + userProfile.loan.interestRate));
                let amount;

                if (amountStr.toLowerCase() === 'hepsi') {
                    amount = totalDebt;
                } else {
                    amount = parseInt(amountStr);
                    if (isNaN(amount)) return interaction.editReply('Lütfen geçerli bir sayı veya "hepsi" yazın.');
                }

                if (userProfile.balance < amount) return interaction.editReply('Cüzdanında bu ödemeyi yapmak için yeterli para yok.');

                const payment = Math.min(amount, totalDebt);
                userProfile.balance -= payment;

                const newPrincipal = Math.max(0, (totalDebt - payment) / (1 + userProfile.loan.interestRate));
                userProfile.loan.principal = Math.ceil(newPrincipal);

                if (userProfile.loan.principal <= 0) {
                    const wasOnTime = new Date() < userProfile.loan.dueDate;
                    if (wasOnTime) {
                        userProfile.reputation += 10; // Zamanında ödediği için repütasyon kazandı
                        await interaction.followUp({content: '🎉 Borcunu zamanında kapattığın için **+10 Repütasyon** kazandın!', ephemeral: true})
                    }
                    userProfile.loan.dueDate = null;
                }

                await userProfile.save();
                return interaction.editReply(`✅ **${payment.toLocaleString()}** 💵 ödeme yaptın. Kalan ana borcun: **${userProfile.loan.principal.toLocaleString()}** 💵`);
            }
        } catch (error) {
            console.error('Kredi komutunda hata:', error);
            await interaction.editReply('Kredi işlemi sırasında bir hata oluştu.');
        }
    },
};
