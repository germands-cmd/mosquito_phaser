export function selectWeighted(weights, random = Math.random) {
  const entries = Object.entries(weights || {}).filter(
    ([, weight]) => Number.isFinite(weight) && weight > 0
  );
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);

  if (totalWeight <= 0) {
    return null;
  }

  const value = random() * totalWeight;
  let cumulativeWeight = 0;
  for (const [key, weight] of entries) {
    cumulativeWeight += weight;
    if (value < cumulativeWeight) {
      return key;
    }
  }

  return entries[entries.length - 1][0];
}
