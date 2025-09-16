import Joi from 'joi';

export const orderSchemas = {
  create: Joi.object({
    items: Joi.array().items(
      Joi.object({
        id: Joi.string().uuid(),
        name: Joi.string().required(),
        quantity: Joi.number().min(1).default(1),
        price: Joi.number().min(0).required(),
        modifiers: Joi.array().items(
          Joi.object({
            name: Joi.string().required(),
            price: Joi.number().min(0).default(0),
          })
        ).optional(),
        notes: Joi.string().max(200).optional(),
      })
    ).min(1).required(),
    type: Joi.string().valid('kiosk', 'drive-thru', 'online', 'voice').default('kiosk'),
    customerName: Joi.string().max(100).optional(),
    tableNumber: Joi.string().max(20).optional(),
    notes: Joi.string().max(500).optional(),
    metadata: Joi.object().optional(),
  }),
  
  voice: Joi.object({
    transcription: Joi.string().required(),
    audioUrl: Joi.string().uri().optional(),
    metadata: Joi.object({
      device: Joi.string().optional(),
      deviceId: Joi.string().optional(),
      location: Joi.string().optional(),
    }).optional(),
  }),
  
  updateStatus: Joi.object({
    status: Joi.string()
      .valid('new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')
      .required(),
    notes: Joi.string().max(500).optional(),
  }),

  filters: Joi.object({
    status: Joi.string().valid('new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'),
    type: Joi.string().valid('kiosk', 'drive-thru', 'online', 'voice'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')),
    limit: Joi.number().min(1).max(100).default(50),
    offset: Joi.number().min(0).default(0),
  }),
};