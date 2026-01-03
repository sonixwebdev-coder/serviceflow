import React, { useState, useRef, useEffect } from 'react';
import { useSendMessage } from '../../hooks/useChat';
import { getSocket } from '../../lib/socket';
import { Send, Smile } from 'lucide-react';
import FileUploadButton from './FileUploadButton';
import VoiceRecordButton from './VoiceRecordButton';
import useToast from '../../context/useToast';

/**
 * Message Composer Component
 * Input area for composing and sending messages
 */
export default function MessageComposer({ channelId }) {
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const sendMessageMutation = useSendMessage(channelId);
  const socket = getSocket();
  const { showToast } = useToast();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [body]);

  const handleTyping = () => {
    if (!socket) return;

    // Emit typing start
    socket.emit('chat:typing:start', { channelId });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing:stop', { channelId });
    }, 3000);
  };

  const stopTyping = () => {
    if (!socket) return;

    socket.emit('chat:typing:stop', { channelId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleSend = async () => {
    if (!body.trim() || isSending) return;

    const messageBody = body.trim();
    setBody('');
    setIsSending(true);
    stopTyping();

    try {
      await sendMessageMutation.mutateAsync({
        body: messageBody,
        type: 'TEXT',
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message on error
      setBody(messageBody);
      showToast({
        title: 'Eroare',
        description: error?.message || 'Nu s-a putut trimite mesajul. Te rugăm să încerci din nou.',
        type: 'error',
      });
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setBody(e.target.value);
    handleTyping();
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex items-end gap-2">
        {/* File Upload Button */}
        <FileUploadButton channelId={channelId} />

        {/* Voice Record Button */}
        <VoiceRecordButton channelId={channelId} />

        {/* Text Input */}
        <div className="flex-1 rounded-lg border border-gray-300 bg-white focus-within:border-viperx-primary focus-within:ring-1 focus-within:ring-viperx-primary">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Scrie un mesaj..."
            className="max-h-32 w-full resize-none rounded-lg px-3 py-2 text-sm focus:outline-none"
            rows={1}
            disabled={isSending}
          />
        </div>

        {/* Emoji Button (placeholder for future implementation) */}
        <button
          type="button"
          className="flex-shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          title="Adaugă emoji"
        >
          <Smile className="h-5 w-5" />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!body.trim() || isSending}
          className="flex-shrink-0 rounded-lg bg-viperx-primary p-2 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          title="Trimite mesajul"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      {/* Helper Text */}
      <div className="mt-2 text-xs text-gray-500">
        <span className="font-medium">Enter</span> pentru a trimite, <span className="font-medium">Shift+Enter</span> pentru linie nouă
      </div>
    </div>
  );
}
