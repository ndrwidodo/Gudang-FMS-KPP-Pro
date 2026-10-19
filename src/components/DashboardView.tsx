import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Warehouse,
  Boxes,
  Sheet,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  PackageCheck,
  Flame,
  BarChart3,
  PieChart as PieIcon,
  RefreshCw,
  FolderOpen,
  Trash2,
  Sparkles,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { InventoryItem, StockTransaction, SpreadsheetConfig } from '../types/inventory';
import { DRIVE_UPLOAD_FOLDER_URL } from '../utils/driveHelper';
import { subscribeSyncState, SyncState } from '../utils/spreadsheetSync';

interface DashboardViewProps {
  items: InventoryItem[];
  transactions: StockTransaction[];
  sheetConfig: SpreadsheetConfig;
  onOpenSpreadsheet: () => void;
  onNavigateToTab: (tabId: string) => void;
  onOpenNewInbound: () => void;
  onOpenNewOutbound: () => void;
  onResetTransactions?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  transactions,
  sheetConfig,
  onOpenSpreadsheet,
  onNavigateToTab,
  onOpenNewInbound,
  onOpenNewOutbound,
  onResetTransactions,
}) => {
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [syncMessage, setSyncMessage] = useState<string>('Real-Time Sync Aktif');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [bottomTab, setBottomTab] = useState<'keluar' | 'masuk'>('keluar');

  useEffect(() => {
    const unsubscribe = subscribeSyncState((state, message) => {
      setSyncState(state);
      setSyncMessage(message);
    });
    return () => unsubscribe();
  }, []);

  // 1. Inbound to Gudang Utama strictly calculated from recorded transactions
  const inboundTransactions = transactions.filter((t) => t.tipe === 'MASUK');
  const totalInboundGU = inboundTransactions.reduce(
    (sum, tx) => sum + tx.items.reduce((s, it) => s + it.jumlah, 0),
    0
  );
  const totalStokGU = items.reduce((sum, item) => sum + (item.stokAkhirGudangUtama || 0), 0);

  // Group inbound goods by item code from recorded inbound transactions
  const itemInboundCounts = new Map<string, { kode: string; nama: string; totalMasuk: number; satuan: string; sisaStok: number }>();
  inboundTransactions.forEach((tx) => {
    tx.items.forEach((line) => {
      const matchItem = items.find((i) => i.kodeBarang === line.kodeBarang);
      const existing = itemInboundCounts.get(line.kodeBarang);
      if (existing) {
        existing.totalMasuk += line.jumlah;
      } else {
        itemInboundCounts.set(line.kodeBarang, {
          kode: line.kodeBarang,
          nama: line.namaBarang,
          totalMasuk: line.jumlah,
          satuan: line.satuan || matchItem?.satuan || 'Pcs',
          sisaStok: matchItem?.stokAkhirGudangUtama || 0,
        });
      }
    });
  });

  const topInboundItems = Array.from(itemInboundCounts.values()).sort(
    (a, b) => b.totalMasuk - a.totalMasuk
  );

  // 2. Outbound to clusters breakdown
  const clusterCounts = {
    'Cluster 1': 0,
    'Cluster 2': 0,
    'Cluster 3': 0,
    'Cluster 4': 0,
  };

  const itemOutboundCounts = new Map<
    string,
    {
      kode: string;
      nama: string;
      totalKeluar: number;
      satuan: string;
      sisaStok: number;
      clusterDestinations: string[];
    }
  >();

  transactions.forEach((tx) => {
    if (tx.tipe === 'KELUAR' && tx.lokasiAsal === 'Gudang Utama') {
      const cluster = tx.lokasiTujuan as 'Cluster 1' | 'Cluster 2' | 'Cluster 3' | 'Cluster 4';
      tx.items.forEach((line) => {
        if (clusterCounts[cluster] !== undefined) {
          clusterCounts[cluster] += line.jumlah;
        }

        const matchItem = items.find((i) => i.kodeBarang === line.kodeBarang);
        const existing = itemOutboundCounts.get(line.kodeBarang);
        if (existing) {
          existing.totalKeluar += line.jumlah;
          if (tx.lokasiTujuan && !existing.clusterDestinations.includes(tx.lokasiTujuan)) {
            existing.clusterDestinations.push(tx.lokasiTujuan);
          }
        } else {
          itemOutboundCounts.set(line.kodeBarang, {
            kode: line.kodeBarang,
            nama: line.namaBarang,
            totalKeluar: line.jumlah,
            satuan: line.satuan || matchItem?.satuan || 'Pcs',
            sisaStok: matchItem?.stokAkhirGudangUtama ?? 0,
            clusterDestinations: tx.lokasiTujuan ? [tx.lokasiTujuan] : [],
          });
        }
      });
    }
  });

  const totalOutboundGU = Object.values(clusterCounts).reduce((a, b) => a + b, 0);

  // 3. Fast Moving Items (Ranked by Outbound)
  const fastMovingItems = Array.from(itemOutboundCounts.values()).sort(
    (a, b) => b.totalKeluar - a.totalKeluar
  );

  const maxFastMoving = fastMovingItems[0]?.totalKeluar || 1;

  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    if (onResetTransactions) {
      onResetTransactions();
    }
  };

  return (
    <div className="space-y-6">
      {/* Odoo ERP Dashboard Top Control Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#714B67] rounded-sm inline-block"></span>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Dashboard
            </h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold">
              <span className={`w-2 h-2 rounded-full ${syncState === 'syncing' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>{syncMessage}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring arus logistik real-time Gudang Utama terintegrasi Cluster 1, 2, 3, dan 4 & Google Sheets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenNewInbound}
            className="px-3.5 py-2 bg-[#017E84] hover:bg-[#006e73] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>+ Barang Masuk</span>
          </button>

          <button
            onClick={onOpenNewOutbound}
            className="px-3.5 py-2 bg-[#714B67] hover:bg-[#5a3c52] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+ Barang Keluar</span>
          </button>

          <button
            onClick={onOpenSpreadsheet}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            title="Pengaturan Koneksi dan Sinkronisasi Real-Time Spreadsheet"
          >
            <Sheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Uji Koneksi Sheet</span>
          </button>

          {/* Reset All Transactions to Fresh State */}
          {onResetTransactions && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              title="Hapus semua riwayat transaksi agar dashboard fresh baru"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Riwayat Transaksi</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal: Reset Transactions */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-bold text-base text-slate-900">
                Hapus Semua Riwayat Transaksi?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tindakan ini akan <strong>menghapus semua riwayat transaksi</strong> yang tercatat di dashboard saat ini.
                Grafik mutasi dan statistik akan dikembalikan ke kondisi <strong>fresh baru</strong> (0 transaksi mutasi), serta stok Gudang Utama akan disinkronkan kembali.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
              >
                Ya, Bersihkan Fresh Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Keluar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Keluar
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#714B67] flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#714B67]">{totalOutboundGU}</span>
            <span className="text-xs font-semibold text-slate-500">Unit Terdistribusi</span>
          </div>
          <div className="mt-2 text-[11px] font-semibold flex items-center gap-1">
            {totalOutboundGU === 0 ? (
              <span className="text-emerald-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Kondisi Fresh Baru (0 Keluar)</span>
              </span>
            ) : (
              <span className="text-purple-600 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Akumulasi Pengeluaran ke 4 Cluster</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Distribusi 4 Cluster */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Distribusi 4 Cluster
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#017E84] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#017E84]">
              {Object.values(clusterCounts).filter((c) => c > 0).length} / 4
            </span>
            <span className="text-xs font-semibold text-slate-500">Cluster Menerima</span>
          </div>
          <div className="mt-2 text-[11px] font-semibold flex items-center gap-1">
            <span className="text-teal-700 flex items-center gap-1">
              <span>Cluster 1, 2, 3, dan 4</span>
            </span>
          </div>
        </div>

        {/* Card 3: Sisa Stok Gudang Utama */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sisa Stok Gudang Utama
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700">{totalStokGU}</span>
            <span className="text-xs font-semibold text-slate-500">Unit Tersedia</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>{items.length} Macam Master Barang</span>
          </div>
        </div>

        {/* Card 4: Top Fast Moving Item */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Item Paling Sering Keluar
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            {fastMovingItems.length > 0 ? (
              <>
                <div className="text-sm font-black text-slate-900 truncate">
                  {fastMovingItems[0]?.nama}
                </div>
                <div className="text-xs text-amber-700 font-bold mt-1">
                  {fastMovingItems[0]?.totalKeluar} {fastMovingItems[0]?.satuan} Terkirim
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-slate-500 italic">
                  Belum ada mutasi keluar
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  Kondisi Fresh Baru
                </div>
              </>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Peringkat Fast-Moving Gudang KPP
          </div>
        </div>
      </div>

      {/* Middle Section: Fast Moving Ranking Chart & Distribution to 4 Clusters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fast Moving Items Ranking Chart (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Statistik Barang Paling Sering Keluar (Fast Moving Items)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Berdasarkan volume mutasi keluar dari Gudang Utama ke Cluster
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-[#714B67] bg-purple-50 px-2 py-0.5 rounded">
              Peringkat Teratas
            </span>
          </div>

          {fastMovingItems.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-2">
              <Sparkles className="w-8 h-8 text-[#017E84] mx-auto opacity-80" />
              <h4 className="font-bold text-slate-700 text-xs">Aplikasi Bersih & Fresh Baru</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Belum ada transaksi pengeluaran barang yang tercatat. Seluruh stok tersimpan utuh di Gudang Utama dan siap didistribusikan ke Cluster 1, 2, 3, dan 4.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {fastMovingItems.slice(0, 5).map((it, idx) => {
                const pct = Math.round((it.totalKeluar / maxFastMoving) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-700 text-[10px] flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-800">{it.nama}</span>
                        <span className="font-mono text-[10px] text-slate-400">({it.kode})</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {it.totalKeluar} <span className="font-normal text-slate-500">{it.satuan}</span>
                      </span>
                    </div>
                    {/* Progress Bar Chart */}
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                      <div
                        className="bg-gradient-to-r from-[#714B67] to-[#017E84] h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Distribution to Cluster 1-4 Graphic (Right 5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-[#017E84]" />
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Statistik Barang Keluar ke Semua Lokasi Tujuan
                </h3>
                <span className="text-[11px] text-slate-500">
                  Proporsi distribusi ke Cluster 1, 2, 3, dan 4
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {(['Cluster 1', 'Cluster 2', 'Cluster 3', 'Cluster 4'] as const).map((clusterKey) => {
              const count = clusterCounts[clusterKey];
              const pct = totalOutboundGU > 0 ? Math.round((count / totalOutboundGU) * 100) : 0;
              const tabId = clusterKey.toLowerCase().replace(' ', '_');

              return (
                <div
                  key={clusterKey}
                  onClick={() => onNavigateToTab(tabId)}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition space-y-1.5"
                >
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Building2 className="w-4 h-4 text-[#714B67]" />
                      <span>{clusterKey}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#017E84]">{count} Unit</span>
                      <span className="text-[11px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#017E84] h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Statistik Nama Barang Keluar (Total Keluar) & Masuk */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#714B67] flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Statistik Nama Barang Keluar (Total Keluar)
              </h3>
              <span className="text-[11px] text-slate-500">
                Data akumulasi kuantitas barang keluar dari Gudang Utama ke Cluster 1, 2, 3, dan 4
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setBottomTab('keluar')}
                className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  bottomTab === 'keluar'
                    ? 'bg-[#714B67] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3 h-3" />
                <span>Total Keluar ({fastMovingItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setBottomTab('masuk')}
                className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                  bottomTab === 'masuk'
                    ? 'bg-[#017E84] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>Total Masuk ({topInboundItems.length})</span>
              </button>
            </div>

            <button
              onClick={() => onNavigateToTab('cluster_1')}
              className="text-xs font-bold text-[#714B67] hover:underline cursor-pointer ml-2"
            >
              Lihat Detail Cluster &rarr;
            </button>
          </div>
        </div>

        {bottomTab === 'keluar' ? (
          fastMovingItems.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-2">
              <Sparkles className="w-8 h-8 text-[#714B67] mx-auto opacity-80" />
              <h4 className="font-bold text-slate-700 text-xs">
                Aplikasi Bersih & Fresh Baru: Belum Ada Transaksi Barang Keluar
              </h4>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Statistik total barang keluar saat ini kosong karena mutasi pengeluaran ke Cluster belum dicatat. Silakan input transaksi pengeluaran baru melalui tombol <strong>+ Barang Keluar</strong> di atas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {fastMovingItems.map((it) => (
                <div
                  key={it.kode}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-purple-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{it.kode}</span>
                      {it.clusterDestinations && it.clusterDestinations.length > 0 && (
                        <span className="text-[9px] bg-purple-100 text-[#714B67] px-1.5 py-0.5 rounded font-bold truncate max-w-[90px]">
                          {it.clusterDestinations.join(', ')}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mt-1">
                      {it.nama}
                    </h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Keluar</span>
                      <span className="text-sm font-black text-[#714B67]">
                        {it.totalKeluar} {it.satuan}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Sisa di GU</span>
                      <span className="text-sm font-black text-emerald-700">
                        {it.sisaStok}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          topInboundItems.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-2">
              <Sparkles className="w-8 h-8 text-[#017E84] mx-auto opacity-80" />
              <h4 className="font-bold text-slate-700 text-xs">
                Aplikasi Bersih & Fresh Baru: Belum Ada Transaksi Barang Masuk
              </h4>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Statistik nama barang masuk ke Gudang Utama saat ini kosong karena mutasi penerimaan belum dicatat. Silakan input penerimaan baru melalui tombol <strong>+ Barang Masuk</strong> di atas atau submenu Gudang Utama.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {topInboundItems.slice(0, 5).map((it) => (
                <div
                  key={it.kode}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between"
                >
                  <div>
                    <span className="font-mono text-[10px] text-slate-400 font-bold">{it.kode}</span>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mt-0.5">
                      {it.nama}
                    </h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Total Masuk</span>
                      <span className="text-sm font-black text-blue-700">
                        {it.totalMasuk} {it.satuan}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Sisa Stok</span>
                      <span className="text-sm font-black text-emerald-700">
                        {it.sisaStok}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
