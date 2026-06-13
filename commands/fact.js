const { SlashCommandBuilder } = require('discord.js');
const { container, textDisplay, separator } = require('../utils/components');
const { tieredPick } = require('../utils/tieredPick');
const factsData = require('../assets/facts.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fact')
    .setDescription('Get a random fact')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const { entry, tier, category } = tieredPick(factsData);

    const components = [
      textDisplay(`## Fact`),
      separator(),
      textDisplay(entry),
    ];

    if (tier === 'cat') {
      components.push(separator());
      components.push(textDisplay(`-# Source: Cat Research Institute.`));
    } else if (tier === 'bot') {
      components.push(separator());
      components.push(textDisplay(`-# Source: ${category === 'made_up' ? 'Trust Me Bro.' : 'Nova.sys Self-Reflection.'}`));
    }

    await interaction.reply(container(components, interaction.user.id));
  },
};
