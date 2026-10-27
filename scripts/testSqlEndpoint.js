const projectRef = 'afvnkmsyijynajexjoqa';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdm5rbXN5aWp5bmFqZXhqb3FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjY2MDE1OSwiZXhwIjoyMTA4MjM2MTU5fQ.38oE7AUBtwYDFWUC1N9QQ3IZJMB-ijOeg2D7S4JjQ4Q';

async function testSqlEndpoint() {
  const testSql = 'SELECT 1 as num;';

  // Test 1: Management API database query
  try {
    const res1 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({ query: testSql })
    });
    console.log('Test 1 (Management API) status:', res1.status, await res1.text().catch(() => ''));
  } catch (e) {
    console.log('Test 1 error:', e.message);
  }

  // Test 2: Project pg/query endpoint
  try {
    const res2 = await fetch(`https://${projectRef}.supabase.co/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      },
      body: JSON.stringify({ query: testSql })
    });
    console.log('Test 2 (pg/query) status:', res2.status, await res2.text().catch(() => ''));
  } catch (e) {
    console.log('Test 2 error:', e.message);
  }

  // Test 3: SQL endpoint on project
  try {
    const res3 = await fetch(`https://${projectRef}.supabase.co/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      },
      body: JSON.stringify({ query: testSql })
    });
    console.log('Test 3 (/sql) status:', res3.status, await res3.text().catch(() => ''));
  } catch (e) {
    console.log('Test 3 error:', e.message);
  }
}

testSqlEndpoint();
