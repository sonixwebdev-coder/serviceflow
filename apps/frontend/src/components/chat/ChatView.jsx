import React, { useEffect } from 'react';
import { useChatStore } from '../../state/useChatStore';
import { useChannel, useMessages, useMarkAsRead } from '../../hooks/useChat';
import { Hash, Lock, MessageSquare, Users, MoreVertical, Settings } from 'lucide-react';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';

/**
 * Chat View Component
 * Main conversation area with header, messages, and composer
 */
export default function ChatView() {
  const { activeChannelId, setMessages, resetUnreadCount } = useChatStore();

  const { data: channel, isLoading: channelLoading } = useChannel(activeChannelId);
  const { data: messages, isLoading: messagesLoading } = useMessages(activeChannelId);
  const markAsReadMutation = useMarkAsRead(activeChannelId);

  // Update messages in store when data changes
  useEffect(() => {
    if (messages && activeChannelId) {
      setMessages(activeChannelId, messages);
    }
  }, [messages, activeChannelId, setMessages]);

  // Mark channel as read when user opens it
  useEffect(() => {
    if (activeChannelId) {
      const timer = setTimeout(() => {
        markAsReadMutation.mutate();
        resetUnreadCount(activeChannelId);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [activeChannelId]);

  if (!activeChannelId) {
    return null;
  }

  if (channelLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-viperx-primary border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Se încarcă canalul...</p>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">Canalul nu a fost găsit</p>
      </div>
    );
  }

  const getChannelName = () => {
    if (channel.name) return channel.name;

    // For DMs, show other user's name
    if (channel.type === 'DIRECT') {
      const otherMember = channel.members.find((m) => m.user.id !== channel.createdById);
      if (otherMember) {
        return `${otherMember.user.firstName} ${otherMember.user.lastName}`;
      }
    }

    // For group DMs, show participant names
    if (channel.type === 'GROUP') {
      const names = channel.members.slice(0, 3).map((m) => m.user.firstName).join(', ');
      const remaining = channel.members.length - 3;
      return remaining > 0 ? `${names} +${remaining}` : names;
    }

    return 'Canal fără nume';
  };

  const getChannelIcon = () => {
    if (channel.type === 'PUBLIC') return <Hash className="h-5 w-5" />;
    if (channel.type === 'PRIVATE') return <Lock className="h-5 w-5" />;
    if (channel.type === 'DIRECT') return <MessageSquare className="h-5 w-5" />;
    if (channel.type === 'GROUP') return <Users className="h-5 w-5" />;
    return <Hash className="h-5 w-5" />;
  };

  const getMemberCount = () => {
    return channel.members?.length || 0;
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="text-gray-600">{getChannelIcon()}</div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-gray-900">{getChannelName()}</h2>
              {channel.description ? (
                <p className="truncate text-sm text-gray-500">{channel.description}</p>
              ) : (
                <p className="text-sm text-gray-500">{getMemberCount()} membri</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              title="Setări canal"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              title="Mai multe opțiuni"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-hidden bg-gray-50">
        {messagesLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-viperx-primary border-r-transparent"></div>
              <p className="mt-2 text-gray-600">Se încarcă mesajele...</p>
            </div>
          </div>
        ) : (
          <MessageList channelId={activeChannelId} />
        )}
      </div>

      {/* Message Composer */}
      <div className="flex-shrink-0">
        <MessageComposer channelId={activeChannelId} />
      </div>
    </div>
  );
}
