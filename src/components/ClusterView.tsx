import React, { useState, useMemo } from 'react';
import {
  Building2,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Printer,
  FileSpreadsheet,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  QrCode,
  Tag,
  Search,
  ExternalLink,
} from 'lucide-react';
import {
  InventoryItem,
  StockTransaction,
  ClusterStockItem,
  TransactionLine,
  ClusterMonthlyReportRow,
} from '../types/inventory';
import { calculateClusterStock } from '../utils/storage';
import { SuratJalanModal } from './SuratJalanModal';
import { QrCodePrintModal } from './QrCodePrintModal';
import { ReportPdfPreviewModal } from './ReportPdfPreviewModal';
import { getDirectDriveImageUrl } from '../utils/driveHelper';
import * as XLSX from 'xlsx';
import { sendDataToSpreadsheet } from '../utils/spreadsheetSync';

interface ClusterViewProps {
  clusterName: 'Cluster 1' | 'Cluster 2' | 'Cluster 3' | 'Cluster 4';
  items: InventoryItem[];
  transactions: StockTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
  currentUser: any;
}

export const ClusterView: React.FC<ClusterViewProps> = ({
  clusterName,
  items,
  transactions,
  setTransactions,
  currentUser,
}) => {
  const [subTab, setSubTab] = useState<'barang' | 'keluar' | 'laporan'>('barang');

  // Today's date
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form Barang Keluar Cluster
  const [outboundDate, setOutboundDate] = useState(todayDate);
  const [namaPembawa, setNamaPembawa] = useState('');
  const [areaTujuanDetail, setAreaTujuanDetail] = useState('');
  const [keteranganGeneral, setKeteranganGeneral] = useState('Pemenuhan unit kerja / perbaikan');
  const [outboundLines, setOutboundLines] = useState<TransactionLine[]>([
    { kodeBarang: '', namaBarang: '', jumlah: 1, satuan: 'Pcs', keterangan: '' },
  ]);

  // Modals
  const [selectedTxForSuratJalan, setSelectedTxForSuratJalan] = useState<StockTransaction | null>(null);
  const [selectedItemForQr, setSelectedItemForQr] = useState<InventoryItem | null>(null);
  const [selectedItemStockOverride, setSelectedItemStockOverride] = useState<number>(0);
  const [isReportPdfOpen, setIsReportPdfOpen] = useState(false);

  // Laporan state
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();
  const [laporanSubMode, setLaporanSubMode] = useState<'bulanan' | 'tahunan'>('bulanan');
  const [reportMonth, setReportMonth] = useState<number>(currentMonthNum);
  const [reportYear, setReportYear] = useState<number>(currentYearNum);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  // Calculate live cluster stock
  const clusterStockList = useMemo(() => {
    return calculateClusterStock(clusterName, items, transactions);
  }, [clusterName, items, transactions]);

  // All transactions originating from Gudang Utama to this cluster
  const inboundFromGudangUtama = useMemo(() => {
    return transactions
      .filter((tx) => tx.tipe === 'KELUAR' && tx.lokasiAsal === 'Gudang Utama' && tx.lokasiTujuan === clusterName)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [transactions, clusterName]);

  // All outgoing transactions from this cluster to sub areas
  const outboundFromCluster = useMemo(() => {
    return transactions
      .filter((tx) => tx.tipe === 'KELUAR' && tx.lokasiAsal === clusterName)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [transactions, clusterName]);

  // Outbound line handlers
  const addOutboundLine = () => {
    setOutboundLines([
      ...outboundLines,
      { kodeBarang: '', namaBarang: '', jumlah: 1, satuan: 'Pcs', keterangan: '' },
    ]);
  };

  const updateOutboundLine = (idx: number, field: keyof TransactionLine, value: any) => {
    const updated = [...outboundLines];
    if (field === 'kodeBarang') {
      const match = clusterStockList.find((c) => c.kodeBarang === value);
      updated[idx].kodeBarang = value;
      if (match) {
        updated[idx].namaBarang = match.namaBarang;
        updated[idx].satuan = match.satuan;
      }
    } else {
      (updated[idx] as any)[field] = value;
    }
    setOutboundLines(updated);
  };

  const removeOutboundLine = (idx: number) => {
    if (outboundLines.length <= 1) return;
    setOutboundLines(outboundLines.filter((_, i) => i !== idx));
  };

  // Submit Barang Keluar Cluster to Sub-area
  const handleSaveOutboundCluster = (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = outboundLines.filter((l) => l.kodeBarang && l.jumlah > 0);
    if (validLines.length === 0) {
      alert('Pilih minimal 1 barang dengan jumlah valid.');
      return;
    }

    if (!areaTujuanDetail.trim()) {
      alert('Tentukan area tujuan spesifik (misal: Lantai 2 Unit 201 / Ruang Server).');
      return;
    }

    // Verify stock in cluster
    for (const l of validLines) {
      const stock = clusterStockList.find((c) => c.kodeBarang === l.kodeBarang);
      if (!stock || stock.stokAkhir < l.jumlah) {
        alert(
          `Stok tidak mencukupi di ${clusterName} untuk ${l.namaBarang || l.kodeBarang}. Stok tersedia: ${
            stock?.stokAkhir || 0
          }, diminta: ${l.jumlah}`
        );
        return;
      }
    }

    const clusterCode = clusterName.replace('Cluster ', 'C');
    const noSurat = `SJ-${clusterCode}/${outboundDate.replace(/-/g, '')}/${Math.floor(100 + Math.random() * 900)}`;

    const newTx: StockTransaction = {
      id: `tx_c_${Date.now()}`,
      nomorSurat: noSurat,
      tanggal: outboundDate,
      jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      tipe: 'KELUAR',
      lokasiAsal: clusterName,
      lokasiTujuan: `${clusterName} - ${areaTujuanDetail}`,
      areaTujuanDetail: areaTujuanDetail.trim(),
      namaPembawa: namaPembawa.trim() || 'Teknisi Operasional',
      namaPenerima: `PIC Area ${areaTujuanDetail}`,
      keterangan: keteranganGeneral,
      dibuatOleh: currentUser?.name || `PIC ${clusterName}`,
      status: 'SELESAI',
      items: validLines,
    };

    setTransactions([newTx, ...transactions]);
    setSelectedTxForSuratJalan(newTx);
    // Rekam langsung ke Google Spreadsheet pada Sheet Cluster yang bersangkutan secara real-time
    sendDataToSpreadsheet('outboundCluster', { ...newTx, cluster: clusterName });
    showToast(`✓ Barang Keluar ${clusterName} berhasil dicatat & terekam ke Spreadsheet (No Surat: ${noSurat})`);
    setOutboundLines([{ kodeBarang: '', namaBarang: '', jumlah: 1, satuan: 'Pcs', keterangan: '' }]);
    setAreaTujuanDetail('');
  };

  // Month names
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Monthly Report for Cluster
  const monthlyReportRows: ClusterMonthlyReportRow[] = useMemo(() => {
    return clusterStockList.map((stk) => {
      let masukGU = 0;
      let keluarArea = 0;

      transactions.forEach((tx) => {
        const txDate = new Date(tx.tanggal);
        if (txDate.getFullYear() === reportYear && txDate.getMonth() + 1 === reportMonth) {
          if (tx.tipe === 'KELUAR' && tx.lokasiAsal === 'Gudang Utama' && tx.lokasiTujuan === clusterName) {
            const line = tx.items.find((l) => l.kodeBarang === stk.kodeBarang);
            if (line) masukGU += line.jumlah;
          }
          if (tx.tipe === 'KELUAR' && tx.lokasiAsal === clusterName) {
            const line = tx.items.find((l) => l.kodeBarang === stk.kodeBarang);
            if (line) keluarArea += line.jumlah;
          }
        }
      });

      const stokAwal = Math.max(0, stk.stokAkhir + keluarArea - masukGU);
      const stokAkhir = Math.max(0, stokAwal + masukGU - keluarArea);

      return {
        kodeBarang: stk.kodeBarang,
        namaBarang: stk.namaBarang,
        kategori: stk.kategori,
        satuan: stk.satuan,
        stokAwal,
        masukDariGudangUtama: masukGU,
        keluarArea,
        stokAkhir,
      };
    });
  }, [clusterStockList, transactions, clusterName, reportMonth, reportYear]);

  // Yearly Report for Cluster (Chained Jan -> Dec)
  const yearlyReportRows = useMemo(() => {
    return clusterStockList.map((stk) => {
      let rolling = 0;
      const months = [];

      for (let m = 1; m <= 12; m++) {
        let masuk = 0;
        let keluar = 0;

        transactions.forEach((tx) => {
          const txDate = new Date(tx.tanggal);
          if (txDate.getFullYear() === reportYear && txDate.getMonth() + 1 === m) {
            if (tx.tipe === 'KELUAR' && tx.lokasiAsal === 'Gudang Utama' && tx.lokasiTujuan === clusterName) {
              const line = tx.items.find((l) => l.kodeBarang === stk.kodeBarang);
              if (line) masuk += line.jumlah;
            }
            if (tx.tipe === 'KELUAR' && tx.lokasiAsal === clusterName) {
              const line = tx.items.find((l) => l.kodeBarang === stk.kodeBarang);
              if (line) keluar += line.jumlah;
            }
          }
        });

        const stokAwal = rolling;
        const stokAkhir = Math.max(0, stokAwal + masuk - keluar);
        rolling = stokAkhir;

        months.push({
          bulan: m,
          namaBulan: monthNames[m - 1],
          stokAwal,
          masuk,
          keluar,
          stokAkhir,
        });
      }

      return {
        kodeBarang: stk.kodeBarang,
        namaBarang: stk.namaBarang,
        satuan: stk.satuan,
        months,
        finalStokDesember: rolling,
      };
    });
  }, [clusterStockList, transactions, clusterName, reportYear]);

  // Export Cluster Monthly Excel
  const handleExportClusterMonthlyExcel = () => {
    const data = monthlyReportRows.map((r, i) => ({
      'No': i + 1,
      'Kode Barang': r.kodeBarang,
      'Nama Barang': r.namaBarang,
      'Kategori': r.kategori,
      'Satuan': r.satuan,
      'Stok Awal': r.stokAwal,
      'Masuk dari Gudang Utama': r.masukDariGudangUtama,
      'Keluar Area Detail': r.keluarArea,
      'Stok Akhir Cluster': r.stokAkhir,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Laporan ${clusterName}`);
    XLSX.writeFile(wb, `Laporan_Bulanan_${clusterName.replace(/\s+/g, '_')}_${monthNames[reportMonth - 1]}_${reportYear}.xlsx`);
  };

  return (
    <div className="space-y-6 relative">
      {/* Real-Time Fast Toast Notification Banner */}
      {toastNotification && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 bg-[#1E293B] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500/60 animate-in fade-in slide-in-from-top-3 duration-150">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-semibold">{toastNotification}</span>
          <button
            onClick={() => setToastNotification(null)}
            className="ml-2 text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cluster Header & Overview */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#714B67] text-white flex items-center justify-center shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">{clusterName}</h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Sinkron dengan GU
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gedung Bertingkat KPP - Penempatan stok transit & pemenuhan area lantai
            </p>
          </div>
        </div>

        {/* 3 Quick Cluster Stats */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Total Diterima dari GU</span>
            <span className="text-base font-black text-[#714B67]">
              {clusterStockList.reduce((sum, c) => sum + c.totalMasuk, 0)} Pcs
            </span>
          </div>

          <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Total Terpasang ke Area</span>
            <span className="text-base font-black text-blue-700">
              {clusterStockList.reduce((sum, c) => sum + c.totalKeluar, 0)} Pcs
            </span>
          </div>

          <div className="bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200">
            <span className="text-[11px] text-emerald-700 block font-bold">Stok Siap Pakai</span>
            <span className="text-base font-black text-emerald-700">
              {clusterStockList.reduce((sum, c) => sum + c.stokAkhir, 0)} Pcs
            </span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Pills */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-1.5 no-print">
        <button
          onClick={() => setSubTab('barang')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
            subTab === 'barang'
              ? 'bg-[#714B67] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Tap Barang {clusterName} (Sinkron GU)</span>
        </button>

        <button
          onClick={() => setSubTab('keluar')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
            subTab === 'keluar'
              ? 'bg-[#714B67] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Tap Barang Keluar {clusterName}</span>
        </button>

        <button
          onClick={() => setSubTab('laporan')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
            subTab === 'laporan'
              ? 'bg-[#714B67] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Tap Laporan {clusterName}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB TAB 1: BARANG CLUSTER (SINKRON GUDANG UTAMA) */}
      {/* ========================================================================= */}
      {subTab === 'barang' && (
        <div className="space-y-6">
          {/* Active Inventory List in this Cluster */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Katalog Stok Barang Tersedia di {clusterName}
                </h3>
                <p className="text-xs text-slate-500">
                  Data otomatis terisi dari barang keluar Gudang Utama menuju lokasi tujuan {clusterName}
                </p>
              </div>
            </div>

            {clusterStockList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                Belum ada barang yang didistribusikan dari Gudang Utama ke {clusterName}.
                <div className="mt-2 text-purple-700 font-semibold">
                  Kirim barang dari menu "Gudang Utama &gt; Barang Keluar GU" dengan tujuan {clusterName}.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FA] text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Kode Barang</th>
                      <th className="p-3">Nama Barang</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3 text-right">Total Masuk (GU)</th>
                      <th className="p-3 text-right">Terpakai ke Area</th>
                      <th className="p-3 text-right font-black text-emerald-700">Sisa Stok Cluster</th>
                      <th className="p-3 text-center">Label QR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clusterStockList.map((stk) => {
                      const masterItem = items.find((i) => i.kodeBarang === stk.kodeBarang);
                      return (
                        <tr key={stk.kodeBarang} className="hover:bg-purple-50/30 transition">
                          <td className="p-3 font-mono font-bold text-slate-700">{stk.kodeBarang}</td>
                          <td className="p-3 font-bold text-slate-900">{stk.namaBarang}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700">
                              {stk.kategori}
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold text-blue-700">
                            {stk.totalMasuk} {stk.satuan}
                          </td>
                          <td className="p-3 text-right font-semibold text-rose-700">
                            {stk.totalKeluar} {stk.satuan}
                          </td>
                          <td className="p-3 text-right font-black text-sm text-emerald-700">
                            {stk.stokAkhir} {stk.satuan}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedItemForQr(masterItem || null);
                                setSelectedItemStockOverride(stk.stokAkhir);
                              }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-[#714B67] hover:text-white text-[#714B67] border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Cetak QR</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Penerimaan Inbound History dari GU */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-800">
                Riwayat Pengiriman Masuk dari Gudang Utama ke {clusterName}
              </h3>
              <p className="text-xs text-slate-500">
                Tanggal barang masuk otomatis tersinkronisasi dari surat jalan Gudang Utama
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">No Surat Jalan GU</th>
                    <th className="p-3">Rincian Barang</th>
                    <th className="p-3">Petugas Pembawa</th>
                    <th className="p-3">Penerima di Cluster</th>
                    <th className="p-3 text-center">Surat Jalan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inboundFromGudangUtama.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono">{tx.tanggal} {tx.jam}</td>
                      <td className="p-3 font-mono font-bold text-[#714B67]">{tx.nomorSurat}</td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {tx.items.map((it, i) => (
                            <div key={i} className="text-slate-700">
                              <span className="font-bold">{it.namaBarang}</span> : {it.jumlah} {it.satuan}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{tx.namaPembawa || '-'}</td>
                      <td className="p-3 text-slate-600">{tx.namaPenerima || `PIC ${clusterName}`}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedTxForSuratJalan(tx)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold border"
                        >
                          Lihat Surat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 2: BARANG KELUAR CLUSTER */}
      {/* ========================================================================= */}
      {subTab === 'keluar' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-[#714B67]" />
              Form Pengeluaran Barang dari {clusterName} ke Area Tujuan
            </h3>
            <p className="text-xs text-slate-500">
              Menerbitkan surat keluar barang & surat jalan resmi untuk teknisi / pengguna area
            </p>
          </div>

          <form onSubmit={handleSaveOutboundCluster} className="space-y-5">
            {/* Outbound Cluster Form Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-purple-50/40 p-4 rounded-xl border border-purple-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Tanggal Keluar (Laptop)
                </label>
                <input
                  type="date"
                  value={outboundDate}
                  onChange={(e) => setOutboundDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#714B67] mb-1">
                  Area Tujuan Spesifik di {clusterName}
                </label>
                <input
                  type="text"
                  required
                  value={areaTujuanDetail}
                  onChange={(e) => setAreaTujuanDetail(e.target.value)}
                  placeholder="Contoh: Lantai 2 Unit 204 / Ruang Panel"
                  className="w-full px-3 py-2 text-xs border-2 border-[#714B67] rounded-lg bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Petugas Pembawa
                </label>
                <input
                  type="text"
                  required
                  value={namaPembawa}
                  onChange={(e) => setNamaPembawa(e.target.value)}
                  placeholder="Contoh: Joko Susilo (Teknisi)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Outbound Multiple Lines */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#714B67] text-white font-bold">
                  <tr>
                    <th className="p-3 w-48">Barang dari {clusterName}</th>
                    <th className="p-3">Nama Barang</th>
                    <th className="p-3 w-28 text-center">Sisa Stok Cluster</th>
                    <th className="p-3 w-28 text-center">Jumlah Keluar</th>
                    <th className="p-3 w-20 text-center">Satuan</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3 w-16 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {outboundLines.map((line, idx) => {
                    const stock = clusterStockList.find((c) => c.kodeBarang === line.kodeBarang);
                    return (
                      <tr key={idx}>
                        <td className="p-2.5">
                          <select
                            value={line.kodeBarang}
                            onChange={(e) => updateOutboundLine(idx, 'kodeBarang', e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                            required
                          >
                            <option value="">-- Pilih Barang di Cluster --</option>
                            {clusterStockList.map((c) => (
                              <option key={c.kodeBarang} value={c.kodeBarang}>
                                {c.kodeBarang} ({c.stokAkhir} {c.satuan})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            readOnly
                            value={line.namaBarang}
                            placeholder="Terisi otomatis..."
                            className="w-full p-1.5 border border-slate-200 bg-slate-50 rounded text-xs text-slate-700"
                          />
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-600">
                          {stock ? stock.stokAkhir : '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            max={stock ? stock.stokAkhir : undefined}
                            required
                            value={line.jumlah}
                            onChange={(e) => updateOutboundLine(idx, 'jumlah', Number(e.target.value))}
                            className="w-24 p-1.5 border border-slate-300 rounded text-xs text-center font-bold text-[#714B67]"
                          />
                        </td>
                        <td className="p-2.5 text-center font-semibold text-slate-600">
                          {line.satuan || 'Pcs'}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={line.keterangan || ''}
                            onChange={(e) => updateOutboundLine(idx, 'keterangan', e.target.value)}
                            placeholder="Pemasangan / Service"
                            className="w-full p-1.5 border border-slate-300 rounded text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeOutboundLine(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={addOutboundLine}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Baris Barang</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#714B67] hover:bg-[#5a3c52] text-white font-bold text-xs rounded-lg shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Surat Jalan & Surat Keluar {clusterName}</span>
              </button>
            </div>
          </form>

          {/* History of Outgoing Goods from this Cluster */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3">
              Riwayat Barang Keluar dari {clusterName} ke Area Tujuan
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Tanggal</th>
                    <th className="p-2.5">No Surat Jalan</th>
                    <th className="p-2.5">Area Tujuan Detail</th>
                    <th className="p-2.5">Nama Pembawa</th>
                    <th className="p-2.5">Barang</th>
                    <th className="p-2.5 text-center">Cetak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outboundFromCluster.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono">{tx.tanggal}</td>
                      <td className="p-2.5 font-mono font-bold text-[#714B67]">{tx.nomorSurat}</td>
                      <td className="p-2.5 font-bold text-slate-800">{tx.areaTujuanDetail}</td>
                      <td className="p-2.5 text-slate-600">{tx.namaPembawa}</td>
                      <td className="p-2.5">
                        {tx.items.map((i, idx) => (
                          <span key={idx} className="mr-2">
                            {i.namaBarang} ({i.jumlah} {i.satuan})
                          </span>
                        ))}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => setSelectedTxForSuratJalan(tx)}
                          className="px-2 py-0.5 bg-purple-50 hover:bg-[#714B67] hover:text-white text-[#714B67] rounded font-bold border text-[11px]"
                        >
                          Surat Jalan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 3: LAPORAN CLUSTER (BULANAN & TAHUNAN) */}
      {/* ========================================================================= */}
      {subTab === 'laporan' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-3 no-print">
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#714B67]" />
                Laporan Inventori {clusterName}
              </h3>
              <p className="text-xs text-slate-500">
                Laporan Bulanan & Tahunan berantai otomatis siap cetak & export Excel
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setLaporanSubMode('bulanan')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                    laporanSubMode === 'bulanan'
                      ? 'bg-white text-[#714B67] shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Laporan Bulanan
                </button>
                <button
                  onClick={() => setLaporanSubMode('tahunan')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                    laporanSubMode === 'tahunan'
                      ? 'bg-white text-[#714B67] shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Laporan Tahunan Berantai
                </button>
              </div>

              {laporanSubMode === 'bulanan' && (
                <>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(Number(e.target.value))}
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    {monthNames.map((name, i) => (
                      <option key={i} value={i + 1}>
                        Bulan {name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleExportClusterMonthlyExcel}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setIsReportPdfOpen(true)}
                className="px-3.5 py-1.5 bg-[#017E84] hover:bg-[#006e73] text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm ring-1 ring-emerald-300"
                title="Buka Preview Laporan Format A4 Resmi sebelum dicetak atau disimpan ke PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Preview PDF (Format A4)</span>
              </button>
            </div>
          </div>

          {/* Printable Report Section */}
          <div className="print-page select-text">
            {laporanSubMode === 'bulanan' ? (
              <div className="space-y-4">
                <div className="text-center pb-2 border-b border-slate-200">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    LAPORAN MUTASI BULANAN {clusterName.toUpperCase()} KPP
                  </h4>
                  <p className="text-xs text-slate-600 font-bold">
                    Periode: {monthNames[reportMonth - 1]} {reportYear}
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#714B67] text-white font-bold">
                      <tr>
                        <th className="p-2.5 text-center w-10">No</th>
                        <th className="p-2.5">Kode Barang</th>
                        <th className="p-2.5">Nama Barang</th>
                        <th className="p-2.5">Kategori</th>
                        <th className="p-2.5">Satuan</th>
                        <th className="p-2.5 text-right">Stok Awal</th>
                        <th className="p-2.5 text-right text-blue-200">Masuk dari GU</th>
                        <th className="p-2.5 text-right text-rose-200">Keluar ke Area</th>
                        <th className="p-2.5 text-right text-emerald-200 font-black">Stok Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyReportRows.map((r, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                          <td className="p-2.5 font-mono">{r.kodeBarang}</td>
                          <td className="p-2.5 font-bold text-slate-900">{r.namaBarang}</td>
                          <td className="p-2.5 text-slate-600">{r.kategori}</td>
                          <td className="p-2.5 text-slate-600">{r.satuan}</td>
                          <td className="p-2.5 text-right font-medium">{r.stokAwal}</td>
                          <td className="p-2.5 text-right font-bold text-blue-700">
                            {r.masukDariGudangUtama}
                          </td>
                          <td className="p-2.5 text-right font-bold text-rose-700">
                            {r.keluarArea}
                          </td>
                          <td className="p-2.5 text-right font-black text-emerald-700">
                            {r.stokAkhir}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Yearly Chained Matrix for Cluster */
              <div className="space-y-4">
                <div className="text-center pb-2 border-b border-slate-200">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    LAPORAN TAHUNAN AKUMULATIF {clusterName.toUpperCase()} {reportYear}
                  </h4>
                  <p className="text-xs text-slate-600 font-bold">
                    *Stok Akhir setiap bulan otomatis berantai menjadi Stok Awal bulan berikutnya
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-[#714B67] text-white font-bold">
                      <tr>
                        <th className="p-2 border border-purple-800">Kode & Nama Barang</th>
                        {monthNames.map((m, i) => (
                          <th key={i} className="p-2 border border-purple-800 text-center" colSpan={3}>
                            {m.slice(0, 3)}
                          </th>
                        ))}
                        <th className="p-2 border border-purple-800 text-center bg-emerald-800">
                          Akhir Des
                        </th>
                      </tr>
                      <tr className="bg-[#5a3c52] text-white text-[10px]">
                        <th className="p-1 border border-purple-800"></th>
                        {monthNames.map((_, i) => (
                          <React.Fragment key={i}>
                            <th className="p-1 border border-purple-800 text-center">Awl</th>
                            <th className="p-1 border border-purple-800 text-center text-blue-200">Msk</th>
                            <th className="p-1 border border-purple-800 text-center text-rose-200">Klr</th>
                          </React.Fragment>
                        ))}
                        <th className="p-1 border border-purple-800 text-center bg-emerald-900">Sisa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {yearlyReportRows.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-2 font-bold text-slate-900 border border-slate-200 whitespace-nowrap">
                            <span className="font-mono text-[10px] text-slate-500 block">{row.kodeBarang}</span>
                            {row.namaBarang}
                          </td>
                          {row.months.map((m, mi) => (
                            <React.Fragment key={mi}>
                              <td className="p-1.5 text-center border border-slate-200">{m.stokAwal}</td>
                              <td className="p-1.5 text-center border border-slate-200 font-semibold text-blue-700">
                                {m.masuk || '-'}
                              </td>
                              <td className="p-1.5 text-center border border-slate-200 font-semibold text-rose-700">
                                {m.keluar || '-'}
                              </td>
                            </React.Fragment>
                          ))}
                          <td className="p-2 text-center font-black text-emerald-800 bg-emerald-50 border border-slate-200">
                            {row.finalStokDesember}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: SURAT JALAN CLUSTER */}
      {selectedTxForSuratJalan && (
        <SuratJalanModal
          isOpen={!!selectedTxForSuratJalan}
          onClose={() => setSelectedTxForSuratJalan(null)}
          transaction={selectedTxForSuratJalan}
        />
      )}

      {/* MODAL: QR CODE STICKER */}
      {selectedItemForQr && (
        <QrCodePrintModal
          isOpen={!!selectedItemForQr}
          onClose={() => setSelectedItemForQr(null)}
          item={selectedItemForQr}
          currentStockOverride={selectedItemStockOverride}
          locationName={clusterName}
        />
      )}

      {/* MODAL: PREVIEW PDF LAPORAN FORMAT A4 */}
      {isReportPdfOpen && (
        <ReportPdfPreviewModal
          isOpen={isReportPdfOpen}
          onClose={() => setIsReportPdfOpen(false)}
          reportType={laporanSubMode === 'bulanan' ? 'bulanan_cluster' : 'tahunan_gudang_utama'}
          title={
            laporanSubMode === 'bulanan'
              ? `Laporan Mutasi Bulanan ${clusterName} KPP`
              : `Laporan Tahunan Akumulatif Berantai ${clusterName} ${reportYear}`
          }
          periodText={
            laporanSubMode === 'bulanan'
              ? `${monthNames[reportMonth - 1]} ${reportYear}`
              : `Januari - Desember ${reportYear}`
          }
          locationName={clusterName}
          clusterMonthlyRows={monthlyReportRows}
          yearlyRows={yearlyReportRows}
          operatorName={currentUser?.name || `Petugas ${clusterName}`}
        />
      )}
    </div>
  );
};
