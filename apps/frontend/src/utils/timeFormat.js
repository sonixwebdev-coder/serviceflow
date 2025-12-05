/**
 * Format decimal hours to Romanian time format
 * @param {number} hours - Decimal hours (e.g., 1.5)
 * @returns {string} Formatted time (e.g., "1 ora 30 min")
 */
export const formatHoursToRomanian = (hours) => {
  if (!hours || hours === 0) return '0 min';

  const totalMinutes = Math.round(hours * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hrs === 0) {
    return `${mins} min`;
  }

  if (mins === 0) {
    return hrs === 1 ? '1 ora' : `${hrs} ore`;
  }

  const hourText = hrs === 1 ? 'ora' : 'ore';
  return `${hrs} ${hourText} ${mins} min`;
};

/**
 * Format minutes to Romanian time format
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted time (e.g., "1 ora 30 min")
 */
export const formatMinutesToRomanian = (minutes) => {
  if (!minutes || minutes === 0) return '0 min';

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs === 0) {
    return `${mins} min`;
  }

  if (mins === 0) {
    return hrs === 1 ? '1 ora' : `${hrs} ore`;
  }

  const hourText = hrs === 1 ? 'ora' : 'ore';
  return `${hrs} ${hourText} ${mins} min`;
};
