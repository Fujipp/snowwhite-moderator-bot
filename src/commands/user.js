const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { setBalance, addBalance, removeBalance, getBalance } = require('../../db/base');

const COLOR = 3618621;
const LINE_SUCCESS = 'https://www.animatedimages.org/data/media/562/animated-line-image-0312.gif';

function tsDiscord(date = new Date()) {
    const unix = Math.floor(date.getTime() / 1000);
    return `<t:${unix}:f>`;
}

async function notifyCreditChange(guild, { user, amount, total, method, title }) {
    // หาช่องแจ้งเตือนจาก config (ถ้ามี)
    // สามารถเพิ่ม logic อ่านจาก config ได้ภายหลัง
    const configManager = require('../utils/configManager');
    const notifyChannelId = configManager.get('features.creditReply.notifyChannelId');

    if (!notifyChannelId) return;

    const ch = guild.channels.cache.get(notifyChannelId);
    if (!ch?.isTextBased?.()) return;

    const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(title || '✅ เติมเงินสำเร็จ (ADMIN)')
        .setDescription('\n')
        .setThumbnail(user.displayAvatarURL())
        .setImage(LINE_SUCCESS)
        .setFields(
            {
                name: '👤 คนทำรายการ',
                value: `\`\`\`${user.username}\`\`\``,
                inline: false,
            },
            {
                name: '💰 จำนวนเงินที่เติม',
                value: `\`\`\`${Number(amount || 0).toFixed(2)}\`\`\``,
                inline: false,
            },
            {
                name: '🪙 จำนวนเงินทั้งหมด',
                value: `\`\`\`${Number(total || 0).toFixed(2)}\`\`\``,
                inline: false,
            },
            {
                name: '🏦 ช่องทางการเติม',
                value: `\`\`\`${method || 'Admin'}\`\`\``,
                inline: false,
            },
            {
                name: '🕐 วันที่และเวลาทำรายการ',
                value: tsDiscord(),
                inline: false,
            }
        );

    await ch.send({ embeds: [embed] }).catch(() => { });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('จัดการเครดิตผู้ใช้')
        .addSubcommand(s => s.setName('add').setDescription('เพิ่มเครดิต')
            .addUserOption(o => o.setName('user').setDescription('ผู้ใช้').setRequired(true))
            .addNumberOption(o => o.setName('amount').setDescription('จำนวนเงิน').setRequired(true)))
        .addSubcommand(s => s.setName('update').setDescription('อัปเดตยอดเป็นจำนวนใหม่')
            .addUserOption(o => o.setName('user').setDescription('ผู้ใช้').setRequired(true))
            .addNumberOption(o => o.setName('amount').setDescription('จำนวนเงิน').setRequired(true)))
        .addSubcommand(s => s.setName('delete').setDescription('ลบข้อมูลผู้ใช้')
            .addUserOption(o => o.setName('user').setDescription('ผู้ใช้').setRequired(true)))
        .addSubcommand(s => s.setName('get').setDescription('ดูยอด')
            .addUserOption(o => o.setName('user').setDescription('ผู้ใช้').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getNumber('amount');

        await interaction.deferReply({ ephemeral: true });

        try {
            if (sub === 'add') {
                const next = await addBalance(user.id, amount);
                await notifyCreditChange(interaction.guild, {
                    user,
                    amount,
                    total: next,
                    method: 'Admin',
                    title: '✅ แจ้งเตือนเติมเงินสำเร็จ (Admin)'
                });
                return interaction.editReply(`✅ เพิ่มให้ <@${user.id}> → ${amount.toFixed(2)} THB | คงเหลือ ${Number(next).toFixed(2)} THB`);
            }

            if (sub === 'update') {
                const next = await setBalance(user.id, amount);
                await notifyCreditChange(interaction.guild, {
                    user,
                    amount,
                    total: next,
                    method: 'Admin',
                    title: '✅ แจ้งเตือนอัปเดตยอดสำเร็จ (Admin)'
                });
                return interaction.editReply(`✏️ ตั้งยอดของ <@${user.id}> เป็น ${Number(next).toFixed(2)} THB`);
            }

            if (sub === 'delete') {
                const ok = await removeBalance(user.id);
                return interaction.editReply(ok ? `🗑️ ลบข้อมูลของ <@${user.id}> แล้ว` : '❌ ไม่พบข้อมูล');
            }

            if (sub === 'get') {
                const cur = await getBalance(user.id);
                return interaction.editReply(`👛 <@${user.id}> คงเหลือ ${Number(cur || 0).toFixed(2)} THB`);
            }
        } catch (err) {
            console.error('User command error:', err);
            return interaction.editReply(`❌ เกิดข้อผิดพลาด: ${err.message}`);
        }
    }
};
