import Joi from 'joi';

// Menu upload validation schema
export const menuUploadSchema = Joi.object({
  restaurant: Joi.string()
    .required()
    .min(1)
    .max(200)
    .trim()
    .messages({
      'string.empty': 'Restaurant name is required',
      'string.max': 'Restaurant name must not exceed 200 characters',
    }),
  menu: Joi.array()
    .required()
    .min(1)
    .max(1000)
    .items(
      Joi.object({
        name: Joi.string().required().min(1).max(200),
        price: Joi.number().positive().allow(0),
        category: Joi.string().max(100),
        description: Joi.string().max(500),
        ingredients: Joi.array().items(Joi.string()),
        tags: Joi.array().items(Joi.string()),
        available: Joi.boolean(),
      }).unknown(true) // Allow additional fields for flexibility
    )
    .messages({
      'array.min': 'Menu must contain at least one item',
      'array.max': 'Menu cannot contain more than 1000 items',
    }),
});

// Order parsing validation schema
export const parseOrderSchema = Joi.object({
  text: Joi.string()
    .required()
    .min(1)
    .max(5000)
    .trim()
    .messages({
      'string.empty': 'Order text is required',
      'string.max': 'Order text must not exceed 5000 characters',
    }),
});

// Transcription request validation (for metadata if needed)
export const transcriptionMetadataSchema = Joi.object({
  duration: Joi.number().positive().max(300), // Max 5 minutes
  format: Joi.string().valid('wav', 'mp3', 'webm', 'ogg'),
  sampleRate: Joi.number().positive(),
}).unknown(true);