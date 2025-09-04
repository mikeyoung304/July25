/**
 * WebSocket Connection Manager
 * Ensures single WebSocket connection across the app
 * Manages connection lifecycle and prevents duplicate connections
 */

import { webSocketService } from './index';
import { logger } from '@/services/logger';

class WebSocketConnectionManager {
  private isConnected = false;
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;
  private connectionCount = 0;

  /**
   * Request a WebSocket connection
   * Multiple calls will share the same connection
   */
  async connect(): Promise<void> {
    this.connectionCount++;
    logger.info(`WebSocket connection requested (count: ${this.connectionCount})`);

    // If already connected, return immediately
    if (this.isConnected) {
      logger.info('WebSocket already connected, reusing existing connection');
      return;
    }

    // If currently connecting, wait for the existing connection attempt
    if (this.isConnecting && this.connectionPromise) {
      logger.info('WebSocket connection in progress, waiting...');
      return this.connectionPromise;
    }

    // Start new connection
    this.isConnecting = true;
    this.connectionPromise = this.performConnection();
    
    try {
      await this.connectionPromise;
      this.isConnected = true;
      logger.info('WebSocket connection established');
    } catch (error) {
      logger.error('WebSocket connection failed:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  private async performConnection(): Promise<void> {
    try {
      await webSocketService.connect();
      
      // Listen for disconnection to update state
      webSocketService.once('disconnected', () => {
        this.isConnected = false;
        this.connectionPromise = null;
        logger.info('WebSocket disconnected, state updated');
      });
    } catch (error) {
      this.isConnected = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket
   * Only disconnects when all consumers have released
   */
  disconnect(): void {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
    logger.info(`WebSocket disconnect requested (count: ${this.connectionCount})`);

    // Only disconnect when no more consumers
    if (this.connectionCount === 0) {
      logger.info('No more WebSocket consumers, disconnecting...');
      webSocketService.disconnect();
      this.isConnected = false;
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  /**
   * Force disconnect regardless of consumer count
   */
  forceDisconnect(): void {
    logger.info('Force disconnecting WebSocket');
    this.connectionCount = 0;
    webSocketService.disconnect();
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  /**
   * Get current connection status
   */
  getStatus(): { isConnected: boolean; isConnecting: boolean; connectionCount: number } {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      connectionCount: this.connectionCount
    };
  }
}

// Export singleton instance
export const connectionManager = new WebSocketConnectionManager();