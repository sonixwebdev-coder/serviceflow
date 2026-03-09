import React, { useEffect, useState, useRef } from 'react';
import confirm from '../../utils/confirm';
import { useChatStore } from '../../state/useChatStore';
import { useAuthStore } from '../../state/useAuthStore';
import { useChannel, useMessages, useMarkAsRead, useLeaveChannel, useArchiveChannel } from '../../hooks/useChat';
import { Hash, Lock, MessageSquare, Users, MoreVertical, Settings, Menu, UserPlus, BellOff, LogOut, Archive, Copy, ArrowLeft } from 'lucide-react';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import AddMembersDialog from './AddMembersDialog';
import ChannelSettingsDialog from './ChannelSettingsDialog';
import useToast from '../../context/useToast';

// Skeleton for channel header
const HeaderSkeleton = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
    <div className="flex-1 space-y-2">
      <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
      <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
    </div>
  </div>
);

// Skeleton for messages
const MessageSkeleton = ({ isOwn }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
    {!isOwn && <div className="mr-3 h-10 w-10 animate-pulse rounded-full bg-gray-200" />}
    <div className={`space-y-2 ${isOwn ? 'items-end' : 'items-start'}`}>
      {!isOwn && <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />}
      <div className={`h-16 w-64 animate-pulse rounded-2xl ${isOwn ? 'bg-orange-200' : 'bg-gray-200'}`} />
    </div>
  </div>
);

// Full messages loading skeleton
const MessagesLoadingSkeleton = () => (
  <div className="h-full overflow-hidden px-6 py-4">
    <MessageSkeleton isOwn={false} />
    <MessageSkeleton isOwn={true} />
    <MessageSkeleton isOwn={false} />
    <MessageSkeleton isOwn={false} />
    <MessageSkeleton isOwn={true} />
    <MessageSkeleton isOwn={false} />
  </div>
);

/**
 * Chat View Component
 * Main conversation area with header, messages, and composer
 */
export default function ChatView({ isMobile = false }) {
  const { activeChannelId, setMessages, resetUnreadCount, toggleSidebar, toggleMemberList, isSidebarOpen, isMemberListOpen, removeChannel, setActiveChannelId } = useChatStore();
  const { user: currentUser } = useAuthStore();
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { showToast } = useToast();

  const { data: channel, isLoading: channelLoading } = useChannel(activeChannelId);
  const { data: messages, isLoading: messagesLoading } = useMessages(activeChannelId);
  const markAsReadMutation = useMarkAsRead(activeChannelId);
  const leaveChannelMutation = useLeaveChannel();
  const archiveChannelMutation = useArchiveChannel();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

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
      <div className="flex h-full flex-col bg-white">
        <div className="flex-shrink-0 border-b border-gray-200 bg-white">
          <HeaderSkeleton />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden bg-gray-50">
          <MessagesLoadingSkeleton />
        </div>
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
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
      const names = otherMembers.slice(0, 3).map((m) => m.user.firstName).join(', ');
      const remaining = otherMembers.length - 3;
      return remaining > 0 ? `${names} +${remaining}` : names || 'Chat Grup';
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

  // Check if current user is owner
  const isOwner = channel?.members?.some(
    (m) => m.user?.id === currentUser?.id && m.role === 'OWNER'
  );

  const handleCopyChannelLink = () => {
    const link = `${window.location.origin}/chat?channel=${activeChannelId}`;
    navigator.clipboard.writeText(link);
    showToast({
      title: 'Link copiat',
      description: 'Link-ul canalului a fost copiat în clipboard.',
      type: 'success',
    });
    setIsMenuOpen(false);
  };

  const handleLeaveChannel = async () => {
    if (!await confirm({ title: 'Paraseste canal', text: 'Esti sigur ca vrei sa parasesti acest canal?', confirmText: 'Paraseste', danger: true })) {
      setIsMenuOpen(false);
      return;
    }

    try {
      await leaveChannelMutation.mutateAsync(activeChannelId);
      removeChannel(activeChannelId);
      setActiveChannelId(null);
      showToast({
        title: 'Succes',
        description: 'Ai părăsit canalul.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error?.message || 'Nu ai putut părăsi canalul.',
        type: 'error',
      });
    }
    setIsMenuOpen(false);
  };

  const handleArchiveChannel = async () => {
    if (!await confirm({ title: 'Arhiveaza canal', text: 'Esti sigur ca vrei sa arhivezi acest canal? Toti membrii vor pierde accesul.', confirmText: 'Arhiveaza', danger: true })) {
      setIsMenuOpen(false);
      return;
    }

    try {
      await archiveChannelMutation.mutateAsync(activeChannelId);
      removeChannel(activeChannelId);
      setActiveChannelId(null);
      showToast({
        title: 'Succes',
        description: 'Canalul a fost arhivat.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Eroare',
        description: error?.message || 'Nu ai putut arhiva canalul.',
        type: 'error',
      });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Sidebar toggle and channel info */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* Sidebar toggle / Back button on mobile */}
            {isMobile ? (
              <button
                onClick={() => setActiveChannelId(null)}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                title="Înapoi la canale"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={toggleSidebar}
                className={`rounded-lg p-2 hover:bg-gray-100 ${isSidebarOpen ? 'text-primary' : 'text-gray-600'}`}
                title={isSidebarOpen ? 'Ascunde sidebar' : 'Afișează sidebar'}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

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

          {/* Right side - Actions */}
          <div className="flex items-center gap-1">
            {/* Add members button - only for non-DM channels */}
            {channel.type !== 'DIRECT' && (
              <button
                onClick={() => setIsAddMembersOpen(true)}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-primary"
                title="Adaugă membri"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            )}
            {/* Members toggle - only for non-DM channels - with explicit label */}
            {channel.type !== 'DIRECT' && (
              <button
                onClick={toggleMemberList}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isMemberListOpen
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={isMemberListOpen ? 'Ascunde lista de membri' : 'Afișează lista de membri'}
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Membri</span>
                <span className="text-xs opacity-70">({getMemberCount()})</span>
              </button>
            )}
            {channel.type !== 'DIRECT' && (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-primary"
                title="Setări canal"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}
            {/* More options menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`rounded-lg p-2 hover:bg-gray-100 ${isMenuOpen ? 'bg-gray-100 text-primary' : 'text-gray-600'}`}
                title="Mai multe opțiuni"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {/* Dropdown menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50">
                  <button
                    onClick={handleCopyChannelLink}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="h-4 w-4" />
                    Copiază link
                  </button>
                  {channel.type !== 'DIRECT' && !isOwner && (
                    <button
                      onClick={handleLeaveChannel}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Părăsește canalul
                    </button>
                  )}
                  {channel.type !== 'DIRECT' && isOwner && (
                    <button
                      onClick={handleArchiveChannel}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Archive className="h-4 w-4" />
                      Arhivează canalul
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-hidden bg-gray-50">
        {messagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <MessageList channelId={activeChannelId} />
        )}
      </div>

      {/* Message Composer */}
      <div className="flex-shrink-0">
        <MessageComposer channelId={activeChannelId} />
      </div>

      {/* Add Members Dialog */}
      <AddMembersDialog
        isOpen={isAddMembersOpen}
        onClose={() => setIsAddMembersOpen(false)}
        channelId={activeChannelId}
      />

      {/* Channel Settings Dialog */}
      <ChannelSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        channelId={activeChannelId}
      />
    </div>
  );
}
