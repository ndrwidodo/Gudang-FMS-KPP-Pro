import React, { useState, useEffect } from 'react';
import {
  X,
  Sheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Link2,
  Server,
  UploadCloud,
  FileCode2,
  Clock,
  ListOrdered,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { SpreadsheetConfig, InventoryItem, StockTransaction } from '../types/inventory';
import { saveSpreadsheetConfig } from '../utils/storage';
import {
  testSpreadsheetConnection,
  bulkSyncAllData,
  getSyncLogs,
  SyncLogEntry,
} from '../utils/spreadsheetSync';

interface SpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SpreadsheetConfig;
  onUpdateConfig: (newConfig: SpreadsheetConfig) => void;
  items?: InventoryItem[];
  transactions?: StockTransaction[];
  onOpenAppsScript?: () => void;
}

export const SpreadsheetModal: React.FC<SpreadsheetModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  items = [],
  transactions = [],
  onOpenAppsScript,
}) => {
  const [formData, setFormData] = useState<SpreadsheetConfig>({ ...config });
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);
  const [bulkSyncResult, setBulkSyncResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSyncLogs(getSyncLogs());
      setFormData({ ...config });
      setBulkSyncResult(null);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  // Auto extract Sheet ID from Google Sheet URL
  const handleSpreadsheetUrlChange = (url: string) => {
    let sheetId = formData.sheetId;
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      sheetId = match[1];
    }
    setFormData({ ...formData, spreadsheetUrl: url, sheetId });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const res = await testSpreadsheetConnection(formData.webAppUrl);
    const now = new Date().toLocaleString('id-ID');

    const updated: SpreadsheetConfig = {
      ...formData,
      status: res.success ? 'connected' : 'error',
      lastTestedAt: now,
      statusMessage: res.message,
    };

    setTestResult({
      success: res.success,
      message: res.message,
      latencyMs: res.latencyMs,
    });

    setFormData(updated);
    saveSpreadsheetConfig(updated);
    onUpdateConfig(updated);
    setSyncLogs(getSyncLogs());
    setIsTesting(false);
  };

  const handleBulkSyncNow = async () => {
    setIsSyncingAll(true);
    setBulkSyncResult(null);

    const res = await bulkSyncAllData(items, transactions);
    setBulkSyncResult(res.message);
    setSyncLogs(getSyncLogs());
    setIsSyncingAll(false);
  };

  const handleSave = () => {
    saveSpreadsheetConfig(formData);
    onUpdateConfig(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#714B67] text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Sheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Pengaturan & Uji Koneksi Google Spreadsheet</h3>
              <p className="text-xs text-purple-200">
                Merekam otomatis setiap input barang ke Google Sheets aktif
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status Indicator */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              formData.status === 'connected'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {formData.status === 'connected' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs flex-1">
              <div className="font-bold flex items-center justify-between">
                <span>{formData.status === 'connected' ? 'Status: Siap Merekam ke Spreadsheet' : 'Status: Menunggu Konfigurasi'}</span>
                {formData.lastTestedAt && (
                  <span className="text-[10px] text-slate-500 font-normal">Diperbarui: {formData.lastTestedAt}</span>
                )}
              </div>
              <div className="text-slate-600 mt-1">
                {formData.statusMessage || 'Setiap input barang masuk, barang keluar, dan master barang otomatis terekam ke spreadsheet.'}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>1. URL Google Spreadsheet Anda</span>
                {formData.sheetId && (
                  <span className="font-mono text-[10px] text-slate-400">ID: {formData.sheetId.slice(0, 14)}...</span>
                )}
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.spreadsheetUrl}
                  onChange={(e) => handleSpreadsheetUrlChange(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1Yi_J91PxBxrRPfHPdhOPakrwSCvpHtHiXjB2AiG9lh0/edit"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67] bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. URL Web App Google Apps Script (Exec Endpoint)
              </label>
              <div className="relative">
                <Server className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.webAppUrl}
                  onChange={(e) => setFormData({ ...formData, webAppUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67] bg-white font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                URL ini didapat setelah men-deploy <strong>Code.gs</strong> sebagai <em>Aplikasi Web</em> dengan izin <em>"Siapa saja" (Anyone)</em>.
              </p>
            </div>

            {/* Helper Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 bg-[#017E84] hover:bg-[#006e73] disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Menguji...' : 'Uji Koneksi Endpoint'}</span>
              </button>

              <button
                type="button"
                onClick={handleBulkSyncNow}
                disabled={isSyncingAll}
                className="px-4 py-2 bg-[#714B67] hover:bg-[#5a3c52] disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-bounce' : ''}`} />
                <span>{isSyncingAll ? 'Merekam Data...' : 'Sinkronkan Seluruh Data Sekarang'}</span>
              </button>

              {formData.spreadsheetUrl && (
                <a
                  href={formData.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition flex items-center gap-1.5"
                >
                  <span>Buka Sheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {onOpenAppsScript && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAppsScript();
                  }}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Petunjuk Deploy Script</span>
                </button>
              )}
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold ${
                  testResult.success
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {testResult.message} {testResult.latencyMs ? `(Latency: ${testResult.latencyMs}ms)` : ''}
              </div>
            )}

            {bulkSyncResult && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-semibold">
                ✓ {bulkSyncResult}
              </div>
            )}
          </div>

          {/* Audit Logs: Recent Recorded Inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Catatan Aktivitas Rekam Input ke Spreadsheet
              </span>
              <span className="text-[10px] text-slate-400">{syncLogs.length} Aktivitas Terakhir</span>
            </div>

            {syncLogs.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-300 rounded-xl text-center text-slate-400 text-xs">
                Belum ada rekaman mutasi baru. Setiap kali Anda memasukkan barang masuk atau keluar, log pengiriman akan tampil di sini.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Waktu</th>
                      <th className="p-2">Aksi</th>
                      <th className="p-2">Keterangan</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {syncLogs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                        <td className="p-2 font-bold text-slate-800 font-mono">{log.action}</td>
                        <td className="p-2 text-slate-600 truncate max-w-xs">{log.details || log.description}</td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status === 'success' ? 'Terekam' : log.status === 'warning' ? 'Lokal' : 'Gagal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
          <div className="text-[11px] text-slate-500">
            *Pastikan Sheet <em>MASTER_BARANG</em>, <em>BARANG_MASUK_GU</em>, dan <em>CLUSTER_1</em> s/d <em>CLUSTER_4</em> telah dibuat di Google Sheets.
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold bg-[#714B67] hover:bg-[#5a3c52] text-white rounded-lg shadow transition cursor-pointer"
            >
              Simpan & Hubungkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
