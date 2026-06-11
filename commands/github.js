const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { container, textDisplay, separator } = require('../utils/components');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('Get a GitHub user\'s profile info')
    .addStringOption(o =>
      o.setName('username').setDescription('GitHub username').setRequired(true)
    )
    .setIntegrationTypes([1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const username = interaction.options.getString('username').trim();
    await interaction.deferReply();

    let user, repos;
    try {
      const [userRes, reposRes] = await Promise.all([
        axios.get(`https://api.github.com/users/${encodeURIComponent(username)}`),
        axios.get(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=stars&per_page=3`),
      ]);
      user = userRes.data;
      repos = reposRes.data;
    } catch (e) {
      if (e.response?.status === 404) return interaction.editReply({ content: `❌ GitHub user \`${username}\` not found.` });
      return interaction.editReply({ content: '❌ Failed to fetch GitHub data.' });
    }

    const created = Math.floor(new Date(user.created_at).getTime() / 1000);
    const topRepos = repos.slice(0, 3).map(r =>
      `• [${r.name}](${r.html_url}) — ⭐ ${r.stargazers_count} ${r.language ? `\`${r.language}\`` : ''}`
    ).join('\n') || 'No public repos';

    const stats = [
      `👥 **Followers:** ${user.followers.toLocaleString()}`,
      `👤 **Following:** ${user.following.toLocaleString()}`,
      `📦 **Public repos:** ${user.public_repos.toLocaleString()}`,
      `📅 **Joined:** <t:${created}:D>`,
    ].join(' • ');

    const components = [
      textDisplay(`## <:github:> ${user.name ?? user.login} — [${user.login}](${user.html_url})`),
      separator(),
      { type: 11, media: { url: user.avatar_url } },
      separator(),
      textDisplay(user.bio ? `*${user.bio}*\n\n${stats}` : stats),
      separator(),
      textDisplay(`**Top repos:**\n${topRepos}`),
    ];

    if (user.blog) {
      components.push(separator());
      components.push(textDisplay(`🌐 [${user.blog}](${user.blog.startsWith('http') ? user.blog : 'https://' + user.blog})`));
    }

    await interaction.editReply(container(components, interaction.user.id));
  },
};
