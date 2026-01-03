import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';
import { useUploadVoice } from '../../hooks/useChat';
import useToast from '../../context/useToast';

/**
 * Voice Record Button Component
 * Handles voice message recording using MediaRecorder API
 */
export default function VoiceRecordButton({ channelId }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const { showToast } = useToast();

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const uploadVoiceMutation = useUploadVoice(channelId);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder with WebM format (widely supported)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      showToast({
        title: 'Eroare',
        description: 'Nu s-a putut accesa microfonul. Te rugăm să acorzi permisiunea și să încerci din nou.',
        type: 'error',
      });
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

  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    setIsUploading(true);

    try {
      await uploadVoiceMutation.mutateAsync(audioBlob);

      showToast({
        title: 'Succes',
        description: 'Mesajul vocal a fost trimis.',
        type: 'success',
      });

      // Reset state
      cancelRecording();
    } catch (error) {
      console.error('Failed to send voice message:', error);
      showToast({
        title: 'Eroare',
        description: error?.message || 'Nu s-a putut trimite mesajul vocal. Te rugăm să încerci din nou.',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Record Button (when not recording and no audio recorded) */}
      {!isRecording && !audioBlob && (
        <button
          type="button"
          onClick={startRecording}
          className="flex-shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          title="Înregistrează mesaj vocal"
          disabled={isUploading}
        >
          <Mic className="h-5 w-5" />
        </button>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <Mic className="h-8 w-8 animate-pulse text-red-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Se înregistrează...</h3>
              <p className="mt-2 text-3xl font-mono text-gray-900">{formatTime(recordingTime)}</p>
            </div>

            {/* Waveform visualization placeholder */}
            <div className="mb-4 flex h-16 items-center justify-center gap-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 animate-pulse rounded-full bg-red-500"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                ></div>
              ))}
            </div>

            <button
              onClick={stopRecording}
              className="w-full rounded-lg bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700"
            >
              <Square className="mx-auto h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Preview and Send */}
      {!isRecording && audioBlob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Mesaj Vocal</h3>

            {/* Audio Player */}
            <div className="mb-4">
              <audio controls className="w-full" src={audioUrl}>
                Browserul tău nu suportă elementul audio.
              </audio>
            </div>

            {/* Duration */}
            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-sm text-gray-600">Durată: {formatTime(recordingTime)}</p>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-4">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full animate-pulse bg-viperx-primary" style={{ width: '100%' }}></div>
                </div>
                <p className="mt-1 text-center text-xs text-gray-500">Se trimite...</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={cancelRecording}
                disabled={isUploading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Șterge
              </button>
              <button
                onClick={sendVoiceMessage}
                disabled={isUploading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isUploading ? 'Se trimite...' : 'Trimite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
