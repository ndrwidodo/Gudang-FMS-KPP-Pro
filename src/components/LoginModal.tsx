import React, { useState } from 'react';
import { X, User, ShieldCheck, Mail, LogIn, Plus, Check } from 'lucide-react';
import { PatraJasaLogo } from './PatraJasaLogo';
import { UserAccount } from '../types/inventory';
import { DEFAULT_USERS, getRegisteredUsers, setCurrentUser } from '../utils/storage';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<'default' | 'google' | 'list'>('default');
  const [defaultUserId, setDefaultUserId] = useState('admin');
  const [googleName, setGoogleName] = useState('Ndr Widodo');
  const [googleEmail, setGoogleEmail] = useState('ndr.widodo@gmail.com');
  const [googleRole, setGoogleRole] = useState<'Kepala Gudang' | 'Admin Cluster' | 'Operator'>('Kepala Gudang');
  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>(getRegisteredUsers());

  if (!isOpen) return null;

  const handleLoginDefault = () => {
    const user: UserAccount = {
      id: 'user_admin_default',
      username: defaultUserId.trim() || 'admin',
      name: 'Administrator Gudang KPP',
      email: `${defaultUserId.trim() || 'admin'}@kpp-patrajasa.co.id`,
      role: 'Super Admin',
      provider: 'default',
      registeredAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    setCurrentUser(user);
    onLoginSuccess(user);
    onClose();
  };

  const handleLoginGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail) return;

    const user: UserAccount = {
      id: `google_${Date.now()}`,
      username: googleEmail.split('@')[0],
      name: googleName.trim() || googleEmail.split('@')[0],
      email: googleEmail.trim(),
      role: googleRole,
      provider: 'google',
      registeredAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    setCurrentUser(user);
    setRegisteredUsers(getRegisteredUsers());
    onLoginSuccess(user);
    onClose();
  };

  const handleSelectUser = (u: UserAccount) => {
    setCurrentUser(u);
    onLoginSuccess(u);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#714B67] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PatraJasaLogo size="sm" showSubtitle={false} />
            <div>
              <h3 className="font-bold text-base leading-tight">Autentikasi Pengguna KPP</h3>
              <p className="text-xs text-purple-200">Inventory Gudang Bertingkat Patrajasa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveMode('default')}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              activeMode === 'default'
                ? 'border-[#714B67] text-[#714B67] bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            User ID Default
          </button>
          <button
            onClick={() => setActiveMode('google')}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              activeMode === 'google'
                ? 'border-[#714B67] text-[#714B67] bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + Akun Google
          </button>
          <button
            onClick={() => {
              setRegisteredUsers(getRegisteredUsers());
              setActiveMode('list');
            }}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              activeMode === 'list'
                ? 'border-[#714B67] text-[#714B67] bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar Akun ({registeredUsers.length})
          </button>
        </div>

        {/* Body Contents */}
        <div className="p-6">
          {activeMode === 'default' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  User ID Default Sistem
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={defaultUserId}
                    onChange={(e) => setDefaultUserId(e.target.value)}
                    placeholder="Contoh: admin atau gudang.kpp"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Default login otomatis tersimpan di browser (tidak akan terlogout saat refresh).
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#714B67] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Akses Super Admin:</span> Memiliki wewenang penuh
                  mutasi Gudang Utama, distribusi ke seluruh Cluster 1-4, serta cetak Surat Jalan resmi.
                </div>
              </div>

              <button
                onClick={handleLoginDefault}
                className="w-full py-2.5 bg-[#714B67] hover:bg-[#5a3c52] text-white font-bold text-sm rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Masuk dengan User ID Default
              </button>
            </div>
          )}

          {activeMode === 'google' && (
            <form onSubmit={handleLoginGoogle} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Akun Google
                </label>
                <input
                  type="text"
                  required
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Contoh: Ndr Widodo"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017E84]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Akun Google
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017E84]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Role Penugasan
                </label>
                <select
                  value={googleRole}
                  onChange={(e) => setGoogleRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017E84] bg-white"
                >
                  <option value="Kepala Gudang">Kepala Gudang</option>
                  <option value="Admin Cluster">Admin Cluster</option>
                  <option value="Operator">Operator Lapangan</option>
                </select>
              </div>

              <p className="text-[11px] text-slate-500">
                Akun Google yang ditambahkan akan otomatis terekam secara permanen di database sistem dan spreadsheet.
              </p>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#017E84] hover:bg-[#006e73] text-white font-bold text-sm rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                Simpan & Masuk Akun Google
              </button>
            </form>
          )}

          {activeMode === 'list' && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {registeredUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleSelectUser(u)}
                  className="p-3 border border-slate-200 rounded-xl hover:border-[#714B67] hover:bg-purple-50/50 cursor-pointer transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs uppercase">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{u.name}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
