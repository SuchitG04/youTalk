"use server";

import fs from "node:fs/promises";

/**
 * 
 * @param audioFile 
 * @returns 
 */
export async function saveAudio(audioBlob: Blob, audioPath: string): Promise<void> {
    const buffer = await audioBlob.arrayBuffer();
    console.log("Saving audio:", audioPath);
    await fs.writeFile(`./user_audios/${audioPath}`, Buffer.from(buffer));
}