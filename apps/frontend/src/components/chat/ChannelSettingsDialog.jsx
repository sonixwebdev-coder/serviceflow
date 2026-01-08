import React, { useState, useEffect } from 'react';
import { X, Settings, Edit2, LogOut, Archive, Bell, BellOff } from 'lucide-react';
import { useUpdateChannel, useLeaveChannel, useArchiveChannel, useChannel } from '../../hooks/useChat';
import { useChatStore } from '../../state/useChatStore';
import { useAuthStore } from '../../state/useAuthStore';
import useToast from '../../context/useToast';

/**
 * Channel Settings Dialog Component
 * Dialog for managing channel settings (name, description, notifications, leave, archive)
 */
export default function ChannelSettingsDialog({ isOpen, onClose, channelId }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { user: currentUser } = useAuthStore();
  const { data: channel } = useChannel(channelId);
  const { setActiveChannelId, removeChannel } = useChatStore();
  const { showToast } = useToast();

  const updateChannelMutation = useUpdateChannel(channelId);
  const leaveChannelMutation = useLeaveChannel();
  const archiveChannelMutation = useArchiveChannel();

  // Initialize form when channel data loads
  useEffect(() => {
    if (channel) {
      setName(channel.name || '');
      setDescription(channel.description || '');
    }
  }, [channel]);

  if (!isOpen || !channel) return null;

  // Find current user's membership
  const currentMember = channel.members?.find((m) => m.user?.id === currentUser?.id);
  const isOwner = currentMember?.role === 'OWNER';
  const isAdmin = currentMember?.role === 'ADMIN' || isOwner;
  const canEdit = isAdmin && channel.type !== 'DIRECT';
  const canArchive = isOwner && channel.type !== 'DIRECT';
  const canLeave = channel.type !== 'DIRECT';

  const handleSave = async () => {
    if (!name.trim()) {
      showToast({
        title: 'Eroare',
        description: 'Numele canalului nu poate fi gol.',
        type: 'error',
      });
      return;
    }

    setIsUpdating(true);

    try {
      await updateChannelMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
      });

      showToast({
        title: 'Succes',
        description: 'Setările canalului au fost actualizate.',
        type: 'success',
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update channel:', error);
      showToast({
        title: 'Eroare',
        description: error?.message || 'Nu s-au putut actualiza setările. Te rugăm să încerci din nou.',
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Ești sigur că vrei să părăsești acest canal?')) return;

    setIsUpdating(true);

    try {
      await leaveChannelMutation.mutateAsync(channelId);

      showToast({
        title: 'Succes',
        description: 'Ai părăsit canalul.',
        type: 'success',
      });

      removeChannel(channelId);
      setActiveChannelId(null);
      handleClose();
    } catch (error) {
      console.error('Failed to leave channel:', error);
      showToast({
        title: 'Eroare',
        description: error?.message || 'Nu s-a putut părăsi canalul. Te rugăm să încerci din nou.',
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Ești sigur că vrei să arhivezi acest canal? Această acțiune nu poate fi anulată.')) return;

    setIsUpdating(true);

    try {
      await archiveChannelMutation.mutateAsync(channelId);

      showToast({
        title: 'Succes',
        description: 'Canalul a fost arhivat.',
        type: 'success',
      });

      removeChannel(channelId);
      setActiveChannelId(null);
      handleClose();
    } catch (error) {
      console.error('Failed to archive channel:', error);
      showToast({
        title: 'Eroare',
        description: error?.message || 'Nu s-a putut arhiva canalul. Te rugăm să încerci din nou.',
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    if (channel) {
      setName(channel.name || '');
      setDescription(channel.description || '');
    }
    onClose();
  };

  const getChannelTypeLabel = (type) => {
    const labels = {
      PUBLIC: 'Canal Public',
      PRIVATE: 'Canal Privat',
      DIRECT: 'Mesaj Direct',
      GROUP: 'Grup',
    };
    return labels[type] || 'Canal';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Setări Canal</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isUpdating}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Channel Info / Edit */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase">
                {getChannelTypeLabel(channel.type)}
              </span>
              {canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-xs text-viperx-primary hover:text-orange-600"
                >
                  <Edit2 className="h-3 w-3" />
                  Editează
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nume</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    placeholder="Numele canalului"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descriere</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    placeholder="Descrierea canalului (opțional)"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isUpdating}
                    className="flex-1 rounded-lg bg-viperx-primary px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdating ? 'Se salvează...' : 'Salvează'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setName(channel.name || '');
                      setDescription(channel.description || '');
                    }}
                    disabled={isUpdating}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anulează
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-semibold text-gray-900">{channel.name || 'Fără nume'}</h3>
                {channel.description && (
                  <p className="mt-1 text-sm text-gray-500">{channel.description}</p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  {channel.members?.length || 0} membri
                </p>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isMuted ? (
                  <BellOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Bell className="h-5 w-5 text-gray-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Notificări</p>
                  <p className="text-sm text-gray-500">
                    {isMuted ? 'Notificările sunt dezactivate' : 'Notificările sunt active'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isMuted ? 'bg-gray-300' : 'bg-viperx-primary'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isMuted ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          {(canLeave || canArchive) && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h4 className="text-sm font-medium text-red-800 mb-3">Zona de pericol</h4>
              <div className="space-y-2">
                {canLeave && (
                  <button
                    onClick={handleLeave}
                    disabled={isUpdating}
                    className="flex w-full items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Părăsește canalul
                  </button>
                )}
                {canArchive && (
                  <button
                    onClick={handleArchive}
                    disabled={isUpdating}
                    className="flex w-full items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Archive className="h-4 w-4" />
                    Arhivează canalul
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleClose}
            disabled={isUpdating}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
