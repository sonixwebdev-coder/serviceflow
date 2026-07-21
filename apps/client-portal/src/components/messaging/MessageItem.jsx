import { cn } from '@/lib/utils';
import { User, Play, Pause, FileText, Image as ImageIcon } from 'lucide-react';
import { useState, useRef } from 'react';
import { getFileUrl } from '@/utils/api';

/**
 * Format time for display
 */
function formatMessageTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  }

  return d.toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get author display name
 */
function getAuthorName(author) {
  if (!author) return 'Necunoscut';
  if (author.companyName) return author.companyName;
  return [author.firstName, author.lastName].filter(Boolean).join(' ') || 'Utilizator';
}

/**
 * File attachment preview
 */
function FileAttachment({ attachment, onPreview }) {
  const isImage = attachment.fileType?.startsWith('image/');
  const isPdf = attachment.fileType === 'application/pdf';
  const fullUrl = getFileUrl(attachment.fileUrl);

  if (isImage) {
    return (
      <button
        type="button"
        onClick={() =>
          onPreview({ url: fullUrl, name: attachment.fileName, type: attachment.fileType })
        }
        className="block mt-2 cursor-pointer hover:opacity-90 transition-opacity"
      >
        <img
          src={fullUrl}
          alt={attachment.fileName}
          className="max-w-[240px] max-h-[180px] rounded-lg object-cover"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        onPreview({ url: fullUrl, name: attachment.fileName, type: attachment.fileType })
      }
      className="flex items-center gap-2 mt-2 p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors w-full text-left"
    >
      {isPdf ? (
        <FileText className="h-5 w-5 text-red-500" />
      ) : (
        <FileText className="h-5 w-5 text-gray-500" />
      )}
      <span className="text-sm text-gray-700 truncate max-w-[180px]">{attachment.fileName}</span>
      <ImageIcon className="h-4 w-4 text-gray-400 ml-auto" />
    </button>
  );
}

/**
 * Voice message player
 */
function VoicePlayer({ fileUrl, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const fullUrl = getFileUrl(fileUrl);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const percentage = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(percentage);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 mt-2 p-2 bg-gray-100 rounded-lg min-w-[200px]">
      <audio ref={audioRef} src={fullUrl} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />
      <button
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
          <div className="h-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-gray-500 mt-1">{formatDuration(duration)}</span>
      </div>
    </div>
  );
}

/**
 * Individual message item component
 */
export default function MessageItem({ message, isOwnMessage, onPreviewFile }) {
  const isVoice = message.metadata?.isVoice;
  const hasAttachments = message.attachments?.length > 0;
  const authorName = getAuthorName(message.author);
  const isClientMessage = message.author?.type === 'client';

  return (
    <div className={cn('flex gap-3 py-2', isOwnMessage ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isClientMessage ? 'bg-primary-100' : 'bg-gray-200'
        )}
      >
        {message.author?.avatarUrl ? (
          <img
            src={message.author.avatarUrl}
            alt={authorName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <User className={cn('h-4 w-4', isClientMessage ? 'text-primary-600' : 'text-gray-500')} />
        )}
      </div>

      {/* Message content */}
      <div className={cn('max-w-[75%] flex flex-col', isOwnMessage ? 'items-end' : 'items-start')}>
        {/* Author name and time */}
        <div
          className={cn(
            'flex items-center gap-2 mb-1',
            isOwnMessage ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="text-xs font-medium text-gray-700">{authorName}</span>
          <span className="text-xs text-gray-400">{formatMessageTime(message.createdAt)}</span>
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isOwnMessage
              ? 'bg-primary-600 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-900 rounded-tl-sm'
          )}
        >
          {/* Text content */}
          {message.body && !isVoice && (
            <p className="text-sm whitespace-pre-wrap wrap-break-word">{message.body}</p>
          )}

          {/* Voice message */}
          {isVoice && hasAttachments && (
            <VoicePlayer
              fileUrl={message.attachments[0].fileUrl}
              duration={message.metadata?.duration}
            />
          )}

          {/* File attachments */}
          {!isVoice &&
            hasAttachments &&
            message.attachments.map((attachment) => (
              <FileAttachment
                key={attachment.id}
                attachment={attachment}
                onPreview={onPreviewFile}
              />
            ))}
        </div>

        {/* Read status for own messages */}
        {isOwnMessage && message.isRead && (
          <span className="text-xs text-gray-400 mt-1">Citit</span>
        )}
      </div>
    </div>
  );
}
