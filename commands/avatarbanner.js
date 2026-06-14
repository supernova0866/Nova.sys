const { SlashCommandBuilder } = require('discord.js');
const { container, textDisplay, separator } = require('../utils/components');

function avatarCommand() {
  return {
    data: new SlashCommandBuilder()
      .setName('avatar')
      .setDescription("Get a user's avatar")
      .addUserOption(o => o.setName('user').setDescription('User to get avatar for (defaults to you)').setRequired(false))
      .setIntegrationTypes([0, 1])
      .setContexts([0, 1, 2]),

    async execute(interaction) {
      const target = interaction.options.getUser('user') ?? interaction.user;
      const avatar = target.displayAvatarURL({ size: 4096, extension: 'png' });
      const gifAvatar = target.displayAvatarURL({ size: 4096, extension: 'gif' });
      const isAnimated = target.avatar?.startsWith('a_');

      const components = [
        textDisplay(`## 🖼️ Avatar — ${target.username}`),
        separator(),
        { type: 12, alt_text: "image", media: { url: avatar } },
        separator(),
        textDisplay(`[PNG](${avatar})${isAnimated ? ` • [GIF](${gifAvatar})` : ''} • \`${target.id}\``),
      ];

      await interaction.reply(container(components, interaction.user.id));
    },
  };
}

function bannerCommand() {
  return {
    data: new SlashCommandBuilder()
      .setName('banner')
      .setDescription("Get a user's profile banner")
      .addUserOption(o => o.setName('user').setDescription('User to get banner for (defaults to you)').setRequired(false))
      .setIntegrationTypes([0, 1])
      .setContexts([0, 1, 2]),

    async execute(interaction) {
      const target = interaction.options.getUser('user') ?? interaction.user;
      const fetched = await target.fetch();

      if (!fetched.banner) {
        return interaction.reply({ content: `❌ **${target.username}** doesn't have a banner set.`, flags: 64 });
      }

      const banner = fetched.bannerURL({ size: 4096, extension: 'png' });
      const gifBanner = fetched.bannerURL({ size: 4096, extension: 'gif' });
      const isAnimated = fetched.banner?.startsWith('a_');

      const components = [
        textDisplay(`## 🎨 Banner — ${target.username}`),
        separator(),
        { type: 12, alt_text: "image", media: { url: banner } },
        separator(),
        textDisplay(`[PNG](${banner})${isAnimated ? ` • [GIF](${gifBanner})` : ''} • \`${target.id}\``),
      ];

      await interaction.reply(container(components, interaction.user.id));
    },
  };
}

module.exports = { avatarCommand, bannerCommand };
