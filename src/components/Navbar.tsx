import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  FileCode2,
  Sheet,
  LogOut,
  User,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronDown,
  Warehouse,
  Boxes,
  Building2,
  FolderOpen,
} from 'lucide-react';
import { PatraJasaLogo } from './PatraJasaLogo';
import { UserAccount, SpreadsheetConfig } from '../types/inventory';
import { DRIVE_UPLOAD_FOLDER_URL } from '../utils/driveHelper';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserAccount | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenSpreadsheet: () => void;
  onOpenAppsScript: () => void;
  sheetConfig: SpreadsheetConfig;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenSpreadsheet,
  onOpenAppsScript,
  sheetConfig,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'gudang_utama', label: 'Gudang Utama', icon: Warehouse },
    { id: 'cluster_1', label: 'Cluster 1', icon: Building2 },
    { id: 'cluster_2', label: 'Cluster 2', icon: Building2 },
    { id: 'cluster_3', label: 'Cluster 3', icon: Building2 },
    { id: 'cluster_4', label: 'Cluster 4', icon: Building2 },
  ];

  return (
    <header className="bg-[#714B67] text-white shadow-md select-none sticky top-0 z-40 transition-colors duration-200">
      {/* Top Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <PatraJasaLogo size="sm" showSubtitle={true} className="cursor-pointer" />
        </div>

        {/* Right Tools & User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Direct Drive Folder Link */}
          <a
            href={DRIVE_UPLOAD_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Buka Folder Google Drive Foto Barang"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-md border border-white/15 transition text-white"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-medium">Drive Foto</span>
          </a>

          {/* Apps Script Code Modal Button */}
          <button
            onClick={onOpenAppsScript}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#017E84] hover:bg-[#006e73] text-white font-semibold rounded-md shadow-sm border border-teal-400/30 transition cursor-pointer"
            title="Lihat & Salin Kode Code.gs dan Index.html"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kode Apps Script</span>
          </button>

          {/* Test Spreadsheet Button */}
          <button
            onClick={onOpenSpreadsheet}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-md border border-white/20 transition cursor-pointer"
            title="Uji Koneksi ke Google Sheets"
          >
            <Sheet className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden md:inline">Koneksi Sheet</span>
            <span
              className={`w-2 h-2 rounded-full ${
                sheetConfig.status === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : sheetConfig.status === 'error'
                  ? 'bg-rose-400'
                  : 'bg-amber-400'
              }`}
            />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:px-2.5 sm:py-1 text-xs bg-white/10 hover:bg-white/20 rounded-md border border-white/20 flex items-center gap-1.5 transition cursor-pointer"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Tampilan Layar Penuh (Tanpa Bar)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline">{isFullscreen ? 'Keluar' : 'Layar Penuh'}</span>
          </button>

          {/* User Profile / Login */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 transition cursor-pointer text-left"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-[11px] text-white uppercase">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block leading-tight text-left">
                  <div className="text-xs font-semibold leading-none">{currentUser.name.split(' ')[0]}</div>
                  <span className="text-[10px] text-purple-200">{currentUser.role}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-purple-200" />
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setShowUserDropdown(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-medium">
                        {currentUser.role}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono">
                        {currentUser.provider === 'google' ? 'Google Auth' : 'Default ID'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onOpenLogin}
                    className="w-full px-4 py-2 text-xs text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ganti Akun / Tambah Akun Google</span>
                  </button>

                  <button
                    onClick={onLogout}
                    className="w-full px-4 py-2 text-xs text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar Akun (Logout)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-3 py-1 text-xs bg-white text-[#714B67] hover:bg-purple-50 font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              Masuk Akun
            </button>
          )}
        </div>
      </div>

      {/* Sub Navigation Tabs (Odoo Style) */}
      <div className="bg-[#5a3c52] border-t border-purple-800/40">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-white text-white bg-white/10'
                    : 'border-transparent text-purple-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-purple-300'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
