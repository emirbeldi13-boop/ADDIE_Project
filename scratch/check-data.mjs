import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: teachers } = await supabase.from('enseignants').select('*');
  const { data: visits } = await supabase.from('visits').select('ens_id');
  const { data: autopos } = await supabase.from('autopos_manual').select('ens_id');

  const total = teachers.length;
  const withVisits = new Set(visits.map(v => v.ens_id)).size;
  const withAutopos = new Set(autopos.map(a => a.ens_id)).size;

  console.log(`Total Teachers: ${total}`);
  console.log(`Teachers with Visits (Obs): ${withVisits} (${Math.round(withVisits/total*100)}%)`);
  console.log(`Teachers with Autopos: ${withAutopos} (${Math.round(withAutopos/total*100)}%)`);
}

check();
