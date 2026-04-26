import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

/**
 * Handles the post-invite / password-recovery flow.
 * Supabase email link redirects here with tokens; detectSessionInUrl in the
 * client picks them up and emits a SIGNED_IN / PASSWORD_RECOVERY event before
 * this component mounts. We just show the form and call updateUser(password).
 */
export function SetPasswordPage() {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [done, setDone] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setRecoveryReady(true);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrMsg('');
    if (password.length < 8) {
      setErrMsg('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setErrMsg('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) {
      setErrMsg(error.message || 'Échec de la mise à jour du mot de passe.');
      return;
    }
    setDone(true);
    setTimeout(() => navigate('/', { replace: true }), 1500);
  }

  // No active session and the URL didn't carry a recovery token → invalid link.
  const noSession = !loading && !user && !recoveryReady;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1F3864] rounded-2xl shadow-md mb-4">
            <KeyRound size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-black italic text-[#1F3864] tracking-tight">
            Définir le mot de passe
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Première connexion ou réinitialisation
          </p>
        </div>

        <div className="bg-white rounded-[32px] shadow-lg border border-slate-200 p-8">
          {noSession ? (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-[#991B1B] text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-0.5">Lien invalide ou expiré</p>
                <p className="text-xs">
                  Demandez un nouveau lien depuis la page de connexion.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="mt-2 text-xs underline font-medium"
                >
                  Retour à la connexion
                </button>
              </div>
            </div>
          ) : done ? (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
              <span>Mot de passe enregistré. Redirection en cours…</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {user?.email && (
                <div className="text-xs text-slate-500">
                  Compte : <span className="font-semibold text-[#1F3864]">{user.email}</span>
                </div>
              )}

              {errMsg && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-[#991B1B] text-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{errMsg}</span>
                </div>
              )}

              <PasswordField
                label="Nouveau mot de passe"
                value={password}
                onChange={setPassword}
                show={showPwd}
                onToggleShow={() => setShowPwd((s) => !s)}
                disabled={submitting}
                autoComplete="new-password"
              />

              <PasswordField
                label="Confirmer le mot de passe"
                value={confirm}
                onChange={setConfirm}
                show={showPwd}
                onToggleShow={() => setShowPwd((s) => !s)}
                disabled={submitting}
                autoComplete="new-password"
              />

              <p className="text-xs text-slate-500">
                Au moins 8 caractères. Mélangez majuscules, chiffres et symboles pour plus de sécurité.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1F3864] hover:bg-[#172d52] text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enregistrement…</span>
                  </>
                ) : (
                  <span>Enregistrer le mot de passe</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggleShow, disabled, autoComplete }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F3864]/30 focus:border-[#1F3864] focus:bg-white transition"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label={show ? 'Masquer' : 'Afficher'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
