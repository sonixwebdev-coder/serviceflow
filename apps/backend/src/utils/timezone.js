/**
 * Timezone utilities for creating dates in a specific timezone.
 *
 * Needed because `new Date(year, month, day, hour, minute)` uses the
 * server's local timezone (often UTC in production), which causes
 * mismatches when the business operates in a different timezone.
 */

const DEFAULT_TIMEZONE = 'Europe/Bucharest';

/**
 * Creates a Date object representing a specific local time in the given timezone.
 *
 * Example: dateInTimezone(2024, 3, 20, 9, 0, 'Europe/Bucharest')
 * returns a Date for 09:00 Bucharest (07:00 UTC in winter, 06:00 UTC in summer).
 */
function dateInTimezone(year, month, day, hour, minute, timezone = DEFAULT_TIMEZONE) {
  // Create a Date as if the target local time were UTC
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  // Compare UTC representation vs target-timezone representation to derive the offset
  const utcStr = utcGuess.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = utcGuess.toLocaleString('en-US', { timeZone: timezone });

  const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();

  return new Date(utcGuess.getTime() - offsetMs);
}

/**
 * Returns start-of-day and end-of-day Date objects in the given timezone.
 */
function dayBoundsInTimezone(year, month, day, timezone = DEFAULT_TIMEZONE) {
  const startOfDay = dateInTimezone(year, month, day, 0, 0, timezone);
  const endOfDay = dateInTimezone(year, month, day, 23, 59, timezone);
  // Add 59 seconds and 999ms to end of day
  endOfDay.setUTCSeconds(59);
  endOfDay.setUTCMilliseconds(999);
  return { startOfDay, endOfDay };
}

module.exports = { dateInTimezone, dayBoundsInTimezone, DEFAULT_TIMEZONE };
