/* ===================== Supabase connection ===================== */
// Get these values from your Supabase project:
// Project Settings -> API -> Project URL / Project API keys -> anon public
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
