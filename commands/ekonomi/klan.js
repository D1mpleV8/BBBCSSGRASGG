const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Profile = require('../../models/Profile');
const Clan = require('../../models/Clan');

module.exports = {
    category: 'ekonomi',
    data: new SlashCommandBuilder()
        .setName('klan')
        .setDescription('Klan paneli, klan kurma ve davet işlemleri.')
        .addSubcommand(sub => sub.setName('bilgi').setDescription('Klan panelini veya bekleyen davetlerini görüntüler.'))
        .addSubcommand(sub => sub.setName('kur').setDescription('Yeni bir klan kurar.')
            .addStringOption(opt => opt.setName('isim').setDescription('Klanının tam adı.').setRequired(true))
            .addStringOption(opt => opt.setName('etiket').setDescription('Klanının kısa etiketi (Max 5 krk).').setRequired(true).setMaxLength(5)))
        .addSubcommand(sub => sub.setName('davet').setDescription('Bir kullanıcıyı klanınıza davet eder.')
            .addUserOption(opt => opt.setName('kullanıcı').setDescription('Davet edilecek kişi.').setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        // deferReply'ı sadece potansiyel olarak özel olacak mesajlar için kullanıyoruz.
        // Public mesajlar için doğrudan reply veya followUp kullanacağız.

        // ================== /klan bilgi (KLAN HUB) ==================
        if (subcommand === 'bilgi') {
            await interaction.deferReply(); // Bilgi paneli herkese açık olabilir
            const userProfile = await Profile.findOne({ userId: interaction.user.id }).populate('clan');

            if (userProfile && userProfile.clan) {
                const clan = userProfile.clan;
                const owner = await interaction.client.users.fetch(clan.ownerId);
                const memberList = clan.members.map(id => `<@${id}>`).join(', ');

                const clanEmbed = new EmbedBuilder()
                    .setColor('#E67E22')
                    .setTitle(`🛡️ ${clan.name} [${clan.tag}]`)
                    .addFields(
                        { name: 'Lider', value: owner.username, inline: true },
                        { name: 'Üye Sayısı', value: `${clan.members.length} kişi`, inline: true },
                        { name: 'Seviye', value: `${clan.level}`, inline: true },
                        { name: 'Banka', value: `${clan.bank.toLocaleString()} 💵`, inline: true },
                        { name: 'Kuruluş Tarihi', value: `<t:${Math.floor(clan.createdAt.getTime() / 1000)}:D>`, inline: true },
                        { name: 'Üyeler', value: memberList }
                    );
                return interaction.editReply({ embeds: [clanEmbed] });
            }
            else {
                const invites = userProfile ? userProfile.pendingInvites : [];
                if (invites.length === 0) {
                    return interaction.editReply({ content: 'Şu anda bir klanda değilsin ve bekleyen bir davetin yok.' });
                }

                const invitesEmbed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('Bekleyen Klan Davetlerin')
                    .setDescription('Aşağıdaki klanlardan davet aldın. Kararını vermek için butonları kullan.');

                const rows = [];
                for (const invite of invites) {
                    invitesEmbed.addFields({ name: `Gelen Davet: ${invite.clanName}`, value: `Kararını aşağıdan ver.` });
                    rows.push(new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`clan_accept_${invite.clanId}`).setLabel(`${invite.clanName}'e Katıl`).setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`clan_decline_${invite.clanId}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
                    ));
                }
                return interaction.editReply({ embeds: [invitesEmbed], components: rows });
            }
        }
        // ================== /klan kur ==================
        else if (subcommand === 'kur') {
            await interaction.deferReply();
            const clanName = interaction.options.getString('isim');
            const clanTag = interaction.options.getString('etiket');
            const cost = 500000;
            const userProfile = await Profile.findOne({ userId: interaction.user.id });
            if (!userProfile || userProfile.bank < cost) return interaction.editReply(`Klan kurmak için bankanda en az **${cost.toLocaleString()}** 💵 olmalı.`);
            if (userProfile.clan) return interaction.editReply('Zaten bir klana üyesin.');
            const existingClan = await Clan.findOne({ $or: [{ name: clanName }, { tag: clanTag }] });
            if (existingClan) return interaction.editReply('Bu isimde veya etikette bir klan zaten mevcut.');

            userProfile.bank -= cost;
            const newClan = new Clan({ name: clanName, tag: clanTag, ownerId: interaction.user.id, members: [interaction.user.id] });
            userProfile.clan = newClan._id;
            userProfile.pendingInvites = [];
            await Promise.all([newClan.save(), userProfile.save()]);
            const successEmbed = new EmbedBuilder().setColor('#2ECC71').setTitle(`🛡️ Klan Kuruldu: ${clanName} [${clanTag}]`).setDescription(`**${interaction.user.username}** klanını kurdu!`);
            return interaction.editReply({ embeds: [successEmbed] });
        }
        // ================== /klan davet ==================
        else if (subcommand === 'davet') {
            await interaction.deferReply({ ephemeral: true }); // Bu cevap sadece davet edene özel olmalı
            const targetUser = interaction.options.getUser('kullanıcı');
            if (targetUser.bot || targetUser.id === interaction.user.id) return interaction.editReply('Geçersiz hedef.');

            const authorProfile = await Profile.findOne({ userId: interaction.user.id }).populate('clan');
            if (!authorProfile || !authorProfile.clan) return interaction.editReply('Bir klana sahip olmadan kimseyi davet edemezsin.');
            if (authorProfile.clan.ownerId !== interaction.user.id) return interaction.editReply('Sadece klan lideri yeni üye davet edebilir.');

            const targetProfile = await Profile.findOneAndUpdate({ userId: targetUser.id }, { $setOnInsert: { username: targetUser.username } }, { upsert: true, new: true });
            if (targetProfile.clan) return interaction.editReply(`**${targetUser.username}** zaten başka bir klana üye.`);
            if (targetProfile.pendingInvites.some(inv => inv.clanId.equals(authorProfile.clan._id))) return interaction.editReply('Bu kullanıcıya zaten davet göndermişsin.');

            targetProfile.pendingInvites.push({ clanId: authorProfile.clan._id, clanName: authorProfile.clan.name });
            await targetProfile.save();
            return interaction.editReply(`✅ **${targetUser.username}** adlı kullanıcıya klan davetin başarıyla gönderildi. Daveti görmek için \`/klan bilgi\` komutunu kullanmasını söyle.`);
        }
    },
};
