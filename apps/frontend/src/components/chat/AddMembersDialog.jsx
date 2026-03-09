import React, { useState } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { useAddMembers, useChannel } from '../../hooks/useChat';
import useUsers from '../../hooks/useUsers';
import { useAuthStore } from '../../state/useAuthStore';
import useToast from '../../context/useToast';

/**
 * Add Members Dialog Component
 * Dialog for adding members to an existing channel
 */
export default function AddMembersDialog({ isOpen, onClose, channelId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  const { user: currentUser } = useAuthStore();
  const { users, loading } = useUsers();
  const { data: channel } = useChannel(channelId);
  const { showToast } = useToast();

  const addMembersMutation = useAddMembers(channelId);

  if (!isOpen) return null;

  // Get existing member IDs
  const existingMemberIds = channel?.members?.map((m) => m.user?.id) || [];

  // Filter out current user, existing members, and apply search
  const filteredUsers = users
    .filter((u) => u.id !== currentUser?.id)
    .filter((u) => !existingMemberIds.includes(u.id))
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

  const handleAdd = async () => {
    if (selectedUsers.length === 0) return;

    setIsAdding(true);

    try {
      await addMembersMutation.mutateAsync(selectedUsers);

      showToast({
        title: 'Succes',
        description: `${selectedUsers.length} ${selectedUsers.length === 1 ? 'membru a fost adăugat' : 'membri au fost adăugați'}.`,
        type: 'success',
      });

      handleClose();
    } catch (error) {
      console.error('Failed to add members:', error);
      showToast({
        title: 'Eroare',
        description: error?.message || 'Nu s-au putut adăuga membrii. Te rugăm să încerci din nou.',
        type: 'error',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedUsers([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Adaugă Membri</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isAdding}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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

        {/* User List */}
        <div className="max-h-80 overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Se încarcă utilizatorii...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {searchTerm ? 'Niciun utilizator găsit' : 'Toți utilizatorii sunt deja membri'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.id);

                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUserSelection(user.id)}
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
                      {user.email && (
                        <p className="truncate text-sm text-gray-500">{user.email}</p>
                      )}
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
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={isAdding}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anulează
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedUsers.length === 0 || isAdding}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdding ? 'Se adaugă...' : `Adaugă ${selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
