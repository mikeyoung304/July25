-- Migration: Create payment tracking tables
-- Description: Adds tables for table checks, payment splits, and split sessions
-- Date: 2025-01-30

-- Create table_checks table for managing payment flow
CREATE TABLE IF NOT EXISTS table_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'presented', 'processing', 'paid', 'cancelled')),
  presented_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  tip DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_id, order_id)
);

-- Create payment_splits table for split payment tracking
CREATE TABLE IF NOT EXISTS payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID NOT NULL REFERENCES table_checks(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  items JSONB,
  payer_id UUID REFERENCES auth.users(id),
  payer_name VARCHAR(255),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create split_sessions table for managing split payment workflows
CREATE TABLE IF NOT EXISTS split_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  check_id UUID NOT NULL REFERENCES table_checks(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  num_splits INTEGER NOT NULL CHECK (num_splits >= 2 AND num_splits <= 10),
  strategy VARCHAR(20) NOT NULL CHECK (strategy IN ('EVEN', 'BY_SEAT', 'BY_ITEM', 'CUSTOM')),
  splits JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_audit_logs table for compliance tracking
CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  amount INTEGER NOT NULL, -- Amount in cents
  payment_method VARCHAR(50),
  payment_id TEXT,
  status VARCHAR(50) NOT NULL,
  error_code VARCHAR(100),
  error_detail TEXT,
  ip_address INET,
  user_agent TEXT,
  idempotency_key TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_table_checks_table_id ON table_checks(table_id);
CREATE INDEX idx_table_checks_order_id ON table_checks(order_id);
CREATE INDEX idx_table_checks_status ON table_checks(status);
CREATE INDEX idx_payment_splits_check_id ON payment_splits(check_id);
CREATE INDEX idx_payment_splits_status ON payment_splits(status);
CREATE INDEX idx_split_sessions_table_id ON split_sessions(table_id);
CREATE INDEX idx_split_sessions_status ON split_sessions(status);
CREATE INDEX idx_payment_audit_logs_order_id ON payment_audit_logs(order_id);
CREATE INDEX idx_payment_audit_logs_payment_id ON payment_audit_logs(payment_id);
CREATE INDEX idx_payment_audit_logs_created_at ON payment_audit_logs(created_at);

-- Add RLS policies
ALTER TABLE table_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for table_checks
CREATE POLICY "Service role can manage all table checks" ON table_checks
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Authenticated users can view table checks" ON table_checks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Servers can manage table checks" ON table_checks
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM tables t
      WHERE t.id = table_checks.table_id
      AND t.restaurant_id IN (
        SELECT restaurant_id FROM user_restaurants
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for payment_splits
CREATE POLICY "Service role can manage all payment splits" ON payment_splits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Authenticated users can view payment splits" ON payment_splits
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for split_sessions
CREATE POLICY "Service role can manage all split sessions" ON split_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Authenticated users can view split sessions" ON split_sessions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for payment_audit_logs
CREATE POLICY "Service role can manage audit logs" ON payment_audit_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Managers can view audit logs" ON payment_audit_logs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    restaurant_id IN (
      SELECT restaurant_id FROM user_restaurants
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager', 'admin')
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_table_checks_updated_at BEFORE UPDATE ON table_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_split_sessions_updated_at BEFORE UPDATE ON split_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add payment_processing status to tables enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'table_status' AND e.enumlabel = 'payment_processing'
  ) THEN
    ALTER TYPE table_status ADD VALUE 'payment_processing';
  END IF;
END $$;