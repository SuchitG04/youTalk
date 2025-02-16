import { readFileSync } from "node:fs";
import { GoogleGenerativeAI } from "@google/generative-ai"

if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not defined");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function POST(req: Request) {
    const { recordedAudioPath, ytAudioPath } = await req.json();

    // get base64 string of audio file
    console.log(`./user_audios/${recordedAudioPath}`);
    const base64UserAudioFile = readFileSync(`./user_audios/${recordedAudioPath}`, 'base64');

    // get base64 string of yt audio file
    console.log(`./audios/${ytAudioPath}`);
    const base64YtAudioFile = readFileSync(`./audios/${ytAudioPath}`, 'base64');

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite-preview-02-05",
    });

    const result = await model.generateContent([
        {
            inlineData: {
                mimeType: "audio/mp3",
                data: base64YtAudioFile,
            }
        },
        { text: "Given above is a audio file from a YouTube video. Following this is the user's audio. Please act as the person in the previously given audio and use this context to respond to the user in a natural conversational manner. Keep your response short enough for the user to be able to understand and long enough to be sufficiently informative and helpful as it will be converted to speech and played to the user." },
        {
            inlineData: {
                mimeType: "audio/mp3",
                data: base64UserAudioFile,
            }
        },
    ]);

    console.log(result.response.text());

    return new Response(JSON.stringify({ message: result.response.text() }), {
        status: 200,
    });
}