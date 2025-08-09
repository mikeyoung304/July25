export interface Restaurant {
  id: string;
  name: string;
  logo_url: string | null;
  timezone: string;
  currency: string;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}
