const { SlashCommandBuilder } = require('discord.js');
const { getShipRange } = require('../db');
const { parseRange, container, textDisplay, separator } = require('../utils/components');

function getBar(score) {
  const filled = Math.round(score / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function getComment(score) {
  if (score >= 90) return 'soulmates fr fr 💞';
  if (score >= 75) return 'pretty solid ship ngl 💕';
  if (score >= 60) return 'there\'s something there... 👀';
  if (score >= 45) return 'mid ship, could work 🤷';
  if (score >= 30) return 'it\'s not looking great 😬';
  if (score >= 15) return 'yikes... 💀';
  return 'absolutely not. 🚫';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Check the ship score between two users')
    .addUserOption(o => o.setName('user1').setDescription('First user').setRequired(true))
    .addUserOption(o => o.setName('user2').setDescription('Second user').setRequired(true))
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2');

    if (user1.id === user2.id) {
      return interaction.reply({ content: '❌ You can\'t ship someone with themselves.', flags: 64 });
    }

    let score;
    try {
      const rangeStr = await getShipRange(user1.id, user2.id);
      score = rangeStr ? parseRange(rangeStr) : Math.floor(Math.random() * 101);
    } catch {
      score = Math.floor(Math.random() * 101);
    }

    const name1 = user1.username;
    const name2 = user2.username;
    const shipName = name1.slice(0, Math.ceil(name1.length / 2)) + name2.slice(Math.floor(name2.length / 2));

    const bar = getBar(score);
    const comment = getComment(score);

    const components = [
      textDisplay(`## 💘 Ship — ${shipName}`),
      separator(),
      textDisplay(
        `**${user1.username}** 💗 **${user2.username}**\n\n` +
        `\`${bar}\` **${score}%**\n\n` +
        `*${comment}*`
      ),
    ];

    await interaction.reply(container(components, interaction.user.id));
  },
};
