const { REST, Routes } = require('discord.js');
const { TOKEN, CLIENT_ID } = require('./config');

const calc = require('./commands/calc');
const define = require('./commands/define');
const time = require('./commands/time');
const { avatarCommand, bannerCommand } = require('./commands/avatarbanner');
const github = require('./commands/github');
const ascii = require('./commands/ascii');
const color = require('./commands/color');
const ship = require('./commands/ship');
const rate = require('./commands/rate');
const lyrics = require('./commands/lyrics');
const urban = require('./commands/urban');
const ratelimit = require('./commands/ratelimit');
const cats = require('./commands/cats');
const help = require('./commands/help');
const stats = require('./commands/stats');
const quote = require('./commands/quote');
const fact = require('./commands/fact');
const stash = require('./commands/stash');
const authorize = require('./commands/authorize');

const dump = require('./guildcommands/dump');

const globalCommands = [
  calc, define, time,
  avatarCommand(), bannerCommand(),
  github, ascii, color,
  ship, rate, lyrics, urban, ratelimit,
  cats, help, stats, quote, fact, stash,
  authorize,
].map(c => c.data.toJSON());

const guildCommands = [dump].filter(cmd => cmd.guildId && cmd.guildId !== 'PUT_YOUR_GUILD_ID_HERE');
const skippedGuildCommands = [dump].filter(cmd => !cmd.guildId || cmd.guildId === 'PUT_YOUR_GUILD_ID_HERE');

const rest = new REST().setToken(TOKEN);

(async () => {
  try {
    console.log(`Registering ${globalCommands.length} global commands...`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: globalCommands });
    console.log('✅ Global commands registered successfully!');
  } catch (err) {
    console.error('❌ Failed to register global commands:', err);
  }

  if (skippedGuildCommands.length) {
    console.warn(`⚠️ Skipped guild command(s) missing a real guildId: ${skippedGuildCommands.map(c => c.data.name).join(', ')}`);
  }

  const byGuild = {};
  for (const cmd of guildCommands) {
    (byGuild[cmd.guildId] ??= []).push(cmd.data.toJSON());
  }

  for (const [guildId, cmds] of Object.entries(byGuild)) {
    try {
      console.log(`Registering ${cmds.length} guild command(s) for ${guildId}...`);
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: cmds });
      console.log(`✅ Guild commands registered for ${guildId}!`);
    } catch (err) {
      console.error(`❌ Failed to register guild commands for ${guildId}:`, err);
    }
  }
})();
