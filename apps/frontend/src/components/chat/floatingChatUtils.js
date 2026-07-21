import { Hash, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';

export const getChannelName = (channel, currentUserId) => {
  if (channel.name) return channel.name;
  if (channel.type === 'DIRECT' || channel.type === 'GROUP') {
    const otherMembers =
      channel.members?.filter((member) => member.user?.id !== currentUserId) || [];
    if (otherMembers.length === 0) return 'Conversație';
    return otherMembers
      .map((member) => `${member.user?.firstName || ''} ${member.user?.lastName || ''}`)
      .join(', ');
  }
  return 'Canal';
};

export const getChannelInitials = (channel, currentUserId) => {
  if (channel.type === 'DIRECT') {
    const other = channel.members?.find((member) => member.user?.id !== currentUserId);
    if (other?.user) {
      return `${other.user.firstName?.[0] || ''}${other.user.lastName?.[0] || ''}`;
    }
  }
  return channel.name?.[0]?.toUpperCase() || '#';
};

export const getChannelIcon = (channel) => {
  if (channel.type === 'DIRECT') return null;
  if (channel.type === 'GROUP') return Users;
  return Hash;
};

export const isChannelOnline = (channel, currentUserId, onlineUsers) => {
  if (channel.type !== 'DIRECT') return false;
  const other = channel.members?.find((member) => member.user?.id !== currentUserId);
  return other?.user?.id ? onlineUsers[other.user.id] : false;
};

export const formatLastMessageTime = (channel) => {
  const time = channel.lastMessageAt || channel.createdAt;
  if (!time) return '';
  try {
    return formatDistanceToNow(new Date(time), { addSuffix: false, locale: ro });
  } catch {
    return '';
  }
};

export const sortChannelsByActivity = (channels) =>
  [...channels].sort((a, b) => {
    const aTime = a.lastMessageAt || a.createdAt;
    const bTime = b.lastMessageAt || b.createdAt;
    return new Date(bTime) - new Date(aTime);
  });
