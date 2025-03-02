import { readFileSync } from "node:fs";;
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatMessage } from "@/store/chatStore";
import { ElevenLabsClient } from "elevenlabs";


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


const client = new ElevenLabsClient({apiKey: process.env.ELEVENLABS_API_KEY});

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not defined");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(req: Request) {
    const { recordedAudioPath, ytAudioPath, convHistory }:
      { recordedAudioPath: string, ytAudioPath: string, convHistory: ChatMessage[] } = await req.json();

    console.log("Received request with chat history:", convHistory);

    // get base64 string of audio file
    console.log(`./audios/${recordedAudioPath}`);
    const base64UserAudioFile = readFileSync(`./audios/${recordedAudioPath}`, 'base64');

    // get base64 string of yt audio file
    console.log(`./audios/${ytAudioPath}`);
    const base64YtAudioFile = readFileSync(`./audios/${ytAudioPath}`, 'base64');

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction: "Given IMMEDIATELY BELOW (first user chat entry) is a audio file from a YouTube video. Following this is the user's audio(s). Please act as the person in the given audio and use this context to respond to the user in a natural conversational manner. Keep your response short enough for the user to be able to understand and long enough to be sufficiently informative and helpful as it will be converted to speech and played to the user."
    });

    // Convert chat history to Gemini format
    const geminiHistory = convHistory.map((msg: ChatMessage) => {
      if (msg.role === 'user' && msg.userAudioPath) {
        // For user messages, read the audio file and convert to base64
        const base64Audio = readFileSync(`./audios/${msg.userAudioPath}`, 'base64');
        return {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'audio/mp3',
                data: base64Audio
              }
            }
          ]
        };
      } else {
        // For assistant messages or the system prompt
        return {
          role: 'model',
          parts: [{ text: msg.content || '' }]
        };
      }
    });

    // Start chat with history
    const chat = model.startChat({
      history: geminiHistory
    });

    const result = await chat.sendMessage([
      {
        inlineData: {
          mimeType: "audio/mp3",
          data: base64UserAudioFile,
        }
      },
      { text: " "}
    ]);

    console.log(result.response.text());

    const audio: AudioResponse = await client.textToSpeech.convertWithTimestamps("JBFqnCBsd6RMkjVDRZzb", {
      text: result.response.text(),
      model_id: "eleven_flash_v2_5",
      output_format: "mp3_44100_128",
    });

    return new Response(JSON.stringify({ text_message: result.response.text(), audio_base64: audio.audio_base64 }), {
      status: 200,
    });
}