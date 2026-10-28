// Granite Systems landing pages — settings.
// Uses the same Supabase project as Second Cut Stone, so staff logins, admin approvals and
// the Resend email setup are shared. The anon key is meant to be public: the database rules
// in supabase/*.sql decide what the public can read and write.
// Region and material lists live in js/regions.js (generated from data/*.json by tools/build.mjs).
export const SUPABASE_URL = 'https://bzgnlzsdyjwjfpsexquz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6Z25senNkeWp3amZwc2V4cXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk3ODEsImV4cCI6MjEwODY2NTc4MX0.UunT_CdsnPyMeRzuIoom6n1R2mBzNnlY5Bwh9v_0NjA';

export const SETTINGS = {
  // Top a region up with jobs from elsewhere in Scotland when it has fewer than this.
  minJobsPerRegion: 3,
  // Fallback if the database can't be reached when someone sends the form.
  email: 'sales@granitesystems.co.uk',
  phone: '01592 654386',
};
