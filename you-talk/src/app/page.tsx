"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DotBackground } from "@/components/dot-background";
import { motion } from "framer-motion";
import { RiResetLeftFill } from "react-icons/ri";

import { RecordButton } from "@/components/RecordButton";
import { UrlForm } from "@/components/UrlForm";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export default function Home() {
  const [ytAudioPath, setYtAudioPath] = useState("");
  const [isUrlProcessing, setIsUrlProcessing] = useState<boolean | 'success' | 'removed'>(false);
  
  const {
    isRecording,
    isAudioProcessing,
    audioError,
    userAudioPath,
    startRecording,
    stopRecording,
    volume
  } = useAudioRecorder(ytAudioPath); // ytAudioPath is passed in the api call inside useAudioRecorder


  return (
    <>
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
              className="text-7xl text-blue font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-black to-gray-400 dark:from-white dark:to-gray-800"
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
                
                <RecordButton
                  isRecording={isRecording}
                  isAudioProcessing={isAudioProcessing}
                  isUrlProcessing={isUrlProcessing}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                  volume={volume}
                />

                {audioError && (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="text-sm text-red-500 mt-4 text-center mx-auto "
                  >
                    {audioError}
                  </motion.p>
                )}

                {isUrlProcessing !== 'removed' && (
                  <UrlForm
                    onAudioPathChange={setYtAudioPath}
                    isProcessing={isUrlProcessing}
                    onProcessingChange={setIsUrlProcessing}
                  />
                )}
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
  </>
  )
}
