import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { saveAudio } from '@/app/actions/saveAudio';
import { useAudioStore } from '@/store/chatStore';

export function useAudioRecorder(ytAudioPath: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);
  // audioError is shown under the mic icon in the UI
  const [audioError, setAudioError] = useState("");
  const [volume, setVolume] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(null);

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
      setIsRecording(false);

      await new Promise(resolve => {
        mediaRecorder.current!.onstop = resolve;
      });

      const audioBlob = new Blob(audioChunks.current);
      const audioPath = `${uuidv4()}.mp3`;      

      try {
        await saveAudio(audioBlob, audioPath);
        useAudioStore.getState().setUserAudioPath(audioPath);
      } catch (error) {
        console.error('Failed to save audio.');
        throw error; // Re-throw to handle in the calling code
      }
    }
  };

  const playAudio = (audioBase64: string) => {
    // play audio from base64 string
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const audioUrl = URL.createObjectURL(new Blob([audioBuffer]));
    const audio = new Audio(audioUrl);
    audio.play();
    
    // Setup audio analysis
    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaElementSource(audio);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);
    updateVolume();
  }

  const updateVolume = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(dataArray);
    
    let sum = 0;
    for (const amplitude of dataArray) {
      sum += Math.abs(128 - amplitude);
    }
    const avg = sum / dataArray.length;
    setVolume(Math.min(avg / 50, 1)); // Normalize volume 0-1
    
    // update volume at 60Hz
    animationFrameRef.current = requestAnimationFrame(updateVolume);
  };

  return {
    isRecording,
    isAudioProcessing,
    audioError,
    setAudioError,
    volume,
    startRecording,
    stopRecording,
    playAudio
  };
}
