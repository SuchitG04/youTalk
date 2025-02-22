import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { saveAudio } from '@/app/actions/saveAudio';

export function useAudioRecorder(ytAudioPath: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [userAudioPath, setUserAudioPath] = useState("");
  const [volume, setVolume] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
  }, []);

  // call /api/chat with the user's audioPath and ytAudioPath
  const askGemini = async (recordedAudioPath: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // the state variable userAudioPath isn't yet updated with the recorded audio path
        // when the askGemini function is called, which is why we pass the custom created audioPath as a parameter down below
        body: JSON.stringify({ recordedAudioPath, ytAudioPath }),
      });
  
      if (!response.ok) {
        throw new Error('API request failed');
      }
  
      const data = await response.json();
      return data.message;
    } catch (err) {
      setAudioError('Failed to get response from Gemini :(');
      setTimeout(() => setAudioError(''), 5000); // hide error after 5 seconds
      console.error(err);
    }
  }

  const elevenLabsTTS = async (text: string) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
  
      if (!response.ok) {
        throw new Error('API request failed');
      }
  
      const data = await response.json();
      return data.audio_base64;
    } catch (err) {
      setAudioError('Failed to get response from ElevenLabs :(');
      setTimeout(() => setAudioError(''), 5000); // hide error after 5 seconds
      console.error(err);
    }
  }

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
      setIsAudioProcessing(true);

      await new Promise(resolve => {
        mediaRecorder.current!.onstop = resolve;
      });

      const audioBlob = new Blob(audioChunks.current);
      const audioPath = `${uuidv4()}.mp3`;
      setUserAudioPath(audioPath); // Update state for UI purposes
      await saveAudio(audioBlob, audioPath);

      // Use local audioPath here instead of state to avoid stale closure
      const geminiResponse = await askGemini(audioPath); // CORRECT: Using fresh local variable
      // now convert the text response to audio
      const elevenLabsResponse: string = await elevenLabsTTS(geminiResponse);

      // play audio from base64 string
      const audioBase64 = elevenLabsResponse;
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

      setIsAudioProcessing(false);
    }

  };

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
    userAudioPath,
    volume,
    startRecording,
    stopRecording
  };
}
