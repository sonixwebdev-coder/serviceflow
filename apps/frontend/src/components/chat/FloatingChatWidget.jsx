import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Maximize2, MessageCircle, MessageSquare, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import useToast from '../../context/useToast';
import { useChannels, useMarkAsRead, useMessages, useSendMessage } from '../../hooks/useChat';
import { useAuthStore } from '../../state/useAuthStore';
import { useChatStore } from '../../state/useChatStore';
import FloatingChatChannelList from './FloatingChatChannelList';
import FloatingChatMessages from './FloatingChatMessages';
import { getChannelName, isChannelOnline, sortChannelsByActivity } from './floatingChatUtils';

/**
 * Floating Chat Widget
 * A quick-access chat popup that appears on all pages except the full chat page.
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
  const { data: channelsData, isLoading: channelsLoading } = useChannels();
  const { data: messagesData, isLoading: messagesLoading } = useMessages(selectedChannelId);
  const sendMessageMutation = useSendMessage(selectedChannelId);
  const { mutate: markAsRead } = useMarkAsRead(selectedChannelId);
  const selectedMessages = messagesByChannel[selectedChannelId];

  const handleOpen = () => {
    setIsAnimating(true);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => setIsOpen(false), 200);
  };

  useEffect(() => {
    if (channelsData) useChatStore.getState().setChannels(channelsData);
  }, [channelsData]);

  useEffect(() => {
    if (messagesData && selectedChannelId) {
      useChatStore.getState().setMessages(selectedChannelId, messagesData);
    }
  }, [messagesData, selectedChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedMessages]);

  useEffect(() => {
    if (selectedChannelId && isOpen) {
      markAsRead();
      useChatStore.getState().resetUnreadCount(selectedChannelId);
    }
  }, [selectedChannelId, isOpen, markAsRead]);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setIsAnimating(true));
  }, [isOpen]);

  if (location.pathname === '/chat') return null;

  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  const regularMessages = selectedMessages || messagesData || [];
  const pending = selectedChannelId ? pendingMessages[selectedChannelId] || [] : [];
  const currentMessages = [...regularMessages, ...pending];
  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId);
  const sortedChannels = sortChannelsByActivity(channels);

  const handleSend = async () => {
    if (!body.trim() || isSending || !selectedChannelId) return;

    const messageBody = body.trim();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    addPendingMessage(selectedChannelId, pendingMessage);

    try {
      await sendMessageMutation.mutateAsync({ body: messageBody, type: 'TEXT' });
      removePendingMessage(selectedChannelId, tempId);
    } catch (error) {
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

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleOpenFullChat = () => {
    if (selectedChannelId) setActiveChannel(selectedChannelId);
    navigate('/chat');
    handleClose();
  };

  const handleSelectChannel = (channelId) => {
    setSelectedChannelId(channelId);
    setBody('');
  };

  const handleBack = () => {
    setSelectedChannelId(null);
    setBody('');
  };

  const onPointerDown = (event) => {
    dragRef.current = {
      active: true,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.lastX;
    const dy = event.clientY - dragRef.current.lastY;
    if (!dragRef.current.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      dragRef.current.moved = true;
    }
    if (!dragRef.current.moved) return;
    setBtnPos((previous) => ({
      right: Math.max(8, Math.min(window.innerWidth - 64, previous.right - dx)),
      bottom: Math.max(8, Math.min(window.innerHeight - 64, previous.bottom - dy)),
    }));
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;
  };

  const onPointerUp = () => {
    if (!dragRef.current.moved) handleOpen();
    dragRef.current.active = false;
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          aria-label="Deschide chat rapid"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="group fixed z-50 flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors duration-200 hover:bg-orange-600 hover:shadow-xl focus:outline-hidden active:cursor-grabbing"
          style={{ bottom: btnPos.bottom, right: btnPos.right, touchAction: 'none' }}
        >
          <MessageSquare className="h-6 w-6 transition-transform group-hover:scale-110" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
          <span className="absolute inset-0 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-10" />
        </button>
      )}

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
          <div className="flex items-center justify-between bg-primary px-4 py-4">
            <div className="flex items-center gap-3">
              {selectedChannelId ? (
                <button
                  type="button"
                  aria-label="Înapoi la conversații"
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
                  {selectedChannel ? getChannelName(selectedChannel, currentUser?.id) : 'Mesaje'}
                </h3>
                {selectedChannel &&
                  isChannelOnline(selectedChannel, currentUser?.id, onlineUsers) && (
                    <p className="text-xs text-white/80">Online</p>
                  )}
                {!selectedChannel && (
                  <p className="text-xs text-white/80">{channels.length} conversații</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Deschide chat complet"
                onClick={handleOpenFullChat}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Închide chat"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!selectedChannelId ? (
            <FloatingChatChannelList
              channels={sortedChannels}
              channelsLoading={channelsLoading}
              currentUser={currentUser}
              handleOpenFullChat={handleOpenFullChat}
              handleSelectChannel={handleSelectChannel}
              onlineUsers={onlineUsers}
              unreadCounts={unreadCounts}
            />
          ) : (
            <FloatingChatMessages
              currentMessages={currentMessages}
              currentUser={currentUser}
              handleKeyDown={handleKeyDown}
              handleSend={handleSend}
              isSending={isSending}
              messagesEndRef={messagesEndRef}
              messagesLoading={messagesLoading}
              body={body}
              setBody={setBody}
              textareaRef={textareaRef}
            />
          )}
        </div>
      )}
    </>
  );
}
