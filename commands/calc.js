const { SlashCommandBuilder } = require('discord.js');
const { container, textDisplay, separator } = require('../utils/components');

function safeEval(expr) {
  const sanitized = expr.replace(/[^0-9+\-*/.()%\s^]/g, '');
  if (!sanitized) throw new Error('Invalid expression');
  const result = Function('"use strict"; return (' + sanitized.replace(/\^/g, '**') + ')')();
  if (!isFinite(result)) throw new Error('Result is not finite');
  return result;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Evaluate a math expression')
    .addStringOption(o =>
      o.setName('expression').setDescription('e.g. 2+2, (10*3)/5, 2^8').setRequired(true)
    )
    .setIntegrationTypes([1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const expr = interaction.options.getString('expression');
    let result;
    try {
      result = safeEval(expr);
    } catch {
      return interaction.reply({ content: '❌ Invalid expression.', flags: 64 });
    }

    const components = [
      textDisplay(`## 🧮 Calculator`),
      separator(),
      textDisplay(`**Expression:** \`${expr}\`\n**Result:** \`${result}\``),
    ];

    await interaction.reply(container(components, interaction.user.id));
  },
};
