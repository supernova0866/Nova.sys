const { SlashCommandBuilder } = require('discord.js');
const { textDisplay, separator } = require('../utils/components');

const CATEGORIES = {
  utilities: {
    label: 'Utilities',
    emoji: '🔧',
    commands: [
      { name: '/calc [expression]', desc: 'Evaluate a math expression' },
      { name: '/define [word]', desc: 'Look up a word definition' },
      { name: '/time [location]', desc: 'Get current time for a city, timezone, or UTC offset' },
      { name: '/color [hex/rgb/name]', desc: 'Get info and a swatch for any color' },
      { name: '/ascii [text]', desc: 'Convert text to ASCII art' },
      { name: '/ratelimit', desc: 'Check API rate limit status' },
    ],
  },
  information: {
    label: 'Information',
    emoji: '📋',
    commands: [
      { name: '/avatar [user?]', desc: 'Get a user\'s avatar at full resolution' },
      { name: '/banner [user?]', desc: 'Get a user\'s profile banner' },
      { name: '/github [username] [repo?]', desc: 'GitHub user profile or repo info' },
      { name: '/define [word]', desc: 'Dictionary definition via Free Dictionary API' },
      { name: '/urban [word]', desc: 'Urban Dictionary lookup' },
      { name: '/lyrics [song] [artist?]', desc: 'Find song info and lyrics' },
    ],
  },
  fun: {
    label: 'Fun',
    emoji: '🎉',
    commands: [
      { name: '/ship [user1] [user2]', desc: 'Check compatibility between two users' },
      { name: '/rate [type] [user]', desc: 'Rate a user on aura, simp, waifu, and more' },
      { name: '/cats [keyword1?] [keyword2?]', desc: 'Fetch a cat image by keyword' },
    ],
  },
  system: {
    label: 'System',
    emoji: '⚙️',
    commands: [
      { name: '/authorize [mode] [user?]', desc: 'Manage who can use the bot (owner only)' },
      { name: '/stats [scope?] [user?]', desc: 'View bot or user usage stats' },
      { name: '/help', desc: 'Show this help menu' },
    ],
  },
};

function buildHelpPayload(activeCategory, requesterId) {
  const cat = CATEGORIES[activeCategory];

  const commandList = cat.commands
    .map(c => `**${c.name}**\n-# ${c.desc}`)
    .join('\n\n');

  const buttons = Object.entries(CATEGORIES).map(([key, val]) => ({
    type: 2,
    style: key === activeCategory ? 1 : 2, // primary if active, secondary otherwise
    label: `${val.emoji} ${val.label}`,
    custom_id: `help_${key}_${requesterId}`,
  }));

  // Split buttons into two rows of 2
  const rows = [
    { type: 1, components: buttons.slice(0, 2) },
    { type: 1, components: buttons.slice(2, 4) },
    {
      type: 1, components: [{
        type: 2,
        style: 4,
        label: '✕',
        custom_id: `delete_${requesterId}`,
      }],
    },
  ];

  return {
    flags: 1 << 15,
    components: [
      {
        type: 17,
        components: [
          textDisplay(`## ${cat.emoji} ${cat.label}`),
          separator(),
          textDisplay(commandList),
          ...rows,
        ],
      },
    ],
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands')
    .setIntegrationTypes([1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    await interaction.reply(buildHelpPayload('utilities', interaction.user.id));
  },

  async handleButton(interaction) {
    const parts = interaction.customId.split('_'); // help_category_requesterId
    const category = parts[1];
    const requesterId = parts.slice(2).join('_');

    if (interaction.user.id !== requesterId) {
      return interaction.reply({ content: '❌ This menu belongs to someone else.', flags: 64 });
    }

    await interaction.update(buildHelpPayload(category, requesterId));
  },
};
