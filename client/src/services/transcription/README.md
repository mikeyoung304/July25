# Voice Transcription Service

This service provides real-time voice transcription using OpenAI's Whisper API.

## Setup

1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Add the key to your `.env.local` file:
   ```
   VITE_OPENAI_API_KEY=your_api_key_here
   ```

## Usage

The transcription is automatically integrated into the `useAudioCapture` hook. When recording stops, the audio is sent to OpenAI for transcription.

## Error Handling

The service handles various error cases:

- **No API Key**: Displays a clear message to configure VITE_OPENAI_API_KEY
- **Invalid API Key**: Shows authentication error message
- **Rate Limiting**: Informs user to try again later
- **Network Errors**: Displays connection error message
- **Invalid Audio Format**: Shows format error (though webm is supported)

## Security Note

⚠️ **Important**: The current implementation uses `dangerouslyAllowBrowser: true` for demo purposes. In production:

1. Never expose API keys in the browser
2. Implement server-side transcription endpoint
3. Use proper authentication and rate limiting
4. Validate and sanitize all inputs

## Supported Audio Formats

The MediaRecorder API typically produces audio in webm format, which is supported by OpenAI's Whisper API. Other supported formats include:
- mp3
- mp4
- mpeg
- mpga
- m4a
- wav
- webm

## Testing

The service is automatically mocked in tests. The mock returns "Mock transcription result" for all audio inputs.