import { MessageSquare } from 'lucide-react';

import {
  formatLastMessageTime,
  getChannelIcon,
  getChannelInitials,
  getChannelName,
  isChannelOnline,
} from './floatingChatUtils';

const ChannelSkeleton = () => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="h-11 w-11 animate-pulse rounded-full bg-gray-200" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-32 animate-pulse rounded-sm bg-gray-200" />
      <div className="h-3 w-24 animate-pulse rounded-sm bg-gray-200" />
    </div>
  </div>
);

export default function FloatingChatChannelList({
  channels,
  channelsLoading,
  currentUser,
  handleOpenFullChat,
  handleSelectChannel,
  onlineUsers,
  unreadCounts,
}) {
  const currentUserId = currentUser?.id;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50">
      {channelsLoading ? (
        <div className="divide-y divide-gray-100 bg-white">
          {[1, 2, 3, 4].map((index) => (
            <ChannelSkeleton key={index} />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900">Nicio conversație</p>
          <p className="mt-1 text-sm text-gray-500">Începe o conversație nouă din pagina de chat</p>
          <button
            type="button"
            onClick={handleOpenFullChat}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            Deschide Chat
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 bg-white">
          {channels.slice(0, 15).map((channel) => {
            const unread = unreadCounts[channel.id] || 0;
            const isOnline = isChannelOnline(channel, currentUserId, onlineUsers);
            const ChannelIcon = getChannelIcon(channel);
            const timeAgo = formatLastMessageTime(channel);

            return (
              <li key={channel.id}>
                <button
                  type="button"
                  onClick={() => handleSelectChannel(channel.id)}
                  className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:rbc-today ${
                    unread > 0 ? 'bg-orange-50/30' : ''
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full font-semibold text-sm transition-transform group-hover:scale-105 ${
                        unread > 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {ChannelIcon ? (
                        <ChannelIcon className="h-5 w-5" />
                      ) : (
                        getChannelInitials(channel, currentUserId)
                      )}
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm ${
                          unread > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                        }`}
                      >
                        {getChannelName(channel, currentUserId)}
                      </p>
                      <div className="flex items-center gap-2">
                        {timeAgo && (
                          <span className="shrink-0 text-[11px] text-gray-400">{timeAgo}</span>
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
                        {channel.lastMessage.author?.id === currentUserId ? 'Tu: ' : ''}
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
  );
}
