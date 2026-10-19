import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  Filter,
  QrCode,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Trash2,
  Edit2,
  FolderOpen,
  Barcode,
  Calendar,
  CheckCircle2,
  Printer,
  ChevronRight,
  ExternalLink,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import {
  InventoryItem,
  StockTransaction,
  MonthlyReportRow,
  YearlyReportRow,
  TransactionLine,
} from '../types/inventory';
import { getDirectDriveImageUrl, DRIVE_UPLOAD_FOLDER_URL } from '../utils/driveHelper';
import {
  exportItemsToExcel,
  parseItemsFromExcel,
  exportMonthlyReportToExcel,
  exportYearlyReportToExcel,
} from '../utils/excelHelper';
import { QrCodePrintModal } from './QrCodePrintModal';
import { SuratJalanModal } from './SuratJalanModal';
import { ReportPdfPreviewModal } from './ReportPdfPreviewModal';
import { sendDataToSpreadsheet } from '../utils/spreadsheetSync';

interface GudangUtamaViewProps {
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  transactions: StockTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
  currentUser: any;
  defaultSubTab?: 'master' | 'masuk' | 'keluar' | 'laporan';
}

export const GudangUtamaView: React.FC<GudangUtamaViewProps> = ({
  items,
  setItems,
  transactions,
  setTransactions,
  currentUser,
  defaultSubTab = 'master',
}) => {
  const [subTab, setSubTab] = useState<'master' | 'masuk' | 'keluar' | 'laporan'>(defaultSubTab);

  // Search & Filter state for Master Barang
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemForQr, setSelectedItemForQr] = useState<InventoryItem | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
  const [selectedTxForSuratJalan, setSelectedTxForSuratJalan] = useState<StockTransaction | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isReportPdfOpen, setIsReportPdfOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const executeDirectDelete = (id: string, kodeBarang: string, namaBarang?: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    sendDataToSpreadsheet('deleteItem', { id, kodeBarang });
    setIsItemModalOpen(false);
    setEditingItem(null);
    setItemToDelete(null);
    showToast(`✓ Barang ${namaBarang || kodeBarang} (${kodeBarang}) berhasil dihapus dari Master Barang & Spreadsheet.`);
  };

  // Form Barang Masuk state (Multiple items, Auto-date)
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [inboundDate, setInboundDate] = useState(todayDate);
  const [inboundKeteranganGeneral, setInboundKeteranganGeneral] = useState('Penerimaan rutin Gudang Utama');
  const [inboundLines, setInboundLines] = useState<TransactionLine[]>([
    { kodeBarang: '', namaBarang: '', jumlah: 1, satuan: 'Pcs', keterangan: '' },
  ]);
  const [barcodeInputVal, setBarcodeInputVal] = useState('');

  // Form Barang Keluar state (Multiple items, Destination Cluster 1-4)
  const [outboundDate, setOutboundDate] = useState(todayDate);
  const [outboundDestination, setOutboundDestination] = useState<'Cluster 1' | 'Cluster 2' | 'Cluster 3' | 'Cluster 4'>('Cluster 1');
  const [outboundPembawa, setOutboundPembawa] = useState('');
  const [outboundPenerima, setOutboundPenerima] = useState('');
  const [outboundKeteranganGeneral, setOutboundKeteranganGeneral] = useState('Distribusi berkala ke Cluster');
  const [outboundLines, setOutboundLines] = useState<TransactionLine[]>([
    { kodeBarang: '', namaBarang: '', jumlah: 1, satuan: 'Pcs', keterangan: '' },
  ]);

  // Laporan state
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();
  const [laporanSubMode, setLaporanSubMode] = useState<'bulanan' | 'tahunan'>('bulanan');
  const [reportMonth, setReportMonth] = useState<number>(currentMonthNum);
  const [reportYear, setReportYear] = useState<number>(currentYearNum);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.kategori));
    return ['ALL', ...Array.from(set)];
  }, [items]);

  // Filtered master items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kategori.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === 'ALL' || item.kategori === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  // Handle Excel Import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseItemsFromExcel(file);
      const newItems: InventoryItem[] = parsed.map((p, idx) => ({
        id: `item_imp_${Date.now()}_${idx}`,
        kodeBarang: p.kodeBarang || `BRG-${Date.now().toString().slice(-4)}`,
        namaBarang: p.namaBarang || 'Barang Baru',
        kategori: p.kategori || 'Umum',
        satuan: p.satuan || 'Pcs',
        gambarUrl: p.gambarUrl || '',
        jumlahMasukGudangUtama: p.jumlahMasukGudangUtama || 0,
        stokAkhirGudangUtama: p.stokAkhirGudangUtama || 0,
        minStok: 5,
        deskripsi: p.deskripsi || '',
        tanggalInput: todayDate,
        updatedAt: todayDate,
      }));

      // Merge avoiding duplicate kodeBarang
      setItems((prev) => {
        const existingCodes = new Set(prev.map((i) => i.kodeBarang));
        const nonDuplicates = newItems.filter((i) => !existingCodes.has(i.kodeBarang));
        return [...prev, ...nonDuplicates];
      });

      alert(`Berhasil mengimpor ${newItems.length} barang dari file Excel!`);
    } catch (err) {
      alert(`Gagal mengimpor Excel: ${err}`);
    }
  };

  // Add line to Inbound
  const addInboundLine = () => {
    setInboundLines([...inboundLines, { kodeBarang: '', namaBarang: '', jumlah: 1, satuan: 'Pcs', keterangan: '' }]);
  };

  const updateInboundLine = (idx: number, field: keyof TransactionLine, value: any) => {
    const updated = [...inboundLines];
    if (field === 'kodeBarang') {
      const matched = items.find((i) => i.kodeBarang === value);
      updated[idx].kodeBarang = value;
      if (matched) {
        updated[idx].namaBarang = matched.namaBarang;
        updated[idx].satuan = matched.satuan;
      }
    } else {
      (updated[idx] as any)[field] = value;
    }
    setInboundLines(updated);
  };

  const removeInboundLine = (idx: number) => {
    if (inboundLines.length <= 1) return;
    setInboundLines(inboundLines.filter((_, i) => i !== idx));
  };

  // Barcode quick add handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInputVal) return;
    const match = items.find(
      (i) => i.kodeBarang.toLowerCase() === barcodeInputVal.trim().toLowerCase()
    );
    if (match) {
      // If empty first row exists
      if (inboundLines.length === 1 && !inboundLines[0].kodeBarang) {
        setInboundLines([{ kodeBarang: match.kodeBarang, namaBarang: match.namaBarang, jumlah: 1, satuan: match.satuan, keterangan: 'Scan Barcode' }]);
      } else {
        setInboundLines([
          ...inboundLines,
          { kodeBarang: match.kodeBarang, namaBarang: match.namaBarang, jumlah: 1, satuan: match.satuan, keterangan: 'Scan Barcode' },
        ]);
      }
      setBarcodeInputVal('');
    } else {
      alert(`Kode barang barcode "${barcodeInputVal}" tidak ditemukan dalam Master Barang.`);
    }
  };

  // Submit Barang Masuk Gudang Utama
  const handleSaveInbound = (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = inboundLines.filter((l) => l.kodeBarang && l.jumlah > 0);
    if (validLines.length === 0) {
      alert('Pilih minimal 1 barang dengan jumlah lebih dari 0.');
      return;
    }

    const noBukti = `BM-GU/${inboundDate.replace(/-/g, '')}/${Math.floor(100 + Math.random() * 900)}`;
    const newTx: StockTransaction = {
      id: `tx_in_${Date.now()}`,
      nomorSurat: noBukti,
      tanggal: inboundDate,
      jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      tipe: 'MASUK',
      lokasiAsal: 'Gudang Utama',
      lokasiTujuan: 'Gudang Utama',
      namaPembawa: 'Suplier Logistik',
      namaPenerima: currentUser?.name || 'Admin GU',
      keterangan: inboundKeteranganGeneral,
      dibuatOleh: currentUser?.name || 'Admin Gudang',
      status: 'SELESAI',
      items: validLines,
    };

    // Update Master Items Stock
    setItems((prev) =>
      prev.map((item) => {
        const added = validLines.find((l) => l.kodeBarang === item.kodeBarang);
        if (added) {
          return {
            ...item,
            jumlahMasukGudangUtama: item.jumlahMasukGudangUtama + Number(added.jumlah),
            stokAkhirGudangUtama: item.stokAkhirGudangUtama + Number(added.jumlah),
            updatedAt: inboundDate,
          };
        }
        return item;
      })
    );

    setTransactions([newTx, ...transactions]);
    // Rekam langsung ke Google Spreadsheet secara real-time
    sendDataToSpreadsheet('inboundGudangUtama', newTx);
    showToast(`✓ Barang Masuk berhasil dicatat & terekam ke Spreadsheet (No Bukti: ${noBukti})`);
    setInboundLines([{ kodeBarang: '', namaBarang: '', jumlah: 1, satuan: 'Pcs', keterangan: '' }]);
  };

  // Add line to Outbound
  const addOutboundLine = () => {
    setOutboundLines([...outboundLines, { kodeBarang: '', namaBarang: '', jumlah: 1, satuan: 'Pcs', keterangan: '' }]);
  };

  const updateOutboundLine = (idx: number, field: keyof TransactionLine, value: any) => {
    const updated = [...outboundLines];
    if (field === 'kodeBarang') {
      const matched = items.find((i) => i.kodeBarang === value);
      updated[idx].kodeBarang = value;
      if (matched) {
        updated[idx].namaBarang = matched.namaBarang;
        updated[idx].satuan = matched.satuan;
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

  // Submit Barang Keluar Gudang Utama to Cluster
  const handleSaveOutbound = (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = outboundLines.filter((l) => l.kodeBarang && l.jumlah > 0);
    if (validLines.length === 0) {
      alert('Pilih minimal 1 barang dengan jumlah lebih dari 0.');
      return;
    }

    // Check stock availability
    for (const line of validLines) {
      const match = items.find((i) => i.kodeBarang === line.kodeBarang);
      if (!match || match.stokAkhirGudangUtama < line.jumlah) {
        alert(
          `Stok tidak mencukupi untuk ${line.namaBarang || line.kodeBarang}. Sisa stok GU: ${
            match?.stokAkhirGudangUtama || 0
          }, diminta: ${line.jumlah}`
        );
        return;
      }
    }

    const clusterCode = outboundDestination.replace('Cluster ', 'C');
    const noSuratJalan = `SJ-GU-${clusterCode}/${outboundDate.replace(/-/g, '')}/${Math.floor(100 + Math.random() * 900)}`;

    const newTx: StockTransaction = {
      id: `tx_out_${Date.now()}`,
      nomorSurat: noSuratJalan,
      tanggal: outboundDate,
      jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      tipe: 'KELUAR',
      lokasiAsal: 'Gudang Utama',
      lokasiTujuan: outboundDestination,
      namaPembawa: outboundPembawa.trim() || 'Kurir Operasional KPP',
      namaPenerima: outboundPenerima.trim() || `PIC ${outboundDestination}`,
      keterangan: outboundKeteranganGeneral,
      dibuatOleh: currentUser?.name || 'Admin GU',
      status: 'SELESAI',
      items: validLines,
    };

    // Deduct stock from Gudang Utama
    setItems((prev) =>
      prev.map((item) => {
        const sent = validLines.find((l) => l.kodeBarang === item.kodeBarang);
        if (sent) {
          return {
            ...item,
            stokAkhirGudangUtama: Math.max(0, item.stokAkhirGudangUtama - Number(sent.jumlah)),
            updatedAt: outboundDate,
          };
        }
        return item;
      })
    );

    // Otomatis tercatat di transactions -> secara otomatis terisi di tab Cluster tujuan!
    setTransactions([newTx, ...transactions]);
    setSelectedTxForSuratJalan(newTx);
    // Rekam langsung ke Google Spreadsheet & Sheet Cluster Tujuan secara real-time
    sendDataToSpreadsheet('outboundGudangUtama', newTx);
    showToast(
      `✓ Barang Keluar berhasil terekam ke Spreadsheet (No Surat: ${noSuratJalan}) & stok di ${outboundDestination} otomatis terisi.`
    );
    setOutboundLines([{ kodeBarang: '', namaBarang: '', jumlah: 1, satuan: 'Pcs', keterangan: '' }]);
  };

  // Calculate Monthly Report rows
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const monthlyReportRows: MonthlyReportRow[] = useMemo(() => {
    return items.map((item) => {
      let masuk = 0;
      let keluarC1 = 0;
      let keluarC2 = 0;
      let keluarC3 = 0;
      let keluarC4 = 0;

      transactions.forEach((tx) => {
        const txDate = new Date(tx.tanggal);
        const txMonth = txDate.getMonth() + 1;
        const txYear = txDate.getFullYear();

        if (txYear === reportYear && txMonth === reportMonth) {
          if (tx.tipe === 'MASUK' && tx.lokasiTujuan === 'Gudang Utama') {
            const line = tx.items.find((l) => l.kodeBarang === item.kodeBarang);
            if (line) masuk += line.jumlah;
          }
          if (tx.tipe === 'KELUAR' && tx.lokasiAsal === 'Gudang Utama') {
            const line = tx.items.find((l) => l.kodeBarang === item.kodeBarang);
            if (line) {
              if (tx.lokasiTujuan === 'Cluster 1') keluarC1 += line.jumlah;
              else if (tx.lokasiTujuan === 'Cluster 2') keluarC2 += line.jumlah;
              else if (tx.lokasiTujuan === 'Cluster 3') keluarC3 += line.jumlah;
              else if (tx.lokasiTujuan === 'Cluster 4') keluarC4 += line.jumlah;
            }
          }
        }
      });

      const totalKeluar = keluarC1 + keluarC2 + keluarC3 + keluarC4;
      const stokAwal = Math.max(0, item.stokAkhirGudangUtama + totalKeluar - masuk);
      const stokAkhir = Math.max(0, stokAwal + masuk - totalKeluar);

      return {
        kodeBarang: item.kodeBarang,
        namaBarang: item.namaBarang,
        kategori: item.kategori,
        satuan: item.satuan,
        stokAwal,
        masuk,
        keluarCluster1: keluarC1,
        keluarCluster2: keluarC2,
        keluarCluster3: keluarC3,
        keluarCluster4: keluarC4,
        totalKeluar,
        stokAkhir,
      };
    });
  }, [items, transactions, reportMonth, reportYear]);

  // Calculate Yearly Report rows (chained Jan -> Dec)
  const yearlyReportRows: YearlyReportRow[] = useMemo(() => {
    return items.map((item) => {
      let rollingStock = item.jumlahMasukGudangUtama > 0 ? Math.round(item.jumlahMasukGudangUtama * 0.7) : 0;
      const monthsData = [];

      for (let m = 1; m <= 12; m++) {
        let masuk = 0;
        let keluar = 0;

        transactions.forEach((tx) => {
          const txDate = new Date(tx.tanggal);
          if (txDate.getFullYear() === reportYear && txDate.getMonth() + 1 === m) {
            if (tx.tipe === 'MASUK' && tx.lokasiTujuan === 'Gudang Utama') {
              const l = tx.items.find((x) => x.kodeBarang === item.kodeBarang);
              if (l) masuk += l.jumlah;
            }
            if (tx.tipe === 'KELUAR' && tx.lokasiAsal === 'Gudang Utama') {
              const l = tx.items.find((x) => x.kodeBarang === item.kodeBarang);
              if (l) keluar += l.jumlah;
            }
          }
        });

        const stokAwal = rollingStock;
        const stokAkhir = Math.max(0, stokAwal + masuk - keluar);
        rollingStock = stokAkhir; // Carry forward to next month!

        monthsData.push({
          bulan: m,
          namaBulan: monthNames[m - 1],
          stokAwal,
          masuk,
          keluar,
          stokAkhir,
        });
      }

      return {
        kodeBarang: item.kodeBarang,
        namaBarang: item.namaBarang,
        satuan: item.satuan,
        months: monthsData,
        finalStokDesember: rollingStock,
      };
    });
  }, [items, transactions, reportYear]);

  return (
    <div className="space-y-6 relative">
      {/* Real-Time Fast Toast Notification Banner */}
      {toastNotification && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 bg-[#1E293B] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500/60 animate-in fade-in slide-in-from-top-3 duration-150">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-semibold">{toastNotification}</span>
          <button
            onClick={() => setToastNotification(null)}
            className="ml-2 text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub Tab Navigation (Odoo Style Pills) */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-1.5 no-print">
        <button
          onClick={() => setSubTab('master')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
            subTab === 'master'
              ? 'bg-[#714B67] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Sub Tab Master Barang</span>
        </button>

        <button
          onClick={() => setSubTab('masuk')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
            subTab === 'masuk'
              ? 'bg-[#714B67] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>Sub Tab Barang Masuk</span>
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
          <span>Sub Tab Barang Keluar</span>
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
          <span>Sub Tab Laporan GU</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB TAB 1: MASTER BARANG */}
      {/* ========================================================================= */}
      {subTab === 'master' && (
        <div className="space-y-4">
          {/* Top Actions Bar (Odoo Control Panel) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsItemModalOpen(true);
                }}
                className="px-3.5 py-2 bg-[#714B67] hover:bg-[#5a3c52] text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Input Barang Baru</span>
              </button>

              <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import Excel (.xlsx)</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => exportItemsToExcel(items)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>

              {/* Link ke Folder Google Drive */}
              <a
                href={DRIVE_UPLOAD_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                title="Buka Folder Google Drive Bukti & Gambar Barang"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>Folder Drive Foto</span>
                <ExternalLink className="w-3 h-3 text-amber-500" />
              </a>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kode, nama barang..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67] w-48 sm:w-60"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67] bg-white text-slate-700"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'ALL' ? 'Semua Kategori' : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Master Barang Table (List View) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-16 text-center">Gambar</th>
                    <th className="p-3">Kode Barang</th>
                    <th className="p-3">Nama Barang</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Satuan</th>
                    <th className="p-3 text-right">Jumlah Masuk</th>
                    <th className="p-3 text-right">Stok Akhir</th>
                    <th className="p-3 text-center">QR Code</th>
                    <th className="p-3 text-center">Aksi & Riwayat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const imgUrl = getDirectDriveImageUrl(item.gambarUrl);
                    return (
                      <tr key={item.id} className="hover:bg-purple-50/30 transition">
                        {/* Image Preview */}
                        <td className="p-3 text-center">
                          <div className="w-11 h-11 mx-auto rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={item.namaBarang}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100';
                                }}
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                        </td>

                        {/* Kode */}
                        <td className="p-3 font-mono font-bold text-slate-700">
                          {item.kodeBarang}
                        </td>

                        {/* Nama */}
                        <td className="p-3">
                          <div className="font-bold text-slate-900 leading-tight">
                            {item.namaBarang}
                          </div>
                          {item.deskripsi && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                              {item.deskripsi}
                            </div>
                          )}
                        </td>

                        {/* Kategori */}
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                            {item.kategori}
                          </span>
                        </td>

                        {/* Satuan */}
                        <td className="p-3 text-slate-600 font-medium">{item.satuan}</td>

                        {/* Masuk */}
                        <td className="p-3 text-right font-semibold text-blue-700">
                          {item.jumlahMasukGudangUtama}
                        </td>

                        {/* Stok Akhir */}
                        <td className="p-3 text-right font-black text-sm text-emerald-700">
                          {item.stokAkhirGudangUtama}
                        </td>

                        {/* QR Code Action */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedItemForQr(item)}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-[#714B67] hover:text-white text-[#714B67] border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto"
                            title="Tampilkan, Edit & Cetak QR Code Fisik"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Cetak QR</span>
                          </button>
                        </td>

                        {/* Actions & History */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedItemForHistory(item)}
                              className="p-1.5 text-slate-600 hover:text-[#714B67] hover:bg-slate-100 rounded-md transition"
                              title="Riwayat Mutasi Transaksi Barang"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setIsItemModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md transition"
                              title="Edit Data Barang"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setItemToDelete(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                              title="Hapus Barang Ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 2: BARANG MASUK GUDANG UTAMA */}
      {/* ========================================================================= */}
      {subTab === 'masuk' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-blue-600" />
                Form Penerimaan Barang Masuk ke Gudang Utama
              </h3>
              <p className="text-xs text-slate-500">
                Pencatatan multi-item dalam satu tanggal otomatis dari laptop dengan dukungan Barcode scan
              </p>
            </div>

            {/* Quick Barcode Scanner Reader Simulation */}
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={barcodeInputVal}
                  onChange={(e) => setBarcodeInputVal(e.target.value)}
                  placeholder="Ketik/Scan Barcode..."
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67] font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#017E84] hover:bg-[#006e73] text-white text-xs font-bold rounded-lg transition"
              >
                + Tambah via Barcode
              </button>
            </form>
          </div>

          <form onSubmit={handleSaveInbound} className="space-y-5">
            {/* General Inbound Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Tanggal Barang Masuk (Otomatis Laptop)
                </label>
                <input
                  type="date"
                  value={inboundDate}
                  onChange={(e) => setInboundDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67] bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Penerimaan / No. PO / Suplier
                </label>
                <input
                  type="text"
                  value={inboundKeteranganGeneral}
                  onChange={(e) => setInboundKeteranganGeneral(e.target.value)}
                  placeholder="Contoh: PO-2026/04 Suplier PT Elektrika Perkasa"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#714B67] bg-white"
                />
              </div>
            </div>

            {/* Multi-Item Lines Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#714B67] text-white font-bold">
                  <tr>
                    <th className="p-3 w-48">Kode Barang</th>
                    <th className="p-3">Nama Barang</th>
                    <th className="p-3 w-28 text-center">Jumlah Masuk</th>
                    <th className="p-3 w-24 text-center">Satuan</th>
                    <th className="p-3">Keterangan Spesifik</th>
                    <th className="p-3 w-16 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {inboundLines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5">
                        <select
                          value={line.kodeBarang}
                          onChange={(e) => updateInboundLine(idx, 'kodeBarang', e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                          required
                        >
                          <option value="">-- Pilih Barang --</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.kodeBarang}>
                              {it.kodeBarang} - {it.namaBarang}
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
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="1"
                          required
                          value={line.jumlah}
                          onChange={(e) => updateInboundLine(idx, 'jumlah', Number(e.target.value))}
                          className="w-24 p-1.5 border border-slate-300 rounded text-xs text-center font-bold"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="font-semibold text-slate-600">{line.satuan || 'Pcs'}</span>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={line.keterangan || ''}
                          onChange={(e) => updateInboundLine(idx, 'keterangan', e.target.value)}
                          placeholder="Batch PO / Kondisi"
                          className="w-full p-1.5 border border-slate-300 rounded text-xs"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeInboundLine(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={addInboundLine}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Baris Barang</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#714B67] hover:bg-[#5a3c52] text-white font-bold text-xs rounded-lg shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Penerimaan Barang Masuk</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 3: BARANG KELUAR GUDANG UTAMA (KE CLUSTER 1, 2, 3, 4) */}
      {/* ========================================================================= */}
      {subTab === 'keluar' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-[#714B67]" />
                Form Pengeluaran Barang GU ke Cluster 1, 2, 3, 4
              </h3>
              <p className="text-xs text-slate-500">
                Barang yang dikeluarkan otomatis menambah stok masuk pada tab Cluster tujuan serta menerbitkan Surat Jalan resmi
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveOutbound} className="space-y-5">
            {/* Metadata Outbound */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-purple-50/50 p-4 rounded-xl border border-purple-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Pengeluaran (Laptop)
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
                  Lokasi Tujuan (Sinkron Otomatis)
                </label>
                <select
                  value={outboundDestination}
                  onChange={(e) => setOutboundDestination(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border-2 border-[#714B67] rounded-lg bg-white font-bold text-[#714B67]"
                >
                  <option value="Cluster 1">Cluster 1</option>
                  <option value="Cluster 2">Cluster 2</option>
                  <option value="Cluster 3">Cluster 3</option>
                  <option value="Cluster 4">Cluster 4</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Petugas Pembawa
                </label>
                <input
                  type="text"
                  required
                  value={outboundPembawa}
                  onChange={(e) => setOutboundPembawa(e.target.value)}
                  placeholder="Contoh: Agus Triono (Kurir)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Penerima (PIC Cluster)
                </label>
                <input
                  type="text"
                  value={outboundPenerima}
                  onChange={(e) => setOutboundPenerima(e.target.value)}
                  placeholder={`Contoh: PIC ${outboundDestination}`}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Outbound Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#017E84] text-white font-bold">
                  <tr>
                    <th className="p-3 w-48">Kode Barang</th>
                    <th className="p-3">Nama Barang</th>
                    <th className="p-3 w-28 text-center">Sisa Stok GU</th>
                    <th className="p-3 w-28 text-center">Jumlah Keluar</th>
                    <th className="p-3 w-24 text-center">Satuan</th>
                    <th className="p-3">Keterangan / Keperluan</th>
                    <th className="p-3 w-16 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {outboundLines.map((line, idx) => {
                    const match = items.find((i) => i.kodeBarang === line.kodeBarang);
                    return (
                      <tr key={idx}>
                        <td className="p-2.5">
                          <select
                            value={line.kodeBarang}
                            onChange={(e) => updateOutboundLine(idx, 'kodeBarang', e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                            required
                          >
                            <option value="">-- Pilih Barang --</option>
                            {items.map((it) => (
                              <option key={it.id} value={it.kodeBarang}>
                                {it.kodeBarang} ({it.stokAkhirGudangUtama} {it.satuan})
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
                          {match ? match.stokAkhirGudangUtama : '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            max={match ? match.stokAkhirGudangUtama : undefined}
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
                            placeholder="Keperluan lantai / unit..."
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
                <span>Kirim Barang & Terbitkan Surat Jalan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB TAB 4: LAPORAN GUDANG UTAMA (BULANAN & TAHUNAN) */}
      {/* ========================================================================= */}
      {subTab === 'laporan' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 gap-3 no-print">
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#714B67]" />
                Laporan Inventori Gudang Utama KPP
              </h3>
              <p className="text-xs text-slate-500">
                Laporan Bulanan & Tahunan berantai otomatis dengan export Excel (.xlsx) dan Cetak Rapi
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

              {laporanSubMode === 'bulanan' ? (
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
                    onClick={() =>
                      exportMonthlyReportToExcel(
                        monthlyReportRows,
                        monthNames[reportMonth - 1],
                        reportYear,
                        'Gudang_Utama'
                      )
                    }
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    exportYearlyReportToExcel(yearlyReportRows, reportYear, 'Gudang_Utama')
                  }
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
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

          {/* PRINTABLE REPORT PREVIEW */}
          <div className="print-page select-text">
            {laporanSubMode === 'bulanan' ? (
              <div className="space-y-4">
                <div className="text-center pb-2 border-b border-slate-200">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    LAPORAN MUTASI BULANAN GUDANG UTAMA KPP
                  </h4>
                  <p className="text-xs text-slate-600 font-bold">
                    Periode: {monthNames[reportMonth - 1]} {reportYear} | Lokasi: Gudang Utama
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#714B67] text-white font-bold">
                      <tr>
                        <th className="p-2.5 text-center w-10">No</th>
                        <th className="p-2.5">Kode</th>
                        <th className="p-2.5">Nama Barang</th>
                        <th className="p-2.5">Sat</th>
                        <th className="p-2.5 text-right">Stok Awal</th>
                        <th className="p-2.5 text-right text-blue-200">Masuk GU</th>
                        <th className="p-2.5 text-right">Ke Cluster 1</th>
                        <th className="p-2.5 text-right">Ke Cluster 2</th>
                        <th className="p-2.5 text-right">Ke Cluster 3</th>
                        <th className="p-2.5 text-right">Ke Cluster 4</th>
                        <th className="p-2.5 text-right text-amber-200">Total Keluar</th>
                        <th className="p-2.5 text-right text-emerald-200">Stok Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyReportRows.map((r, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                          <td className="p-2.5 font-mono">{r.kodeBarang}</td>
                          <td className="p-2.5 font-bold text-slate-900">{r.namaBarang}</td>
                          <td className="p-2.5 text-slate-600">{r.satuan}</td>
                          <td className="p-2.5 text-right font-medium">{r.stokAwal}</td>
                          <td className="p-2.5 text-right font-bold text-blue-700">{r.masuk}</td>
                          <td className="p-2.5 text-right text-slate-700">{r.keluarCluster1}</td>
                          <td className="p-2.5 text-right text-slate-700">{r.keluarCluster2}</td>
                          <td className="p-2.5 text-right text-slate-700">{r.keluarCluster3}</td>
                          <td className="p-2.5 text-right text-slate-700">{r.keluarCluster4}</td>
                          <td className="p-2.5 text-right font-bold text-rose-700">{r.totalKeluar}</td>
                          <td className="p-2.5 text-right font-black text-emerald-700">{r.stokAkhir}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Yearly Matrix Table */
              <div className="space-y-4">
                <div className="text-center pb-2 border-b border-slate-200">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    LAPORAN TAHUNAN AKUMULATIF BERANTAI JANUARI - DESEMBER {reportYear}
                  </h4>
                  <p className="text-xs text-slate-600 font-bold">
                    *Stok Akhir setiap bulan otomatis menjadi Stok Awal bulan berikutnya
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

      {/* ========================================================================= */}
      {/* MODAL: INPUT / EDIT MASTER BARANG */}
      {/* ========================================================================= */}
      {isItemModalOpen && (
        <ItemFormModal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
          initialItem={editingItem}
          onDeleteItem={(id, kodeBarang) => executeDirectDelete(id, kodeBarang, editingItem?.namaBarang)}
          onSaveItem={(saved) => {
            if (editingItem) {
              setItems((prev) => prev.map((it) => (it.id === saved.id ? saved : it)));
              showToast(`✓ Perubahan barang ${saved.kodeBarang} tersimpan & terekam ke Spreadsheet.`);
            } else {
              setItems((prev) => [saved, ...prev]);
              showToast(`✓ Barang baru ${saved.kodeBarang} ditambahkan & terekam ke Spreadsheet.`);
            }
            // Rekam langsung ke Google Spreadsheet secara real-time
            sendDataToSpreadsheet('saveItem', saved);
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS BARANG (IN-APP DIALOG) */}
      {/* ========================================================================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-bold text-base text-slate-900">
                Hapus Barang dari Master Barang?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus <strong>"{itemToDelete.namaBarang}" ({itemToDelete.kodeBarang})</strong> secara permanen?
                Data akan dihapus dari daftar master dan Google Spreadsheet secara real-time.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeDirectDelete(itemToDelete.id, itemToDelete.kodeBarang, itemToDelete.namaBarang)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
              >
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW PDF LAPORAN FORMAT A4 */}
      {/* ========================================================================= */}
      {isReportPdfOpen && (
        <ReportPdfPreviewModal
          isOpen={isReportPdfOpen}
          onClose={() => setIsReportPdfOpen(false)}
          reportType={laporanSubMode === 'bulanan' ? 'bulanan_gudang_utama' : 'tahunan_gudang_utama'}
          title={
            laporanSubMode === 'bulanan'
              ? 'Laporan Mutasi Bulanan Gudang Utama KPP'
              : `Laporan Tahunan Akumulatif Berantai Gudang Utama ${reportYear}`
          }
          periodText={
            laporanSubMode === 'bulanan'
              ? `${monthNames[reportMonth - 1]} ${reportYear}`
              : `Januari - Desember ${reportYear}`
          }
          locationName="Gudang Utama KPP"
          monthlyRows={monthlyReportRows}
          yearlyRows={yearlyReportRows}
          operatorName={currentUser?.name || 'Petugas Gudang Utama'}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: QR CODE STICKER PRINT */}
      {/* ========================================================================= */}
      {selectedItemForQr && (
        <QrCodePrintModal
          isOpen={!!selectedItemForQr}
          onClose={() => setSelectedItemForQr(null)}
          item={selectedItemForQr}
          locationName="Gudang Utama KPP"
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: SURAT JALAN / SURAT KELUAR */}
      {/* ========================================================================= */}
      {selectedTxForSuratJalan && (
        <SuratJalanModal
          isOpen={!!selectedTxForSuratJalan}
          onClose={() => setSelectedTxForSuratJalan(null)}
          transaction={selectedTxForSuratJalan}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRANSACTION HISTORY KARTU STOK */}
      {/* ========================================================================= */}
      {selectedItemForHistory && (
        <ItemHistoryModal
          isOpen={!!selectedItemForHistory}
          onClose={() => setSelectedItemForHistory(null)}
          item={selectedItemForHistory}
          transactions={transactions}
        />
      )}
    </div>
  );
};

// Sub-component: Item Form Modal
interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItem: InventoryItem | null;
  onSaveItem: (item: InventoryItem) => void;
  onDeleteItem?: (id: string, kodeBarang: string, namaBarang?: string) => void;
}

const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  initialItem,
  onSaveItem,
  onDeleteItem,
}) => {
  const [kodeBarang, setKodeBarang] = useState(initialItem?.kodeBarang || `KPP-MAT-${Math.floor(100 + Math.random() * 900)}`);
  const [namaBarang, setNamaBarang] = useState(initialItem?.namaBarang || '');
  const [kategori, setKategori] = useState(initialItem?.kategori || 'Elektrikal & ME');
  const [satuan, setSatuan] = useState(initialItem?.satuan || 'Pcs');
  const [gambarUrl, setGambarUrl] = useState(initialItem?.gambarUrl || '');
  const [jumlahMasuk, setJumlahMasuk] = useState(initialItem?.jumlahMasukGudangUtama?.toString() || '0');
  const [stokAkhir, setStokAkhir] = useState(initialItem?.stokAkhirGudangUtama?.toString() || '0');
  const [minStok, setMinStok] = useState(initialItem?.minStok?.toString() || '5');
  const [deskripsi, setDeskripsi] = useState(initialItem?.deskripsi || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync internal state if initialItem changes
  React.useEffect(() => {
    if (initialItem) {
      setKodeBarang(initialItem.kodeBarang);
      setNamaBarang(initialItem.namaBarang);
      setKategori(initialItem.kategori || 'Elektrikal & ME');
      setSatuan(initialItem.satuan || 'Pcs');
      setGambarUrl(initialItem.gambarUrl || '');
      setJumlahMasuk(initialItem.jumlahMasukGudangUtama?.toString() || '0');
      setStokAkhir(initialItem.stokAkhirGudangUtama?.toString() || '0');
      setMinStok(initialItem.minStok?.toString() || '5');
      setDeskripsi(initialItem.deskripsi || '');
      setShowDeleteConfirm(false);
    } else {
      setKodeBarang(`KPP-MAT-${Math.floor(100 + Math.random() * 900)}`);
      setNamaBarang('');
      setKategori('Elektrikal & ME');
      setSatuan('Pcs');
      setGambarUrl('');
      setJumlahMasuk('0');
      setStokAkhir('0');
      setMinStok('5');
      setDeskripsi('');
      setShowDeleteConfirm(false);
    }
  }, [initialItem]);

  if (!isOpen) return null;

  const previewThumbnail = getDirectDriveImageUrl(gambarUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kodeBarang || !namaBarang) return;

    const item: InventoryItem = {
      id: initialItem?.id || `item_${Date.now()}`,
      kodeBarang: kodeBarang.trim(),
      namaBarang: namaBarang.trim(),
      kategori,
      satuan,
      gambarUrl: gambarUrl.trim(),
      jumlahMasukGudangUtama: Number(jumlahMasuk) || 0,
      stokAkhirGudangUtama: Number(stokAkhir) || 0,
      minStok: Number(minStok) || 5,
      deskripsi: deskripsi.trim(),
      tanggalInput: initialItem?.tanggalInput || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    onSaveItem(item);
  };

  const executeDelete = () => {
    if (!initialItem || !onDeleteItem) return;
    onDeleteItem(initialItem.id, initialItem.kodeBarang, initialItem.namaBarang);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Edit Title & Top Delete Action if editing */}
        <div className="bg-[#714B67] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-purple-200" />
            <div>
              <div className="font-bold text-sm">
                {initialItem ? 'Edit Data Master Barang' : 'Input Master Barang Baru'}
              </div>
              <div className="text-[11px] text-purple-200">
                {initialItem ? `Perbarui informasi ${initialItem.kodeBarang}` : 'Tambahkan barang baru ke gudang'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {initialItem && onDeleteItem && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-2.5 py-1 bg-rose-600/80 hover:bg-rose-600 text-white rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Hapus Barang Ini dari Master Barang"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Item</span>
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded cursor-pointer">
              ✕
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="bg-rose-50 border-b border-rose-200 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <div className="font-bold text-rose-900">Konfirmasi Hapus Barang Permanen</div>
                <div className="text-rose-700 mt-0.5">
                  Apakah Anda yakin ingin menghapus <strong>"{namaBarang}" ({kodeBarang})</strong>? Data akan dihapus dari Master Barang dan Google Spreadsheet secara real-time.
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={executeDelete}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold text-xs shadow-sm cursor-pointer"
                  >
                    Ya, Hapus Sekarang
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md font-semibold text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Kode Barang</label>
              <input
                type="text"
                required
                value={kodeBarang}
                onChange={(e) => setKodeBarang(e.target.value)}
                className="w-full p-2 border rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Kategori</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="Elektrikal & ME">Elektrikal & ME</option>
                <option value="Safety & K3">Safety & K3</option>
                <option value="IT & Jaringan">IT & Jaringan</option>
                <option value="Sipil & Finishing">Sipil & Finishing</option>
                <option value="Sanitasi & Plumbing">Sanitasi & Plumbing</option>
                <option value="Alat Kantor & Umum">Alat Kantor & Umum</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Barang</label>
            <input
              type="text"
              required
              value={namaBarang}
              onChange={(e) => setNamaBarang(e.target.value)}
              placeholder="Contoh: Kabel UTP Cat6 Commscope"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Satuan</label>
              <input
                type="text"
                required
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                placeholder="Pcs/Roll/Unit"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Jumlah Masuk</label>
              <input
                type="number"
                value={jumlahMasuk}
                onChange={(e) => setJumlahMasuk(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Stok Akhir</label>
              <input
                type="number"
                value={stokAkhir}
                onChange={(e) => setStokAkhir(e.target.value)}
                className="w-full p-2 border rounded font-bold text-emerald-700"
              />
            </div>
          </div>

          {/* Google Drive Image Link & Preview */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-bold text-slate-700">Link Gambar Google Drive</label>
              <a
                href={DRIVE_UPLOAD_FOLDER_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>Buka Folder Drive</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <input
              type="text"
              value={gambarUrl}
              onChange={(e) => setGambarUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full p-2 border rounded bg-white"
            />
            {previewThumbnail && (
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200">
                <div className="w-14 h-14 rounded-lg border bg-white overflow-hidden flex items-center justify-center">
                  <img src={previewThumbnail} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-bold text-emerald-600">Preview Berhasil!</span>
                  <div>Gambar dikonversi langsung dari Google Drive.</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Deskripsi / Spesifikasi</label>
            <textarea
              rows={2}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Modal Action Buttons: Delete Item (if editing) + Cancel & Save */}
          <div className="flex flex-wrap justify-between items-center pt-3 border-t border-slate-200 gap-2">
            {initialItem && onDeleteItem ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Hapus Item Ini</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#714B67] hover:bg-[#5a3c52] text-white rounded-lg font-bold shadow cursor-pointer transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Master Barang</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-component: Item History Modal (Stock Card)
interface ItemHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  transactions: StockTransaction[];
}

const ItemHistoryModal: React.FC<ItemHistoryModalProps> = ({
  isOpen,
  onClose,
  item,
  transactions,
}) => {
  if (!isOpen) return null;

  // Filter transactions containing this item
  const historyList = transactions
    .filter((tx) => tx.items.some((l) => l.kodeBarang === item.kodeBarang))
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-[#714B67] text-white p-4 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm">Riwayat Mutasi & Kartu Stok Barang</h4>
            <p className="text-xs text-purple-200 font-mono">
              {item.kodeBarang} - {item.namaBarang}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">✕</button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {historyList.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Belum ada riwayat mutasi untuk barang ini.
            </div>
          ) : (
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="p-2.5">Tanggal</th>
                  <th className="p-2.5">No Bukti / Surat</th>
                  <th className="p-2.5">Tipe</th>
                  <th className="p-2.5">Asal / Tujuan</th>
                  <th className="p-2.5 text-center">Qty Mutasi</th>
                  <th className="p-2.5">Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.map((tx) => {
                  const line = tx.items.find((l) => l.kodeBarang === item.kodeBarang);
                  const isMasuk = tx.tipe === 'MASUK';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono">{tx.tanggal}</td>
                      <td className="p-2.5 font-bold font-mono text-slate-800">{tx.nomorSurat}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isMasuk ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-[#714B67]'
                          }`}
                        >
                          {tx.tipe}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {isMasuk ? 'Gudang Utama' : `${tx.lokasiAsal} → ${tx.lokasiTujuan}`}
                      </td>
                      <td
                        className={`p-2.5 text-center font-bold ${
                          isMasuk ? 'text-blue-700' : 'text-rose-700'
                        }`}
                      >
                        {isMasuk ? `+${line?.jumlah}` : `-${line?.jumlah}`} {line?.satuan}
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px]">{tx.dibuatOleh}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
