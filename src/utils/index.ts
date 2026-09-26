/**
 * Rounds a money amount to a WHOLE taka.
 *
 * Campaign prices are percentage-off a base price, so they land on fractions
 * (৳250 at 10% off = 225, but ৳150 at 25% off = 112.5). The storefront quotes
 * whole taka everywhere, so every module that derives a discounted amount runs
 * it through here. Rounding is applied to the UNIT price before it is
 * multiplied by a quantity, so a line total is always a whole number too —
 * never `quantity × 112.5 = 337.5`.
 *
 * `Math.round` (not truncation) is deliberate: 112.5 becomes 113, so a
 * campaign never quietly shaves taka off the price it advertised.
 */
export const toSolidTaka = (amount: number): number => {
  const value = Number(amount);
  return Number.isFinite(value) ? Math.round(value) : 0;
};

export const parseExpirationTime = (time: string) => {
  const value = parseInt(time.slice(0, -1), 10);
  const unit = time.slice(-1);

  switch (unit) {
    case 's':
      return value; // Seconds
    case 'm':
      return value * 60; // Minutes
    case 'h':
      return value * 3600; // Hours
    case 'd':
      return value * 86400; // Days
  }
};