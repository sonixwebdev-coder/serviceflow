import { useState } from 'react';
import { X, Search, UserPlus, Users, MessageSquare } from 'lucide-react';
import { useCreateDM, useCreateGroupDM } from '../../hooks/useChat';
import { useChatStore } from '../../state/useChatStore';
import useUsers from '../../hooks/useUsers';
import { useAuthStore } from '../../state/useAuthStore';
import useToast from '../../context/useToast';

/**
 * Create DM Dialog Component
 * Dialog for creating direct messages (1-on-1 or group)
 */
export default function CreateDMDialog({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isGroupDM, setIsGroupDM] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [, setCreatedChannelId] = useState(null);

  const { user: currentUser } = useAuthStore();
  const { users, loading } = useUsers();
  const { setActiveChannelId, addChannel } = useChatStore();
  const { showToast } = useToast();

  const createDMMutation = useCreateDM();
  const createGroupDMMutation = useCreateGroupDM();

  if (!isOpen) return null;

  // Filter out current user and search
  const filteredUsers = users
    .filter((u) => u.id !== currentUser?.id)
    .filter((u) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const email = u.email?.toLowerCase() || '';
      const search = searchTerm.toLowerCase();
      return fullName.includes(search) || email.includes(search);
    });

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);

    try {
      let channel;

      if (isGroupDM) {
        // Group DM
        if (!groupName.trim()) {
          showToast({
            title: 'Eroare',
            description: 'Te rugăm să introduci un nume pentru grup.',
            type: 'error',
          });
          setIsCreating(false);
          return;
        }

        channel = await createGroupDMMutation.mutateAsync({
          userIds: selectedUsers,
          name: groupName.trim(),
        });
      } else {
        // 1-on-1 DM
        if (selectedUsers.length !== 1) {
          showToast({
            title: 'Eroare',
            description: 'Te rugăm să selectezi exact un utilizator pentru mesaj direct.',
            type: 'error',
          });
          setIsCreating(false);
          return;
        }

        channel = await createDMMutation.mutateAsync(selectedUsers[0]);
      }

      // Check if channel was created successfully
      if (!channel?.id) {
        throw new Error('Răspuns invalid de la server');
      }

      // Add channel to store and set as active
      addChannel(channel);
      setActiveChannelId(channel.id);

      // Send initial message if provided
      if (initialMessage.trim()) {
        try {
          // We need to send the message using the API directly since useSendMessage needs a static channelId
          const API = (await import('../../utils/api')).default;
          await API.post(`/chat/channels/${channel.id}/messages`, {
            body: initialMessage.trim(),
            type: 'TEXT',
          });
        } catch (msgError) {
          console.warn('Failed to send initial message:', msgError);
          // Don't fail the whole operation, just warn
        }
      }

      showToast({
        title: 'Succes',
        description: isGroupDM
          ? 'Grupul a fost creat cu succes.'
          : 'Conversația a fost creată cu succes.',
        type: 'success',
      });

      handleClose();
    } catch (error) {
      console.error('Failed to create DM:', error);
      showToast({
        title: 'Eroare',
        description:
          error?.message || 'Nu s-a putut crea conversația. Te rugăm să încerci din nou.',
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedUsers([]);
    setIsGroupDM(false);
    setGroupName('');
    setInitialMessage('');
    setCreatedChannelId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-gray-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Mesaj Nou</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* DM Type Toggle */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsGroupDM(false);
                setSelectedUsers(selectedUsers.slice(0, 1));
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                !isGroupDM
                  ? 'bg-primary text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Mesaj Direct
            </button>
            <button
              onClick={() => setIsGroupDM(true)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                isGroupDM
                  ? 'bg-primary text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4" />
              Mesaj Grup
            </button>
          </div>
        </div>

        {/* Group Name Input (for group DMs) */}
        {isGroupDM && (
          <div className="border-b border-gray-200 p-4">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nume grup..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Search */}
        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Caută utilizatori..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div className="border-b border-gray-200 p-4">
            <p className="mb-2 text-xs font-medium text-gray-500">
              Selectați ({selectedUsers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((userId) => {
                const user = users.find((u) => u.id === userId);
                if (!user) return null;

                return (
                  <div
                    key={userId}
                    className="flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1"
                  >
                    <span className="text-sm font-medium text-orange-900">
                      {user.firstName} {user.lastName}
                    </span>
                    <button
                      onClick={() => toggleUserSelection(userId)}
                      className="text-primary hover:text-orange-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Initial Message (shown when user is selected) */}
        {selectedUsers.length > 0 && (
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500">Mesaj inițial (opțional)</p>
            </div>
            <textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Scrie un mesaj de început..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        )}

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Se încarcă utilizatorii...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">Niciun utilizator găsit</div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.id);

                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      if (!isGroupDM && !isSelected) {
                        // For 1-on-1, replace selection
                        setSelectedUsers([user.id]);
                      } else {
                        // For group DMs, toggle
                        toggleUserSelection(user.id);
                      }
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-gray-50 ${
                      isSelected ? 'bg-orange-50' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-white ${
                        isSelected ? 'bg-primary' : 'bg-gray-500'
                      }`}
                    >
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </div>

                    {/* User Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.email && <p className="truncate text-sm text-gray-500">{user.email}</p>}
                    </div>

                    {/* Checkmark */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anulează
            </button>
            <button
              onClick={handleCreate}
              disabled={selectedUsers.length === 0 || isCreating}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? 'Se creează...' : 'Creează'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
