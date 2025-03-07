import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { saveAudio } from '@/app/actions/saveAudio';
import { useAudioStore } from '@/store/chatStore';

export function useAudioRecorder(ytAudioPath: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);
  // audioError is shown under the mic icon in the UI
  const [audioError, setAudioError] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
  }, []);

  const startRecording = async () => {
    try {
      audioChunks.current = []; // Reset audio chunks at the start of recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.start();
      setIsRecording(true);

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data)
      };
    } catch (err) {
      setAudioError('Microphone access required for recording');
      setTimeout(() => setAudioError(''), 5000); // hide error after 5 seconds
    }
  };

  const stopRecording = async () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);

      await new Promise(resolve => {
        mediaRecorder.current!.onstop = resolve;
      });

      console.log("stopped recording");
      const audioBlob = new Blob(audioChunks.current);
      const audioPath = `${uuidv4()}.mp3`;      

      try {
        await saveAudio(audioBlob, audioPath);
        useAudioStore.getState().setUserAudioPath(audioPath);
        audioChunks.current = []; // Clear the chunks after successful save
      } catch (error) {
        console.error('Failed to save audio.');
        throw error; 
      }
    }
  };

  return {
    isRecording,
    isAudioProcessing,
    audioError,
    setAudioError,
    startRecording,
    stopRecording,
  };
}
