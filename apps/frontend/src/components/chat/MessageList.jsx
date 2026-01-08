import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../../state/useChatStore';
import { useAuthStore } from '../../state/useAuthStore';
import MessageItem from './MessageItem';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

/**
 * Message List Component
 * Displays messages with date separators and auto-scroll
 */
export default function MessageList({ channelId }) {
  const { messagesByChannel, getTypingUsers, typingUsers, channels, pendingMessages } = useChatStore();
  const { user: currentUser } = useAuthStore();
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const messages = messagesByChannel[channelId] || [];
  const pending = pendingMessages[channelId] || [];
  const typingUserIds = getTypingUsers(channelId);

  // Get typing user names for display
  const activeChannel = channels.find((ch) => ch.id === channelId);
  const typingUserNames = typingUserIds
    .map((userId) => {
      const member = activeChannel?.members?.find((m) => m.user?.id === userId);
      return member?.user?.firstName || 'Cineva';
    })
    .slice(0, 3);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, pending.length]);

  const getDateSeparator = (date) => {
    const messageDate = new Date(date);

    if (isToday(messageDate)) {
      return 'Astăzi';
    }

    if (isYesterday(messageDate)) {
      return 'Ieri';
    }

    return format(messageDate, 'd MMMM yyyy');
  };

  const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;

    const currentDate = new Date(currentMessage.createdAt);
    const previousDate = new Date(previousMessage.createdAt);

    return !isSameDay(currentDate, previousDate);
  };

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Niciun mesaj încă</h3>
          <p className="mt-1 text-sm text-gray-500">Fii primul care trimite un mesaj!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto px-6 py-4">
      <div className="space-y-4">
        {messages.map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : null;
          const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
          const showAvatar =
            !previousMessage ||
            previousMessage.authorId !== message.authorId ||
            showDateSeparator;

          return (
            <div key={message.id}>
              {/* Date Separator */}
              {showDateSeparator && (
                <div className="relative mb-4 mt-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-gray-50 px-3 text-xs font-medium text-gray-500">
                      {getDateSeparator(message.createdAt)}
                    </span>
                  </div>
                </div>
              )}

              {/* Message */}
              <MessageItem
                message={message}
                showAvatar={showAvatar}
                isOwnMessage={message.authorId === currentUser?.id}
              />
            </div>
          );
        })}

        {/* Pending Messages (Optimistic UI) */}
        {pending.map((message) => (
          <div key={message.tempId}>
            <MessageItem
              message={message}
              showAvatar={true}
              isOwnMessage={true}
              isPending={true}
              status={message.status}
            />
          </div>
        ))}

        {/* Typing Indicator */}
        {typingUserIds.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="flex gap-1">
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
            </div>
            <span>
              {typingUserNames.length === 1
                ? `${typingUserNames[0]} scrie...`
                : typingUserNames.length === 2
                  ? `${typingUserNames.join(' și ')} scriu...`
                  : `${typingUserNames.slice(0, 2).join(', ')} și alții scriu...`}
            </span>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
