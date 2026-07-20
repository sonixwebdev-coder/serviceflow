import { describe, expect, it } from 'vitest';
import { getActivityPresentation } from './activityPresentation';

describe('getActivityPresentation', () => {
  it('normalizes labels and actor identity for known activities', () => {
    const result = getActivityPresentation({
      entityType: 'Appointment',
      action: 'UPDATE',
      actor: { firstName: 'Ana', lastName: 'Pop' },
    });

    expect(result).toMatchObject({
      actionLabel: 'Actualizare',
      entityLabel: 'Programare',
      actorName: 'Ana Pop',
      actorInitials: 'AP',
    });
  });

  it('keeps unknown values visible and identifies system activity', () => {
    expect(
      getActivityPresentation({ entityType: 'CustomEntity', action: 'CUSTOM_ACTION' })
    ).toMatchObject({
      actionLabel: 'CUSTOM_ACTION',
      entityLabel: 'CustomEntity',
      actorName: 'Sistem',
      actorInitials: 'S',
    });
  });
});
