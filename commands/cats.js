const { SlashCommandBuilder } = require('discord.js');
const { container, textDisplay, separator } = require('../utils/components');
const catsData = require('../assets/cats.json');

const KEYWORDS = [
  'smug', 'angy', 'sad', 'cute', 'derp', 'judging',
  'eepy', 'silly', 'cozy', 'grumpy', 'shocked', 'vibing',
  'wet', 'orange', ':P',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function filterImages(k1, k2) {
  const all = catsData.images;

  if (k1 && k2) {
    const both = all.filter(i => i.keywords.includes(k1) && i.keywords.includes(k2));
    if (both.length) return both;
  }

  if (k1) {
    const one = all.filter(i => i.keywords.includes(k1));
    if (one.length) return one;
  }

  if (k2) {
    const one = all.filter(i => i.keywords.includes(k2));
    if (one.length) return one;
  }

  return all;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cats')
    .setDescription('Fetch a cat image')
    .addStringOption(o =>
      o.setName('keyword1').setDescription('Primary keyword filter').setRequired(false)
        .addChoices(...KEYWORDS.map(k => ({ name: k, value: k })))
    )
    .addStringOption(o =>
      o.setName('keyword2').setDescription('Secondary keyword filter').setRequired(false)
        .addChoices(...KEYWORDS.map(k => ({ name: k, value: k })))
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const k1 = interaction.options.getString('keyword1');
    const k2 = interaction.options.getString('keyword2');

    const pool = filterImages(k1, k2);

    // filterImages only falls back to the full list when every supplied
    // keyword (individually and combined) failed to match anything.
    if ((k1 || k2) && pool === catsData.images) {
      const components = [
        textDisplay('## Cat Not Found.'),
        separator(),
        textDisplay('No cats matching the supplied criteria were located.\n-# Consider lowering your standards.'),
      ];
      return interaction.reply(container(components, interaction.user.id));
    }

    const cat = pick(pool);
    const label = [k1, k2].filter(Boolean).join(' + ') || 'random';

    const components = [
      textDisplay(`## 🐱 Cat — \`${label}\``),
      separator(),
      { type: 12, items: [{ media: { url: cat.url } }] },
      ...(cat.credit ? [separator(), textDisplay(`-# Credit: ${cat.credit}`)] : []),
    ];

    await interaction.reply(container(components, interaction.user.id));
  },
};
