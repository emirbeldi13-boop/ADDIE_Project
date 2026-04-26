import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  UserCheck, 
  UserMinus, 
  Mail, 
  Search, 
  ChevronRight,
  MoreVertical,
  Activity,
  ArrowLeft,
  Menu,
  Plus,
  Trash2,
  Edit2,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import * as db from '../../lib/db';

export function UserManagementPage({ onMenuOpen }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [updating, setUpdating] = useState(null);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'visitor'
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await db.fetchAllProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Error loading profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await db.adminCreateUser(formData.email, formData.password, {
        full_name: formData.full_name,
        role: formData.role
      });
      setSuccess('Utilisateur invité avec succès. Un email de confirmation a été envoyé.');
      setShowAddModal(false);
      setFormData({ email: '', password: '', full_name: '', role: 'visitor' });
      loadProfiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await db.updateProfile(selectedProfile.id, {
        full_name: formData.full_name,
        role: formData.role,
        is_active: formData.is_active
      });
      setSuccess('Profil mis à jour avec succès.');
      setShowEditModal(false);
      loadProfiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    setSubmitting(true);
    try {
      await db.deleteProfile(selectedProfile.id);
      setSuccess('Profil supprimé avec succès.');
      setShowDeleteModal(false);
      loadProfiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (profile) => {
    setSelectedProfile(profile);
    setFormData({
      full_name: profile.full_name || '',
      role: profile.role,
      is_active: profile.is_active
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (profile) => {
    setSelectedProfile(profile);
    setShowDeleteModal(true);
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = p.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && p.is_active) || 
                         (filter === 'inactive' && !p.is_active);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {success && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl shadow-lg animate-in slide-in-from-right duration-300">
            <CheckCircle size={18} className="text-emerald-500" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-xl shadow-lg animate-in slide-in-from-right duration-300">
            <AlertTriangle size={18} className="text-red-500" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onMenuOpen}
                className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu size={20} />
              </button>
              <div className="p-2.5 bg-[#0223C6] text-white rounded-xl shadow-lg shadow-blue-500/20">
                <Shield size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight italic">User Administration</h1>
                <p className="text-sm text-slate-500 font-medium">Contrôle des accès de la plateforme</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex bg-slate-100 rounded-xl p-1 ring-1 ring-slate-200">
                <button 
                  onClick={() => setFilter('all')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Tous
                </button>
                <button 
                  onClick={() => setFilter('active')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'active' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Actifs
                </button>
                <button 
                  onClick={() => setFilter('inactive')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'inactive' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Inactifs
                </button>
              </div>
              
              <button 
                onClick={() => {
                  setFormData({ email: '', password: '', full_name: '', role: 'visitor' });
                  setShowAddModal(true);
                }}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0223C6] text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[#021db5] transform hover:-translate-y-0.5 active:scale-95 transition-all"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Nouvel Utilisateur</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8 relative max-w-md group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>

        {/* User Table Card */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Identité</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Rôle Applicatif</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date d'arrivée</th>
                  <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
                          <div className="space-y-2">
                            <div className="h-4 w-40 bg-slate-100 rounded"></div>
                            <div className="h-3 w-32 bg-slate-100 rounded"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6"><div className="h-6 w-24 bg-slate-100 rounded-full"></div></td>
                      <td className="px-8 py-6"><div className="h-6 w-20 bg-slate-100 rounded-full"></div></td>
                      <td className="px-8 py-6"><div className="h-4 w-24 bg-slate-100 rounded"></div></td>
                      <td className="px-8 py-6 text-right"><div className="h-10 w-10 bg-slate-100 rounded-xl ml-auto"></div></td>
                    </tr>
                  ))
                ) : filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                          <Users size={48} />
                        </div>
                        <p className="text-slate-500 font-bold">Aucun utilisateur ne correspond à votre recherche</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-500/20 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/10">
                          {profile.email?.[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 mb-0.5 group-hover:text-blue-600 transition-colors">
                            {profile.full_name || 'Utilisateur'}
                          </p>
                          <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                            <Mail size={12} />
                            {profile.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                        profile.role === 'super_admin' 
                          ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' 
                          : 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                      }`}>
                        {profile.role === 'super_admin' ? (
                          <Shield size={12} />
                        ) : (
                          <Users size={12} />
                        )}
                        {profile.role === 'super_admin' ? 'Administrateur' : 'Inspecteur'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${
                        profile.is_active 
                          ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' 
                          : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${profile.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-400'}`}></span>
                        {profile.is_active ? 'Compte Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm text-slate-500 font-medium italic">
                      {new Date(profile.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(profile)}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Modifier"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(profile)}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-400 italic flex items-center gap-2">
              <Activity size={14} />
              Changements appliqués dynamiquement sur la couche de données.
            </p>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin</span>
               </div>
               <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Online</span>
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">Inviter un membre</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nom Complet</label>
                <input 
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                  placeholder="ex: Mohamed Amir Beldi"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Email Professionnel</label>
                <input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                  placeholder="nom@exemple.tn"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Mot de Passe Provisoire</label>
                <input 
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Rôle</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold appearance-none"
                >
                  <option value="visitor">Inspecteur (Visitor)</option>
                  <option value="super_admin">Administrateur (Super Admin)</option>
                </select>
              </div>
              
              <button 
                disabled={submitting}
                className="w-full py-4 bg-[#0223C6] text-white rounded-2xl font-black italic shadow-xl shadow-blue-500/30 hover:bg-[#021db5] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
              >
                {submitting ? <Loader2 size={20} className="animate-spin" /> : <Mail size={20} />}
                {submitting ? 'Traitement...' : 'Envoyer l\'invitation'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">Modifier le Profil</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nom Complet</label>
                <input 
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Rôle</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold appearance-none"
                >
                  <option value="visitor">Inspecteur (Visitor)</option>
                  <option value="super_admin">Administrateur (Super Admin)</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-sm font-bold text-slate-900">Statut du compte</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Active ou bloque l'accès</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                  className={`w-12 h-6 rounded-full p-1 transition-all ${formData.is_active ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
              
              <button 
                disabled={submitting}
                className="w-full py-4 bg-[#0223C6] text-white rounded-2xl font-black italic shadow-xl shadow-blue-500/30 hover:bg-[#021db5] disabled:opacity-50 transition-all flex items-center justify-center gap-3"
              >
                {submitting ? <Loader2 size={20} className="animate-spin" /> : <Edit2 size={20} />}
                {submitting ? 'Mise à jour...' : 'Sauvegarder les modifications'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6">
              <Trash2 size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight italic mb-3">Supprimer le profil ?</h2>
            <p className="text-slate-500 font-medium mb-8">
              Cette action supprimera le profil de <span className="font-bold text-slate-900">{selectedProfile?.full_name}</span>. 
              L'accès sera révoqué mais l'utilisateur restera présent dans le système d'authentification.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={handleDeleteUser}
                disabled={submitting}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black italic shadow-xl shadow-red-500/20 hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
