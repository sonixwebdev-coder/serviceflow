import { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Send } from 'lucide-react';

const VoiceRecorder = ({ onUpload, disabled, isUploading }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleSend = async () => {
    if (audioBlob && onUpload) {
      await onUpload(audioBlob, recordingTime);
      clearRecording();
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-red-50 rounded-lg">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-xs text-red-600 font-medium">{formatTime(recordingTime)}</span>
        <button
          type="button"
          onClick={stopRecording}
          className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
        >
          <Square size={12} />
        </button>
      </div>
    );
  }

  if (audioBlob && audioUrl) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-lg">
        <audio src={audioUrl} controls className="h-8" style={{ maxWidth: '120px' }} />
        <button
          type="button"
          onClick={clearRecording}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <X size={14} />
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={isUploading}
          className="p-1 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50"
        >
          {isUploading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send size={12} />}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled || isUploading}
      className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Mic size={20} />
    </button>
  );
};

export default VoiceRecorder;
