/* ===================== Supabase connection ===================== */
// Get these values from your Supabase project:
// Project Settings -> API -> Project URL / Project API keys -> anon public
const SUPABASE_URL = "https://eqajyybmnarzajnhgozq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JVUt7JjeM9I1n8pF1x_9fw_5FrsMbFx";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
