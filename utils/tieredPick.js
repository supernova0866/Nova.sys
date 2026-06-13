function tieredPick(data) {
  const tiers = Object.values(data.tiers);
  const tierRoll = Math.random() * 100;
  let cumulative = 0;

  let selectedTier = tiers[tiers.length - 1];
  for (const tier of tiers) {
    cumulative += tier.chance;
    if (tierRoll < cumulative) {
      selectedTier = tier;
      break;
    }
  }

  const totalWeight = selectedTier.pools.reduce((s, p) => s + p.weight, 0);
  const poolRoll = Math.random() * totalWeight;
  let poolCumulative = 0;

  let selectedPool = selectedTier.pools[selectedTier.pools.length - 1];
  for (const pool of selectedTier.pools) {
    poolCumulative += pool.weight;
    if (poolRoll < poolCumulative) {
      selectedPool = pool;
      break;
    }
  }

  const entries = selectedPool.entries;
  return {
    entry: entries[Math.floor(Math.random() * entries.length)],
    tier: Object.keys(data.tiers).find(k => data.tiers[k] === selectedTier),
    category: selectedPool.category,
  };
}

module.exports = { tieredPick };
