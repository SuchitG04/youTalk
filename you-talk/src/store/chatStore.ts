import { create } from 'zustand';

interface AudioState {
    userAudioPath: string | null;
    setUserAudioPath: (audioPath: string | null) => void;
    resetAudioPath: () => void;
}

export const useAudioStore = create<AudioState>()((set) => ({
    userAudioPath: null,
    setUserAudioPath: (audioPath) => set(() => ({ userAudioPath: audioPath })),
    resetAudioPath: () => set(() => ({ userAudioPath: null }))
}));

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content?: string;
  userAudioPath?: string;
}

interface ChatState {
    convHistory: ChatMessage[];
    addToConvHistory: (newMessage: ChatMessage) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
    convHistory: [],
    addToConvHistory: (newMessage: ChatMessage) => set((state) => ({
      convHistory: [...state.convHistory, newMessage]
    })),
}));