import React, { useState } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '../../state/useAuthStore';
import { useDeleteMessage, useUpdateMessage } from '../../hooks/useChat';
import { MoreVertical, Edit2, Trash2, File, Image } from 'lucide-react';
import useToast from '../../context/useToast';

/**
 * Message Item Component
 * Displays individual message with avatar, content, and actions
 */
export default function MessageItem({ message, showAvatar }) {
  const { user: currentUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(message.body);
  const [showActions, setShowActions] = useState(false);
  const { showToast } = useToast();

  const updateMessageMutation = useUpdateMessage();
  const deleteMessageMutation = useDeleteMessage();

  const isOwnMessage = message.author.id === currentUser?.id;
  const timestamp = format(new Date(message.createdAt), 'HH:mm');

  const handleEdit = async () => {
    if (editedBody.trim() && editedBody !== message.body) {
      try {
        await updateMessageMutation.mutateAsync({
          messageId: message.id,
          body: editedBody.trim(),
        });
        showToast({
          title: 'Succes',
          description: 'Mesajul a fost actualizat.',
          type: 'success',
        });
      } catch (error) {
        showToast({
          title: 'Eroare',
          description: error?.message || 'Nu s-a putut actualiza mesajul. Te rugăm să încerci din nou.',
          type: 'error',
        });
        return;
      }
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Ești sigur că vrei să ștergi acest mesaj?')) {
      try {
        await deleteMessageMutation.mutateAsync(message.id);
        showToast({
          title: 'Succes',
          description: 'Mesajul a fost șters.',
          type: 'success',
        });
      } catch (error) {
        showToast({
          title: 'Eroare',
          description: error?.message || 'Nu s-a putut șterge mesajul. Te rugăm să încerci din nou.',
          type: 'error',
        });
      }
    }
  };

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null;

    return (
      <div className="mt-2 space-y-2">
        {message.attachments.map((attachment) => {
          const isImage = attachment.fileType?.startsWith('image/');
          const isVoice = message.type === 'VOICE';

          if (isImage) {
            return (
              <div key={attachment.id} className="max-w-sm">
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/files/${attachment.fileUrl}`}
                  alt={attachment.fileName}
                  className="rounded-lg"
                />
              </div>
            );
          }

          if (isVoice) {
            return (
              <audio
                key={attachment.id}
                controls
                className="max-w-sm"
                src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/files/${attachment.fileUrl}`}
              >
                Browserul tău nu suportă elementul audio.
              </audio>
            );
          }

          return (
            <a
              key={attachment.id}
              href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}/files/${attachment.fileUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50"
            >
              <File className="h-5 w-5 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{attachment.fileName}</p>
                {attachment.fileSize && (
                  <p className="text-xs text-gray-500">
                    {(attachment.fileSize / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="group relative flex gap-3"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {showAvatar ? (
        <div className="flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-viperx-primary text-white">
            {message.author.firstName[0]}
            {message.author.lastName[0]}
          </div>
        </div>
      ) : (
        <div className="w-10 flex-shrink-0"></div>
      )}

      {/* Message Content */}
      <div className="min-w-0 flex-1">
        {showAvatar && (
          <div className="mb-1 flex items-baseline gap-2">
            <span className="font-semibold text-gray-900">
              {message.author.firstName} {message.author.lastName}
            </span>
            <span className="text-xs text-gray-500">{timestamp}</span>
            {message.editedAt && (
              <span className="text-xs text-gray-400">(editat)</span>
            )}
          </div>
        )}

        {/* Message Body */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={updateMessageMutation.isPending}
                className="rounded bg-viperx-primary px-3 py-1 text-sm text-white hover:bg-orange-600 disabled:opacity-50"
              >
                Salvează
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedBody(message.body);
                }}
                className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
              >
                Anulează
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-900">
            {message.isDeleted ? (
              <span className="italic text-gray-400">{message.body}</span>
            ) : (
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
            )}
          </div>
        )}

        {/* Attachments */}
        {renderAttachments()}
      </div>

      {/* Actions Menu */}
      {showActions && isOwnMessage && !message.isDeleted && !isEditing && (
        <div className="absolute right-0 top-0 flex gap-1 rounded-lg bg-white shadow-sm border border-gray-200 p-1">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Editează mesaj"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"
            title="Șterge mesaj"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
