import { supabaseAdmin } from '@/integrations/supabase/client.server';

export function db() {
  return supabaseAdmin;
}
