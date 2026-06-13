let callCount = 0;
let resetTimer = null;

function msUntilMidnightUTC() {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return midnight.getTime() - now.getTime();
}

function scheduleReset() {
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    callCount = 0;
    console.log('[Genius] Daily call count reset');
    scheduleReset();
  }, msUntilMidnightUTC());
}

scheduleReset();

function increment() { callCount++; }
function getCount() { return callCount; }
function getResetUnix() {
  const now = new Date();
  return Math.floor(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ) / 1000);
}

module.exports = { increment, getCount, getResetUnix };
