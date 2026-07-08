// ============================================================
// lib/supabaseClient.js — Клиент Supabase (anon key, безопасен для фронтенда)
// ============================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bniqnepyvqamsxcujsji.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuaXFuZXB5dnFhbXN4Y3Vqc2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MjQwMzAsImV4cCI6MjA5OTAwMDAzMH0.wJBat-CBpJx70CYZ56y_DQkos5BZSfUniaXkX6B0TFE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);