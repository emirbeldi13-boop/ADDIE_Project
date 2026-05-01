import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  console.log("Fetching teachers...");
  const { data: teachers, error: tErr } = await supabase.from('enseignants').select('ens_id').limit(5);
  
  if (tErr) {
    console.error("Error fetching teachers:", tErr);
    return;
  }

  if (!teachers || teachers.length < 3) {
    console.error("Not enough teachers found in DB.");
    return;
  }

  const ids = teachers.map(t => t.ens_id);
  console.log("Found IDs:", ids);

  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  const userId = profiles?.[0]?.id || '00000000-0000-0000-0000-000000000000';

  const fakeVisits = [
    {
      user_id: userId,
      visit_id: "SIM_VIS_" + Date.now() + "_1",
      ens_id: ids[0],
      visit_date: "2026-04-15",
      visit_type: "official",
      observer: "M. Beldi (Simulated)",
      note_20: 12.5,
      scores: { RC8: 1.5, RC9: 1.0, RC12: 2.0 },
      visit_score: 1.5,
      recorded_at: new Date().toISOString()
    },
    {
      user_id: userId,
      visit_id: "SIM_VIS_" + Date.now() + "_2",
      ens_id: ids[1],
      visit_date: "2026-04-16",
      visit_type: "official",
      observer: "M. Beldi (Simulated)",
      note_20: 11.0,
      scores: { RC8: 2.5, RC9: 2.0, RC11: 1.5 },
      visit_score: 2.0,
      recorded_at: new Date().toISOString()
    },
    {
      user_id: userId,
      visit_id: "SIM_VIS_" + Date.now() + "_3",
      ens_id: ids[2],
      visit_date: "2026-04-17",
      visit_type: "official",
      observer: "M. Beldi (Simulated)",
      note_20: 14.0,
      scores: { RC10: 1.5, RC12: 2.0, RC11: 2.5 },
      visit_score: 2.0,
      recorded_at: new Date().toISOString()
    }
  ];

  console.log("Inserting fake visits into Supabase...");
  const { error: vErr } = await supabase.from('visits').upsert(fakeVisits);

  if (vErr) {
    console.error("Error inserting visits:", vErr);
  } else {
    console.log("Successfully integrated 3 fake visits into your real database.");
  }
}

run();
