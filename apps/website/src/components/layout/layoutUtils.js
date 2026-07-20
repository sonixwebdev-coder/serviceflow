const DAY_NAMES = {
  monday: 'Luni',
  tuesday: 'Marti',
  wednesday: 'Miercuri',
  thursday: 'Joi',
  friday: 'Vineri',
  saturday: 'Sambata',
  sunday: 'Duminica',
};

const DAY_ORDER = Object.keys(DAY_NAMES);

export const LEGAL_PAGE_SLUGS = ['termeni-si-conditii', 'politica-de-confidentialitate'];

export function getWebsitePagePath(subdomain, page) {
  return `/${subdomain}/${page.slug === 'home' ? '' : page.slug}`;
}

export function isWebsitePageActive(currentPath, subdomain, page) {
  const pagePath = getWebsitePagePath(subdomain, page);
  if (page.slug === 'home') {
    return currentPath === `/${subdomain}` || currentPath === `/${subdomain}/`;
  }
  return currentPath === pagePath || currentPath.startsWith(`${pagePath}/`);
}

export function condenseBusinessHours(operatingHours = {}) {
  const entries = DAY_ORDER.map((day, dayIndex) => {
    const hours = operatingHours[day];
    if (!hours) return null;
    const isOpen = hours.isOpen !== false;
    return {
      dayIndex,
      dayName: DAY_NAMES[day],
      label: isOpen ? `${hours.open || '09:00'} - ${hours.close || '18:00'}` : 'Inchis',
      isOpen,
    };
  }).filter(Boolean);

  return entries
    .reduce((groups, entry) => {
      const previous = groups.at(-1);
      if (previous?.label === entry.label && previous.lastDayIndex === entry.dayIndex - 1) {
        previous.endDay = entry.dayName;
        previous.lastDayIndex = entry.dayIndex;
      } else {
        groups.push({
          startDay: entry.dayName,
          endDay: entry.dayName,
          label: entry.label,
          isOpen: entry.isOpen,
          lastDayIndex: entry.dayIndex,
        });
      }
      return groups;
    }, [])
    .map(({ startDay, endDay, label, isOpen }) => ({ startDay, endDay, label, isOpen }));
}

export function footerGridClass(columnCount) {
  return (
    {
      0: '',
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    }[columnCount] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  );
}
