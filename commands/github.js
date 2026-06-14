const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { container, textDisplay, separator } = require('../utils/components');

const trunc = (str, len) => str && str.length > len ? str.slice(0, len - 3) + '...' : str;

const ghHeaders = process.env.GITHUB_TOKEN
  ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
  : {};

async function fetchUser(username) {
  const [userRes, reposRes] = await Promise.all([
    axios.get(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers: ghHeaders }),
    axios.get(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=stars&per_page=3`, { headers: ghHeaders }),
  ]);
  return { user: userRes.data, repos: reposRes.data };
}

async function fetchRepo(username, repo) {
  const res = await axios.get(
    `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}`,
    { headers: ghHeaders }
  );
  return res.data;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('github')
    .setDescription('Get a GitHub user profile or repo info')
    .addStringOption(o =>
      o.setName('username').setDescription('GitHub username').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('repo').setDescription('Repo name (optional — shows specific repo info)').setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const username = interaction.options.getString('username').trim();
    const repo = interaction.options.getString('repo')?.trim();
    await interaction.deferReply();

    if (repo) {
      // Repo lookup
      let data;
      try {
        data = await fetchRepo(username, repo);
      } catch (e) {
        if (e.response?.status === 404) return interaction.editReply({ content: `❌ Repo \`${username}/${repo}\` not found.` });
        return interaction.editReply({ content: '❌ Failed to fetch repo data.' });
      }

      const pushed = Math.floor(new Date(data.pushed_at).getTime() / 1000);
      const created = Math.floor(new Date(data.created_at).getTime() / 1000);

      const components = [
        textDisplay(`## 📦 [${data.full_name}](${data.html_url})`),
        separator(),
        textDisplay(data.description ? `*${trunc(data.description, 200)}*` : '*No description*'),
        separator(),
        textDisplay(
          `⭐ **Stars:** ${data.stargazers_count.toLocaleString()}\n` +
          `🍴 **Forks:** ${data.forks_count.toLocaleString()}\n` +
          `🐛 **Open issues:** ${data.open_issues_count.toLocaleString()}\n` +
          `👁️ **Watchers:** ${data.watchers_count.toLocaleString()}\n` +
          `${data.language ? `💻 **Language:** ${data.language}\n` : ''}` +
          `📅 **Created:** <t:${created}:D>\n` +
          `🔄 **Last push:** <t:${pushed}:R>`
        ),
      ];

      if (data.license) {
        components.push(separator());
        components.push(textDisplay(`📄 **License:** ${data.license.name}`));
      }

      if (data.homepage) {
        components.push(separator());
        components.push(textDisplay(`🌐 [${trunc(data.homepage, 100)}](${data.homepage.startsWith('http') ? data.homepage : 'https://' + data.homepage})`));
      }

      return interaction.editReply(container(components, interaction.user.id));
    }

    // User profile lookup
    let user, repos;
    try {
      ({ user, repos } = await fetchUser(username));
    } catch (e) {
      if (e.response?.status === 404) return interaction.editReply({ content: `❌ GitHub user \`${username}\` not found.` });
      return interaction.editReply({ content: '❌ Failed to fetch GitHub data.' });
    }

    const created = Math.floor(new Date(user.created_at).getTime() / 1000);
    const topRepos = repos.slice(0, 3).map(r =>
      `• [${trunc(r.name, 50)}](${r.html_url}) — ⭐ ${r.stargazers_count} ${r.language ? `\`${trunc(r.language, 20)}\`` : ''}`
    ).join('\n') || 'No public repos';

    const stats = [
      `👥 **Followers:** ${user.followers.toLocaleString()}`,
      `👤 **Following:** ${user.following.toLocaleString()}`,
      `📦 **Public repos:** ${user.public_repos.toLocaleString()}`,
      `📅 **Joined:** <t:${created}:D>`,
    ].join(' • ');

    const components = [
      textDisplay(`## ${trunc(user.name ?? user.login, 100)} — [${user.login}](${user.html_url})`),
      separator(),
      { type: 11, media: { url: user.avatar_url } },
      separator(),
      textDisplay(user.bio ? `*${trunc(user.bio, 200)}*\n\n${stats}` : stats),
      separator(),
      textDisplay(`**Top repos:**\n${topRepos}`),
    ];

    if (user.blog) {
      components.push(separator());
      components.push(textDisplay(`🌐 [${trunc(user.blog, 100)}](${user.blog.startsWith('http') ? user.blog : 'https://' + user.blog})`));
    }

    await interaction.editReply(container(components, interaction.user.id));
  },
};
    
