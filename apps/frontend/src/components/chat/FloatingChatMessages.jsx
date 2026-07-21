import { AlertCircle, Clock, FileText, MessageCircle, Send } from 'lucide-react';
import { format } from 'date-fns';

import { getFileUrl } from '../../utils/api';

const MessageSkeleton = ({ isOwn }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
    <div className={`space-y-2 ${isOwn ? 'items-end' : 'items-start'}`}>
      <div
        className={`h-12 w-48 animate-pulse rounded-2xl ${isOwn ? 'bg-orange-200' : 'bg-gray-200'}`}
      />
    </div>
  </div>
);

export default function FloatingChatMessages({
  currentMessages,
  currentUser,
  handleKeyDown,
  handleSend,
  isSending,
  messagesEndRef,
  messagesLoading,
  body,
  setBody,
  textareaRef,
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-4">
        {messagesLoading ? (
          <div className="space-y-3">
            <MessageSkeleton isOwn={false} />
            <MessageSkeleton isOwn />
            <MessageSkeleton isOwn={false} />
            <MessageSkeleton isOwn />
          </div>
        ) : currentMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
              <MessageCircle className="h-7 w-7 text-primary" />
            </div>
            <p className="font-medium text-gray-900">Începe conversația</p>
            <p className="mt-1 text-sm text-gray-500">Trimite primul mesaj</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentMessages.map((message, index) => {
              const isOwn = message.author?.id === currentUser?.id;
              const isPending = !!message.tempId;
              const showAuthor =
                !isOwn &&
                (index === 0 || currentMessages[index - 1]?.author?.id !== message.author?.id);

              return (
                <div
                  key={message.id || message.tempId}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    {showAuthor && (
                      <p className="mb-1 ml-3 text-xs font-medium text-gray-500">
                        {message.author?.firstName}
                      </p>
                    )}
                    <div
                      className={`relative rounded-2xl px-4 py-2.5 text-sm ${
                        isOwn
                          ? 'bg-primary text-white rounded-br-md shadow-sm'
                          : 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5 rounded-bl-md'
                      } ${isPending ? 'opacity-70' : ''}`}
                    >
                      {message.body && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {message.body}
                        </p>
                      )}
                      {message.attachments?.map((attachment) => {
                        const isImage = attachment.fileType?.startsWith('image/');
                        const fullUrl = getFileUrl(attachment.fileUrl);
                        if (isImage) {
                          return (
                            <a
                              key={attachment.id}
                              href={fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={fullUrl}
                                alt={attachment.fileName}
                                className="mt-1 max-w-full max-h-[150px] rounded-lg object-cover"
                              />
                            </a>
                          );
                        }
                        return (
                          <a
                            key={attachment.id}
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 mt-1 text-xs underline ${isOwn ? 'text-white/80' : 'text-gray-600'}`}
                          >
                            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{attachment.fileName}</span>
                          </a>
                        );
                      })}
                      {!message.body && !message.attachments?.length && (
                        <p className="whitespace-pre-wrap break-words leading-relaxed opacity-70">
                          Atașament
                        </p>
                      )}
                      <div
                        className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
                          isOwn ? 'text-white/70' : 'text-gray-400'
                        }`}
                      >
                        {isPending && message.status === 'sending' && (
                          <Clock className="h-3 w-3 animate-pulse" />
                        )}
                        {isPending && message.status === 'failed' && (
                          <AlertCircle className="h-3 w-3 text-red-300" />
                        )}
                        <span>
                          {isPending
                            ? message.status === 'sending'
                              ? 'Se trimite...'
                              : 'Eroare'
                            : format(new Date(message.createdAt), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-white p-3">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrie un mesaj..."
              className="max-h-24 min-h-[44px] w-full resize-none rounded-xl border-0 bg-gray-100 px-4 py-3 pr-12 text-sm placeholder-gray-500 transition-colors focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={1}
              disabled={isSending}
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={!body.trim() || isSending}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            title="Trimite"
          >
            <Send className={`h-4 w-4 ${isSending ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>
    </>
  );
}
