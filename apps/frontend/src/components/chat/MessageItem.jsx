import React, { useState, useMemo, memo } from 'react';
import confirm from '../../utils/confirm';
import { format } from 'date-fns';
import { useAuthStore } from '../../state/useAuthStore';
import { useDeleteMessage, useUpdateMessage } from '../../hooks/useChat';
import { MoreVertical, Edit2, Trash2, File, Image, Mic, Clock, AlertCircle } from 'lucide-react';
import useToast from '../../context/useToast';
import ImagePreviewModal from './ImagePreviewModal';
import UserHoverCard from './UserHoverCard';
import { getFileUrl } from '../../utils/api';

/**
 * Message Item Component
 * Displays individual message with avatar, content, and actions
 */
function MessageItem({ message, showAvatar, isOwnMessage: isOwnMessageProp, isPending, status }) {
  const { user: currentUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(message.body);
  const [showActions, setShowActions] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const { showToast } = useToast();

  const updateMessageMutation = useUpdateMessage();
  const deleteMessageMutation = useDeleteMessage();

  // Use prop if provided, otherwise compute
  const isOwnMessage = isOwnMessageProp ?? (message.author?.id === currentUser?.id);
  const timestamp = useMemo(() => format(new Date(message.createdAt), 'HH:mm'), [message.createdAt]);

  // Get display body based on message type
  const getDisplayBody = () => {
    // Don't show body text for voice messages (audio player shows instead)
    if (message.type === 'VOICE') {
      return null;
    }

    // For file/image messages, show appropriate Romanian text
    if (message.type === 'FILE' || message.type === 'IMAGE') {
      const fileName = message.attachments?.[0]?.fileName || '';
      if (message.type === 'IMAGE') {
        return isOwnMessage ? `Ai trimis o imagine: ${fileName}` : `A trimis o imagine: ${fileName}`;
      }
      return isOwnMessage ? `Ai trimis un fișier: ${fileName}` : `A trimis un fișier: ${fileName}`;
    }

    return message.body;
  };

  const displayBody = getDisplayBody();

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
    if (await confirm({ title: 'Sterge mesaj', text: 'Esti sigur ca vrei sa stergi acest mesaj?', confirmText: 'Sterge', danger: true })) {
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
            const imageSrc = getFileUrl(`/files/${attachment.fileUrl}`);
            return (
              <div key={attachment.id} className="max-w-sm">
                <img
                  src={imageSrc}
                  alt={attachment.fileName}
                  className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setPreviewImage({ src: imageSrc, fileName: attachment.fileName })}
                />
              </div>
            );
          }

          if (isVoice) {
            return (
              <div
                key={attachment.id}
                className={`flex items-center gap-3 rounded-xl p-3 ${
                  isOwnMessage ? 'bg-orange-600/20' : 'bg-gray-100'
                }`}
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                  isOwnMessage ? 'bg-white/30' : 'bg-primary/10'
                }`}>
                  <Mic className={`h-5 w-5 ${isOwnMessage ? 'text-white' : 'text-primary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium mb-1 ${isOwnMessage ? 'text-white/80' : 'text-gray-500'}`}>
                    Mesaj vocal
                  </p>
                  <audio
                    controls
                    className="w-full max-w-[200px] h-8"
                    src={getFileUrl(`/files/${attachment.fileUrl}`)}
                  >
                    Browserul tău nu suportă elementul audio.
                  </audio>
                </div>
              </div>
            );
          }

          return (
            <a
              key={attachment.id}
              href={getFileUrl(`/files/${attachment.fileUrl}`)}
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
      className={`group relative flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar - only show for other users' messages */}
      {!isOwnMessage && (
        showAvatar ? (
          <UserHoverCard user={message.author}>
            <div className="flex-shrink-0 cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                {message.author?.firstName?.[0] || '?'}
                {message.author?.lastName?.[0] || ''}
              </div>
            </div>
          </UserHoverCard>
        ) : (
          <div className="w-10 flex-shrink-0"></div>
        )
      )}

      {/* Message Content */}
      <div className={`min-w-0 max-w-[70%] ${isOwnMessage ? 'ml-auto' : ''}`}>
        {/* Author name and timestamp */}
        {showAvatar && !isOwnMessage && (
          <div className="mb-1 flex items-baseline gap-2">
            <UserHoverCard user={message.author}>
              <span className="font-semibold text-gray-900 cursor-pointer hover:underline">
                {message.author?.firstName} {message.author?.lastName}
              </span>
            </UserHoverCard>
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
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={updateMessageMutation.isPending}
                className="rounded bg-primary px-3 py-1 text-sm text-white hover:bg-orange-600 disabled:opacity-50"
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
        ) : displayBody ? (
          <div
            className={`inline-block rounded-2xl px-4 py-2 text-sm ${
              isOwnMessage
                ? 'bg-primary text-white rounded-br-md'
                : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-md'
            } ${isPending ? 'opacity-70' : ''}`}
          >
            {message.isDeleted ? (
              <span className="italic opacity-70">{displayBody}</span>
            ) : (
              <p className="whitespace-pre-wrap break-words">{displayBody}</p>
            )}
            {/* Timestamp for own messages */}
            {isOwnMessage && (
              <div className="mt-1 flex items-center justify-end gap-1 text-xs opacity-70">
                {isPending && status === 'sending' && (
                  <Clock className="h-3 w-3 animate-pulse" />
                )}
                {isPending && status === 'failed' && (
                  <AlertCircle className="h-3 w-3 text-red-300" />
                )}
                <span>{isPending ? (status === 'sending' ? 'Se trimite...' : 'Eroare') : timestamp}</span>
                {!isPending && message.editedAt && <span>(editat)</span>}
              </div>
            )}
          </div>
        ) : null}

        {/* Attachments */}
        {renderAttachments()}
      </div>

      {/* Actions Menu */}
      {showActions && isOwnMessage && !message.isDeleted && !isEditing && !isPending && (
        <div className={`absolute ${isOwnMessage ? 'left-0' : 'right-0'} top-0 flex gap-1 rounded-lg bg-white shadow-sm border border-gray-200 p-1`}>
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

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        src={previewImage?.src}
        fileName={previewImage?.fileName}
      />
    </div>
  );
}

export default memo(MessageItem);
