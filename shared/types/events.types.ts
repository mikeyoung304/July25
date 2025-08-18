/**
 * Event Types for WebSocket and System Events
 */

import { Order, OrderStatus } from './order.types';
import { Table } from './table.types';

// Order Events
export interface OrderCreatedEvent {
  type: 'order:created';
  order: Order;
  timestamp: string;
}

export interface OrderUpdatedEvent {
  type: 'order:updated';
  order: Order;
  timestamp: string;
}

export interface OrderStatusChangedEvent {
  type: 'order:status_changed';
  orderId: string;
  status: OrderStatus;
  previousStatus: OrderStatus;
  timestamp: string;
}

// Table Events
export interface TableStatusChangedEvent {
  type: 'table:status_changed';
  table: Table;
  previousStatus: Table['status'];
  timestamp: string;
}

// Voice Events
export interface VoiceStreamData {
  type: 'voice:stream';
  audio: ArrayBuffer;
  sampleRate: number;
  channels: number;
}

export interface VoiceTranscriptionResult {
  type: 'voice:transcription';
  transcript: string;
  isFinal: boolean;
  confidence?: number;
  language?: string;
}

// API Error
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}