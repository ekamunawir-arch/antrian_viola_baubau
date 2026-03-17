'use server';
/**
 * @fileOverview A Genkit flow for generating an audio announcement for an admin to call a queue number.
 *
 * - adminQueueCallAnnouncement - A function that handles generating the audio announcement.
 * - AdminQueueCallAnnouncementInput - The input type for the adminQueueCallAnnouncement function.
 * - AdminQueueCallAnnouncementOutput - The return type for the adminQueueCallAnnouncement function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import wav from 'wav';

const AdminQueueCallAnnouncementInputSchema = z.object({
  queueNumber: z.string().describe('The queue number to be announced (e.g., A01).'),
});
export type AdminQueueCallAnnouncementInput = z.infer<typeof AdminQueueCallAnnouncementInputSchema>;

const AdminQueueCallAnnouncementOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio announcement as a WAV data URI.'),
  error: z.string().optional().describe('Error code or message if the generation failed.'),
});
export type AdminQueueCallAnnouncementOutput = z.infer<typeof AdminQueueCallAnnouncementOutputSchema>;

/**
 * Converts PCM audio data to WAV format.
 */
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

export async function adminQueueCallAnnouncement(
  input: AdminQueueCallAnnouncementInput
): Promise<AdminQueueCallAnnouncementOutput> {
  return adminQueueCallAnnouncementFlow(input);
}

const adminQueueCallAnnouncementFlow = ai.defineFlow(
  {
    name: 'adminQueueCallAnnouncementFlow',
    inputSchema: AdminQueueCallAnnouncementInputSchema,
    outputSchema: AdminQueueCallAnnouncementOutputSchema,
  },
  async (input) => {
    try {
      // Teks pengumuman disederhanakan agar bisa di-cache per nomor antrian
      const promptText = `Antrian selanjutnya Nomor ${input.queueNumber}`;

      const { media } = await ai.generate({
        model: googleAI.model('gemini-2.5-flash-preview-tts'),
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Algenib' },
            },
          },
        },
        prompt: promptText,
      });

      if (!media || !media.url) {
        throw new Error('No audio media returned from TTS model.');
      }

      const audioBuffer = Buffer.from(
        media.url.substring(media.url.indexOf(',') + 1),
        'base64'
      );

      const wavBase64 = await toWav(audioBuffer);

      return {
        audioDataUri: 'data:audio/wav;base64,' + wavBase64,
      };
    } catch (error: any) {
      console.error('Error generating announcement:', error);
      if (error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('429')) {
        return {
          audioDataUri: '',
          error: 'QUOTA_EXHAUSTED'
        };
      }
      return {
        audioDataUri: '',
        error: error.message || 'INTERNAL_ERROR'
      };
    }
  }
);
