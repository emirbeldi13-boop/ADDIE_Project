import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const TEACHER_IDS = [
  'ENS001', 'ENS002', 'ENS010', 'ENS015', 'ENS020',
  'ENS025', 'ENS030', 'ENS035', 'ENS040', 'ENS045', 'ENS048',
  'ENS050', 'ENS052', 'ENS055', 'ENS059'
];

async function cleanAndPopulate() {
  console.log('🧹 Nettoyage des anciennes simulations...');
  const { error: delError } = await supabase
    .from('visits')
    .delete()
    .eq('observer', 'Inspecteur Simulation');

  if (delError) console.warn('Note: Erreur au nettoyage (peut-être déjà vide)', delError);

  console.log('🚀 Injection de 15 visites avec scores ENTIERS (1-5)...');

  const { data: teachers } = await supabase.from('enseignants').select('user_id').limit(1);
  const userId = teachers[0].user_id;

  const visits = TEACHER_IDS.map(id => {
    const profileType = Math.random();
    let scores = {};
    
    // Using Math.round to ensure integers 1-5
    if (profileType > 0.7) {
      scores = { RC1: 5, RC2: 4, RC3: 4, RC4: 3, RC5: 4, RC6: 3, RC7: 3, RC8: 2, RC9: 2, RC10: 4, RC11: 3, RC12: 4 };
    } else if (profileType > 0.3) {
      scores = { RC1: 4, RC2: 3, RC3: 2, RC4: 4, RC5: 1, RC6: 2, RC7: 2, RC8: 1, RC9: 1, RC10: 3, RC11: 2, RC12: 2 };
    } else {
      scores = { RC1: 3, RC2: 1, RC3: 1, RC4: 2, RC5: 2, RC6: 1, RC7: 1, RC8: 1, RC9: 1, RC10: 2, RC11: 2, RC12: 1 };
    }

    return {
      visit_id: crypto.randomUUID(),
      user_id: userId,
      ens_id: id,
      visit_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      observer: 'Inspecteur Simulation',
      scores: scores,
      visit_score: Object.values(scores).reduce((a, b) => a + b, 0) / 12,
      note_20: Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / 12) * 4), // Note also rounded
      visit_type: 'official',
      appreciation: 'Validation Quorum RCET (Scores Entiers 1-5).'
    };
  });

  const { data, error } = await supabase.from('visits').insert(visits).select();

  if (error) {
    console.error('❌ Erreur injection :', error);
  } else {
    console.log(`✅ Succès ! ${data.length} visites (scores entiers) injectées.`);
  }
}

cleanAndPopulate();
