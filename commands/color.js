const { SlashCommandBuilder } = require('discord.js');
const tinycolor = require('tinycolor2');
const { container, textDisplay, separator } = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('color')
    .setDescription('Get info about a color')
    .addStringOption(o =>
      o.setName('color').setDescription('Hex (#ff0000), RGB (255,0,0), or name (red)').setRequired(true)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const input = interaction.options.getString('color').trim();
    const color = tinycolor(input);

    if (!color.isValid()) {
      return interaction.reply({ content: `❌ Couldn't parse \`${input}\` as a color.`, flags: 64 });
    }

    const hex = color.toHexString().toUpperCase();
    const rgb = color.toRgb();
    const hsl = color.toHsl();
    const hsv = color.toHsv();
    const name = color.toName() || 'N/A';
    const isDark = color.isDark();

    const swatchUrl = `https://singlecolorimage.com/get/${hex.replace('#', '')}/200x200`;

    const components = [
      textDisplay(`## 🎨 Color — ${hex}`),
      separator(),
      { type: 12, items: [{ media: { url: swatchUrl } }] },
      separator(),
      textDisplay(
        `**HEX:** \`${hex}\`\n` +
        `**RGB:** \`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\`\n` +
        `**HSL:** \`hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s * 100)}%, ${Math.round(hsl.l * 100)}%)\`\n` +
        `**HSV:** \`hsv(${Math.round(hsv.h)}, ${Math.round(hsv.s * 100)}%, ${Math.round(hsv.v * 100)}%)\`\n` +
        `**Name:** ${name}\n` +
        `**Brightness:** ${isDark ? '🌑 Dark' : '☀️ Light'}`
      ),
    ];

    await interaction.reply(container(components, interaction.user.id));
  },
};
