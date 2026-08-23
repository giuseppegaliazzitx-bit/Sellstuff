export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const n = Math.abs(cents);
  const dollars = Math.floor(n / 100);
  const rem = n % 100;
  return `${sign}$${dollars.toLocaleString("en-US")}.${String(rem).padStart(2, "0")}`;
}

export function priceLabel(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) {
    const m = dollars / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `$${Math.round(dollars / 1000)}K`;
}
