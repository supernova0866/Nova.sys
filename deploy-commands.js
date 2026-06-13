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

const commands = [
  calc, define, time,
  avatarCommand(), bannerCommand(),
  github, ascii, color,
  ship, rate, lyrics,
].map(c => c.data.toJSON());

const rest = new REST().setToken(TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} commands...`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Commands registered successfully!');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();
