/* ===================== Supabase connection ===================== */
// Project Settings -> API -> Project URL / anon public key
const SUPABASE_URL = "https://eqajyybmnarzajnhgozq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxYWp5eWJtbmFyemFqbmhnb3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMzE4NjUsImV4cCI6MjA5NjcwNzg2NX0.jRTRmu2S-zwUZnjvF9RyE46Lj9StiCrkXEZHHxnBMCg";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
