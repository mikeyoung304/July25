#!/usr/bin/env node
// Generate a minimal 16-bit PCM mono WAV file for testing
const fs = require('fs');
const path = require('path');

function generateWAV() {
  const sampleRate = 16000;
  const duration = 3; // 3 seconds
  const numSamples = sampleRate * duration;
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;

  // Create buffer for WAV file
  const dataSize = numSamples * numChannels * bytesPerSample;
  const bufferSize = 44 + dataSize; // 44 byte header + data
  const buffer = Buffer.alloc(bufferSize);

  // WAV header
  let offset = 0;

  // "RIFF" chunk descriptor
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(bufferSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // "fmt " sub-chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, offset); offset += 2; // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, offset); offset += 4; // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, offset); offset += 2; // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // "data" sub-chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Generate simple sine wave tone (440 Hz - A note)
  const frequency = 440;
  const amplitude = 10000; // Lower amplitude for safety

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude;
    buffer.writeInt16LE(Math.round(sample), offset);
    offset += 2;
  }

  return buffer;
}

// Generate and save
const outputPath = path.join(__dirname, '..', 'assets', 'voice_samples', 'margherita.wav');
const wavBuffer = generateWAV();
fs.writeFileSync(outputPath, wavBuffer);
console.log(`Generated test audio: ${outputPath} (${wavBuffer.length} bytes)`);
