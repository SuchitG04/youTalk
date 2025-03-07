import { useState, useRef } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAudioStore, useChatStore } from "@/store/chatStore";

interface ChatMessage {
  role: 'user' | 'assistant';
  content?: string;
  audioPath?: string;
}

interface VoiceResponse {
  text_message: string;
  audio_base64: string;
}


export function useChat(ytAudioPath: string) {
  const [audioError, setAudioError] = useState("");
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);

  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const {
    isRecording,
    startRecording,
    stopRecording,
  } = useAudioRecorder(ytAudioPath); // ytAudioPath is passed in the api call inside useAudioRecorder

  const handleApiError = (error: string, duration = 5000) => {
    setAudioError(error);
    setTimeout(() => setAudioError(''), duration);
    console.error(error);
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

  // call /api/chat with the user's audioPath and ytAudioPath
  const getVoiceResponse = async (recordedAudioPath: string): Promise<VoiceResponse> => {
    const convHistory = useChatStore.getState().convHistory;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordedAudioPath, ytAudioPath, convHistory }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMsg = 'Failed to get response from Gemini';
      handleApiError(errorMsg);
      throw err;
    }
  };


  const getAiResponse = async (): Promise<[string, string]> => {
    const currentAudioPath = useAudioStore.getState().userAudioPath;
    if (!currentAudioPath) {
      throw new Error('No audio recording available');
    }

    const aiResponse: VoiceResponse = await getVoiceResponse(currentAudioPath);
  
    return [aiResponse.text_message, aiResponse.audio_base64];
  };

  const startChat = async () => {
    await stopRecording();
    setIsAudioProcessing(true);

    if (useChatStore.getState().convHistory.length === 0) {
      // add yt audio to be added first
      useChatStore.getState().addToConvHistory({
        role: 'user',
        userAudioPath: ytAudioPath
      })
    }

    const recordedAudioPath = useAudioStore.getState().userAudioPath;
    if (!recordedAudioPath) {
      throw new Error('No audio recording available');
    }
    const convHistory = useChatStore.getState().convHistory;

    try {
      // Add user message to conversation history
      // useChatStore.getState().addToConvHistory({
      //   role: 'user',
      //   userAudioPath: recordedAudioPath
      // });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({ recordedAudioPath, ytAudioPath, convHistory }),
      });

      if (!response.body) throw new Error("No response body");
      
      // Initialize audio context for visualization
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // Start volume visualization
      setIsPlaying(true);
      updateVolume();
      
      // Create an audio element for playback
      const audioElement = new Audio();
      let audioSource: MediaElementAudioSourceNode | null = null;
      
      // Store all received chunks
      const audioChunks: Uint8Array[] = [];
      
      // Process the stream
      const reader = response.body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Add the new chunk to our collection
        audioChunks.push(value);
        
        // Create a blob from all chunks received so far
        const blob = new Blob(audioChunks, { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        
        // Remember current playback position if already playing
        const currentTime = audioElement.currentTime;
        const wasPlaying = !audioElement.paused && audioElement.currentTime > 0;
        
        // Clean up old URL if exists
        if (audioElement.src && audioElement.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioElement.src);
        }
        
        // Update the audio source
        audioElement.src = url;
        
        // If we were already playing, restore position and continue
        if (wasPlaying) {
          audioElement.currentTime = currentTime;
          audioElement.play().catch(e => console.error('Error resuming audio:', e));
        } else {
          // First time playing, set up analyzer connection
          audioElement.play()
            .then(() => {
              // Connect to analyzer for volume visualization (only once)
              if (!audioSource) {
                audioSource = audioContextRef.current!.createMediaElementSource(audioElement);
                audioSource.connect(analyserRef.current!);
                analyserRef.current!.connect(audioContextRef.current!.destination);
                updateVolume();
              }
            })
            .catch(e => console.error('Error starting audio playback:', e));
        }
      }
      
      // Add assistant's response to conversation history
      // useChatStore.getState().addToConvHistory({
      //   role: 'assistant',
      //   content: 'Audio response played'
      // });

    } catch (err) {
      console.error('Error during chat:', err);
      handleApiError('Error during chat: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsPlaying(false);
      setIsAudioProcessing(false);
      useAudioStore.getState().resetAudioPath();
      
      // Clean up audio resources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  return {
    isRecording,
    isAudioProcessing,
    audioError,
    startRecording,
    startChat,
    volume
  };
}
