require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

supabase.from('orders').select('*').limit(1).then(({ data, error }) => {
  if (error) console.error(error);
  else console.log(Object.keys(data[0] || { empty: true }));
  process.exit(0);
});
