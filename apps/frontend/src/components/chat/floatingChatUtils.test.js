import { describe, expect, it } from 'vitest';

import {
  formatLastMessageTime,
  getChannelIcon,
  getChannelInitials,
  getChannelName,
  isChannelOnline,
  sortChannelsByActivity,
} from './floatingChatUtils';

const otherMember = {
  user: { id: 'user-2', firstName: 'Maria', lastName: 'Ionescu' },
};

describe('floating chat presentation helpers', () => {
  it('derives direct-channel names and initials without the current user', () => {
    const channel = { type: 'DIRECT', members: [otherMember, { user: { id: 'user-1' } }] };

    expect(getChannelName(channel, 'user-1')).toBe('Maria Ionescu');
    expect(getChannelInitials(channel, 'user-1')).toBe('MI');
    expect(getChannelIcon(channel)).toBeNull();
  });

  it('selects group/public icons and reports direct-channel presence', () => {
    const directChannel = { type: 'DIRECT', members: [otherMember] };
    const groupChannel = { type: 'GROUP', name: 'Team' };
    const publicChannel = { type: 'PUBLIC', name: 'General' };

    expect(getChannelIcon(groupChannel)).toBeTruthy();
    expect(getChannelIcon(publicChannel)).toBeTruthy();
    expect(isChannelOnline(directChannel, 'user-1', { 'user-2': true })).toBe(true);
    expect(isChannelOnline(groupChannel, 'user-1', { 'user-2': true })).toBe(false);
  });

  it('sorts channels by latest activity and safely formats invalid timestamps', () => {
    const channels = [
      { id: 'old', createdAt: '2025-01-01T00:00:00.000Z' },
      {
        id: 'new',
        createdAt: '2025-01-01T00:00:00.000Z',
        lastMessageAt: '2025-01-02T00:00:00.000Z',
      },
    ];

    expect(sortChannelsByActivity(channels).map((channel) => channel.id)).toEqual(['new', 'old']);
    expect(formatLastMessageTime({ createdAt: 'not-a-date' })).toBe('');
    expect(formatLastMessageTime({})).toBe('');
  });
});
