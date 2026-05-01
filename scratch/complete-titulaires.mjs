import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function populateRemainingTitulaires() {
  console.log('🔍 Recherche des titulaires sans observations...');

  // 1. Get all teachers
  const { data: allTeachers, error: err1 } = await supabase.from('enseignants').select('ens_id, user_id, statut');
  if (err1) { console.error('❌ Erreur fetch enseignants:', err1); return; }
  
  // 2. Get teachers who already have visits
  const { data: existingVisits, error: err2 } = await supabase.from('visits').select('ens_id');
  if (err2) { console.error('❌ Erreur fetch visits:', err2); return; }
  
  if (!allTeachers) { console.error('❌ Aucun enseignant trouvé.'); return; }
  const visitedIds = new Set((existingVisits || []).map(v => v.ens_id));

  // 3. Filter for Titulaires without visits
  const targetTeachers = allTeachers.filter(t => 
    (t.statut === 'Titulaire' || t.statut === 'Titulaire (en attente)') && 
    !visitedIds.has(t.ens_id)
  );

  if (targetTeachers.length === 0) {
    console.log('✅ Tous les titulaires ont déjà des observations. Rien à faire.');
    return;
  }

  console.log(`🚀 Injection de ${targetTeachers.length} visites pour les titulaires restants...`);

  const userId = targetTeachers[0].user_id;

  const visits = targetTeachers.map(t => {
    // Generate a random but realistic integer profile
    const seed = Math.random();
    let scores = {};
    
    if (seed > 0.8) {
      // High performer
      scores = { RC1: 5, RC2: 5, RC3: 4, RC4: 5, RC5: 4, RC6: 5, RC7: 4, RC8: 4, RC9: 4, RC10: 5, RC11: 4, RC12: 5 };
    } else if (seed > 0.4) {
      // Average performer
      scores = { RC1: 4, RC2: 3, RC3: 3, RC4: 4, RC5: 3, RC6: 3, RC7: 3, RC8: 3, RC9: 2, RC10: 3, RC11: 3, RC12: 3 };
    } else {
      // Needs support (Low RC8-RC12)
      scores = { RC1: 3, RC2: 3, RC3: 2, RC4: 3, RC5: 2, RC6: 2, RC7: 2, RC8: 1, RC9: 1, RC10: 2, RC11: 2, RC12: 2 };
    }

    return {
      visit_id: crypto.randomUUID(),
      user_id: userId,
      ens_id: t.ens_id,
      visit_date: new Date(Date.now() - (30 + Math.random() * 60) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      observer: 'Génération Automatique',
      scores: scores,
      visit_score: Object.values(scores).reduce((a, b) => a + b, 0) / 12,
      note_20: Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / 12) * 4),
      visit_type: 'official',
      appreciation: 'Complétion automatique du portfolio pédagogique (Titulaire).'
    };
  });

  // Split into chunks if too many (Supabase might have limits)
  const chunkSize = 50;
  for (let i = 0; i < visits.length; i += chunkSize) {
    const chunk = visits.slice(i, i + chunkSize);
    const { error } = await supabase.from('visits').insert(chunk);
    if (error) {
      console.error(`❌ Erreur chunk ${i} :`, error);
    } else {
      console.log(`✅ Chunk ${i/chunkSize + 1} injecté.`);
    }
  }

  console.log('✨ Portfolio Titulaires complété avec succès.');
}

populateRemainingTitulaires();
