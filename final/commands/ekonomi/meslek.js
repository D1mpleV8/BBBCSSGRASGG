const { EmbedBuilder } = require('discord.js');
const Profile = require('../../models/Profile');

const JOBS = {
    polis: { name: 'Polis', emoji: '👮', description: 'Şehrin düzenini korur, suçluları yakalar.', levelReq: 10 },
    hirsiz: { name: 'Hırsız', emoji: '🥷', description: 'Riskli soygunlar yapar, gölgelerde yaşar.', levelReq: 10 },
    mekanik: { name: 'Mekanik', emoji: '🛠️', description: 'Araçları onarır ve modifiye eder.', levelReq: 5 },
    sofor: { name: 'Şoför', emoji: '🚚', description: 'Uzun yol sevkiyatları yaparak para kazanır.', levelReq: 5 },
    hacker: { name: 'Hacker', emoji: '💻', description: 'Dijital sistemlere sızarak büyük vurgunlar yapar.', levelReq: 15 },
};

module.exports = {
    name: 'meslek',
    description: 'Meslek seç, durumunu gör veya işten ayrıl.',
    aliases: ['job'],
    async execute(context) {
        const { message, args } = context;
        const prefix = process.env.PREFIX || '!';
        const action = args[0]?.toLowerCase();

        const userProfile = await Profile.findOne({ userId: message.author.id });
        if (!userProfile) {
            return message.reply(`Önce bir profil oluşturmalısın. \`${prefix}profil\``);
        }

        if (action === 'durum') {
            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle(`${message.author.username}'in Meslek Kartı`)
                .addFields({ name: 'Mevcut Meslek', value: `> **${userProfile.job || 'İşsiz'}**` });
            return message.reply({ embeds: [embed] });
        }

        if (action === 'ayrıl' || action === 'ayril') {
            if (!userProfile.job || userProfile.job === 'İşsiz') {
                return message.reply('Zaten bir işin yok ki istifa edesin.');
            }
            const oldJob = userProfile.job;
            userProfile.job = 'İşsiz';
            await userProfile.save();
            return message.reply(`✅ **${oldJob}** mesleğinden başarıyla istifa ettin. Artık bir işsizin...`);
        }

        if (action === 'seç' || action === 'sec') {
            const jobKey = args[1]?.toLowerCase();

            // Eğer kullanıcı bir meslek ID'si belirtmediyse, mevcut meslekleri listele
            if (!jobKey) {
                if (userProfile.job && userProfile.job !== 'İşsiz') {
                     return message.reply(`Zaten bir mesleğin var (${userProfile.job}). Yeni bir meslek seçmek için önce istifa etmelisin: \`${prefix}meslek ayrıl\``);
                }
                const embed = new EmbedBuilder()
                    .setTitle('İş ve İşçi Bulma Kurumu')
                    .setDescription(`Aşağıdaki mesleklerden birini seçmek için \`${prefix}meslek seç <meslek_id>\` komutunu kullan.`)
                    .setColor('#1ABC9C');

                for (const [key, job] of Object.entries(JOBS)) {
                    embed.addFields({
                        name: `${job.emoji} ${job.name} (\`ID: ${key}\`)`,
                        value: `Gereken Seviye: **${job.levelReq}**\n*${job.description}*`
                    });
                }
                return message.reply({ embeds: [embed] });
            }

            // Kullanıcı bir meslek ID'si belirtti, atamayı yap
            const selectedJob = JOBS[jobKey];
            if (!selectedJob) {
                return message.reply('Geçersiz meslek IDsi. Lütfen listeden doğru IDyi gir.');
            }
            if (userProfile.level < selectedJob.levelReq) {
                return message.reply(`Bu mesleğe katılmak için yeterli seviyede değilsin. Gereken seviye: **${selectedJob.levelReq}**`);
            }
            if (userProfile.job && userProfile.job !== 'İşsiz') {
                 return message.reply(`Zaten bir mesleğin var (${userProfile.job}). Yeni bir meslek seçmek için önce istifa etmelisin: \`${prefix}meslek ayrıl\``);
            }

            userProfile.job = selectedJob.name;
            await userProfile.save();
            return message.reply(`🎉 Tebrikler! Artık bir **${selectedJob.name}** oldun.`);
        }

        // Eğer hiçbir eylem belirtilmediyse, yardım mesajı göster
        const usageEmbed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('Meslek Komutu Kullanımı')
            .addFields(
                { name: 'Durumunu Gör', value: `\`${prefix}meslek durum\`` },
                { name: 'Meslekleri Listele/Seç', value: `\`${prefix}meslek seç\`\n\`${prefix}meslek seç <meslek_id>\`` },
                { name: 'İstifa Et', value: `\`${prefix}meslek ayrıl\`` }
            );
        await message.reply({ embeds: [usageEmbed] });
    },
};
