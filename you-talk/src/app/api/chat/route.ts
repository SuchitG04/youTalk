import { readFileSync } from "node:fs";;
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatMessage } from "@/store/chatStore";
import { ElevenLabsClient } from "elevenlabs";
import { WebSocket } from "ws";


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

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not defined");
}
if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const client = new ElevenLabsClient({apiKey: process.env.ELEVENLABS_API_KEY});


export async function POST(req: Request) {
  const { recordedAudioPath, ytAudioPath, convHistory, voiceId }:
    { recordedAudioPath: string, ytAudioPath: string, convHistory: ChatMessage[], voiceId: string } = await req.json();

  const ws_url = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_flash_v2_5`
  // get base64 string of audio file
  console.log(`./audios/${recordedAudioPath}`);
  const base64UserAudioFile = readFileSync(`./audios/${recordedAudioPath}`, 'base64');

  // get base64 string of yt audio file
  console.log(`./audios/${ytAudioPath}`);
  const base64YtAudioFile = readFileSync(`./audios/${ytAudioPath}`, 'base64');

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction: "Given IMMEDIATELY BELOW (first user chat entry) is a audio file from a YouTube video. Following this is the user's audio(s). Please act as the YouTuber in the given YouTube video's audio and use this context to respond to the user's query, whatever it might be, in a natural conversational manner. Keep your response short enough for the user to be able to understand and long enough to be sufficiently informative and helpful as it will be converted to speech and played to the user. Do not include any other text in your response other than the response to the user's query that follows the first video's audio."
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


  const requestStartTime = Date.now();
  const result = await chat.sendMessageStream([
    { text: "Given below is the user's query. Given the above video context, respond to the query in a natural conversational manner."},
    {
      inlineData: {
        mimeType: "audio/mp3",
        data: base64UserAudioFile,
      }
    }
  ]);

  const websocketStartTime = Date.now();
  const ws = new WebSocket(ws_url);

  const elevenLabsStartTime = Date.now();
  let firstElevenLabsChunk = false;

  ws.onopen = async (event) => {
    const connectionTime = Date.now() - websocketStartTime;
    console.log(`WebSocket connection established in ${connectionTime}ms`);
    ws.send(JSON.stringify({
      text: " ", // initial text " "
      "xi-api-key": process.env.ELEVENLABS_API_KEY
    }));

    // Stream text chunks as they arrive
    for await (const chunk of result.stream) {
      const chunkReceiveTime = Date.now() - requestStartTime;
      const text = chunk.text();
      console.log(`📨 Text chunk received @ +${chunkReceiveTime}ms: ${text}`);
      
      const sendStart = Date.now();
      ws.send(JSON.stringify({ text: text + " " }));
      console.log(`📤 Sent to ElevenLabs @ +${Date.now() - requestStartTime}ms (processing: ${Date.now() - sendStart}ms)`);
    }
    ws.send(JSON.stringify({ text: "" })); // end of stream text ""
  };

  const startTime = Date.now();
  let firstChunkReceived = false;

  const stream = new ReadableStream({
    async start(controller) {
      ws.onmessage = (event) => {
        const response = JSON.parse(event.data.toString());

        if (response.isFinal) {
          controller.close();
          ws.close();
        }

        if (response.audio) {
          if (!firstChunkReceived) {
            const timeToFirstChunk = Date.now() - startTime;
            console.log(`Time to first chunk: ${timeToFirstChunk}ms`);
            firstChunkReceived = true;
          }
          if (!firstElevenLabsChunk) {
            const elevenLabsTime = Date.now() - elevenLabsStartTime;
            console.log(`ElevenLabs first audio chunk: ${elevenLabsTime}ms`);
            firstElevenLabsChunk = true;
          }
          console.log("sending response...")
          controller.enqueue(Buffer.from(response.audio, 'base64'));
        }
      };
    }
  });


  ws.onclose = (event) => {
    if (event.wasClean) {
      console.info(`Connection closed cleanly, reason=${event.reason}`);
    } else {
      console.warn(`Connection died`);
    }
  };

  return new Response(stream, {
    headers: {
      'cache-control': 'no-store',
      'Content-Type': 'text/event-stream',
    }
  });
}