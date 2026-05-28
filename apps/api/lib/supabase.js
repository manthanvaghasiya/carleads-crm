// ============================================================
// Supabase Admin Client
// Falls back to mock mode if credentials are not configured
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
let isMockMode = true;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    isMockMode = false;
    console.log('✅ Supabase client initialized');
  } catch (err) {
    console.warn('⚠️  Failed to initialize Supabase client:', err.message);
    console.warn('   Running in MOCK mode — all data is in-memory');
  }
} else {
  console.log('ℹ️  Supabase credentials not configured — running in MOCK mode');
}

module.exports = { supabase, isMockMode };
