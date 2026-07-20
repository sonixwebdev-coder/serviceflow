import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  ChevronLeft,
  Send,
  X,
  Maximize2,
  MessageCircle,
  Users,
  Hash,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useLocation, useNavigate } from 'react-router-dom';
import { useChatStore } from '../../state/useChatStore';
import { useAuthStore } from '../../state/useAuthStore';
import { useChannels, useMessages, useSendMessage, useMarkAsRead } from '../../hooks/useChat';
import useToast from '../../context/useToast';
import { getFileUrl } from '../../utils/api';

/**
 * Floating Chat Widget
 * A polished quick-access chat popup that appears on all pages (except the full chat page)
 */
export default function FloatingChatWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Draggable button state
  const [btnPos, setBtnPos] = useState({ bottom: 24, right: 24 });
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0, moved: false });

  const { user: currentUser } = useAuthStore();
  const {
    channels,
    unreadCounts,
    messagesByChannel,
    setActiveChannel,
    onlineUsers,
    pendingMessages,
    addPendingMessage,
    removePendingMessage,
    updatePendingMessage,
  } = useChatStore();
  const { showToast } = useToast();

  // Fetch channels
  const { data: channelsData, isLoading: channelsLoading } = useChannels();

  // Fetch messages for selected channel
  const { data: messagesData, isLoading: messagesLoading } = useMessages(selectedChannelId);

  // Send message mutation
  const sendMessageMutation = useSendMessage(selectedChannelId);

  // Mark as read mutation
  const { mutate: markAsRead } = useMarkAsRead(selectedChannelId);
  const selectedMessages = messagesByChannel[selectedChannelId];

  // Handle open/close with animation
  const handleOpen = () => {
    setIsAnimating(true);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setIsOpen(false), 200);
  };

  // Update channels in store when fetched
  useEffect(() => {
    if (channelsData) {
      useChatStore.getState().setChannels(channelsData);
    }
  }, [channelsData]);

  // Store messages in Zustand when fetched
  useEffect(() => {
    if (messagesData && selectedChannelId) {
      useChatStore.getState().setMessages(selectedChannelId, messagesData);
    }
  }, [messagesData, selectedChannelId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMessages]);

  // Mark channel as read when viewing
  useEffect(() => {
    if (selectedChannelId && isOpen) {
      markAsRead();
      useChatStore.getState().resetUnreadCount(selectedChannelId);
    }
  }, [selectedChannelId, isOpen, markAsRead]);

  // Animation class
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsAnimating(true));
    }
  }, [isOpen]);

  // Don't show on the full chat page
  if (location.pathname === '/chat') {
    return null;
  }

  // Calculate total unread count
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  // Get current messages (including pending)
  const regularMessages = selectedMessages || messagesData || [];
  const pending = selectedChannelId ? pendingMessages[selectedChannelId] || [] : [];
  const currentMessages = [...regularMessages, ...pending];

  // Get channel display name
  const getChannelName = (channel) => {
    if (channel.name) return channel.name;
    if (channel.type === 'DIRECT' || channel.type === 'GROUP') {
      const otherMembers = channel.members?.filter((m) => m.user?.id !== currentUser?.id) || [];
      if (otherMembers.length === 0) return 'Conversație';
      return otherMembers
        .map((m) => `${m.user?.firstName || ''} ${m.user?.lastName || ''}`)
        .join(', ');
    }
    return 'Canal';
  };

  // Get channel avatar/initials
  const getChannelInitials = (channel) => {
    if (channel.type === 'DIRECT') {
      const other = channel.members?.find((m) => m.user?.id !== currentUser?.id);
      if (other?.user) {
        return `${other.user.firstName?.[0] || ''}${other.user.lastName?.[0] || ''}`;
      }
    }
    return channel.name?.[0]?.toUpperCase() || '#';
  };

  // Get channel icon based on type
  const getChannelIcon = (channel) => {
    if (channel.type === 'DIRECT') return null; // Show initials instead
    if (channel.type === 'GROUP') return Users;
    return Hash;
  };

  // Check if other user is online (for DMs)
  const isChannelOnline = (channel) => {
    if (channel.type === 'DIRECT') {
      const other = channel.members?.find((m) => m.user?.id !== currentUser?.id);
      return other?.user?.id ? onlineUsers[other.user.id] : false;
    }
    return false;
  };

  // Format last message time
  const formatLastMessageTime = (channel) => {
    const time = channel.lastMessageAt || channel.createdAt;
    if (!time) return '';
    try {
      return formatDistanceToNow(new Date(time), { addSuffix: false, locale: ro });
    } catch {
      return '';
    }
  };

  // Handle send message
  const handleSend = async () => {
    if (!body.trim() || isSending || !selectedChannelId) return;

    const messageBody = body.trim();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create pending message for optimistic UI
    const pendingMessage = {
      tempId,
      id: tempId,
      body: messageBody,
      type: 'TEXT',
      status: 'sending',
      createdAt: new Date().toISOString(),
      author: currentUser,
      authorId: currentUser?.id,
    };

    setBody('');
    setIsSending(true);

    // Add pending message immediately
    addPendingMessage(selectedChannelId, pendingMessage);

    try {
      await sendMessageMutation.mutateAsync({
        body: messageBody,
        type: 'TEXT',
      });
      // Remove pending message on success (real message comes via socket)
      removePendingMessage(selectedChannelId, tempId);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Mark as failed
      updatePendingMessage(selectedChannelId, tempId, { status: 'failed' });
      showToast({
        title: 'Eroare',
        description: error?.message || 'Nu s-a putut trimite mesajul.',
        type: 'error',
      });
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  // Handle key press
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Open full chat page
  const handleOpenFullChat = () => {
    if (selectedChannelId) {
      setActiveChannel(selectedChannelId);
    }
    navigate('/chat');
    handleClose();
  };

  // Select channel
  const handleSelectChannel = (channelId) => {
    setSelectedChannelId(channelId);
    setBody('');
  };

  // Go back to channel list
  const handleBack = () => {
    setSelectedChannelId(null);
    setBody('');
  };

  // Drag handlers for floating button
  const onPointerDown = (e) => {
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    if (!dragRef.current.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      dragRef.current.moved = true;
    }
    if (!dragRef.current.moved) return;
    setBtnPos((prev) => ({
      right: Math.max(8, Math.min(window.innerWidth - 64, prev.right - dx)),
      bottom: Math.max(8, Math.min(window.innerHeight - 64, prev.bottom - dy)),
    }));
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
  };

  const onPointerUp = () => {
    if (!dragRef.current.moved) {
      handleOpen();
    }
    dragRef.current.active = false;
  };

  // Selected channel object
  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  // Sort channels by most recent activity
  const sortedChannels = [...channels].sort((a, b) => {
    const aTime = a.lastMessageAt || a.createdAt;
    const bTime = b.lastMessageAt || b.createdAt;
    return new Date(bTime) - new Date(aTime);
  });

  // Skeleton loader for channels
  const ChannelSkeleton = () => (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-11 w-11 animate-pulse rounded-full bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );

  // Skeleton loader for messages
  const MessageSkeleton = ({ isOwn }) => (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`space-y-2 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`h-12 w-48 animate-pulse rounded-2xl ${isOwn ? 'bg-orange-200' : 'bg-gray-200'}`}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="group fixed z-50 flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors duration-200 hover:bg-orange-600 hover:shadow-xl focus:outline-none active:cursor-grabbing"
          style={{ bottom: btnPos.bottom, right: btnPos.right, touchAction: 'none' }}
          title="Deschide chat rapid"
        >
          <MessageSquare className="h-6 w-6 transition-transform group-hover:scale-110" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
          {/* Ripple effect */}
          <span className="absolute inset-0 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-10" />
        </button>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <div
          className={`fixed z-50 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-gray-900/20 ring-1 ring-gray-900/5 transition-all duration-200 ${
            isAnimating ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
          }`}
          style={{
            bottom: btnPos.bottom,
            right: Math.min(btnPos.right, window.innerWidth - 368),
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-4">
            <div className="flex items-center gap-3">
              {selectedChannelId ? (
                <button
                  onClick={handleBack}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-white">
                  {selectedChannel ? getChannelName(selectedChannel) : 'Mesaje'}
                </h3>
                {selectedChannel && isChannelOnline(selectedChannel) && (
                  <p className="text-xs text-white/80">Online</p>
                )}
                {!selectedChannel && (
                  <p className="text-xs text-white/80">{channels.length} conversații</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenFullChat}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                title="Deschide chat complet"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                title="Închide"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!selectedChannelId ? (
            // Channel List
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
              {channelsLoading ? (
                <div className="divide-y divide-gray-100 bg-white">
                  {[1, 2, 3, 4].map((i) => (
                    <ChannelSkeleton key={i} />
                  ))}
                </div>
              ) : sortedChannels.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <MessageSquare className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900">Nicio conversație</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Începe o conversație nouă din pagina de chat
                  </p>
                  <button
                    onClick={handleOpenFullChat}
                    className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                  >
                    Deschide Chat
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 bg-white">
                  {sortedChannels.slice(0, 15).map((channel) => {
                    const unread = unreadCounts[channel.id] || 0;
                    const isOnline = isChannelOnline(channel);
                    const ChannelIcon = getChannelIcon(channel);
                    const timeAgo = formatLastMessageTime(channel);

                    return (
                      <li key={channel.id}>
                        <button
                          onClick={() => handleSelectChannel(channel.id)}
                          className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-orange-50/50 ${
                            unread > 0 ? 'bg-orange-50/30' : ''
                          }`}
                        >
                          {/* Avatar */}
                          <div className="relative">
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-full font-semibold text-sm transition-transform group-hover:scale-105 ${
                                unread > 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {ChannelIcon ? (
                                <ChannelIcon className="h-5 w-5" />
                              ) : (
                                getChannelInitials(channel)
                              )}
                            </div>
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`truncate text-sm ${
                                  unread > 0
                                    ? 'font-semibold text-gray-900'
                                    : 'font-medium text-gray-700'
                                }`}
                              >
                                {getChannelName(channel)}
                              </p>
                              <div className="flex items-center gap-2">
                                {timeAgo && (
                                  <span className="flex-shrink-0 text-[11px] text-gray-400">
                                    {timeAgo}
                                  </span>
                                )}
                                {unread > 0 && (
                                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                                    {unread}
                                  </span>
                                )}
                              </div>
                            </div>
                            {channel.lastMessage && (
                              <p
                                className={`mt-0.5 truncate text-xs ${
                                  unread > 0 ? 'text-gray-600' : 'text-gray-500'
                                }`}
                              >
                                {channel.lastMessage.author?.id === currentUser?.id ? 'Tu: ' : ''}
                                {channel.lastMessage.body || 'Atașament'}
                              </p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            // Messages View
            <>
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-4">
                {messagesLoading ? (
                  <div className="space-y-3">
                    <MessageSkeleton isOwn={false} />
                    <MessageSkeleton isOwn={true} />
                    <MessageSkeleton isOwn={false} />
                    <MessageSkeleton isOwn={true} />
                  </div>
                ) : currentMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
                      <MessageCircle className="h-7 w-7 text-primary" />
                    </div>
                    <p className="font-medium text-gray-900">Începe conversația</p>
                    <p className="mt-1 text-sm text-gray-500">Trimite primul mesaj</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentMessages.map((message, index) => {
                      const isOwn = message.author?.id === currentUser?.id;
                      const isPending = !!message.tempId;
                      const showAuthor =
                        !isOwn &&
                        (index === 0 ||
                          currentMessages[index - 1]?.author?.id !== message.author?.id);

                      return (
                        <div
                          key={message.id || message.tempId}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                            {showAuthor && (
                              <p className="mb-1 ml-3 text-xs font-medium text-gray-500">
                                {message.author?.firstName}
                              </p>
                            )}
                            <div
                              className={`relative rounded-2xl px-4 py-2.5 text-sm ${
                                isOwn
                                  ? 'bg-primary text-white rounded-br-md shadow-sm'
                                  : 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5 rounded-bl-md'
                              } ${isPending ? 'opacity-70' : ''}`}
                            >
                              {message.body && (
                                <p className="whitespace-pre-wrap break-words leading-relaxed">
                                  {message.body}
                                </p>
                              )}
                              {message.attachments?.map((attachment) => {
                                const isImage = attachment.fileType?.startsWith('image/');
                                const fullUrl = getFileUrl(attachment.fileUrl);
                                if (isImage) {
                                  return (
                                    <a
                                      key={attachment.id}
                                      href={fullUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <img
                                        src={fullUrl}
                                        alt={attachment.fileName}
                                        className="mt-1 max-w-full max-h-[150px] rounded-lg object-cover"
                                      />
                                    </a>
                                  );
                                }
                                return (
                                  <a
                                    key={attachment.id}
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-1.5 mt-1 text-xs underline ${isOwn ? 'text-white/80' : 'text-gray-600'}`}
                                  >
                                    <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="truncate max-w-[160px]">
                                      {attachment.fileName}
                                    </span>
                                  </a>
                                );
                              })}
                              {!message.body && !message.attachments?.length && (
                                <p className="whitespace-pre-wrap break-words leading-relaxed opacity-70">
                                  Atașament
                                </p>
                              )}
                              <div
                                className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                                  isOwn ? 'text-white/70' : 'text-gray-400'
                                }`}
                              >
                                {isPending && message.status === 'sending' && (
                                  <Clock className="h-3 w-3 animate-pulse" />
                                )}
                                {isPending && message.status === 'failed' && (
                                  <AlertCircle className="h-3 w-3 text-red-300" />
                                )}
                                <span>
                                  {isPending
                                    ? message.status === 'sending'
                                      ? 'Se trimite...'
                                      : 'Eroare'
                                    : format(new Date(message.createdAt), 'HH:mm')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-gray-100 bg-white p-3">
                <div className="flex items-end gap-2">
                  <div className="relative flex-1">
                    <textarea
                      ref={textareaRef}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Scrie un mesaj..."
                      className="max-h-24 min-h-[44px] w-full resize-none rounded-xl border-0 bg-gray-100 px-4 py-3 pr-12 text-sm placeholder-gray-500 transition-colors focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      rows={1}
                      disabled={isSending}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!body.trim() || isSending}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    title="Trimite"
                  >
                    <Send className={`h-4 w-4 ${isSending ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
