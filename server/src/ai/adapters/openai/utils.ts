import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';

/**
 * Write buffer to temporary file and return file path
 * Remember to clean up the file after use
 */
export async function bufferToTmpFile(buffer: Buffer, extension: string): Promise<string> {
  const tmpDir = os.tmpdir();
  const tmpPath = path.join(tmpDir, `audio-${Date.now()}.${extension}`);
  
  await fs.promises.writeFile(tmpPath, buffer);
  return tmpPath;
}

/**
 * Create a read stream and cleanup function for temporary file
 */
export async function bufferToStream(buffer: Buffer, extension: string): Promise<{
  stream: fs.ReadStream;
  cleanup: () => Promise<void>;
}> {
  const tmpPath = await bufferToTmpFile(buffer, extension);
  const stream = createReadStream(tmpPath);
  
  return {
    stream,
    cleanup: async () => {
      try {
        await unlink(tmpPath);
      } catch (error) {
        // File may already be deleted
      }
    }
  };
}

/**
 * Execute with timeout and retry
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  {
    maxAttempts = 2,
    timeoutMs = 15000,
    retryDelayMs = 1000
  }: {
    maxAttempts?: number;
    timeoutMs?: number;
    retryDelayMs?: number;
  } = {}
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
        )
      ]);
      return result;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  
  throw lastError;
}