import { useNavigate } from 'react-router-dom';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { useChannels } from '../../../hooks/useChat';
import { useChatStore } from '../../../state/useChatStore';
import { useAuthStore } from '../../../state/useAuthStore';

const ListSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
        <div className="flex-1 space-y-1">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    ))}
  </div>
);

export default function RecentMessagesWidget() {
  const navigate = useNavigate();
  const { data: channels = [], isLoading } = useChannels();
  const { unreadCounts, setActiveChannel } = useChatStore();
  const { user: currentUser } = useAuthStore();

  // Sort by last activity and get top 5
  const recentChannels = [...channels]
    .sort((a, b) => {
      const aTime = a.lastMessageAt || a.createdAt;
      const bTime = b.lastMessageAt || b.createdAt;
      return new Date(bTime) - new Date(aTime);
    })
    .slice(0, 5);

  const getChannelName = (channel) => {
    if (channel.name) return channel.name;
    if (channel.type === 'DIRECT') {
      const other = channel.members?.find((m) => m.user?.id !== currentUser?.id);
      return other?.user ? `${other.user.firstName} ${other.user.lastName}` : 'Chat';
    }
    if (channel.type === 'GROUP') {
      const others = channel.members?.filter((m) => m.user?.id !== currentUser?.id) || [];
      return (
        others
          .slice(0, 2)
          .map((m) => m.user?.firstName)
          .join(', ') || 'Grup'
      );
    }
    return 'Canal';
  };

  const getChannelInitials = (channel) => {
    if (channel.type === 'DIRECT') {
      const other = channel.members?.find((m) => m.user?.id !== currentUser?.id);
      if (other?.user) {
        return `${other.user.firstName?.[0] || ''}${other.user.lastName?.[0] || ''}`;
      }
    }
    return channel.name?.[0]?.toUpperCase() || '#';
  };

  const handleOpenChat = (channelId) => {
    setActiveChannel(channelId);
    navigate('/chat');
  };

  if (isLoading) {
    return <ListSkeleton />;
  }

  if (recentChannels.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <MessageSquare className="h-6 w-6 text-gray-400" />
        </div>
        <p className="font-medium text-gray-900">Nicio conversatie</p>
        <p className="text-sm text-gray-500 mt-1">Incepe o conversatie noua</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recentChannels.map((channel) => {
        const unread = unreadCounts[channel.id] || 0;
        return (
          <div
            key={channel.id}
            onClick={() => handleOpenChat(channel.id)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
              unread > 0 ? 'bg-purple-50 hover:bg-purple-100' : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                unread > 0 ? 'bg-purple-200 text-purple-700' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {getChannelInitials(channel)}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm truncate ${unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}
              >
                {getChannelName(channel)}
              </p>
              {channel.lastMessage && (
                <p className="text-xs text-gray-500 truncate">
                  {channel.lastMessage.body || 'Atasament'}
                </p>
              )}
            </div>
            {unread > 0 && (
              <span className="flex-shrink-0 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-purple-500 text-white text-[10px] font-bold px-1.5">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
        );
      })}

      <button
        onClick={() => navigate('/chat')}
        className="w-full text-center text-sm text-primary hover:text-orange-600 font-medium py-2 flex items-center justify-center gap-1"
      >
        Deschide chat <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
