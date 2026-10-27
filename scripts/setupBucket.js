import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://afvnkmsyijynajexjoqa.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdm5rbXN5aWp5bmFqZXhqb3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjY2MDE1OSwiZXhwIjoyMTA4MjM2MTU5fQ.38oE7AUBtwYDFWUC1N9QQ3IZJMB-ijOeg2D7S4JjQ4Q';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBucket() {
  console.log('Creating pattern-blueprints storage bucket...');
  const { data, error } = await supabase.storage.createBucket('pattern-blueprints', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
  });

  if (error) {
    console.error('Bucket creation error:', error);
  } else {
    console.log('Bucket created successfully:', data);
  }

  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('Current buckets:', buckets.map(b => b.name));
}

setupBucket().catch(console.error);
