import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hwfnkfextgkpjbmikguu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3Zm5rZmV4dGdrcGpibWlrZ3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyOTY0NjcsImV4cCI6MjA2MDg3MjQ2N30.JVNOnsYghpEEDIJ-TE864MJuovK-R65jzWM0Du4M6rI';

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
} 