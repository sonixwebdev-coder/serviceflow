import React from 'react';
import { useChatStore } from '../../state/useChatStore';
import { useChannel } from '../../hooks/useChat';
import { Users, Crown, Shield, User as UserIcon } from 'lucide-react';

/**
 * Chat Member List Component
 * Displays channel members with online status and roles
 */
export default function ChatMemberList() {
  const { activeChannelId, isUserOnline } = useChatStore();
  const { data: channel, isLoading } = useChannel(activeChannelId);

  if (!activeChannelId || isLoading) {
    return null;
  }

  if (!channel) {
    return null;
  }

  const getRoleIcon = (role) => {
    if (role === 'OWNER') return <Crown className="h-3 w-3 text-yellow-500" />;
    if (role === 'ADMIN') return <Shield className="h-3 w-3 text-blue-500" />;
    return null;
  };

  const getRoleLabel = (role) => {
    if (role === 'OWNER') return 'Proprietar';
    if (role === 'ADMIN') return 'Admin';
    return 'Membru';
  };

  // Sort members: online first, then by role
  const sortedMembers = [...(channel.members || [])].sort((a, b) => {
    const aOnline = isUserOnline(a.user.id);
    const bOnline = isUserOnline(b.user.id);

    if (aOnline !== bOnline) {
      return bOnline ? 1 : -1;
    }

    const roleOrder = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  const onlineCount = sortedMembers.filter((m) => isUserOnline(m.user.id)).length;

  return (
    <div className="flex w-64 flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Membri</h3>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {onlineCount} online • {sortedMembers.length} total
        </p>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {sortedMembers.map((member) => {
            const online = isUserOnline(member.user.id);

            return (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50"
              >
                {/* Avatar with online status */}
                <div className="relative flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-viperx-primary text-sm text-white">
                    {member.user.firstName[0]}
                    {member.user.lastName[0]}
                  </div>
                  {online && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500"></div>
                  )}
                </div>

                {/* User Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    {getRoleIcon(member.role)}
                  </div>
                  <p className="truncate text-xs text-gray-500">
                    {online ? 'Online' : 'Deconectat'}
                  </p>
                </div>

                {/* Role Badge */}
                {(member.role === 'OWNER' || member.role === 'ADMIN') && (
                  <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {getRoleLabel(member.role)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
