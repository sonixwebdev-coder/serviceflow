import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Send, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_DURATION = 120; // 2 minutes max

/**
 * Voice recording button with preview
 */
export default function VoiceRecordButton({ onUpload, isUploading, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_DURATION) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Nu am putut accesa microfonul. Verifica permisiunile.');
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

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSend = () => {
    if (audioBlob && onUpload) {
      onUpload({ audioBlob, duration: recordingTime });
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
    setIsPlaying(false);
    setError(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording in progress
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm text-red-600 font-medium">{formatTime(recordingTime)}</span>
        <button
          onClick={stopRecording}
          className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          title="Opreste inregistrarea"
        >
          <Square className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Preview recorded audio
  if (audioBlob && audioUrl) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
        <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />

        <button
          onClick={togglePlayback}
          className="p-1.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
          title={isPlaying ? 'Pauza' : 'Reda'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        <span className="text-sm text-gray-600">{formatTime(recordingTime)}</span>

        <button
          onClick={clearRecording}
          className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          title="Sterge"
        >
          <X className="h-4 w-4" />
        </button>

        <button
          onClick={handleSend}
          disabled={isUploading}
          className="p-1.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50"
          title="Trimite"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }

  // Default state - record button
  return (
    <div className="relative">
      {error && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200 max-w-[240px]">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium">
            ×
          </button>
        </div>
      )}

      <button
        onClick={startRecording}
        disabled={disabled || isUploading}
        className={cn(
          'p-2 rounded-full transition-colors',
          'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Inregistreaza mesaj vocal"
      >
        <Mic className="h-5 w-5" />
      </button>
    </div>
  );
}
