import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// --- DEBUGGING LOGS ---
console.log('--- Supabase Auth ---');
console.log('URL Loaded:', supabaseUrl);
// For security, we only log the first 10 characters and the length of the key.
console.log('Service Key Loaded:', `${supabaseKey?.slice(0, 10)}... (Length: ${supabaseKey?.length})`);
console.log('---------------------');
// --- END DEBUGGING LOGS ---

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Service Key must be defined in the .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);