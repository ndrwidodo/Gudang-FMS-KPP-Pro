import React from 'react';
import { X, Printer, FileSpreadsheet, Download, ShieldCheck, Building2, Truck, Calendar } from 'lucide-react';
import { StockTransaction } from '../types/inventory';
import { PatraJasaLogo } from './PatraJasaLogo';
import { exportSuratJalanToExcel } from '../utils/excelHelper';
import { getQrSvgDataUri } from '../utils/qrHelper';

interface SuratJalanModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: StockTransaction | null;
}

export const SuratJalanModal: React.FC<SuratJalanModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportSuratJalanToExcel(transaction);
  };

  const qrVerification = getQrSvgDataUri(
    JSON.stringify({
      doc: 'SURAT_JALAN_KPP',
      no: transaction.nomorSurat,
      tgl: transaction.tanggal,
      asal: transaction.lokasiAsal,
      tujuan: transaction.lokasiTujuan,
      pembawa: transaction.namaPembawa,
      itemsCount: transaction.items.length,
    }),
    100
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-[#714B67] text-white p-4 sm:p-5 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Surat Jalan / Surat Keluar Barang</h3>
              <p className="text-xs text-purple-200">
                Dokumen Resmi Mutasi & Distribusi Gudang KPP
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

        {/* Action Controls */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between no-print">
          <span className="text-xs font-semibold text-slate-600">
            Nomor: <span className="font-mono text-[#714B67] font-bold">{transaction.nomorSurat}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#017E84] hover:bg-[#006e73] text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>

        {/* OFFICIAL SURAT JALAN PRINT DOCUMENT */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          <div
            id="printable-surat-jalan"
            className="print-page bg-white p-8 border border-slate-300 rounded-xl shadow-sm text-slate-900 select-text font-calibri"
          >
            {/* Header Surat */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <PatraJasaLogo size="lg" showSubtitle={true} />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  FORMULIR OPERASIONAL LOGISTIK
                </div>
                <h1 className="text-xl font-black text-[#714B67] tracking-tight">
                  SURAT JALAN PENGELUARAN BARANG
                </h1>
                <div className="text-sm font-mono font-bold text-slate-800 mt-0.5">
                  NO: {transaction.nomorSurat}
                </div>
              </div>
            </div>

            {/* Metadata Info Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-5">
              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Tanggal & Waktu</span>
                  <span className="font-bold">: {transaction.tanggal} | {transaction.jam || '10:00'} WIB</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Lokasi Asal</span>
                  <span className="font-bold text-[#714B67]">: {transaction.lokasiAsal}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Lokasi Tujuan</span>
                  <span className="font-bold text-emerald-700">: {transaction.lokasiTujuan}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Nama Pembawa</span>
                  <span className="font-bold">: {transaction.namaPembawa || '-'}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Area / Detail</span>
                  <span className="font-bold">: {transaction.areaTujuanDetail || transaction.lokasiTujuan}</span>
                </div>
                <div className="flex">
                  <span className="w-28 text-slate-500 font-semibold">Keterangan</span>
                  <span>: {transaction.keterangan || 'Distribusi kebutuhan logistik'}</span>
                </div>
              </div>
            </div>

            {/* Table of Items */}
            <table className="w-full text-xs text-left border-collapse border border-slate-300 mb-6">
              <thead>
                <tr className="bg-[#714B67] text-white">
                  <th className="border border-slate-400 p-2 text-center w-10">NO</th>
                  <th className="border border-slate-400 p-2 w-32">KODE BARANG</th>
                  <th className="border border-slate-400 p-2">NAMA BARANG / DESKRIPSI</th>
                  <th className="border border-slate-400 p-2 text-center w-20">JUMLAH</th>
                  <th className="border border-slate-400 p-2 text-center w-20">SATUAN</th>
                  <th className="border border-slate-400 p-2 w-44">KETERANGAN</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items.map((it, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-mono font-semibold">{it.kodeBarang}</td>
                    <td className="border border-slate-300 p-2 font-bold">{it.namaBarang}</td>
                    <td className="border border-slate-300 p-2 text-center font-black text-sm">{it.jumlah}</td>
                    <td className="border border-slate-300 p-2 text-center font-medium">{it.satuan}</td>
                    <td className="border border-slate-300 p-2 text-slate-600">{it.keterangan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signatures & Security Validation */}
            <div className="grid grid-cols-12 gap-4 items-end mt-8 pt-4 border-t border-slate-200">
              {/* QR Verification */}
              <div className="col-span-3 text-center flex flex-col items-center">
                <img src={qrVerification} alt="QR Validasi" className="w-20 h-20 border border-slate-300 rounded p-1" />
                <span className="text-[9px] font-mono font-bold text-slate-500 mt-1">VERIFIKASI SISTEM KPP</span>
              </div>

              {/* 3 Signature Columns */}
              <div className="col-span-3 text-center">
                <div className="text-[11px] font-bold text-slate-600 mb-12">Diserahkan Oleh (Gudang)</div>
                <div className="border-b border-slate-400 font-bold text-xs pb-0.5">
                  ({transaction.dibuatOleh || 'Budi Santoso'})
                </div>
                <div className="text-[10px] text-slate-500">Staf Logistik GU</div>
              </div>

              <div className="col-span-3 text-center">
                <div className="text-[11px] font-bold text-slate-600 mb-12">Petugas Pembawa</div>
                <div className="border-b border-slate-400 font-bold text-xs pb-0.5">
                  ({transaction.namaPembawa || 'Kurir Transporter'})
                </div>
                <div className="text-[10px] text-slate-500">Kurir / Teknisi</div>
              </div>

              <div className="col-span-3 text-center">
                <div className="text-[11px] font-bold text-slate-600 mb-12">Diterima Oleh (PIC)</div>
                <div className="border-b border-slate-400 font-bold text-xs pb-0.5">
                  ({transaction.namaPenerima || 'PIC Cluster'})
                </div>
                <div className="text-[10px] text-slate-500">{transaction.lokasiTujuan}</div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 mt-6 pt-2 border-t border-slate-100 flex justify-between">
              <span>Dokumen ini dicetak otomatis dari Sistem Inventory Gudang KPP</span>
              <span>Halaman 1 dari 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
