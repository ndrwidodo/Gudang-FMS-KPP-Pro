import React, { useState } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Download,
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  Maximize2,
  RotateCw,
  QrCode,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { PatraJasaLogo } from './PatraJasaLogo';
import { MonthlyReportRow, YearlyReportRow, ClusterMonthlyReportRow } from '../types/inventory';
import { getQrSvgDataUri } from '../utils/qrHelper';
import * as XLSX from 'xlsx';

interface ReportPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'bulanan_gudang_utama' | 'tahunan_gudang_utama' | 'bulanan_cluster';
  title: string;
  periodText: string;
  locationName: string;
  monthlyRows?: MonthlyReportRow[];
  yearlyRows?: YearlyReportRow[];
  clusterMonthlyRows?: ClusterMonthlyReportRow[];
  operatorName?: string;
}

export const ReportPdfPreviewModal: React.FC<ReportPdfPreviewModalProps> = ({
  isOpen,
  onClose,
  reportType,
  title,
  periodText,
  locationName,
  monthlyRows = [],
  yearlyRows = [],
  clusterMonthlyRows = [],
  operatorName = 'Petugas Logistik KPP',
}) => {
  if (!isOpen) return null;

  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const printDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const reportDocNumber = `DOC-KPP/${reportType.toUpperCase().slice(0, 7)}/${new Date().getFullYear()}/${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  // Document verification QR Code
  const qrVerification = getQrSvgDataUri(
    `[DOKUMEN RESMI INVENTORI KPP]\nNo: ${reportDocNumber}\nLaporan: ${title}\nPeriode: ${periodText}\nLokasi: ${locationName}\nStatus: Terverifikasi Digital PT Patra Jasa`,
    110
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    let ws: XLSX.WorkSheet | null = null;
    let fileName = `Laporan_${locationName.replace(/\s+/g, '_')}_${periodText.replace(/\s+/g, '_')}.xlsx`;

    if (reportType === 'bulanan_gudang_utama') {
      const data = monthlyRows.map((r, i) => ({
        No: i + 1,
        'Kode Barang': r.kodeBarang,
        'Nama Barang': r.namaBarang,
        Satuan: r.satuan,
        'Stok Awal': r.stokAwal,
        'Masuk Gudang Utama': r.masuk,
        'Keluar Cluster 1': r.keluarCluster1,
        'Keluar Cluster 2': r.keluarCluster2,
        'Keluar Cluster 3': r.keluarCluster3,
        'Keluar Cluster 4': r.keluarCluster4,
        'Total Keluar': r.totalKeluar,
        'Stok Akhir': r.stokAkhir,
      }));
      ws = XLSX.utils.json_to_sheet(data);
    } else if (reportType === 'bulanan_cluster') {
      const data = clusterMonthlyRows.map((r, i) => ({
        No: i + 1,
        'Kode Barang': r.kodeBarang,
        'Nama Barang': r.namaBarang,
        Satuan: r.satuan,
        'Stok Awal Cluster': r.stokAwal,
        'Diterima dari Gudang Utama': r.masukDariGudangUtama,
        'Keluar ke Area Kerja': r.keluarArea,
        'Sisa Stok Akhir': r.stokAkhir,
      }));
      ws = XLSX.utils.json_to_sheet(data);
    } else if (reportType === 'tahunan_gudang_utama') {
      const data = yearlyRows.map((r, i) => {
        const rowObj: any = {
          No: i + 1,
          'Kode Barang': r.kodeBarang,
          'Nama Barang': r.namaBarang,
          Satuan: r.satuan,
        };
        r.months.forEach((m) => {
          rowObj[`${m.namaBulan} (Awal)`] = m.stokAwal;
          rowObj[`${m.namaBulan} (Masuk)`] = m.masuk;
          rowObj[`${m.namaBulan} (Keluar)`] = m.keluar;
        });
        rowObj['Stok Akhir Desember'] = r.finalStokDesember;
        return rowObj;
      });
      ws = XLSX.utils.json_to_sheet(data);
    }

    if (ws) {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
      XLSX.writeFile(wb, fileName);
    }
  };

  // Calculations for summary footer
  const totalMasukSum =
    reportType === 'bulanan_gudang_utama'
      ? monthlyRows.reduce((a, b) => a + (b.masuk || 0), 0)
      : reportType === 'bulanan_cluster'
      ? clusterMonthlyRows.reduce((a, b) => a + (b.masukDariGudangUtama || 0), 0)
      : 0;

  const totalKeluarSum =
    reportType === 'bulanan_gudang_utama'
      ? monthlyRows.reduce((a, b) => a + (b.totalKeluar || 0), 0)
      : reportType === 'bulanan_cluster'
      ? clusterMonthlyRows.reduce((a, b) => a + (b.keluarArea || 0), 0)
      : 0;

  const totalStokAkhirSum =
    reportType === 'bulanan_gudang_utama'
      ? monthlyRows.reduce((a, b) => a + (b.stokAkhir || 0), 0)
      : reportType === 'bulanan_cluster'
      ? clusterMonthlyRows.reduce((a, b) => a + (b.stokAkhir || 0), 0)
      : 0;

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="bg-[#714B67] text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  Preview Dokumen Format A4 (Siap Cetak / Simpan PDF)
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/80 text-white rounded text-[10px] font-bold uppercase tracking-wider">
                  Standar ISO A4
                </span>
              </div>
              <p className="text-xs text-purple-200">
                {title} &bull; {periodText} &bull; {locationName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Orientation switch */}
            <div className="flex items-center bg-purple-950/40 p-1 rounded-lg border border-purple-400/30 text-xs">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-purple-200 hover:text-white'
                }`}
                title="Format A4 Landscape (Ideal untuk tabel lebar)"
              >
                A4 Landscape
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-purple-200 hover:text-white'
                }`}
                title="Format A4 Portrait (Tegak)"
              >
                A4 Portrait
              </button>
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Unduh data dalam format Excel .xlsx"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#017E84] hover:bg-[#006e73] text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-md cursor-pointer ring-2 ring-emerald-300"
              title="Buka dialog cetak browser / Simpan ke file PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF (A4)</span>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Tutup Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Canvas Preview Area (Scrollable with zoom) */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-300/70 flex justify-center items-start">
          {/* THE OFFICIAL A4 PAPER SHEET */}
          <div
            id="printable-a4-document"
            className={`bg-white shadow-2xl transition-all duration-200 select-text font-calibri text-slate-900 border border-slate-300 print:shadow-none print:border-none print:m-0 ${
              orientation === 'landscape'
                ? 'w-[297mm] min-h-[210mm] p-[12mm] max-w-full'
                : 'w-[210mm] min-h-[297mm] p-[12mm] max-w-full'
            }`}
            style={{
              boxSizing: 'border-box',
            }}
          >
            {/* 1. OFFICIAL KOP SURAT */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <PatraJasaLogo size="lg" showSubtitle={true} />
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-[#017E84] uppercase tracking-wider">
                  FACILITY MANAGEMENT SERVICES
                </div>
                <div className="text-sm font-black text-slate-900 tracking-tight">
                  PROYEK GUDANG BERTINGKAT KPP
                </div>
                <div className="text-[10px] text-slate-600">
                  Jl. Gatot Subroto Kav. 32-34, Kuningan Barat, Mampang Prapatan, Jakarta Selatan
                </div>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                  Ref No: {reportDocNumber} &bull; Tgl Cetak: {printDateStr}
                </div>
              </div>
            </div>

            {/* 2. DOCUMENT TITLE & METADATA BADGE */}
            <div className="text-center py-2 mb-4 bg-slate-50 rounded-lg border border-slate-200">
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wide uppercase">
                {title}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700 mt-1">
                <span>
                  Periode: <strong>{periodText}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Lokasi Gudang: <strong>{locationName}</strong>
                </span>
                <span>&bull;</span>
                <span>
                  Format Dokumen: <strong>A4 ({orientation.toUpperCase()})</strong>
                </span>
              </div>
            </div>

            {/* 3. REPORT DATA TABLE */}
            {reportType === 'bulanan_gudang_utama' && (
              <div className="overflow-x-auto border border-slate-400 rounded-lg">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-[#714B67] text-white font-bold">
                    <tr>
                      <th className="p-2 border border-purple-800 text-center w-8">No</th>
                      <th className="p-2 border border-purple-800 w-24">Kode</th>
                      <th className="p-2 border border-purple-800">Nama Barang</th>
                      <th className="p-2 border border-purple-800 text-center w-12">Sat</th>
                      <th className="p-2 border border-purple-800 text-right w-16">Stok Awal</th>
                      <th className="p-2 border border-purple-800 text-right w-16 bg-blue-900/60">
                        Masuk GU
                      </th>
                      <th className="p-2 border border-purple-800 text-right w-14">C-1</th>
                      <th className="p-2 border border-purple-800 text-right w-14">C-2</th>
                      <th className="p-2 border border-purple-800 text-right w-14">C-3</th>
                      <th className="p-2 border border-purple-800 text-right w-14">C-4</th>
                      <th className="p-2 border border-purple-800 text-right w-18 bg-rose-900/60">
                        Tot. Keluar
                      </th>
                      <th className="p-2 border border-purple-800 text-right w-18 bg-emerald-900/60">
                        Stok Akhir
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {monthlyRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-6 text-center text-slate-500 italic">
                          Belum ada data barang atau mutasi pada periode {periodText}.
                        </td>
                      </tr>
                    ) : (
                      monthlyRows.map((r, idx) => (
                        <tr
                          key={idx}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                        >
                          <td className="p-1.5 text-center font-bold border border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="p-1.5 font-mono border border-slate-200 font-semibold">
                            {r.kodeBarang}
                          </td>
                          <td className="p-1.5 font-bold text-slate-900 border border-slate-200">
                            {r.namaBarang}
                          </td>
                          <td className="p-1.5 text-center text-slate-600 border border-slate-200">
                            {r.satuan}
                          </td>
                          <td className="p-1.5 text-right font-medium border border-slate-200">
                            {r.stokAwal}
                          </td>
                          <td className="p-1.5 text-right font-bold text-blue-700 bg-blue-50/50 border border-slate-200">
                            {r.masuk}
                          </td>
                          <td className="p-1.5 text-right text-slate-700 border border-slate-200">
                            {r.keluarCluster1 || '-'}
                          </td>
                          <td className="p-1.5 text-right text-slate-700 border border-slate-200">
                            {r.keluarCluster2 || '-'}
                          </td>
                          <td className="p-1.5 text-right text-slate-700 border border-slate-200">
                            {r.keluarCluster3 || '-'}
                          </td>
                          <td className="p-1.5 text-right text-slate-700 border border-slate-200">
                            {r.keluarCluster4 || '-'}
                          </td>
                          <td className="p-1.5 text-right font-bold text-rose-700 bg-rose-50/50 border border-slate-200">
                            {r.totalKeluar}
                          </td>
                          <td className="p-1.5 text-right font-black text-emerald-800 bg-emerald-50/50 border border-slate-200">
                            {r.stokAkhir}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {monthlyRows.length > 0 && (
                    <tfoot className="bg-slate-200 font-black text-slate-900 border-t-2 border-slate-500">
                      <tr>
                        <td colSpan={5} className="p-2 text-right uppercase">
                          Total Akumulasi Periode:
                        </td>
                        <td className="p-2 text-right text-blue-800">{totalMasukSum}</td>
                        <td colSpan={4} className="p-2 text-center text-slate-500">
                          -
                        </td>
                        <td className="p-2 text-right text-rose-800">{totalKeluarSum}</td>
                        <td className="p-2 text-right text-emerald-800">{totalStokAkhirSum}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* 3B. REPORT BULANAN CLUSTER */}
            {reportType === 'bulanan_cluster' && (
              <div className="overflow-x-auto border border-slate-400 rounded-lg">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-[#714B67] text-white font-bold">
                    <tr>
                      <th className="p-2 border border-purple-800 text-center w-10">No</th>
                      <th className="p-2 border border-purple-800 w-28">Kode Barang</th>
                      <th className="p-2 border border-purple-800">Nama Barang</th>
                      <th className="p-2 border border-purple-800 text-center w-14">Satuan</th>
                      <th className="p-2 border border-purple-800 text-right w-24">Stok Awal</th>
                      <th className="p-2 border border-purple-800 text-right w-28 bg-blue-900/60">
                        Terima dari GU
                      </th>
                      <th className="p-2 border border-purple-800 text-right w-28 bg-rose-900/60">
                        Keluar Area
                      </th>
                      <th className="p-2 border border-purple-800 text-right w-28 bg-emerald-900/60">
                        Sisa Stok
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {clusterMonthlyRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500 italic">
                          Belum ada stok atau mutasi di {locationName} pada periode {periodText}.
                        </td>
                      </tr>
                    ) : (
                      clusterMonthlyRows.map((r, idx) => (
                        <tr
                          key={idx}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                        >
                          <td className="p-2 text-center font-bold border border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-mono border border-slate-200 font-semibold">
                            {r.kodeBarang}
                          </td>
                          <td className="p-2 font-bold text-slate-900 border border-slate-200">
                            {r.namaBarang}
                          </td>
                          <td className="p-2 text-center text-slate-600 border border-slate-200">
                            {r.satuan}
                          </td>
                          <td className="p-2 text-right font-medium border border-slate-200">
                            {r.stokAwal}
                          </td>
                          <td className="p-2 text-right font-bold text-blue-700 bg-blue-50/50 border border-slate-200">
                            {r.masukDariGudangUtama}
                          </td>
                          <td className="p-2 text-right font-bold text-rose-700 bg-rose-50/50 border border-slate-200">
                            {r.keluarArea}
                          </td>
                          <td className="p-2 text-right font-black text-emerald-800 bg-emerald-50/50 border border-slate-200">
                            {r.stokAkhir}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {clusterMonthlyRows.length > 0 && (
                    <tfoot className="bg-slate-200 font-black text-slate-900 border-t-2 border-slate-500">
                      <tr>
                        <td colSpan={5} className="p-2 text-right uppercase">
                          Total Akumulasi {locationName}:
                        </td>
                        <td className="p-2 text-right text-blue-800">{totalMasukSum}</td>
                        <td className="p-2 text-right text-rose-800">{totalKeluarSum}</td>
                        <td className="p-2 text-right text-emerald-800">{totalStokAkhirSum}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* 3C. REPORT TAHUNAN AKUMULATIF BERANTAI */}
            {reportType === 'tahunan_gudang_utama' && (
              <div className="overflow-x-auto border border-slate-400 rounded-lg">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="bg-[#714B67] text-white font-bold">
                    <tr>
                      <th className="p-1.5 border border-purple-800">Barang & Satuan</th>
                      {monthNames.map((m, i) => (
                        <th key={i} className="p-1 border border-purple-800 text-center" colSpan={3}>
                          {m}
                        </th>
                      ))}
                      <th className="p-1.5 border border-purple-800 text-center bg-emerald-900">
                        Sisa Des
                      </th>
                    </tr>
                    <tr className="bg-[#56364e] text-white text-[9px]">
                      <th className="p-1 border border-purple-800"></th>
                      {monthNames.map((_, i) => (
                        <React.Fragment key={i}>
                          <th className="p-0.5 border border-purple-800 text-center">Awl</th>
                          <th className="p-0.5 border border-purple-800 text-center text-blue-200">Msk</th>
                          <th className="p-0.5 border border-purple-800 text-center text-rose-200">Klr</th>
                        </React.Fragment>
                      ))}
                      <th className="p-1 border border-purple-800 text-center bg-emerald-950">Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {yearlyRows.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-1.5 font-bold text-slate-900 border border-slate-200 whitespace-nowrap">
                          <span className="font-mono text-[9px] text-slate-500 block">{row.kodeBarang}</span>
                          {row.namaBarang} ({row.satuan})
                        </td>
                        {row.months.map((m, mi) => (
                          <React.Fragment key={mi}>
                            <td className="p-1 text-center border border-slate-200 text-slate-600">
                              {m.stokAwal}
                            </td>
                            <td className="p-1 text-center border border-slate-200 font-semibold text-blue-700">
                              {m.masuk || '-'}
                            </td>
                            <td className="p-1 text-center border border-slate-200 font-semibold text-rose-700">
                              {m.keluar || '-'}
                            </td>
                          </React.Fragment>
                        ))}
                        <td className="p-1.5 text-center font-black text-emerald-800 bg-emerald-50 border border-slate-200">
                          {row.finalStokDesember}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. OFFICIAL THREE-COLUMN SIGNATURE APPROVAL BLOCK */}
            <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs break-inside-avoid">
              {/* Kolom 1 */}
              <div className="flex flex-col justify-between h-28 p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                <div className="font-bold text-slate-700">Dibuat Oleh,</div>
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 underline">{operatorName}</div>
                  <div className="text-[10px] text-slate-500">Staff Logistik / Admin Gudang</div>
                </div>
              </div>

              {/* Kolom 2 */}
              <div className="flex flex-col justify-between h-28 p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                <div className="font-bold text-slate-700">Diperiksa Oleh,</div>
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 underline">( ............................................ )</div>
                  <div className="text-[10px] text-slate-500">Supervisor Fasilitas / FMS KPP</div>
                </div>
              </div>

              {/* Kolom 3 */}
              <div className="flex flex-col justify-between h-28 p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                <div className="font-bold text-slate-700">Disetujui Oleh,</div>
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 underline">( ............................................ )</div>
                  <div className="text-[10px] text-slate-500">Project Manager / Kepala Proyek</div>
                </div>
              </div>
            </div>

            {/* 5. FOOTER VERIFIKASI QR DOKUMEN & WATERMARK */}
            <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 break-inside-avoid">
              <div className="flex items-center gap-2">
                {qrVerification && (
                  <img
                    src={qrVerification}
                    alt="Verifikasi Dokumen"
                    className="w-12 h-12 border border-slate-300 rounded p-0.5 bg-white"
                  />
                )}
                <div>
                  <div className="font-bold text-slate-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dokumen Sah Sistem Manajemen Inventori Gudang KPP</span>
                  </div>
                  <div className="text-[9px]">
                    Generated automatically via FMS Patra Jasa Inventory Core. All rights reserved.
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-[9px]">
                <div>Dicetak: {new Date().toISOString().replace('T', ' ').slice(0, 19)}</div>
                <div className="text-slate-400">Halaman 1 dari 1 (A4 Standar)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
