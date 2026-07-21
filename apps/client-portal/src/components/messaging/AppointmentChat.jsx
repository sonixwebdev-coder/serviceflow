import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageCircle, AlertCircle, X, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppointmentMessages } from '@/hooks/useAppointmentMessages';
import { useAuth } from '@/hooks/useAuth';
import MessageItem from './MessageItem';
import FileUploadButton from './FileUploadButton';
import VoiceRecordButton from './VoiceRecordButton';

/**
 * Main chat component for appointment messaging
 */
export default function AppointmentChat({ appointmentId }) {
  const [messageText, setMessageText] = useState('');
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type } for modal preview
  const [pendingFile, setPendingFile] = useState(null); // File object for preview before sending
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { client } = useAuth();

  const {
    messages,
    isLoading,
    isError,
    error,
    sendMessage,
    isSending,
    uploadFile,
    isUploadingFile,
    uploadVoice,
    isUploadingVoice,
    markAsRead,
  } = useAppointmentMessages(appointmentId);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages.length, markAsRead]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || isSending) return;

    sendMessage({ body: messageText.trim() });
    setMessageText('');
    inputRef.current?.focus();
  };

  const handleFileSelect = (file) => {
    setPendingFile(file);
  };

  const handleFileUpload = async () => {
    if (!pendingFile) return;
    try {
      await uploadFile(pendingFile);
      setPendingFile(null);
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  const cancelPendingFile = () => {
    setPendingFile(null);
  };

  const handleVoiceUpload = ({ audioBlob, duration }) => {
    uploadVoice({ audioBlob, duration });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p className="text-sm">Se incarca mesajele...</p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-sm">Eroare la incarcarea mesajelor</p>
        <p className="text-xs text-gray-500 mt-1">
          {error?.message || 'Incearca din nou mai tarziu'}
        </p>
      </div>
    );
  }

  const isProcessing = isSending || isUploadingFile || isUploadingVoice;

  return (
    <div className="flex flex-col h-full">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle className="h-12 w-12 mb-3 text-gray-300" />
            <p className="text-sm font-medium">Niciun mesaj inca</p>
            <p className="text-xs text-gray-400 mt-1">
              Trimite un mesaj pentru a incepe conversatia
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isOwnMessage={message.clientAuthorId === client?.id}
                onPreviewFile={setPreviewFile}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input */}
      <div className="border-t border-gray-200 px-4 py-3 bg-white">
        {/* Pending file preview */}
        {pendingFile && (
          <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-start gap-3">
              {pendingFile.type?.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(pendingFile)}
                  alt={pendingFile.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{pendingFile.name}</p>
                <p className="text-xs text-gray-500">{(pendingFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelPendingFile}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={isUploadingFile}
                  onClick={handleFileUpload}
                  className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isUploadingFile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          {/* File upload button */}
          <FileUploadButton
            onUpload={handleFileSelect}
            isUploading={isUploadingFile}
            disabled={isProcessing || !!pendingFile}
          />

          {/* Voice record button */}
          <VoiceRecordButton
            onUpload={handleVoiceUpload}
            isUploading={isUploadingVoice}
            disabled={isProcessing}
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrie un mesaj..."
              rows={1}
              disabled={isProcessing}
              className={cn(
                'w-full px-4 py-2.5 border border-gray-300 rounded-2xl resize-none',
                'focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'disabled:bg-gray-50 disabled:cursor-not-allowed',
                'text-sm placeholder:text-gray-400'
              )}
              style={{
                minHeight: '42px',
                maxHeight: '120px',
              }}
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!messageText.trim() || isProcessing}
            className={cn(
              'p-2.5 rounded-full transition-colors',
              'bg-primary-600 text-white hover:bg-primary-700',
              'disabled:bg-gray-300 disabled:cursor-not-allowed'
            )}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>

        {/* Upload indicator */}
        {(isUploadingFile || isUploadingVoice) && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {isUploadingFile ? 'Se incarca fisierul...' : 'Se incarca mesajul vocal...'}
            </span>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 truncate max-w-[250px]">
                {previewFile.name}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Descarca
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-auto max-h-[calc(90vh-60px)] flex items-center justify-center bg-gray-100">
              {previewFile.type?.startsWith('image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              ) : previewFile.type === 'application/pdf' ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[70vh] rounded-lg"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">
                    Previzualizare indisponibila pentru acest tip de fisier
                  </p>
                  <a
                    href={previewFile.url}
                    download={previewFile.name}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Descarca fisierul
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
