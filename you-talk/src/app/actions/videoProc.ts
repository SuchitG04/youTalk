"use server";

import { createWriteStream, rm } from 'node:fs';
import ytdl from '@distube/ytdl-core';
import { v4 as uuidv4 } from "uuid";
import ffmpeg from 'fluent-ffmpeg';

/**
 * Downloads a YouTube video and processes it.
 *
 * @param youtubeUrl The full YouTube URL of the video.
 */
export async function downloadAndProcessVideo(youtubeUrl: string): Promise<string> {
  console.log("Downloading and processing video:", youtubeUrl);

  // Validate the URL
  if (!ytdl.validateURL(youtubeUrl)) {
    console.error('Invalid YouTube URL.');
    throw new Error('Invalid YouTube URL.');
  }
  
  const id = uuidv4();
  const downloadedVideoPath = `${id}.mp4`;
  const audioPath = `./audios/${id}.mp3`;

  const startTime = Date.now();
  // Start downloading the video. The options object allows you to select quality, etc.
  const videoStream = ytdl(youtubeUrl, { 
    // extract and download audio only
    filter: 'audioonly',
    lang: 'en',
  });

  videoStream.on('error', (error: Error) => {
    console.error('Error during video streaming:', error);
  });

  const writeStream = createWriteStream(downloadedVideoPath);
  // Pipe the video stream to the file system.
  videoStream.pipe(writeStream);

  // When the download finishes...
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log('Video downloaded successfully.');
      ffmpeg(downloadedVideoPath)
        .noVideo()                 // Ignore the video stream.
        .audioCodec('libmp3lame')  // Use the MP3 encoder.
        .audioBitrate('16k')       // (Optional) Set the audio bitrate.
        .on('error', (err: Error) => {
          console.error('Error extracting audio:', err);
        })
        .on('end', () => {
          console.log('Audio extracted successfully:', audioPath);
          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;
          console.log(`Duration: ${duration} seconds`);
          // delete the video file
          rm(downloadedVideoPath, { force: true }, (err) => {
            if (err) {
              console.error('Error deleting the video file:', err);
            }
          });
          resolve(audioPath.split('/')[2]);
        })
        .save(audioPath);
    });
    writeStream.on('error', (err) => {
      console.error('Error writing the video file:', err);
      reject(err);
    });
  });
}