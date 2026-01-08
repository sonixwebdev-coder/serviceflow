import React, { useState, useRef, useEffect } from 'react';
import { useSendMessage } from '../../hooks/useChat';
import { getSocket } from '../../lib/socket';
import { Send, Smile } from 'lucide-react';
import FileUploadButton from './FileUploadButton';
import VoiceRecordButton from './VoiceRecordButton';
import EmojiPicker from './EmojiPicker';
import useToast from '../../context/useToast';
import { useChatStore } from '../../state/useChatStore';
import { useAuthStore } from '../../state/useAuthStore';

/**
 * Message Composer Component
 * Input area for composing and sending messages
 */
export default function MessageComposer({ channelId }) {
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiButtonRef = useRef(null);

  const sendMessageMutation = useSendMessage(channelId);
  const socket = getSocket();
  const { showToast } = useToast();
  const { user: currentUser } = useAuthStore();
  const { addPendingMessage, removePendingMessage, updatePendingMessage } = useChatStore();

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
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create pending message for optimistic UI
    const pendingMessage = {
      tempId,
      body: messageBody,
      type: 'TEXT',
      status: 'sending',
      createdAt: new Date().toISOString(),
      author: currentUser,
      authorId: currentUser?.id,
    };

    setBody('');
    setIsSending(true);
    stopTyping();

    // Add pending message immediately
    addPendingMessage(channelId, pendingMessage);

    try {
      await sendMessageMutation.mutateAsync({
        body: messageBody,
        type: 'TEXT',
      });
      // Remove pending message on success (real message comes via socket)
      removePendingMessage(channelId, tempId);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Mark as failed
      updatePendingMessage(channelId, tempId, { status: 'failed' });
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

  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = body.slice(0, start) + emoji + body.slice(end);
      setBody(newBody);

      // Set cursor position after emoji
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setBody((prev) => prev + emoji);
    }
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

        {/* Emoji Button */}
        <div className="relative">
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            className={`flex-shrink-0 rounded-lg p-2 hover:bg-gray-100 ${
              isEmojiPickerOpen ? 'text-viperx-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Adaugă emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
          <EmojiPicker
            isOpen={isEmojiPickerOpen}
            onClose={() => setIsEmojiPickerOpen(false)}
            onSelect={handleEmojiSelect}
            anchorRef={emojiButtonRef}
          />
        </div>

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
