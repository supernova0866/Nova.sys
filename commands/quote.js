const { SlashCommandBuilder } = require('discord.js');
const { container, textDisplay, separator } = require('../utils/components');
const { tieredPick } = require('../utils/tieredPick');
const quotesData = require('../assets/quotes.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Get a random quote')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const { entry, tier, category } = tieredPick(quotesData);

    const components = [
      textDisplay(`## Quote`),
      separator(),
      textDisplay(entry),
    ];

    if (tier === 'cat') {
      components.push(separator());
      components.push(textDisplay(`-# Source: The Cat.`));
    } else if (tier === 'bot') {
      components.push(separator());
      components.push(textDisplay(`-# Source: Nova.sys Internal Archives.`));
    }

    await interaction.reply(container(components, interaction.user.id));
  },
};
