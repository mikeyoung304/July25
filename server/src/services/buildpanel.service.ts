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
  private menuContext: any = null;

  constructor() {
    this.config = {
      baseUrl: process.env.BUILDPANEL_BASE_URL || process.env.BUILDPANEL_URL || 'http://localhost:3003',
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
   * Set menu context to be included with all requests
   */
  setMenuContext(menuData: any): void {
    this.menuContext = menuData;
    buildPanelLogger.info('Menu context updated', {
      itemCount: menuData?.menu?.length || 0,
      categoryCount: menuData?.categories?.length || 0
    });
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

      const chatEndpoint = process.env.BUILDPANEL_CHAT_ENDPOINT || '/api/chatbot';
      
      const response = await this.client.post(chatEndpoint, {
        message,
        context: {
          restaurantId,
          userId,
          timestamp: new Date().toISOString(),
          menu: this.menuContext // Include menu data for context
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
      throw new Error(`BuildPanel chat failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process voice audio through BuildPanel
   * Sends audio to BuildPanel and returns MP3 audio response
   * 
   * @param audioBuffer - Audio file buffer (webm, mp4, wav, etc.)
   * @param mimeType - MIME type of the audio file
   * @param restaurantId - Restaurant context
   * @param userId - Optional user ID
   * @returns MP3 audio buffer for playback
   */
  async processVoice(
    audioBuffer: Buffer,
    mimeType: string,
    restaurantId: string,
    userId?: string
  ): Promise<Buffer> {
    try {
      buildPanelLogger.info('Processing voice audio', { 
        restaurantId, 
        bufferSize: audioBuffer.length,
        mimeType 
      });

      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'recording.webm',
        contentType: mimeType || 'audio/webm'
      });

      const voiceEndpoint = process.env.BUILDPANEL_VOICE_ENDPOINT || '/api/voice-chat';
      
      const response = await this.client.post(voiceEndpoint, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Restaurant-ID': restaurantId,
          'X-User-ID': userId || 'anonymous'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        responseType: 'arraybuffer' // Important: expect binary response
      });

      buildPanelLogger.info('Voice response received', { 
        restaurantId,
        responseSize: response.data.byteLength,
        contentType: response.headers['content-type']
      });

      // Return the MP3 audio buffer directly
      return Buffer.from(response.data);
    } catch (error) {
      buildPanelLogger.error('Voice processing failed', { error, restaurantId });
      throw new Error(`BuildPanel voice processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Process voice audio through BuildPanel with metadata response
   * Use this method when you need transcription text along with audio
   * Note: This is not the standard BuildPanel voice endpoint behavior
   */
  async processVoiceWithMetadata(
    audioBuffer: Buffer,
    mimeType: string,
    restaurantId: string,
    userId?: string
  ): Promise<VoiceResponse> {
    try {
      buildPanelLogger.info('Processing voice audio with metadata', { 
        restaurantId, 
        bufferSize: audioBuffer.length,
        mimeType 
      });

      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'recording.webm',
        contentType: mimeType || 'audio/webm'
      });

      // Add context as form fields for metadata endpoints
      formData.append('restaurantId', restaurantId);
      if (userId) formData.append('userId', userId);
      // Include menu context as JSON string
      if (this.menuContext) {
        formData.append('menuContext', JSON.stringify(this.menuContext));
      }

      // Use alternative endpoint if available for metadata response
      const voiceEndpoint = process.env.BUILDPANEL_VOICE_METADATA_ENDPOINT || '/api/voice-chat-metadata';
      
      const response = await this.client.post(voiceEndpoint, formData, {
        headers: {
          ...formData.getHeaders(),
          'X-Restaurant-ID': restaurantId,
          'X-User-ID': userId || 'anonymous'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      buildPanelLogger.info('Voice metadata response received', { 
        restaurantId,
        hasTranscription: !!response.data.transcription,
        hasAudio: !!response.data.audioUrl || !!response.data.audioBuffer,
        hasOrderData: !!response.data.orderData 
      });

      return response.data;
    } catch (error) {
      buildPanelLogger.error('Voice processing with metadata failed', { error, restaurantId });
      throw new Error(`BuildPanel voice processing failed: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new Error(`BuildPanel menu fetch failed: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new Error(`BuildPanel order creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Health check for BuildPanel service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error: any) {
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: this.config.baseUrl
      };
      
      if (error.response?.status === 502) {
        buildPanelLogger.warn('BuildPanel service is down (502 Bad Gateway)', errorDetails);
      } else {
        buildPanelLogger.warn('BuildPanel health check failed', errorDetails);
      }
      
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
   * Returns MP3 audio buffer for direct playback
   */
  async processAuthenticatedVoice(
    req: AuthenticatedRequest,
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<Buffer> {
    const restaurantId = req.restaurantId || 'default';
    const userId = req.user?.id;
    
    return this.processVoice(audioBuffer, mimeType, restaurantId, userId);
  }

  /**
   * Process voice with metadata using restaurant context from AuthenticatedRequest
   * Returns transcription and response data along with audio
   */
  async processAuthenticatedVoiceWithMetadata(
    req: AuthenticatedRequest,
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<VoiceResponse> {
    const restaurantId = req.restaurantId || 'default';
    const userId = req.user?.id;
    
    return this.processVoiceWithMetadata(audioBuffer, mimeType, restaurantId, userId);
  }

  /**
   * Cleanup connections for graceful shutdown
   */
  cleanup(): void {
    // Cancel any pending requests
    buildPanelLogger.info('Cleaning up BuildPanel connections');
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