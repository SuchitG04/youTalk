import { ElevenLabsClient, play } from "elevenlabs";

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not defined");
}

const client = new ElevenLabsClient({apiKey: process.env.ELEVENLABS_API_KEY});

interface AudioResponse {
  audio_base64: string;
  alignment: {
    characters: [string];
    character_start_times_seconds: [number];
    character_end_times_seconds: [number];
  };
  normalized_alignment: {
    characters: [string];
    character_start_times_seconds: [number];
    character_end_times_seconds: [number];
  };
}

export async function POST(req: Request) {
  const { text } = await req.json();
  
  // add error handling using then, catch, etc later
  const audio: AudioResponse = await client.textToSpeech.convertWithTimestamps("JBFqnCBsd6RMkjVDRZzb", {
    text: text,
    model_id: "eleven_flash_v2_5",
    output_format: "mp3_44100_128",
  });

  return new Response(JSON.stringify({ audio_base64: audio.audio_base64 }), {
    status: 200,
  });
}