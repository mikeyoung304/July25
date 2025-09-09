export interface CheckItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: Array<{
    name: string;
    price?: number;
  }>;
  specialInstructions?: string;
  seat?: number;
}

export interface CheckSummary {
  id: string;
  tableId: string;
  tableName: string;
  orderId: string;
  orderNumber: string;
  items: CheckItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  status: 'open' | 'presented' | 'processing' | 'paid' | 'cancelled';
  serverName?: string;
  presentedAt?: string;
  paidAt?: string;
}

export interface PaymentMethod {
  type: 'SQUARE_TERMINAL' | 'WEB_SDK' | 'MANUAL_ENTRY' | 'CASH' | 'DIGITAL_WALLET' | 'SPLIT';
  token?: string;
  deviceId?: string;
  tenderedAmount?: number;
}

export interface PaymentResult {
  id: string;
  status: 'completed' | 'failed' | 'cancelled';
  paymentId?: string;
  amount: {
    subtotal: number;
    tax: number;
    tip: number;
    total: number;
  };
  method: PaymentMethod;
  receiptUrl?: string;
  changeAmount?: number;
  timestamp: string;
}

export interface SplitSession {
  id: string;
  tableId: string;
  checkId: string;
  totalAmount: number;
  splits: SplitPayment[];
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

export interface SplitPayment {
  id: string;
  checkId: string;
  amount: number;
  tipAmount: number;
  total: number;
  payerId?: string;
  payerName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod?: PaymentMethod;
  paymentId?: string;
  items?: CheckItem[];
  createdAt: string;
  paidAt?: string;
}

export interface TipOption {
  percentage: number;
  amount: number;
  label: string;
  isRecommended?: boolean;
}