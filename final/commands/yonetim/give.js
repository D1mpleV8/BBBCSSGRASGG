const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');
const { Stock } = require('../../models/Stock');
const cars = require('../../data/cars');

module.exports = {
    category: 'yonetim',
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Bot sahibi özel komutu: Kullanıcılara varlık verir.')
        .addSubcommand(sub => sub
            .setName('para')
            .setDescription('Bir kullanıcıya para verir.')
            .addUserOption(option => option.setName('kullanıcı').setDescription('Para verilecek kullanıcı').setRequired(true))
            .addIntegerOption(option => option.setName('miktar').setDescription('Verilecek miktar').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('xp')
            .setDescription('Bir kullanıcıya XP verir.')
            .addUserOption(option => option.setName('kullanıcı').setDescription('XP verilecek kullanıcı').setRequired(true))
            .addIntegerOption(option => option.setName('miktar').setDescription('Verilecek miktar').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('araba')
            .setDescription('Bir kullanıcıya araba verir.')
            .addUserOption(option => option.setName('kullanıcı').setDescription('Araba verilecek kullanıcı').setRequired(true))
            .addStringOption(option => option.setName('araba_id').setDescription('Verilecek arabanın IDsi').setRequired(true)))
        .setDMPermission(false),

    async execute(interaction) {
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: 'Bu komutu sadece bot sahibi kullanabilir.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getUser('kullanıcı');
        const amount = interaction.options.getInteger('miktar');

        await interaction.deferReply({ ephemeral: true });

        const targetProfile = await Profile.findOneAndUpdate(
            { userId: target.id },
            { $setOnInsert: { username: target.username } },
            { upsert: true, new: true }
        );

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setAuthor({ name: 'Varlık Verildi', iconURL: interaction.client.user.displayAvatarURL() });

        try {
            switch (subcommand) {
                case 'para':
                    targetProfile.balance += amount;
                    await targetProfile.save();
                    embed.setDescription(`✅ **${target.tag}** adlı kullanıcının cüzdanına **${amount.toLocaleString()}** 💵 eklendi.`);
                    break;
                case 'xp':
                    targetProfile.xp += amount;
                    // Seviye atlama mantığı burada da uygulanabilir, şimdilik basit tutuluyor.
                    await targetProfile.save();
                    embed.setDescription(`✅ **${target.tag}** adlı kullanıcıya **${amount.toLocaleString()}** XP eklendi.`);
                    break;
                case 'araba':
                    const carId = interaction.options.getString('araba_id');
                    const carData = cars.find(c => c.id === carId);
                    if (!carData) return interaction.editReply('Geçersiz araba IDsi.');
                    if (targetProfile.cars.includes(carId)) return interaction.editReply('Kullanıcı bu arabaya zaten sahip.');

                    targetProfile.cars.push(carId);
                    await targetProfile.save();
                    embed.setDescription(`✅ **${carData.name}** adlı araba **${target.tag}** adlı kullanıcının garajına eklendi.`);
                    break;
            }
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Give komutu hatası:', error);
            await interaction.editReply('Varlık verilirken bir hata oluştu.');
        }
    },
};
