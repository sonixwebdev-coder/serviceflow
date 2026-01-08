import React, { useState } from 'react';
import { X, Hash, Lock, Search, Users } from 'lucide-react';
import { useCreateChannel } from '../../hooks/useChat';
import { useChatStore } from '../../state/useChatStore';
import useUsers from '../../hooks/useUsers';
import { useAuthStore } from '../../state/useAuthStore';
import useToast from '../../context/useToast';

/**
 * Create Channel Dialog Component
 * Dialog for creating new channels (public or private)
 */
export default function CreateChannelDialog({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  const { setActiveChannel, addChannel } = useChatStore();
  const { user: currentUser } = useAuthStore();
  const { users, loading: loadingUsers } = useUsers();
  const { showToast } = useToast();
  const createChannelMutation = useCreateChannel();

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast({
        title: 'Eroare',
        description: 'Te rugăm să introduci un nume pentru canal.',
        type: 'error',
      });
      return;
    }

    setIsCreating(true);

    try {
      const channel = await createChannelMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        type: isPrivate ? 'PRIVATE' : 'PUBLIC',
        memberIds: selectedMembers,
      });

      // Check if channel was created successfully
      if (!channel?.id) {
        console.error('Invalid channel response:', channel);
        throw new Error('Răspuns invalid de la server');
      }

      showToast({
        title: 'Succes',
        description: `Canalul "${name}" a fost creat cu succes.`,
        type: 'success',
      });

      // Add channel to store and set as active
      addChannel(channel);
      setActiveChannel(channel.id);
      handleClose();
    } catch (error) {
      console.error('Failed to create channel:', error);
      // Extract error message from various error formats
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Nu s-a putut crea canalul. Te rugăm să încerci din nou.';
      showToast({
        title: 'Eroare',
        description: errorMessage,
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setIsPrivate(false);
    setSelectedMembers([]);
    setMemberSearchTerm('');
    onClose();
  };

  // Filter users for member selection
  const filteredUsers = users
    .filter((u) => u.id !== currentUser?.id)
    .filter((u) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const email = u.email?.toLowerCase() || '';
      const search = memberSearchTerm.toLowerCase();
      return fullName.includes(search) || email.includes(search);
    });

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Canal Nou</h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Channel Type Toggle */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setIsPrivate(false)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                !isPrivate
                  ? 'bg-viperx-primary text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Hash className="h-4 w-4" />
              Public
            </button>
            <button
              onClick={() => setIsPrivate(true)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                isPrivate
                  ? 'bg-viperx-primary text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Lock className="h-4 w-4" />
              Privat
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {isPrivate
              ? 'Doar membrii invitați pot vedea și accesa acest canal.'
              : 'Oricine din organizație poate vedea și accesa acest canal.'}
          </p>
        </div>

        {/* Form */}
        <div className="p-4 flex-shrink-0">
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nume canal <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: general, suport-tehnic"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
              disabled={isCreating}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Descriere (opțional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrie scopul acestui canal..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
              disabled={isCreating}
            />
          </div>
        </div>

        {/* Member Selection */}
        <div className="border-t border-gray-200 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="p-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">
                Adaugă membri (opțional)
              </label>
              {selectedMembers.length > 0 && (
                <span className="text-xs text-viperx-primary font-medium">
                  {selectedMembers.length} selectat(i)
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                placeholder="Caută utilizatori..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                disabled={isCreating}
              />
            </div>
          </div>

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="px-4 pb-2 flex-shrink-0">
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((userId) => {
                  const user = users.find((u) => u.id === userId);
                  if (!user) return null;
                  return (
                    <div
                      key={userId}
                      className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1"
                    >
                      <span className="text-xs font-medium text-orange-900">
                        {user.firstName} {user.lastName}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleMember(userId)}
                        className="text-viperx-primary hover:text-orange-700"
                        disabled={isCreating}
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
          <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
            {loadingUsers ? (
              <div className="py-4 text-center text-sm text-gray-500">Se încarcă utilizatorii...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">Niciun utilizator găsit</div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.slice(0, 10).map((user) => {
                  const isSelected = selectedMembers.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleMember(user.id)}
                      disabled={isCreating}
                      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-gray-50 ${
                        isSelected ? 'bg-orange-50' : ''
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm text-white ${
                          isSelected ? 'bg-viperx-primary' : 'bg-gray-500'
                        }`}
                      >
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        {user.email && (
                          <p className="truncate text-xs text-gray-500">{user.email}</p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-viperx-primary">
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
                {filteredUsers.length > 10 && (
                  <p className="py-2 text-center text-xs text-gray-500">
                    Afișând primii 10 din {filteredUsers.length} utilizatori. Folosește căutarea pentru a găsi mai mulți.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
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
              disabled={!name.trim() || isCreating}
              className="flex-1 rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? 'Se creează...' : 'Creează'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
