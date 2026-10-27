import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://afvnkmsyijynajexjoqa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdm5rbXN5aWp5bmFqZXhqb3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjY2MDE1OSwiZXhwIjoyMTA4MjM2MTU5fQ.38oE7AUBtwYDFWUC1N9QQ3IZJMB-ijOeg2D7S4JjQ4Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log('Testing Supabase connection...');
  const { data: buckets, error: bError } = await supabase.storage.listBuckets();
  if (bError) {
    console.error('Storage bucket check error:', bError);
  } else {
    console.log('Existing storage buckets:', buckets);
  }

  // Check if projects table exists
  const { data: projData, error: projError } = await supabase.from('projects').select('id').limit(1);
  if (projError) {
    console.log('Projects table query status:', projError.message);
  } else {
    console.log('Projects table exists! Rows:', projData);
  }
}

check().catch(console.error);
