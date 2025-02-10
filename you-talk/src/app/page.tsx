"use client"

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DotBackground } from "@/components/dot-background";
import { motion } from "framer-motion";
import type React from "react";
import { FiMic, FiLoader, FiCheckCircle } from "react-icons/fi";
import { RiResetLeftFill } from "react-icons/ri";
import { v4 as uuidv4 } from "uuid";

import { downloadAndProcessVideo } from "@/app/actions/videoProc";

const Spinner = () => (
  <svg className='animate-spin h-5 w-5 mr-3' viewBox='0 0 24 24'>
    <circle className="opacity-25" cx="12" cy="12" r="10" fill="currentColor" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const Checkmark = () => (
  <svg className='w-5 h-5 text-green-500' viewBox='0 0 24 24'>
    <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.42L9 16.17z" />
  </svg>
);

export default function Home() {
  const [url, setUrl] = useState("");
  const [audioError, setAudioError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);
  const [isUrlProcessing, setIsUrlProcessing] = useState<boolean | 'success' | 'removed'>(false);
  const [ytAudioPath, setYtAudioPath] = useState("");
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

      mediaRecorder.current.onstop = async () => {
        setIsAudioProcessing(true);
        const audioBlob = new Blob(audioChunks.current);
        audioChunks.current = [];

        const audioFile = new File([audioBlob], `${uuidv4()}.mp3`, { type: 'audio/mp3' });
        // placeholder timeout to mimic processing
        setTimeout(() => setIsAudioProcessing(false), 2000);
      };
    } catch (err) {
      setAudioError('Microphone access required for recording')
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      // use ytAudioPath to generate voice clone + this and user audio to gemini parallelly
      // or should you generate the voice clone right after we get the audio from the downloaded video?
      setIsRecording(false);
    }
  };

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsUrlProcessing(true);

    console.log("Submitting URL:", url);
    downloadAndProcessVideo(url)
    .then((audioPath) => {
      setYtAudioPath(audioPath);

      setUrl('');
      setIsUrlProcessing('success');
      setTimeout(() => setIsUrlProcessing('removed'), 2000);
    })
    .catch((err) => {
      console.error('Error downloading and processing video:', err);
      setUrlError(err.message);
      setIsUrlProcessing(false);
      return;
    });
  };


  return (
    <div className="relative min-h-screen">
      <DotBackground />
      <ThemeToggle />

      <main className="container relative mx-auto px-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center justify-center space-y-20"
        >
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <motion.h1
              className="text-7xl text-blue font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-black to-gray-600 dark:from-white dark:to-gray-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              youTalk
            </motion.h1>
            <motion.p
              className="text-xl text-muted-foreground max-w-[600px] mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Experience the future of content interaction. Chat with your favorite YouTubers using AI-powered voice
              interactions.
            </motion.p>
          </div>

          {/* Main Input Section */}
          <motion.div
            className="w-full max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="relative p-8 rounded-xl border-2 border-foreground/10 bg-background/50 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(255,255,255,0.1)]">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5" />
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute top-0 right-0 p-2"
                >
                  <RiResetLeftFill />
                </Button>
                <h2 className="text-xl font-semibold mb-6">Start a Conversation</h2>
                <div className="flex flex-col items-center justify-center space-y-4">
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`p-6 rounded-full transition-all duration-300 ${
                      isRecording 
                        ? 'bg-red-500 scale-110' 
                        : isAudioProcessing
                        ? 'bg-blue-500'
                        : 'bg-foreground hover:bg-foreground/90'
                    }`}
                    disabled={isAudioProcessing || isUrlProcessing !== 'removed'}
                  >
                    {isAudioProcessing ? (
                      <FiLoader className="h-16 w-16 text-background animate-spin" />
                    ) : (
                      <FiMic className="h-16 w-16 text-background" />
                    )}
                  </button>
                  <p className="text-sm text-muted-foreground">
                    {isAudioProcessing
                      ? 'Oo interesting question tbh...'
                      : isRecording
                      ? 'Recording... Release to send'
                      : isUrlProcessing !== 'removed'
                      ? 'Submit the YouTube video URL first ;)'
                      : 'Press and hold to speak'}
                  </p>
                </div>
                {audioError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500 mt-4">
                    {audioError}
                  </motion.p>
                )}

              {/* textarea to get url. shows until url is not processed */}
              { isUrlProcessing !== 'removed' && <form className="mt-2 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste YouTube video URL here"
                      className="flex-grow border-foreground/20 bg-background/50"
                    />
                    <Button 
                      onClick={handleUrlSubmit} 
                      type="submit" 
                      disabled={!!isUrlProcessing}
                      className={`flex items-center justify-center gap-2 ${
                        isUrlProcessing === 'success' && 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {isUrlProcessing === true ? (
                        <>
                          <Spinner />
                          Processing...
                        </>
                      ) : isUrlProcessing === 'success' ? (
                        <>
                          <Checkmark />
                          Done!
                        </>
                      ) : (
                        'Submit'
                      )}
                    </Button>
                  </div>
                  {urlError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-500">
                      {urlError}
                    </motion.p>
                  )}
              </form> }
              </div>
            </div>
          </motion.div>

          {/* Features Section */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {[
              {
                title: "Natural Conversations",
                description: "Engage in fluid, context-aware discussions that feel remarkably human-like.",
              },
              {
                title: "Voice Matching",
                description: "Experience responses in the authentic voice of your chosen YouTuber.",
              },
              {
                title: "Real-time Processing",
                description: "Get instant responses powered by advanced AI technology.",
              },
            ].map((feature, index) => (
              <div key={index} className="p-6 rounded-lg border border-foreground/10 bg-background/50 backdrop-blur-sm">
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </main>

      <footer className="absolute bottom-4 w-full text-center text-sm text-foreground/60">
        © 2024 youTalk. All rights reserved.
      </footer>
    </div>
  )
}
