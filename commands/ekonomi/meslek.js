const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const Profile = require('../../models/Profile');

const JOBS = {
    polis: { name: 'Polis', emoji: '👮', description: 'Şehrin düzenini korur, suçluları yakalar.', levelReq: 10 },
    hirsiz: { name: 'Hırsız', emoji: '🥷', description: 'Riskli soygunlar yapar, gölgelerde yaşar.', levelReq: 10 },
    mekanik: { name: 'Mekanik', emoji: '🛠️', description: 'Araçları onarır ve modifiye eder.', levelReq: 5 },
    sofor: { name: 'Şoför', emoji: '🚚', description: 'Uzun yol sevkiyatları yaparak para kazanır.', levelReq: 5 },
    hacker: { name: 'Hacker', emoji: '💻', description: 'Dijital sistemlere sızarak büyük vurgunlar yapar.', levelReq: 15 },
};

module.exports = {
    category: 'ekonomi',
    data: new SlashCommandBuilder()
        .setName('meslek')
        .setDescription('Meslek seç, durumunu gör veya işten ayrıl.')
        .addSubcommand(sub => sub.setName('seç').setDescription('Mevcut meslekler arasından birini seç.'))
        .addSubcommand(sub => sub.setName('durum').setDescription('Mevcut mesleğini ve bilgilerini görüntüler.'))
        .addSubcommand(sub => sub.setName('ayrıl').setDescription('Mevcut mesleğinden istifa edersin.')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userProfile = await Profile.findOne({ userId: interaction.user.id });

        if (!userProfile) return interaction.reply({ content: 'Önce bir profil oluşturmalısın. `/profil`', ephemeral: true });

        if (subcommand === 'durum') {
            const embed = new EmbedBuilder().setColor('#3498DB').setTitle(`${interaction.user.username}'in Meslek Kartı`).addFields({ name: 'Mevcut Meslek', value: `> **${userProfile.job}**` });
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'ayrıl') {
            if (userProfile.job === 'İşsiz') return interaction.reply({ content: 'Zaten bir işin yok ki istifa edesin.', ephemeral: true });
            const oldJob = userProfile.job;
            userProfile.job = 'İşsiz';
            await userProfile.save();
            return interaction.reply(`✅ **${oldJob}** mesleğinden başarıyla istifa ettin. Artık bir işsizin...`);
        }

        if (subcommand === 'seç') {
            if (userProfile.job !== 'İşsiz') return interaction.reply({ content: `Zaten bir mesleğin var. Yeni bir meslek seçmek için önce istifa etmelisin: \`/meslek ayrıl\``, ephemeral: true });

            const menuOptions = Object.keys(JOBS).map(key => {
                const job = JOBS[key];
                return { label: job.name, value: key, description: `Gereken Seviye: ${job.levelReq}. ${job.description}`, emoji: job.emoji, }
            });
            const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('job_selection').setPlaceholder('Bir meslek seç...').addOptions(menuOptions));
            const embed = new EmbedBuilder().setTitle('İş ve İşçi Bulma Kurumu').setDescription('Kariyerine bir yön verme zamanı.').setColor('#1ABC9C');
            const message = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true, fetchReply: true });

            const filter = (i) => i.customId === 'job_selection' && i.user.id === interaction.user.id;
            try {
                const selection = await message.awaitMessageComponent({ filter, time: 60000 });
                const selectedJobKey = selection.values[0];
                const selectedJob = JOBS[selectedJobKey];
                if (userProfile.level < selectedJob.levelReq) {
                    return selection.update({ content: `Bu mesleğe katılmak için yeterli seviyede değilsin. Gereken seviye: **${selectedJob.levelReq}**`, components: [], embeds:[] });
                }
                userProfile.job = selectedJob.name;
                await userProfile.save();
                return selection.update({ content: `🎉 Tebrikler! Artık bir **${selectedJob.name}** oldun.`, components: [], embeds:[] });
            } catch (error) {
                await interaction.editReply({ content: 'Meslek seçimi için zamanın doldu veya bir hata oluştu.', components: [], embeds:[] });
            }
        }
    }
};
