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
