import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Mail, Calendar, Circle } from 'lucide-react';
import { useChatStore } from '../../state/useChatStore';
import { useCreateDM } from '../../hooks/useChat';
import { useAuthStore } from '../../state/useAuthStore';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

/**
 * User Hover Card Component
 * Shows user information on hover with option to send DM
 */
export default function UserHoverCard({ user, children, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const cardRef = useRef(null);
  const timeoutRef = useRef(null);

  const { user: currentUser } = useAuthStore();
  const { isUserOnline, onlineUsers, setActiveChannelId, addChannel } = useChatStore();
  const createDMMutation = useCreateDM();

  // Check if user is online
  const isOnline = onlineUsers[user?.id] !== undefined ? onlineUsers[user.id] : false;

  // Don't show hover card for current user or when disabled
  const isCurrentUser = user?.id === currentUser?.id;

  const handleMouseEnter = () => {
    if (disabled || isCurrentUser) return;

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const cardWidth = 280;
        const cardHeight = 200;

        // Calculate position - prefer below and to the right
        let top = rect.bottom + 8;
        let left = rect.left;

        // Adjust if would overflow right edge
        if (left + cardWidth > window.innerWidth - 16) {
          left = window.innerWidth - cardWidth - 16;
        }

        // Adjust if would overflow bottom edge
        if (top + cardHeight > window.innerHeight - 16) {
          top = rect.top - cardHeight - 8;
        }

        setPosition({ top, left });
        setIsOpen(true);
      }
    }, 400); // 400ms delay before showing
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
  };

  const handleSendDM = async () => {
    if (!user?.id || isCurrentUser) return;

    try {
      const channel = await createDMMutation.mutateAsync(user.id);
      if (channel?.id) {
        addChannel(channel);
        setActiveChannelId(channel.id);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create DM:', error);
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!user) return children;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>

      {isOpen && (
        <div
          ref={cardRef}
          className="fixed z-50 w-72 rounded-lg border border-gray-200 bg-white shadow-xl"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header with avatar */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-viperx-primary text-lg font-semibold text-white">
                  {user.firstName?.[0] || '?'}
                  {user.lastName?.[0] || ''}
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                    isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-semibold text-gray-900">
                  {user.firstName} {user.lastName}
                </h4>
                <p className="flex items-center gap-1 text-sm text-gray-500">
                  <Circle
                    className={`h-2 w-2 ${isOnline ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`}
                  />
                  {isOnline ? 'Online' : 'Deconectat'}
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="border-t border-gray-100 px-4 py-3 space-y-2">
            {user.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            {user.joinedAt && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>
                  Membru din {format(new Date(user.joinedAt), 'MMMM yyyy', { locale: ro })}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {!isCurrentUser && (
            <div className="border-t border-gray-100 p-3">
              <button
                onClick={handleSendDM}
                disabled={createDMMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4" />
                {createDMMutation.isPending ? 'Se încarcă...' : 'Trimite mesaj'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
