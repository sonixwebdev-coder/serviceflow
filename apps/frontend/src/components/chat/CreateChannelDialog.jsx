import React, { useState } from 'react';
import { X, Hash, Lock } from 'lucide-react';
import { useCreateChannel } from '../../hooks/useChat';
import { useChatStore } from '../../state/useChatStore';
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

  const { setActiveChannelId } = useChatStore();
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
        description: description.trim() || undefined,
        type: isPrivate ? 'PRIVATE' : 'PUBLIC',
      });

      showToast({
        title: 'Success',
        description: `Canalul "${name}" a fost creat cu succes.`,
        type: 'success',
      });

      // Set as active channel and close dialog
      setActiveChannelId(channel.id);
      handleClose();
    } catch (error) {
      console.error('Failed to create channel:', error);
      showToast({
        title: 'Eroare',
        description: error?.message || 'Nu s-a putut crea canalul. Te rugăm să încerci din nou.',
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
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
        <div className="p-4">
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
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
              disabled={isCreating}
            />
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
