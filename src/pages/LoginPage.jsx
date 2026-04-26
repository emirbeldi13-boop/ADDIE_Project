import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { signIn, sendPasswordReset, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrMsg('');
    if (!email || !password) {
      setErrMsg('Email et mot de passe requis.');
      return;
    }
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setErrMsg(translateAuthError(error));
      return;
    }
    navigate(from, { replace: true });
  }

  async function handleReset(e) {
    e.preventDefault();
    setErrMsg('');
    if (!email) {
      setErrMsg('Veuillez entrer votre email.');
      return;
    }
    setSubmitting(true);
    const { error } = await sendPasswordReset(email.trim());
    setSubmitting(false);
    if (error) {
      setErrMsg(translateAuthError(error));
      return;
    }
    setResetSent(true);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand block */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1F3864] rounded-2xl shadow-md mb-4">
            <span className="text-white font-black text-xl">PT</span>
          </div>
          <h1 className="text-2xl font-black italic text-[#1F3864] tracking-tight">
            PedagoTrack
          </h1>
          <p className="text-xs text-slate-500 mt-1">Studio ADDIE · Cycle Italien 2026-2027</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[32px] shadow-lg border border-slate-200 p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#1F3864]">
              {resetMode ? 'Réinitialiser le mot de passe' : 'Connexion'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {resetMode
                ? 'Entrez votre email, nous vous enverrons un lien.'
                : 'Accès réservé · Inspection Pédagogique'}
            </p>
          </div>

          {errMsg && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-[#991B1B] text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{errMsg}</span>
            </div>
          )}

          {resetSent && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
              <span>Si ce compte existe, un email de réinitialisation a été envoyé.</span>
            </div>
          )}

          <form onSubmit={resetMode ? handleReset : handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F3864]/30 focus:border-[#1F3864] focus:bg-white transition"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Password */}
            {!resetMode && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F3864]/30 focus:border-[#1F3864] focus:bg-white transition"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPwd ? 'Masquer' : 'Afficher'}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1F3864] hover:bg-[#172d52] text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Veuillez patienter…</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>{resetMode ? 'Envoyer le lien' : 'Se connecter'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setResetMode((m) => !m);
                setErrMsg('');
                setResetSent(false);
              }}
              className="text-xs text-[#1F3864] hover:text-[#991B1B] font-medium transition"
            >
              {resetMode ? '← Retour à la connexion' : 'Mot de passe oublié ?'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Inscription sur invitation uniquement · Contactez votre administrateur.
        </p>
      </div>
    </div>
  );
}

function translateAuthError(error) {
  const msg = error?.message || '';
  if (/invalid login credentials/i.test(msg)) return 'Email ou mot de passe incorrect.';
  if (/email not confirmed/i.test(msg)) return 'Email non confirmé. Vérifiez votre boîte de réception.';
  if (/rate limit/i.test(msg)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  if (/user not found/i.test(msg)) return 'Aucun compte trouvé pour cet email.';
  return msg || 'Erreur de connexion. Réessayez.';
}
