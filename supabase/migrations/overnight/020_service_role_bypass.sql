-- Service role bypass policies for administrative operations
-- These allow the service role to bypass RLS for system operations

-- Helper function to check if current user is service role
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'role' = 'service_role';
$$;

-- Add service role bypass for all tenant-scoped tables
CREATE POLICY service_role_bypass_tables ON public.tables
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_orders ON public.orders
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_menu_items ON public.menu_items
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_menu_categories ON public.menu_categories
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_restaurants ON public.restaurants
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_order_status_history ON public.order_status_history
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_voice_order_logs ON public.voice_order_logs
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_station_tokens ON public.station_tokens
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_user_pins ON public.user_pins
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_user_restaurants ON public.user_restaurants
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_user_profiles ON public.user_profiles
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_api_scopes ON public.api_scopes
FOR ALL
USING (public.is_service_role());

CREATE POLICY service_role_bypass_role_scopes ON public.role_scopes
FOR ALL
USING (public.is_service_role());