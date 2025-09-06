const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'kurulum',
    description: 'Sunucuyu otomatik olarak yapılandırır.',
    async execute(message) {

        // 1. YETKİ KONTROLÜ
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.');
        }

        const guild = message.guild;
        await message.reply('Gelişmiş sunucu kurulumu başlatılıyor... Roller, kanallar ve izinler ayarlanacak.');

        try {
            // 2. ROLLERİ OLUŞTURMA
            console.log('Roller oluşturuluyor...');
            const rolesToCreate = [
                { name: '⚙️ Yönetici', color: '#ff4d4d', permissions: [PermissionsBitField.Flags.Administrator] },
                { name: '🚨 Moderatör', color: '#ffaf4d', permissions: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers] },
                { name: '🤖 Bot', color: '#808080' },
                { name: '✅ Üye', color: '#4dff7d' },
                { name: '🔇 Susturulmuş', color: '#546e7a' }
            ];

            const createdRoles = new Map();

            for (const roleData of rolesToCreate) {
                const existingRole = guild.roles.cache.find(r => r.name === roleData.name);
                if (!existingRole) {
                    const newRole = await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        permissions: roleData.permissions || [],
                    });
                    createdRoles.set(roleData.name, newRole);
                } else {
                    createdRoles.set(roleData.name, existingRole);
                }
            }

            // 3. KANAL VE KATEGORİLERİ İZİNLERLE OLUŞTURMA
            console.log('Kanallar ve izinler ayarlanıyor...');

            const adminRole = createdRoles.get('⚙️ Yönetici');
            const modRole = createdRoles.get('🚨 Moderatör');
            const uyeRole = createdRoles.get('✅ Üye');
            const mutedRole = createdRoles.get('🔇 Susturulmuş');
            const everyoneRole = guild.roles.everyone;

            // BİLGİ KATEGORİSİ
            const bilgiCategory = await guild.channels.create({ name: '╔════ BİLGİ ════╗', type: ChannelType.GuildCategory });
            await guild.channels.create({
                name: '📜-kurallar', type: ChannelType.GuildText, parent: bilgiCategory,
                permissionOverwrites: [
                    { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] },
                    { id: modRole.id, allow: [PermissionsBitField.Flags.SendMessages] },
                    { id: adminRole.id, allow: [PermissionsBitField.Flags.SendMessages] },
                ],
            });
            await guild.channels.create({
                name: '📢-duyurular', type: ChannelType.GuildText, parent: bilgiCategory,
                permissionOverwrites: [
                    { id: everyoneRole.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] },
                    { id: modRole.id, allow: [PermissionsBitField.Flags.SendMessages] },
                    { id: adminRole.id, allow: [PermissionsBitField.Flags.SendMessages] },
                ],
            });

            // GENEL SOHBET KATEGORİSİ
            const sohbetCategory = await guild.channels.create({
                name: '╠════ SOHBET ════╣', type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: uyeRole.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                    { id: mutedRole.id, deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions] },
                ],
            });
            await guild.channels.create({ name: '💬-sohbet', type: ChannelType.GuildText, parent: sohbetCategory });
            await guild.channels.create({ name: '🖼️-foto-chat', type: ChannelType.GuildText, parent: sohbetCategory });
            await guild.channels.create({ name: '🤖-bot-komut', type: ChannelType.GuildText, parent: sohbetCategory });

            // GENEL SES KANALLARI
            const genelSesCategory = await guild.channels.create({
                name: '╠═══ GENEL SES ═══╣', type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: uyeRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
                    { id: mutedRole.id, deny: [PermissionsBitField.Flags.Speak] },
                ],
            });
            for (let i = 1; i <= 5; i++) {
                await guild.channels.create({ name: `Sohbet ${i}`, type: ChannelType.GuildVoice, parent: genelSesCategory });
            }
            await guild.channels.create({
                name: '🔴 Toplantı Odası', type: ChannelType.GuildVoice, parent: genelSesCategory,
                permissionOverwrites: [
                    { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
                    { id: uyeRole.id, deny: [PermissionsBitField.Flags.Connect] },
                    { id: modRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] },
                    { id: adminRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] },
                ]
            });

            // OYUN KANALLARI
            const oyunlar = [
                { name: 'LEAGUE OF LEGENDS', channels: ['LoL Duo', 'LoL Trio', 'LoL 5v5'] },
                { name: 'VALORANT', channels: ['Valorant Duo/Trio', 'Valorant 5v5', 'Valorant Unrated'] },
                { name: 'PUBG', channels: ['PUBG Duo', 'PUBG Squad', 'PUBG Eğlence'] }
            ];
            for (const oyun of oyunlar) {
                const gameCategory = await guild.channels.create({
                    name: `🎮 ${oyun.name} 🎮`, type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        { id: everyoneRole.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: uyeRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect] },
                        { id: mutedRole.id, deny: [PermissionsBitField.Flags.Speak] },
                    ],
                });
                for (const channelName of oyun.channels) {
                    await guild.channels.create({ name: channelName, type: ChannelType.GuildVoice, parent: gameCategory });
                }
            }

            await message.channel.send('✅ Sunucu kurulumu ve izin ayarları başarıyla tamamlandı!');

        } catch (error) {
            console.error('Kurulum sırasında bir hata oluştu:', error);
            await message.channel.send('❌ Kurulum sırasında bir hata oluştu. Lütfen botun yetkilerini (`Yönetici`) kontrol et ve tekrar dene.');
        }
    },
};