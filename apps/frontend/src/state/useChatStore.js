import { create } from 'zustand';

/**
 * Chat Store - Zustand state management for chat
 * Manages active channel, channels list, messages, typing indicators, and presence
 */
export const useChatStore = create((set, get) => ({
  // Active channel
  activeChannelId: null,
  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),
  setActiveChannelId: (channelId) => set({ activeChannelId: channelId }),

  // Channels list
  channels: [],
  setChannels: (channels) => set({ channels }),

  updateChannel: (channelId, updates) =>
    set((state) => ({
      channels: state.channels.map((ch) => (ch.id === channelId ? { ...ch, ...updates } : ch)),
    })),

  addChannel: (channel) =>
    set((state) => {
      // Prevent duplicates
      if (state.channels.some((ch) => ch.id === channel.id)) {
        return state;
      }
      return {
        channels: [channel, ...state.channels],
      };
    }),

  removeChannel: (channelId) =>
    set((state) => ({
      channels: state.channels.filter((ch) => ch.id !== channelId),
      activeChannelId: state.activeChannelId === channelId ? null : state.activeChannelId,
    })),

  // Messages by channel
  messagesByChannel: {}, // { [channelId]: Message[] }

  setMessages: (channelId, messages) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: messages,
      },
    })),

  addMessage: (channelId, message) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: [...(state.messagesByChannel[channelId] || []), message],
      },
    })),

  prependMessages: (channelId, messages) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: [...messages, ...(state.messagesByChannel[channelId] || [])],
      },
    })),

  updateMessage: (channelId, messageId, updates) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: (state.messagesByChannel[channelId] || []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      },
    })),

  deleteMessage: (channelId, messageId) =>
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: (state.messagesByChannel[channelId] || []).filter(
          (msg) => msg.id !== messageId
        ),
      },
    })),

  // Pending messages (optimistic UI for sending)
  pendingMessages: {}, // { [channelId]: PendingMessage[] }

  addPendingMessage: (channelId, message) =>
    set((state) => ({
      pendingMessages: {
        ...state.pendingMessages,
        [channelId]: [...(state.pendingMessages[channelId] || []), message],
      },
    })),

  removePendingMessage: (channelId, tempId) =>
    set((state) => ({
      pendingMessages: {
        ...state.pendingMessages,
        [channelId]: (state.pendingMessages[channelId] || []).filter(
          (msg) => msg.tempId !== tempId
        ),
      },
    })),

  updatePendingMessage: (channelId, tempId, updates) =>
    set((state) => ({
      pendingMessages: {
        ...state.pendingMessages,
        [channelId]: (state.pendingMessages[channelId] || []).map((msg) =>
          msg.tempId === tempId ? { ...msg, ...updates } : msg
        ),
      },
    })),

  getPendingMessages: (channelId) => {
    const state = get();
    return state.pendingMessages[channelId] || [];
  },

  // Typing indicators
  typingUsers: {}, // { [channelId]: Set<userId> }

  setTyping: (channelId, userId, isTyping) =>
    set((state) => {
      const current = new Set(state.typingUsers[channelId] || []);
      if (isTyping) {
        current.add(userId);
      } else {
        current.delete(userId);
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: current,
        },
      };
    }),

  getTypingUsers: (channelId) => {
    const state = get();
    return Array.from(state.typingUsers[channelId] || []);
  },

  // Unread counts
  unreadCounts: {}, // { [channelId]: number }

  setUnreadCount: (channelId, count) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [channelId]: count,
      },
    })),

  setAllUnreadCounts: (counts) => set({ unreadCounts: counts }),

  incrementUnreadCount: (channelId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [channelId]: (state.unreadCounts[channelId] || 0) + 1,
      },
    })),

  resetUnreadCount: (channelId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [channelId]: 0,
      },
    })),

  // Online presence - use object for better Zustand reactivity
  onlineUsers: {},

  setUserOnline: (userId, isOnline) =>
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [userId]: isOnline,
      },
    })),

  // Initialize online users from API data (e.g., channel members)
  initOnlineUsers: (members) =>
    set((state) => {
      const newOnlineUsers = { ...state.onlineUsers };
      members.forEach((member) => {
        // Only set if not already tracked (preserve socket updates)
        if (newOnlineUsers[member.user?.id || member.userId] === undefined) {
          newOnlineUsers[member.user?.id || member.userId] = member.isOnline || false;
        }
      });
      return { onlineUsers: newOnlineUsers };
    }),

  isUserOnline: (userId) => {
    const state = get();
    return state.onlineUsers[userId] === true;
  },

  // UI state
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  isMemberListOpen: true,
  toggleMemberList: () => set((state) => ({ isMemberListOpen: !state.isMemberListOpen })),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  filteredChannels: () => {
    const state = get();
    if (!state.searchQuery) return state.channels;

    const query = state.searchQuery.toLowerCase();
    return state.channels.filter((channel) => {
      if (channel.name) {
        return channel.name.toLowerCase().includes(query);
      }
      // For DMs, search by member names
      if (channel.type === 'DIRECT' || channel.type === 'GROUP') {
        return channel.members.some((member) =>
          `${member.user.firstName} ${member.user.lastName}`.toLowerCase().includes(query)
        );
      }
      return false;
    });
  },

  // Clear all state (on logout)
  clear: () =>
    set({
      activeChannelId: null,
      channels: [],
      messagesByChannel: {},
      pendingMessages: {},
      typingUsers: {},
      unreadCounts: {},
      onlineUsers: {},
      searchQuery: '',
      isSidebarOpen: true,
      isMemberListOpen: true,
    }),
}));
