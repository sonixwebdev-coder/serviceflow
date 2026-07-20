import { describe, expect, it } from 'vitest';
import { condenseBusinessHours, isWebsitePageActive } from './layoutUtils';

describe('condenseBusinessHours', () => {
  it('uses calendar order and groups consecutive matching schedules', () => {
    const result = condenseBusinessHours({
      friday: { open: '09:00', close: '17:00' },
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      saturday: { isOpen: false },
    });

    expect(result).toEqual([
      { startDay: 'Luni', endDay: 'Marti', label: '09:00 - 17:00', isOpen: true },
      { startDay: 'Vineri', endDay: 'Vineri', label: '09:00 - 17:00', isOpen: true },
      { startDay: 'Sambata', endDay: 'Sambata', label: 'Inchis', isOpen: false },
    ]);
  });
});

describe('isWebsitePageActive', () => {
  it('recognizes home and nested custom-page routes', () => {
    expect(isWebsitePageActive('/demo/', 'demo', { slug: 'home' })).toBe(true);
    expect(isWebsitePageActive('/demo/services/details', 'demo', { slug: 'services' })).toBe(true);
    expect(isWebsitePageActive('/other/services', 'demo', { slug: 'services' })).toBe(false);
  });
});
