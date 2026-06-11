const { SlashCommandBuilder } = require('discord.js');
const moment = require('moment-timezone');
const { container, textDisplay, separator } = require('../utils/components');

const TZ_ABBREVIATIONS = {
  IST: 'Asia/Kolkata', EST: 'America/New_York', PST: 'America/Los_Angeles',
  CST: 'America/Chicago', MST: 'America/Denver', GMT: 'Etc/GMT',
  UTC: 'Etc/UTC', BST: 'Europe/London', CET: 'Europe/Paris',
  JST: 'Asia/Tokyo', AEST: 'Australia/Sydney', HKT: 'Asia/Hong_Kong',
  SGT: 'Asia/Singapore', PKT: 'Asia/Karachi', BDT: 'Asia/Dhaka',
  MSK: 'Europe/Moscow', EET: 'Europe/Helsinki', WET: 'Europe/Lisbon',
};

const CITY_MAP = {
  'new york': 'America/New_York', 'london': 'Europe/London',
  'paris': 'Europe/Paris', 'tokyo': 'Asia/Tokyo',
  'sydney': 'Australia/Sydney', 'dubai': 'Asia/Dubai',
  'singapore': 'Asia/Singapore', 'hong kong': 'Asia/Hong_Kong',
  'mumbai': 'Asia/Kolkata', 'delhi': 'Asia/Kolkata',
  'kolkata': 'Asia/Kolkata', 'bangalore': 'Asia/Kolkata',
  'karachi': 'Asia/Karachi', 'dhaka': 'Asia/Dhaka',
  'beijing': 'Asia/Shanghai', 'shanghai': 'Asia/Shanghai',
  'moscow': 'Europe/Moscow', 'berlin': 'Europe/Berlin',
  'madrid': 'Europe/Madrid', 'rome': 'Europe/Rome',
  'toronto': 'America/Toronto', 'chicago': 'America/Chicago',
  'los angeles': 'America/Los_Angeles', 'la': 'America/Los_Angeles',
  'san francisco': 'America/Los_Angeles', 'sf': 'America/Los_Angeles',
  'seattle': 'America/Los_Angeles', 'denver': 'America/Denver',
  'mexico city': 'America/Mexico_City', 'cairo': 'Africa/Cairo',
  'johannesburg': 'Africa/Johannesburg', 'nairobi': 'Africa/Nairobi',
  'istanbul': 'Europe/Istanbul', 'tehran': 'Asia/Tehran',
  'jakarta': 'Asia/Jakarta', 'bangkok': 'Asia/Bangkok',
  'seoul': 'Asia/Seoul', 'taipei': 'Asia/Taipei',
  'auckland': 'Pacific/Auckland', 'amsterdam': 'Europe/Amsterdam',
  'brussels': 'Europe/Brussels', 'stockholm': 'Europe/Stockholm',
  'oslo': 'Europe/Oslo', 'helsinki': 'Europe/Helsinki',
  'warsaw': 'Europe/Warsaw', 'prague': 'Europe/Prague',
  'budapest': 'Europe/Budapest', 'vienna': 'Europe/Vienna',
  'zurich': 'Europe/Zurich', 'lisbon': 'Europe/Lisbon',
  'athens': 'Europe/Athens', 'riyadh': 'Asia/Riyadh',
};

function parseTimezone(input) {
  const clean = input.trim();

  const utcMatch = clean.match(/^(?:UTC|GMT)?([+-])(\d{1,2})(?::(\d{2}))?$/i);
  if (utcMatch) {
    const sign = utcMatch[1] === '+' ? 1 : -1;
    const hours = parseInt(utcMatch[2]);
    const mins = parseInt(utcMatch[3] || '0');
    const totalMins = sign * (hours * 60 + mins);
    const offsetStr = totalMins >= 0
      ? `+${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`
      : `-${String(Math.floor(Math.abs(totalMins) / 60)).padStart(2, '0')}:${String(Math.abs(totalMins) % 60).padStart(2, '0')}`;
    const tz = `Etc/GMT${totalMins <= 0 ? '+' : '-'}${Math.abs(Math.round(totalMins / 60))}`;
    return { tz: moment.tz.zone(tz) ? tz : null, label: `UTC${offsetStr}`, offsetMins: totalMins };
  }

  const upper = clean.toUpperCase();
  if (TZ_ABBREVIATIONS[upper]) return { tz: TZ_ABBREVIATIONS[upper], label: upper };

  const lower = clean.toLowerCase();
  if (CITY_MAP[lower]) return { tz: CITY_MAP[lower], label: clean };

  const mtzZone = moment.tz.zone(clean);
  if (mtzZone) return { tz: clean, label: clean };

  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('time')
    .setDescription('Get current time for a city, timezone, or UTC offset')
    .addStringOption(o =>
      o.setName('location').setDescription('City, timezone (IST, EST), or offset (+5:30, -7)').setRequired(true)
    )
    .setIntegrationTypes([1])
    .setContexts([0, 1, 2]),

  async execute(interaction) {
    const input = interaction.options.getString('location');
    const parsed = parseTimezone(input);

    if (!parsed || !parsed.tz) {
      return interaction.reply({ content: `❌ Couldn't recognize \`${input}\`. Try a city name, timezone abbreviation (IST, EST), or UTC offset (+5:30, -7).`, flags: 64 });
    }

    const now = moment().tz(parsed.tz);
    const unix = now.unix();
    const tzName = now.format('z');
    const utcOffset = now.format('Z');

    const components = [
      textDisplay(`## 🕐 Time — ${parsed.label}`),
      separator(),
      textDisplay(
        `**Current time:** <t:${unix}:F>\n**Relative:** <t:${unix}:R>\n**Timezone:** ${tzName} (UTC${utcOffset})`
      ),
    ];

    await interaction.reply(container(components, interaction.user.id));
  },
};
