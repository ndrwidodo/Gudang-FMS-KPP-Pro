import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Edit3,
  Image as ImageIcon,
  QrCode as QrIcon,
  Tag,
  Check,
  PackageCheck,
  Smartphone,
  Barcode as BarcodeIcon,
  Copy,
  Info,
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { getQrPngDataUri, generateBarcode1DSvg } from '../utils/qrHelper';
import { getDirectDriveImageUrl } from '../utils/driveHelper';
import { PatraJasaLogo } from './PatraJasaLogo';

interface QrCodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  currentStockOverride?: number;
  locationName?: string;
}

export const QrCodePrintModal: React.FC<QrCodePrintModalProps> = ({
  isOpen,
  onClose,
  item,
  currentStockOverride,
  locationName = 'Gudang Utama KPP',
}) => {
  if (!isOpen || !item) return null;

  const currentStock =
    currentStockOverride !== undefined ? currentStockOverride : item.stokAkhirGudangUtama;

  const [headerTitle, setHeaderTitle] = useState('PATRAJASA FMS - INVENTORY KPP');
  const [editableNama, setEditableNama] = useState(item.namaBarang);
  const [editableKode, setEditableKode] = useState(item.kodeBarang);
  const [editableStok, setEditableStok] = useState(currentStock.toString());
  const [editableSatuan, setEditableSatuan] = useState(item.satuan);
  const [editableLokasi, setEditableLokasi] = useState(locationName);
  const [editableCatatan, setEditableCatatan] = useState('Peralatan & Material Standar Gudang Bertingkat');
  const [isEditMode, setIsEditMode] = useState(false);
  const [barcodeType, setBarcodeType] = useState<'qr_text' | 'qr_url' | 'barcode1d'>('qr_text');
  const [qrPngUrl, setQrPngUrl] = useState<string>('');
  const [barcode1dSvg, setBarcode1dSvg] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Synchronize when item changes
  useEffect(() => {
    if (item) {
      setEditableNama(item.namaBarang);
      setEditableKode(item.kodeBarang);
      setEditableStok(
        (currentStockOverride !== undefined ? currentStockOverride : item.stokAkhirGudangUtama).toString()
      );
      setEditableSatuan(item.satuan);
      setEditableLokasi(locationName);
    }
  }, [item, currentStockOverride, locationName]);

  // Format scannable text payload optimized for Mobile Phone Cameras (iPhone Camera, Google Lens, Android Camera)
  const scannableTextPayload = `[DATA BARANG GUDANG KPP]
Kode: ${editableKode}
Nama: ${editableNama}
Kategori: ${item.kategori}
Stok: ${editableStok} ${editableSatuan}
Lokasi: ${editableLokasi}
Update: ${new Date().toISOString().split('T')[0]}
Patra Jasa FMS`;

  // App URL for web link payload
  const appWebUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?item=${encodeURIComponent(editableKode)}`
    : `https://kpp-inventory.patrajasa.co.id/?item=${encodeURIComponent(editableKode)}`;

  // Active payload based on user selection
  const activeQrPayload = barcodeType === 'qr_url' ? appWebUrl : scannableTextPayload;

  // Generate ISO QR code and 1D Barcode
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const dataUri = await getQrPngDataUri(activeQrPayload, 260);
      if (isMounted) {
        setQrPngUrl(dataUri);
      }
    })();

    // Generate 1D Barcode SVG
    const svg1d = generateBarcode1DSvg(editableKode, 1.8, 55);
    setBarcode1dSvg(svg1d);

    return () => {
      isMounted = false;
    };
  }, [activeQrPayload, editableKode, barcodeType]);

  const previewImg = getDirectDriveImageUrl(item.gambarUrl);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(scannableTextPayload);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#714B67] text-white p-4 sm:p-5 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <QrIcon className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Cetak Label Barcode & QR Code Fisik</h3>
              <p className="text-xs text-purple-200">
                Standar ISO Scannable: Langsung menampilkan data barang saat discan kamera HP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Selector */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs no-print">
          {/* Format selector */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-300">
            <button
              onClick={() => setBarcodeType('qr_text')}
              className={`px-2.5 py-1 rounded font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                barcodeType === 'qr_text'
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Kamera HP langsung memunculkan teks data barang tanpa perlu internet"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>QR Teks Data (Kamera HP)</span>
            </button>

            <button
              onClick={() => setBarcodeType('barcode1d')}
              className={`px-2.5 py-1 rounded font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                barcodeType === 'barcode1d'
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Barcode 1D Code-128 standar untuk scanner barcode laser/fisik"
            >
              <BarcodeIcon className="w-3.5 h-3.5" />
              <span>Barcode 1D (Garis)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                isEditMode
                  ? 'bg-[#714B67] text-white border-[#714B67]'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Selesai Edit' : 'Edit Info Label'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#017E84] hover:bg-[#006e73] text-white font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Label Stiker</span>
            </button>
          </div>
        </div>

        {/* Info Banner on Phone Scan Result */}
        <div className="bg-blue-50 border-b border-blue-200 px-5 py-2 text-[11px] text-blue-900 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Hasil Scan Kamera HP:</strong> Menampilkan kode, nama barang, stok ({editableStok} {editableSatuan}), lokasi, dan status inventori secara otomatis.
            </span>
          </div>
          <button
            onClick={handleCopyText}
            className="text-blue-700 hover:text-blue-900 font-bold underline shrink-0 flex items-center gap-1 cursor-pointer"
          >
            {copiedNotification ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedNotification ? 'Tersalin!' : 'Salin Teks'}</span>
          </button>
        </div>

        {/* Modal Body / Label Printable Preview */}
        <div className="p-6">
          {/* Editable inputs drawer if edit mode is active */}
          {isEditMode && (
            <div className="mb-5 p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3 text-xs no-print">
              <div className="font-bold text-[#714B67] flex items-center gap-1.5">
                <Tag className="w-4 h-4" />
                <span>Sesuaikan Informasi Label Fisik:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Header Perusahaan</label>
                  <input
                    type="text"
                    value={headerTitle}
                    onChange={(e) => setHeaderTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Lokasi Penempatan</label>
                  <input
                    type="text"
                    value={editableLokasi}
                    onChange={(e) => setEditableLokasi(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded bg-white text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Kode Barang</label>
                  <input
                    type="text"
                    value={editableKode}
                    onChange={(e) => setEditableKode(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded bg-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Stok Fisik</label>
                  <input
                    type="text"
                    value={editableStok}
                    onChange={(e) => setEditableStok(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded bg-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Satuan</label>
                  <input
                    type="text"
                    value={editableSatuan}
                    onChange={(e) => setEditableSatuan(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded bg-white text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Catatan Label</label>
                <input
                  type="text"
                  value={editableCatatan}
                  onChange={(e) => setEditableCatatan(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded bg-white text-xs"
                />
              </div>
            </div>
          )}

          {/* PHYSICAL STICKER CONTAINER (Optimized for label printers) */}
          <div
            id="printable-label"
            className="print-page bg-white p-5 rounded-2xl border-2 border-dashed border-slate-400 shadow-md mx-auto max-w-md select-text"
          >
            {/* Label Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <PatraJasaLogo size="sm" showSubtitle={false} />
                <div className="leading-tight">
                  <div className="font-black text-xs tracking-tight text-slate-900">
                    {headerTitle}
                  </div>
                  <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                    {editableLokasi}
                  </div>
                </div>
              </div>
              <span className="text-[10px] bg-slate-900 text-white font-mono px-2 py-0.5 rounded font-bold">
                {editableKode}
              </span>
            </div>

            {/* Label Main Content: Image + QR Code/Barcode + Details */}
            <div className="grid grid-cols-12 gap-3 items-center">
              {/* Product Photo Preview */}
              <div className="col-span-4 flex flex-col items-center">
                <div className="w-24 h-24 rounded-xl border border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                  {previewImg ? (
                    <img
                      src={previewImg}
                      alt={editableNama}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300';
                      }}
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      <span className="text-[9px]">Foto Barang</span>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 text-center font-medium line-clamp-1">
                  {item.kategori}
                </span>
              </div>

              {/* Scannable Barcode / QR Code Container */}
              <div className="col-span-4 flex flex-col items-center justify-center">
                {barcodeType === 'barcode1d' ? (
                  <div className="flex flex-col items-center bg-white p-1 border-2 border-slate-900 rounded-lg shadow-xs">
                    <div
                      className="w-28 flex items-center justify-center overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: barcode1dSvg }}
                    />
                    <span className="text-[8px] font-mono font-bold text-slate-600 mt-0.5">
                      CODE-128
                    </span>
                  </div>
                ) : (
                  <div className="p-1.5 bg-white border-2 border-slate-900 rounded-lg shadow-xs flex flex-col items-center">
                    {qrPngUrl ? (
                      <img
                        src={qrPngUrl}
                        alt="Scannable QR Code"
                        className="w-24 h-24 object-contain"
                      />
                    ) : (
                      <div className="w-24 h-24 flex items-center justify-center text-xs text-slate-400">
                        Memuat QR...
                      </div>
                    )}
                    <span className="text-[8px] font-mono font-bold text-slate-600 mt-0.5">
                      SCAN VIA HP
                    </span>
                  </div>
                )}
              </div>

              {/* Stock Metric Badge */}
              <div className="col-span-4 flex flex-col justify-center items-center bg-purple-50 border border-purple-200 rounded-xl p-2.5 text-center">
                <span className="text-[10px] font-bold text-[#714B67] uppercase tracking-wider">
                  STOK FISIK
                </span>
                <span className="text-3xl font-black text-slate-900 leading-tight">
                  {editableStok}
                </span>
                <span className="text-xs font-bold text-slate-700 uppercase">
                  {editableSatuan}
                </span>
              </div>
            </div>

            {/* Item Name & Footer */}
            <div className="mt-3 pt-2.5 border-t border-slate-200">
              <div className="font-black text-sm text-slate-900 leading-snug">
                {editableNama}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                <span>{editableCatatan}</span>
                <span className="font-mono">Tgl: {new Date().toISOString().split('T')[0]}</span>
              </div>
            </div>

            {/* Live Scan Preview Box inside sticker */}
            <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-[9px] text-slate-500">
              <div className="font-semibold text-slate-600 flex items-center gap-1 mb-0.5">
                <Smartphone className="w-3 h-3 text-[#017E84]" />
                <span>Format Data Terbaca Kamera HP:</span>
              </div>
              <div className="bg-slate-50 p-1.5 rounded font-mono text-[9px] text-slate-700 whitespace-pre-line leading-tight">
                {activeQrPayload}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-center text-slate-500 mt-4 no-print">
            Tip: Arahkan kamera smartphone ke kode QR di atas untuk menguji pembacaan data barang secara langsung.
          </p>
        </div>
      </div>
    </div>
  );
};
