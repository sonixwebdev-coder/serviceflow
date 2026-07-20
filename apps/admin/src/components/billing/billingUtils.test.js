import { describe, expect, it } from 'vitest';
import { isTrialExpiringWithinSevenDays } from './billingUtils';

const NOW = new Date('2026-07-20T12:00:00.000Z');

describe('isTrialExpiringWithinSevenDays', () => {
  it('includes active trials ending within seven days', () => {
    expect(isTrialExpiringWithinSevenDays({ trialEndsAt: '2026-07-27T12:00:00.000Z' }, NOW)).toBe(
      true
    );
  });

  it('excludes expired, distant, and undated trials', () => {
    expect(isTrialExpiringWithinSevenDays({ trialEndsAt: '2026-07-19T12:00:00.000Z' }, NOW)).toBe(
      false
    );
    expect(isTrialExpiringWithinSevenDays({ trialEndsAt: '2026-07-28T12:00:00.000Z' }, NOW)).toBe(
      false
    );
    expect(isTrialExpiringWithinSevenDays({}, NOW)).toBe(false);
  });
});
