const { SlashCommandBuilder } = require('discord.js');
const figlet = require('figlet');
const { container, textDisplay, separator } = require('../utils/components');

const FONTS = ['Standard', 'Big', 'Slant', 'Banner', 'Block', 'Bubble', 'Digital', 'Doom', 'Isometric1', 'Larry 3D'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ascii')
    .setDescription('Convert text to ASCII art')
    .addStringOption(o =>
      o.setName('text').setDescription('Text to convert (keep it short!)').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('font').setDescription('Font style').setRequired(false)
        .addChoices(...FONTS.map(f => ({ name: f, value: f })))
    )
    .setIntegrationTypes([1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const text = interaction.options.getString('text').slice(0, 20);
    const font = interaction.options.getString('font') ?? 'Standard';

    let art;
    try {
      art = await new Promise((resolve, reject) => {
        figlet.text(text, { font }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    } catch {
      return interaction.reply({ content: '❌ Failed to generate ASCII art.', flags: 64 });
    }

    if (art.length > 1900) {
      return interaction.reply({ content: '❌ Text too long — try fewer characters.', flags: 64 });
    }

    const components = [
      textDisplay(`## 🔤 ASCII Art — \`${font}\``),
      separator(),
      textDisplay(`\`\`\`\n${art}\n\`\`\``),
    ];

    await interaction.reply(container(components, interaction.user.id));
  },
};
