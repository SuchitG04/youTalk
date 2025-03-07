import { FiMic, FiLoader } from "react-icons/fi";

interface RecordButtonProps {
  isRecording: boolean;
  isAudioProcessing: boolean;
  isUrlProcessing: boolean | 'success' | 'removed';
  onStartRecording: () => void;
  onRecordingEnd: () => void;
  volume?: number;
}

export function RecordButton({
  isRecording,
  isAudioProcessing,
  isUrlProcessing,
  onStartRecording,
  onRecordingEnd,
  volume = 0
}: RecordButtonProps) {
  // Smooth out the volume value using a logarithmic scale and clamping
  const smoothVolume = Math.min(Math.log(volume * 15 + 1) / Math.log(10), 1);
  
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <button
        onMouseDown={onStartRecording}
        onMouseUp={onRecordingEnd}
        onTouchStart={onStartRecording}
        onTouchEnd={onRecordingEnd}
        style={{
          transform: `scale(${1 + smoothVolume * 0.2})`,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.3s ease-in-out'
        }}
        className={`p-6 rounded-full relative ${
          isRecording 
            ? 'bg-red-500 after:absolute after:inset-0 after:rounded-full after:animate-ping after:bg-red-500/50 after:-z-10' 
            : isAudioProcessing
            ? 'bg-blue-500'
            : 'bg-foreground hover:bg-foreground/90'
        } transition-colors duration-300 ease-in-out`}
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
  );
}
