-- Payment Audit Logs Table
-- Purpose: Complete audit trail for all payment transactions for compliance and reconciliation
-- Author: Restaurant OS Team
-- Date: 2025-02-01

-- Create payment_audit_logs table
CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID NOT NULL,
  
  -- Payment details
  amount INTEGER NOT NULL, -- Amount in cents
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'cash', 'other')),
  payment_id TEXT, -- Square payment ID
  status TEXT NOT NULL CHECK (status IN ('initiated', 'processing', 'success', 'failed', 'refunded')),
  
  -- Error tracking
  error_code TEXT,
  error_detail TEXT,
  
  -- Request tracking
  ip_address INET,
  user_agent TEXT,
  idempotency_key TEXT UNIQUE, -- Prevent duplicate charges
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_payment_audit_logs_order_id ON payment_audit_logs(order_id);
CREATE INDEX idx_payment_audit_logs_user_id ON payment_audit_logs(user_id);
CREATE INDEX idx_payment_audit_logs_restaurant_id ON payment_audit_logs(restaurant_id);
CREATE INDEX idx_payment_audit_logs_payment_id ON payment_audit_logs(payment_id);
CREATE INDEX idx_payment_audit_logs_status ON payment_audit_logs(status);
CREATE INDEX idx_payment_audit_logs_created_at ON payment_audit_logs(created_at);
CREATE INDEX idx_payment_audit_logs_idempotency_key ON payment_audit_logs(idempotency_key);

-- Composite index for common queries
CREATE INDEX idx_payment_audit_logs_restaurant_created ON payment_audit_logs(restaurant_id, created_at DESC);
CREATE INDEX idx_payment_audit_logs_restaurant_status ON payment_audit_logs(restaurant_id, status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_audit_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_audit_logs_updated_at
  BEFORE UPDATE ON payment_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_audit_logs_updated_at();

-- Row Level Security (RLS)
ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view payment logs for their restaurant
CREATE POLICY payment_audit_logs_restaurant_policy ON payment_audit_logs
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM user_restaurants 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Policy: Only system can insert (server-side only)
CREATE POLICY payment_audit_logs_insert_policy ON payment_audit_logs
  FOR INSERT
  WITH CHECK (false); -- Only service role can insert

-- Policy: No updates allowed (immutable audit log)
CREATE POLICY payment_audit_logs_no_update ON payment_audit_logs
  FOR UPDATE
  USING (false);

-- Policy: No deletes allowed (immutable audit log)
CREATE POLICY payment_audit_logs_no_delete ON payment_audit_logs
  FOR DELETE
  USING (false);

-- Grant permissions
GRANT SELECT ON payment_audit_logs TO authenticated;
GRANT INSERT ON payment_audit_logs TO service_role;

-- Add comment for documentation
COMMENT ON TABLE payment_audit_logs IS 'Immutable audit log for all payment transactions. Required for PCI compliance and financial reconciliation. Retention: 7 years.';
COMMENT ON COLUMN payment_audit_logs.amount IS 'Payment amount in cents (e.g., $10.00 = 1000)';
COMMENT ON COLUMN payment_audit_logs.idempotency_key IS 'Unique key to prevent duplicate charges on retries';
COMMENT ON COLUMN payment_audit_logs.metadata IS 'Additional context like refund reasons, user roles, etc.';

-- Create a view for easier reporting
CREATE OR REPLACE VIEW payment_audit_summary AS
SELECT 
  pal.id,
  pal.order_id,
  o.order_number,
  pal.user_id,
  u.email AS user_email,
  pal.restaurant_id,
  r.name AS restaurant_name,
  pal.amount / 100.0 AS amount_dollars,
  pal.payment_method,
  pal.payment_id,
  pal.status,
  pal.error_code,
  pal.error_detail,
  pal.metadata,
  pal.created_at
FROM payment_audit_logs pal
LEFT JOIN orders o ON pal.order_id = o.id
LEFT JOIN auth.users u ON pal.user_id = u.id
LEFT JOIN restaurants r ON pal.restaurant_id = r.id;

-- Grant access to the view
GRANT SELECT ON payment_audit_summary TO authenticated;

-- Add indexes on auth_logs table if not exists (for cross-referencing)
CREATE INDEX IF NOT EXISTS idx_auth_logs_access_denied ON auth_logs(event_type) 
  WHERE event_type = 'access_denied';
CREATE INDEX IF NOT EXISTS idx_auth_logs_payment_events ON auth_logs((metadata->>'path')) 
  WHERE metadata->>'path' LIKE '/api/v1/payments%';

-- Insert sample metadata to document expected structure
COMMENT ON TABLE payment_audit_logs IS E'
Expected metadata structure:
{
  "orderNumber": "string",
  "userRole": "string",
  "refundId": "string (for refunds)",
  "refundReason": "string (for refunds)",
  "originalPaymentId": "string (for refunds)",
  "errorCategory": "string (for failures)"
}';

-- Create function to get payment stats for a restaurant
CREATE OR REPLACE FUNCTION get_payment_stats(
  p_restaurant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_payments BIGINT,
  successful_payments BIGINT,
  failed_payments BIGINT,
  refunded_payments BIGINT,
  total_revenue DECIMAL(10,2),
  success_rate DECIMAL(5,2),
  average_payment DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_payments,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT AS successful_payments,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_payments,
    COUNT(*) FILTER (WHERE status = 'refunded')::BIGINT AS refunded_payments,
    COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) / 100.0 AS total_revenue,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE status = 'success')::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0
    END AS success_rate,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'success') > 0
      THEN (SUM(amount) FILTER (WHERE status = 'success')::DECIMAL / COUNT(*) FILTER (WHERE status = 'success') / 100.0)
      ELSE 0
    END AS average_payment
  FROM payment_audit_logs
  WHERE restaurant_id = p_restaurant_id
    AND created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_payment_stats TO authenticated;