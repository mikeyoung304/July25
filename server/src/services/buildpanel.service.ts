import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

const buildPanelLogger = logger.child({ service: 'BuildPanelService' });

interface BuildPanelConfig {
  baseUrl: string;
  timeout: number;
}

interface ChatResponse {
  message: string;
  suggestions?: string[];
  orderData?: any;
}

interface VoiceResponse {
  transcription: string;
  response: string;
  audioUrl?: string;
  audioBuffer?: Buffer;
  orderData?: any;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

interface OrderRequest {
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    modifiers?: any[];
    notes?: string;
  }>;
  customerInfo?: {
    name?: string;
    phone?: string;
  };
  totalAmount: number;
  restaurantId: string;
  userId?: string;
}

interface OrderResponse {
  orderId: string;
  status: string;
  items: any[];
  totalAmount: number;
  estimatedTime?: number;
}

export class BuildPanelService {
  private client: AxiosInstance;
  private config: BuildPanelConfig;

  constructor() {
    this.config = {
      baseUrl: process.env.BUILDPANEL_URL || 'http://localhost:3003',
      timeout: 30000 // 30 seconds for voice processing
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    buildPanelLogger.info(`BuildPanelService initialized with URL: ${this.config.baseUrl}`);
  }

  /**
   * Process text chat message through BuildPanel
   */
  async processChat(
    message: string, 
    restaurantId: string,
    userId?: string
  ): Promise<ChatResponse> {
    try {
      buildPanelLogger.info('Processing chat message', { 
        restaurantId, 
        messageLength: message.length 
      });

      const response = await this.client.post('/api/chatbot', {
        message,
        context: {
          restaurantId,
          userId,
          timestamp: new Date().toISOString()
        }
      }, {
        headers: {
          'X-Restaurant-ID': restaurantId,
          'X-User-ID': userId || 'anonymous'
        }
      });

      buildPanelLogger.info('Chat response received', { 
        restaurantId,
        hasOrderData: !!response.data.orderData 
      });

      return response.data;
    } catch (error) {
      buildPanelLogger.error('Chat processing failed', { error, restaurantId });
      throw new Error(`BuildPanel chat failed: ${error.message}`);
    }
  }

  /**
   * Process voice audio through BuildPanel
   * Converts audio buffer to file and sends to BuildPanel
   */
  async processVoice(
    audioBuffer: Buffer,
    mimeType: string,
    restaurantId: string,
    userId?: string
  ): Promise<VoiceResponse> {
    try {
      buildPanelLogger.info('Processing voice audio', { 
        restaurantId, 
        bufferSize: audioBuffer.length,
        mimeType 
      });

      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'audio.webm',
        contentType: mimeType || 'audio/webm'
      });

      // Add context as form fields
      formData.append('restaurantId', restaurantId);
      if (userId) formData.append('userId', userId);

      const response = await this.client.post('/api/voice-chat', formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Restaurant-ID': restaurantId,
          'X-User-ID': userId || 'anonymous'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      buildPanelLogger.info('Voice response received', { 
        restaurantId,
        hasTranscription: !!response.data.transcription,
        hasAudio: !!response.data.audioUrl || !!response.data.audioBuffer,
        hasOrderData: !!response.data.orderData 
      });

      return response.data;
    } catch (error) {
      buildPanelLogger.error('Voice processing failed', { error, restaurantId });
      throw new Error(`BuildPanel voice processing failed: ${error.message}`);
    }
  }

  /**
   * Get menu from BuildPanel
   */
  async getMenu(restaurantId: string): Promise<MenuItem[]> {
    try {
      buildPanelLogger.info('Fetching menu', { restaurantId });

      const response = await this.client.get('/api/menu', {
        headers: {
          'X-Restaurant-ID': restaurantId
        }
      });

      const menuItems = response.data.items || response.data;
      
      buildPanelLogger.info('Menu fetched successfully', { 
        restaurantId,
        itemCount: menuItems.length 
      });

      return menuItems;
    } catch (error) {
      buildPanelLogger.error('Menu fetch failed', { error, restaurantId });
      throw new Error(`BuildPanel menu fetch failed: ${error.message}`);
    }
  }

  /**
   * Create order through BuildPanel
   */
  async createOrder(orderData: OrderRequest): Promise<OrderResponse> {
    try {
      buildPanelLogger.info('Creating order', { 
        restaurantId: orderData.restaurantId,
        itemCount: orderData.items.length,
        totalAmount: orderData.totalAmount 
      });

      const response = await this.client.post('/api/orders', orderData, {
        headers: {
          'X-Restaurant-ID': orderData.restaurantId,
          'X-User-ID': orderData.userId || 'anonymous'
        }
      });

      buildPanelLogger.info('Order created successfully', { 
        restaurantId: orderData.restaurantId,
        orderId: response.data.orderId 
      });

      return response.data;
    } catch (error) {
      buildPanelLogger.error('Order creation failed', { error, orderData });
      throw new Error(`BuildPanel order creation failed: ${error.message}`);
    }
  }

  /**
   * Health check for BuildPanel service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch (error) {
      buildPanelLogger.warn('BuildPanel health check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Process request with restaurant context from AuthenticatedRequest
   */
  async processAuthenticatedChat(
    req: AuthenticatedRequest,
    message: string
  ): Promise<ChatResponse> {
    const restaurantId = req.restaurantId || 'default';
    const userId = req.user?.id;
    
    return this.processChat(message, restaurantId, userId);
  }

  /**
   * Process voice with restaurant context from AuthenticatedRequest
   */
  async processAuthenticatedVoice(
    req: AuthenticatedRequest,
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<VoiceResponse> {
    const restaurantId = req.restaurantId || 'default';
    const userId = req.user?.id;
    
    return this.processVoice(audioBuffer, mimeType, restaurantId, userId);
  }
}

// Singleton instance
let buildPanelService: BuildPanelService;

export function getBuildPanelService(): BuildPanelService {
  if (!buildPanelService) {
    buildPanelService = new BuildPanelService();
  }
  return buildPanelService;
}

export const buildPanelServiceInstance = getBuildPanelService();