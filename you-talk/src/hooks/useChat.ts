import { useEffect, useState } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAudioStore, useChatStore } from "@/store/chatStore";
import { saveAudio } from "@/app/actions/saveAudio";
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  role: 'user' | 'assistant';
  content?: string;
  audioPath?: string;
}

export function useChat(ytAudioPath: string) {
  const [audioError, setAudioError] = useState("");
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);

  const {
    isRecording,
    startRecording,
    stopRecording,
    volume,
    playAudio
  } = useAudioRecorder(ytAudioPath); // ytAudioPath is passed in the api call inside useAudioRecorder

  const handleApiError = (error: string, duration = 5000) => {
    setAudioError(error);
    setTimeout(() => setAudioError(''), duration);
    console.error(error);
  };

  // call /api/chat with the user's audioPath and ytAudioPath
  const askGemini = async (recordedAudioPath: string): Promise<string> => {
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
      return data.message;
    } catch (err) {
      const errorMsg = 'Failed to get response from Gemini';
      handleApiError(errorMsg);
      throw err;
    }
  };

  const elevenLabsTTS = async (text: string): Promise<string> => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.audio_base64;
    } catch (err) {
      const errorMsg = 'Failed to generate speech with ElevenLabs';
      handleApiError(errorMsg);
      throw err;
    }
  };

  const getAiResponse = async (): Promise<[string, string]> => {
    const currentAudioPath = useAudioStore.getState().userAudioPath;
    if (!currentAudioPath) {
      throw new Error('No audio recording available');
    }

    // TODO: send conversation history to Gemini
    const geminiResponse = await askGemini(currentAudioPath);
    const ttsResponse = await elevenLabsTTS(geminiResponse);
  
    return [geminiResponse, ttsResponse];
  };

  const startChat = async () => {
    setIsAudioProcessing(true);

    if (useChatStore.getState().convHistory.length === 0) {
      // add yt audio to be added first
      useChatStore.getState().addToConvHistory({
        role: 'user',
        userAudioPath: ytAudioPath
      });
    }

    try {
      await stopRecording();
      const [responseText, audioBase64] = await getAiResponse();
      // save ai audio to audios folder
      const asstAudioPath = `${uuidv4()}.mp3`;
      const audioBlob = new Blob([Buffer.from(audioBase64, 'base64')]);
      await saveAudio(audioBlob, asstAudioPath);

      // update chat history with user and assistant messages
      useChatStore.getState().addToConvHistory({
        role: 'user',
        userAudioPath: useAudioStore.getState().userAudioPath! 
      });
      useChatStore.getState().addToConvHistory({
        role: 'assistant',
        content: responseText,
        userAudioPath: asstAudioPath
      });

      playAudio(audioBase64);
    } catch (err) {
      console.error('Error during chat:', err);
    } finally {
      setIsAudioProcessing(false);
      useAudioStore.getState().resetAudioPath();
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
