const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const Warning = require('../../models/Warning');
const { logAction } = require('../../utils/logHelper');

module.exports = {
    category: 'yonetim',
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Bir kullanıcıya uyarı verir.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Uyarılacak kullanıcı')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Uyarı sebebi')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .setDMPermission(false),
    async execute(interaction) {
        const target = interaction.options.getMember('kullanıcı');
        const reason = interaction.options.getString('sebep');

        if (!target) {
            return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });
        }

        if (target.id === interaction.user.id) {
            return interaction.reply({ content: 'Kendine uyarı veremezsin.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const newWarning = new Warning({
                guildId: interaction.guild.id,
                userId: target.id,
                userTag: target.user.tag,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason: reason,
            });

            await newWarning.save();

            // Kullanıcıya DM gönder
            const dmEmbed = new EmbedBuilder()
                .setColor('#E67E22')
                .setTitle(`\`${interaction.guild.name}\` Sunucusunda Uyarı Aldınız`)
                .addFields(
                    { name: 'Sebep', value: reason },
                    { name: 'Yetkili', value: interaction.user.tag }
                )
                .setTimestamp();

            await target.send({ embeds: [dmEmbed] }).catch(err => {
                console.log(`Uyarı: ${target.user.tag} kullanıcısına DM gönderilemedi.`);
            });

            // Kanalda onay mesajı göster
            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setDescription(`✅ ${target.user.tag} başarıyla uyarıldı. Sebep: **${reason}**`);

            await interaction.editReply({ embeds: [successEmbed] });

            // Log kanalına gönder
            await logAction(
                interaction.client,
                interaction.guild,
                'Kullanıcı Uyarıldı',
                [
                    { name: 'Kullanıcı', value: `${target.user.tag} (${target.id})`, inline: true },
                    { name: 'Yetkili', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                    { name: 'Sebep', value: reason }
                ],
                '#F1C40F' // Yellow for warn
            );

            // --- Otomatik Yaptırım Sistemi ---
            const userWarnings = await Warning.find({ guildId: interaction.guild.id, userId: target.id });
            const warningCount = userWarnings.length;
            let autoActionDescription = '';

            // 5 uyarı -> Kick
            if (warningCount >= 5) {
                if (target.kickable) {
                    await target.kick(`Otomatik sistem: 5. uyarıya ulaşıldı.`);
                    autoActionDescription = `Kullanıcı **5. uyarıya** ulaştığı için sunucudan otomatik olarak atıldı.`;
                    await logAction(interaction.client, interaction.guild, 'Otomatik Eylem: Kick', [{ name: 'Kullanıcı', value: target.user.tag }, { name: 'Sebep', value: '5 uyarıya ulaşıldı.' }], '#E74C3C');
                }
            }
            // 3 uyarı -> Mute (Timeout)
            else if (warningCount >= 3) {
                 if (target.moderatable) {
                    const muteDuration = 60 * 60 * 1000; // 1 saat
                    await target.timeout(muteDuration, 'Otomatik sistem: 3. uyarıya ulaşıldı.');
                    autoActionDescription = `Kullanıcı **3. uyarıya** ulaştığı için 1 saatliğine otomatik olarak susturuldu.`;
                    await logAction(interaction.client, interaction.guild, 'Otomatik Eylem: Timeout', [{ name: 'Kullanıcı', value: target.user.tag }, { name: 'Sebep', value: '3 uyarıya ulaşıldı.' }, {name: 'Süre', value: '1 Saat'}], '#E67E22');
                 }
            }

            if (autoActionDescription) {
                const autoActionEmbed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('🚨 Otomatik Yaptırım Uygulandı 🚨')
                    .setDescription(autoActionDescription);
                await interaction.followUp({ embeds: [autoActionEmbed], ephemeral: true });
            }

        } catch (error) {
            console.error('Warn komutunda hata:', error);
            await interaction.editReply({ content: 'Kullanıcıya uyarı verilirken bir hata oluştu.' });
        }
    },
};
