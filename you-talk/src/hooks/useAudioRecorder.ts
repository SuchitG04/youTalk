import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { saveAudio } from '@/app/actions/saveAudio';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [userAudioPath, setUserAudioPath] = useState("");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
  }, []);

  const startRecording = async () => {
    try {
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
      setIsAudioProcessing(true);

      // Wait for final data to arrive
      await new Promise(resolve => {
        mediaRecorder.current!.onstop = resolve;
      });

      const audioBlob = new Blob(audioChunks.current);
      const audioPath = uuidv4();
      setUserAudioPath(audioPath);
      await saveAudio(audioBlob, audioPath);

      // placeholder timeout to mimic processing
      setTimeout(() => setIsAudioProcessing(false), 2000);

      audioChunks.current = [];
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  return {
    isRecording,
    isAudioProcessing,
    audioError,
    userAudioPath,
    startRecording,
    stopRecording
  };
}
