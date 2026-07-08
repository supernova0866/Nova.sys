const { SlashCommandBuilder } = require('discord.js');
const { container, textDisplay, separator } = require('../utils/components');
const { getXpLog, clearXpLog } = require('../db');
const xpConfig = require('../assets/xpConfig.json');
const { OWNER_ID } = require('../config');

const GUILD_ID = '1276144243219365928';

module.exports = {
  guildId: GUILD_ID,

  data: new SlashCommandBuilder()
    .setName('dump')
    .setDescription('Dump and clear the bump/water log')
    .addStringOption(o =>
      o.setName('type').setDescription('Which log to dump').setRequired(true)
        .addChoices(
          { name: 'bump', value: 'bump' },
          { name: 'water', value: 'water' },
        )
    ),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: '❌ You are not authorized to use this command.', flags: 64 });
    }

    const type = interaction.options.getString('type');
    const cfg = xpConfig[type];

    await interaction.deferReply();

    const rows = await getXpLog(type);

    if (!rows.length) {
      return interaction.editReply({ content: `📭 No ${cfg?.label ?? type} events logged since the last dump.` });
    }

    const xpPerEvent = Number(cfg?.xp ?? 0);

    const lines = rows.map((r, i) => {
      const count = Number(r.count);
      const xp = count * xpPerEvent;
      return `${i + 1}. <@${r.user_id}> — **${count}** ${count === 1 ? 'time' : 'times'} — **${xp.toLocaleString()} XP**`;
    }).join('\n');

    const total = rows.reduce((s, r) => s + Number(r.count), 0);
    const totalXp = total * xpPerEvent;

    const components = [
      textDisplay(`## ${cfg?.emoji ?? '📋'} ${cfg?.label ?? type} Log Dump`),
      separator(),
      textDisplay(lines),
      separator(),
      textDisplay(`**Total events:** ${total} · **Unique users:** ${rows.length} · **Total XP:** ${totalXp.toLocaleString()}\n-# Log cleared — starting fresh.`),
    ];

    await interaction.editReply(container(components, interaction.user.id));

    try {
      await clearXpLog(type);
    } catch (err) {
      console.error(`[Dump] Failed to clear ${type} log:`, err.message);
    }
  },
};
