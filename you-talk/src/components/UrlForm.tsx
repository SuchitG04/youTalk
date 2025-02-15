import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/icons";
import { FiCheckCircle } from "react-icons/fi";
import { downloadAndProcessVideo } from "@/app/actions/videoProc";

interface UrlFormProps {
  onAudioPathChange: (path: string) => void;
  isProcessing: boolean | 'success' | 'removed';
  onProcessingChange: (state: boolean | 'success' | 'removed') => void;
}

export function UrlForm({ onAudioPathChange, isProcessing, onProcessingChange }: UrlFormProps) {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (url === '') {
      setUrlError('Please enter a YouTube video URL');
      setTimeout(() => setUrlError(''), 5000); // hide error after 5 seconds
      return;
    }
    onProcessingChange(true);

    console.log("Submitting URL:", url);
    downloadAndProcessVideo(url)
      .then((audioPath) => {
        onAudioPathChange(audioPath);
        setUrl('');
        onProcessingChange('success');
        setTimeout(() => onProcessingChange('removed'), 2000);
      })
      .catch((err) => {
        console.error('Error downloading and processing video:', err);
        setUrlError(err.message);
        setTimeout(() => setUrlError(''), 5000); // hide error after 5 seconds
        onProcessingChange(false);
      });
  }

  return (
    <form onSubmit={handleUrlSubmit} className="mt-2 space-y-4">
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="Paste YouTube video URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="default">
          {isProcessing === true ? (
            <>
              <Spinner />
              Processing...
            </>
          ) : isProcessing === 'success' ? (
            <>
              <FiCheckCircle />
              Done!
            </>
          ) : (
            'Submit'
          )}
        </Button>
      </div>
      {urlError && (
        <p className="text-sm text-red-500">{urlError}</p>
      )}
    </form>
  );
}
