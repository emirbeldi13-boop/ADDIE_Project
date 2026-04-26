/**
 * Data access layer over Supabase tables.
 * Each function maps Supabase rows to the legacy app shape and back.
 *
 * RLS handles tenant isolation — every query implicitly scopes to auth.uid().
 * For super_admin we still pass user_id explicitly on writes (RLS allows it).
 */

import { supabase } from '../supabase';
import {
  enseignantFromDB, enseignantToDB,
  sessionFromDB, sessionToDB,
  visitFromDB, visitToDB,
  overrideFromDB, overrideToDB,
  availabilityFromDB, availabilityToDB,
  autoposFromDB,
  autoposManualFromDB, autoposManualEntryToDB,
  observationFromDB,
  satisfactionFromDB, acquisFromDB, transfertFromDB,
  besoinFromDB, besoinToDB,
  crefocsFromDB, crefocToDB,
  formationsFromDB, formationToDB,
  competencesFromDB, competenceToDB,
  referentialFromDB, referentialToDB,
  auditFromDB, auditToDB,
} from './mappers';

// ─── Generic helpers ────────────────────────────────────────────────────────
async function fetchAll(table, mapper, opts = {}) {
  const { order, limit } = opts;
  let q = supabase.from(table).select('*');
  if (order) q = q.order(order.column, { ascending: order.ascending ?? true });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw new Error(`[${table}] ${error.message}`);
  return mapper ? data.map(mapper) : data;
}

// ─── Enseignants ────────────────────────────────────────────────────────────
export async function fetchEnseignants() {
  return fetchAll('enseignants', enseignantFromDB);
}

export async function upsertEnseignant(record, userId) {
  const row = enseignantToDB(record, userId);
  const { error } = await supabase
    .from('enseignants')
    .upsert(row, { onConflict: 'user_id,ens_id' });
  if (error) throw new Error(`[enseignants upsert] ${error.message}`);
}

export async function deleteEnseignantDB(ensId) {
  const { error } = await supabase.from('enseignants').delete().eq('ens_id', ensId);
  if (error) throw new Error(`[enseignants delete] ${error.message}`);
}

// ─── Sessions ───────────────────────────────────────────────────────────────
export async function fetchSessions() {
  return fetchAll('sessions', sessionFromDB);
}

export async function upsertSession(record, userId) {
  const row = sessionToDB(record, userId);
  const { error } = await supabase
    .from('sessions')
    .upsert(row, { onConflict: 'user_id,session_id' });
  if (error) throw new Error(`[sessions upsert] ${error.message}`);
}

export async function deleteSessionDB(sessionId) {
  const { error } = await supabase.from('sessions').delete().eq('session_id', sessionId);
  if (error) throw new Error(`[sessions delete] ${error.message}`);
}

// ─── Visits ─────────────────────────────────────────────────────────────────
export async function fetchVisits() {
  // Returns { [ensId]: [visit, ...] } sorted by date desc per teacher.
  const { data, error } = await supabase
    .from('visits')
    .select('*')
    .order('recorded_at', { ascending: false });
  if (error) throw new Error(`[visits] ${error.message}`);
  const out = {};
  for (const r of data) {
    if (!out[r.ens_id]) out[r.ens_id] = [];
    out[r.ens_id].push(visitFromDB(r));
  }
  return out;
}

export async function upsertVisit(visit, userId, ensId) {
  const row = visitToDB(visit, userId, ensId);
  const { error } = await supabase
    .from('visits')
    .upsert(row, { onConflict: 'user_id,visit_id' });
  if (error) throw new Error(`[visits upsert] ${error.message}`);
}

// ─── Overrides ──────────────────────────────────────────────────────────────
export async function fetchOverrides() {
  const { data, error } = await supabase.from('overrides').select('*');
  if (error) throw new Error(`[overrides] ${error.message}`);
  const out = {};
  for (const r of data) out[r.ens_id] = overrideFromDB(r);
  return out;
}

export async function upsertOverride(override, userId, ensId) {
  const row = overrideToDB(override, userId, ensId);
  const { error } = await supabase
    .from('overrides')
    .upsert(row, { onConflict: 'user_id,ens_id' });
  if (error) throw new Error(`[overrides upsert] ${error.message}`);
}

export async function deleteOverrideDB(ensId) {
  const { error } = await supabase.from('overrides').delete().eq('ens_id', ensId);
  if (error) throw new Error(`[overrides delete] ${error.message}`);
}

// ─── Availability ───────────────────────────────────────────────────────────
export async function fetchAvailability() {
  const { data, error } = await supabase.from('availability').select('*');
  if (error) throw new Error(`[availability] ${error.message}`);
  return availabilityFromDB(data);
}

export async function upsertAvailability(entry, userId, ensId, formationId) {
  const row = availabilityToDB(entry, userId, ensId, formationId);
  const { error } = await supabase
    .from('availability')
    .upsert(row, { onConflict: 'user_id,ens_id,formation_id' });
  if (error) throw new Error(`[availability upsert] ${error.message}`);
}

export async function deleteAvailabilityDB(ensId, formationId) {
  const { error } = await supabase
    .from('availability')
    .delete()
    .match({ ens_id: ensId, formation_id: formationId });
  if (error) throw new Error(`[availability delete] ${error.message}`);
}

// ─── Autopositionnement (read-only seed) ───────────────────────────────────
export async function fetchAutopositionnement() {
  return fetchAll('autopositionnement', autoposFromDB);
}

// ─── Autopos Manual ─────────────────────────────────────────────────────────
export async function fetchAutoposManual() {
  const { data, error } = await supabase
    .from('autopos_manual')
    .select('*')
    .order('recorded_at', { ascending: false });
  if (error) throw new Error(`[autopos_manual] ${error.message}`);
  return autoposManualFromDB(data);
}

export async function insertAutoposManual(entry, userId, ensId) {
  const row = autoposManualEntryToDB(entry, userId, ensId);
  const { error } = await supabase.from('autopos_manual').insert(row);
  if (error) throw new Error(`[autopos_manual insert] ${error.message}`);
}

export async function deleteAutoposManualDB(entryId) {
  const { error } = await supabase.from('autopos_manual').delete().eq('entry_id', entryId);
  if (error) throw new Error(`[autopos_manual delete] ${error.message}`);
}

// ─── Observations ──────────────────────────────────────────────────────────
export async function fetchObservations() {
  return fetchAll('observations', observationFromDB);
}

// ─── Kirkpatrick ────────────────────────────────────────────────────────────
export async function fetchSatisfaction() {
  return fetchAll('satisfaction', satisfactionFromDB);
}

export async function fetchAcquis() {
  return fetchAll('acquis', acquisFromDB);
}

export async function fetchTransfert() {
  return fetchAll('transfert', transfertFromDB);
}

export async function fetchKirkpatrickEdits() {
  const { data, error } = await supabase.from('kirkpatrick_edits').select('*');
  if (error) throw new Error(`[kirkpatrick_edits] ${error.message}`);
  // Shape: { [`${ensId}_${formationId}_${level}`]: data }
  const out = {};
  for (const r of data) {
    out[`${r.ens_id}_${r.formation_id}_${r.level}`] = r.data ?? {};
  }
  return out;
}

export async function upsertKirkpatrickEdit(ensId, formationId, level, data, userId) {
  const { error } = await supabase
    .from('kirkpatrick_edits')
    .upsert(
      { user_id: userId, ens_id: ensId, formation_id: formationId, level, data },
      { onConflict: 'user_id,ens_id,formation_id,level' }
    );
  if (error) throw new Error(`[kirkpatrick_edits upsert] ${error.message}`);
}

export async function deleteKirkpatrickEdit(ensId, formationId, level) {
  const { error } = await supabase
    .from('kirkpatrick_edits')
    .delete()
    .match({ ens_id: ensId, formation_id: formationId, level });
  if (error) throw new Error(`[kirkpatrick_edits delete] ${error.message}`);
}

// ─── Triangulation ──────────────────────────────────────────────────────────
export async function fetchTriangulation() {
  return fetchAll('triangulation_besoins', besoinFromDB);
}

export async function upsertBesoin(besoin, userId) {
  const row = besoinToDB(besoin, userId);
  const { error } = await supabase
    .from('triangulation_besoins')
    .upsert(row, { onConflict: 'user_id,besoin_id' });
  if (error) throw new Error(`[triangulation upsert] ${error.message}`);
}

// ─── Crefocs ────────────────────────────────────────────────────────────────
export async function fetchCrefocs() {
  const { data, error } = await supabase.from('crefocs').select('*');
  if (error) throw new Error(`[crefocs] ${error.message}`);
  return crefocsFromDB(data);
}

export async function upsertCrefoc(code, c, userId) {
  const row = crefocToDB(code, c, userId);
  const { error } = await supabase
    .from('crefocs')
    .upsert(row, { onConflict: 'user_id,code' });
  if (error) throw new Error(`[crefocs upsert] ${error.message}`);
}

export async function deleteCrefocDB(code) {
  const { error } = await supabase.from('crefocs').delete().eq('code', code);
  if (error) throw new Error(`[crefocs delete] ${error.message}`);
}

// ─── Formations ─────────────────────────────────────────────────────────────
export async function fetchFormations() {
  const { data, error } = await supabase.from('formations').select('*');
  if (error) throw new Error(`[formations] ${error.message}`);
  return formationsFromDB(data);
}

export async function upsertFormation(formation, userId) {
  const row = formationToDB(formation, userId);
  const { error } = await supabase
    .from('formations')
    .upsert(row, { onConflict: 'user_id,formation_id' });
  if (error) throw new Error(`[formations upsert] ${error.message}`);
}

export async function deleteFormationDB(formationId) {
  const { error } = await supabase.from('formations').delete().eq('formation_id', formationId);
  if (error) throw new Error(`[formations delete] ${error.message}`);
}

// ─── Competences ────────────────────────────────────────────────────────────
export async function fetchCompetences() {
  const { data, error } = await supabase.from('competences').select('*');
  if (error) throw new Error(`[competences] ${error.message}`);
  return competencesFromDB(data);
}

export async function upsertCompetence(code, label, userId) {
  const row = competenceToDB(code, label, userId);
  const { error } = await supabase
    .from('competences')
    .upsert(row, { onConflict: 'user_id,code' });
  if (error) throw new Error(`[competences upsert] ${error.message}`);
}

export async function deleteCompetenceDB(code) {
  const { error } = await supabase.from('competences').delete().eq('code', code);
  if (error) throw new Error(`[competences delete] ${error.message}`);
}

// ─── Referential ────────────────────────────────────────────────────────────
export async function fetchReferential() {
  const { data, error } = await supabase.from('referential_modules').select('*');
  if (error) throw new Error(`[referential] ${error.message}`);
  return referentialFromDB(data);
}

export async function upsertReferential(item, userId) {
  const row = referentialToDB(item, userId);
  const { error } = await supabase
    .from('referential_modules')
    .upsert(row, { onConflict: 'user_id,module_id' });
  if (error) throw new Error(`[referential upsert] ${error.message}`);
}

export async function deleteReferentialDB(moduleId) {
  const { error } = await supabase.from('referential_modules').delete().eq('module_id', moduleId);
  if (error) throw new Error(`[referential delete] ${error.message}`);
}

// ─── Audit trail ────────────────────────────────────────────────────────────
export async function fetchAuditTrail() {
  const { data, error } = await supabase
    .from('audit_trail')
    .select('*')
    .order('ts', { ascending: false })
    .limit(500);
  if (error) throw new Error(`[audit_trail] ${error.message}`);
  return auditFromDB(data);
}

export async function insertAuditEntry(entry, userId) {
  const row = auditToDB(entry, userId);
  const { error } = await supabase.from('audit_trail').insert(row);
  if (error) {
    // Don't throw — audit failures shouldn't block UX.
    console.warn('[audit_trail insert]', error.message);
  }
}

// ─── User settings (KV) ─────────────────────────────────────────────────────
export async function fetchUserSettings() {
  const { data, error } = await supabase.from('user_settings').select('*');
  if (error) throw new Error(`[user_settings] ${error.message}`);
  const out = {};
  for (const r of data) out[r.key] = r.value;
  return out;
}

export async function upsertUserSetting(key, value, userId) {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, key, value },
      { onConflict: 'user_id,key' }
    );
  if (error) throw new Error(`[user_settings upsert] ${error.message}`);
}

// ─── Profiles (admin) ───────────────────────────────────────────────────────
export async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, created_at, updated_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`[profiles] ${error.message}`);
  return data ?? [];
}

export async function updateProfile(id, changes) {
  const { error } = await supabase.from('profiles').update(changes).eq('id', id);
  if (error) throw new Error(`[profiles update] ${error.message}`);
}

export async function adminCreateUser(email, password, metadata) {
  // We use a secondary client so we don't overwrite the current admin session.
  const { createClient } = await import('@supabase/supabase-js');
  const tempClient = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  const { data, error } = await tempClient.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/login`
    }
  });

  if (error) throw new Error(`[adminCreateUser] ${error.message}`);
  return data;
}

export async function deleteProfile(id) {
  // Note: This only deletes the profile record, not the auth user (requires service role).
  // But RLS in 0001_init_schema allows super_admin to delete from public.profiles.
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw new Error(`[profiles delete] ${error.message}`);
}
