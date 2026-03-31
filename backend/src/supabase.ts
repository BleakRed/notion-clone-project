import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET || 'notion-clone-files';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Supabase configuration is missing. File uploads will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
