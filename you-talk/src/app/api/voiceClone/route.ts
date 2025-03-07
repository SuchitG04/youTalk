import { ElevenLabsClient } from "elevenlabs";
import * as fs from "fs";
import { v4 as uuidv4 } from 'uuid';

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

export async function POST(req: Request) {
  const { audioPath } = await req.json();

  const voiceName = uuidv4();

  const voice = await client.voices.add({
    files: [fs.createReadStream(`./audios/${audioPath}`)],
    name: voiceName
  });

  return new Response(JSON.stringify({ voiceId: voice.voice_id }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
