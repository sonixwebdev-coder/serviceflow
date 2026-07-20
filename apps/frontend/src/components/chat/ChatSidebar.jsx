import { useState } from 'react';
import { useChatStore } from '../../state/useChatStore';
import { useAuthStore } from '../../state/useAuthStore';
import { useChannels } from '../../hooks/useChat';
import { Hash, Lock, MapPin, MessageSquare, Plus, Search, Users, UserPlus } from 'lucide-react';
import CreateDMDialog from './CreateDMDialog';
import CreateChannelDialog from './CreateChannelDialog';

// Skeleton component for channel items
const ChannelSkeleton = () => (
  <div className="flex items-center gap-2 px-3 py-2">
    <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
    <div className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
  </div>
);

// Skeleton for channel section
const SectionSkeleton = () => (
  <div className="mb-4">
    <div className="mb-2 flex items-center gap-2 px-3">
      <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
    </div>
    <div className="space-y-1">
      <ChannelSkeleton />
      <ChannelSkeleton />
      <ChannelSkeleton />
    </div>
  </div>
);

/**
 * Chat Sidebar Component
 * Displays channels list and search
 */
export default function ChatSidebar({ isMobile = false }) {
  const {
    channels,
    activeChannelId,
    setActiveChannel,
    searchQuery,
    setSearchQuery,
    filteredChannels,
    unreadCounts,
  } = useChatStore();
  const { user: currentUser } = useAuthStore();
  const { isLoading: channelsLoading } = useChannels();

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDM, setShowCreateDM] = useState(false);

  const displayChannels = searchQuery ? filteredChannels() : channels;

  // Group channels by type
  const locationChannels = displayChannels.filter((ch) => ch.type === 'LOCATION');
  const publicChannels = displayChannels.filter((ch) => ch.type === 'PUBLIC');
  const privateChannels = displayChannels.filter((ch) => ch.type === 'PRIVATE');
  const directMessages = displayChannels.filter((ch) => ch.type === 'DIRECT');
  const groupMessages = displayChannels.filter((ch) => ch.type === 'GROUP');

  const getChannelName = (channel) => {
    if (channel.name) return channel.name;

    // For DMs, show other user's name (not the current user)
    if (channel.type === 'DIRECT') {
      const otherMember = channel.members?.find((m) => m.user?.id !== currentUser?.id);
      if (otherMember?.user) {
        return `${otherMember.user.firstName} ${otherMember.user.lastName}`;
      }
    }

    // For group DMs, show participant names (excluding current user)
    if (channel.type === 'GROUP') {
      const otherMembers = channel.members?.filter((m) => m.user?.id !== currentUser?.id) || [];
      const names = otherMembers
        .slice(0, 3)
        .map((m) => m.user.firstName)
        .join(', ');
      const remaining = otherMembers.length - 3;
      if (remaining > 0) {
        return `${names} +${remaining}`;
      }
      return names || 'Chat Grup';
    }

    return 'Canal fără nume';
  };

  const getChannelIcon = (channel) => {
    if (channel.type === 'LOCATION') return <MapPin className="h-4 w-4 text-orange-500" />;
    if (channel.type === 'PUBLIC') return <Hash className="h-4 w-4" />;
    if (channel.type === 'PRIVATE') return <Lock className="h-4 w-4" />;
    if (channel.type === 'DIRECT') return <MessageSquare className="h-4 w-4" />;
    if (channel.type === 'GROUP') return <Users className="h-4 w-4" />;
    return <Hash className="h-4 w-4" />;
  };

  const ChannelItem = ({ channel }) => {
    const isActive = channel.id === activeChannelId;
    const unreadCount = unreadCounts[channel.id] || 0;

    return (
      <button
        onClick={() => setActiveChannel(channel.id)}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
          isActive ? 'bg-orange-100 text-orange-900' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {getChannelIcon(channel)}
          <span className="truncate text-sm font-medium">{getChannelName(channel)}</span>
        </div>
        {unreadCount > 0 && (
          <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  };

  const ChannelSection = ({ title, channels, icon: Icon }) => {
    if (channels.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-gray-500" />}
            <h3 className="text-xs font-semibold uppercase text-gray-500">{title}</h3>
          </div>
          <span className="text-xs text-gray-400">{channels.length}</span>
        </div>
        <div className="space-y-1">
          {channels.map((channel) => (
            <ChannelItem key={channel.id} channel={channel} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex h-full flex-col border-r border-gray-200 bg-white ${isMobile ? 'w-full' : 'w-64'}`}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 border-b border-gray-200 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Caută canale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-3">
        {channelsLoading ? (
          <>
            <SectionSkeleton />
            <SectionSkeleton />
          </>
        ) : (
          <>
            <ChannelSection title="Locatii" channels={locationChannels} icon={MapPin} />
            <ChannelSection title="Canale Publice" channels={publicChannels} icon={Hash} />
            <ChannelSection title="Canale Private" channels={privateChannels} icon={Lock} />
            <ChannelSection title="Mesaje Directe" channels={directMessages} icon={MessageSquare} />
            <ChannelSection title="Mesaje Grup" channels={groupMessages} icon={Users} />

            {displayChannels.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500">
                {searchQuery ? 'Niciun canal găsit' : 'Niciun canal încă'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3">
        <div className="space-y-2">
          <button
            onClick={() => setShowCreateDM(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-orange-50"
          >
            <UserPlus className="h-4 w-4" />
            Mesaj Nou
          </button>
          <button
            onClick={() => setShowCreateChannel(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Canal Nou
          </button>
        </div>
      </div>

      {/* Dialogs */}
      <CreateDMDialog isOpen={showCreateDM} onClose={() => setShowCreateDM(false)} />
      <CreateChannelDialog isOpen={showCreateChannel} onClose={() => setShowCreateChannel(false)} />
    </div>
  );
}
