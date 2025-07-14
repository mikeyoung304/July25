import multer from 'multer'
import { Request } from 'express'

// Configure multer for audio file uploads with security restrictions
export const audioUpload = multer({
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1 
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['audio/wav', 'audio/mp3', 'audio/webm', 'audio/ogg', 'audio/mpeg']
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only audio files allowed (wav, mp3, webm, ogg).'))
    }
  },
  storage: multer.memoryStorage() // Store in memory for processing
})