const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

fetch(`${URL}/auth/v1/admin/users?per_page=1000`, {
  headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
})
  .then(r => r.json())
  .then(d => {
    const users = d.users ?? d;
    console.log('Total auth.users:', users.length);
    users.forEach(u => console.log(' -', u.email));
  });
