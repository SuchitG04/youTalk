import { FiMic, FiLoader } from "react-icons/fi";

interface RecordButtonProps {
  isRecording: boolean;
  isAudioProcessing: boolean;
  isUrlProcessing: boolean | 'success' | 'removed';
  onStartRecording: () => void;
  onStopRecording: () => void;
  volume?: number;
}

export function RecordButton({
  isRecording,
  isAudioProcessing,
  isUrlProcessing,
  onStartRecording,
  onStopRecording,
  volume = 0
}: RecordButtonProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <button
        onMouseDown={onStartRecording}
        onMouseUp={onStopRecording}
        onTouchStart={onStartRecording}
        onTouchEnd={onStopRecording}
        style={{
          transform: `scale(${1 + volume * 0.2})`,
          transition: 'transform 0.1s ease-out'
        }}
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
  );
}
