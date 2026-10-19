import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, Code2, Globe, Sparkles, BookOpen } from 'lucide-react';

interface AppsScriptViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppsScriptViewerModal: React.FC<AppsScriptViewerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'gs' | 'html' | 'guide'>('gs');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const codeGs = `/**
 * =========================================================================
 * INVENTORY GUDANG BERTINGKAT KPP - PATRAJASA FMS APPS
 * File: Code.gs (Google Apps Script Backend)
 * =========================================================================
 * Petunjuk Instalasi:
 * 1. Buka Google Sheets Anda atau buat baru: https://sheets.new
 * 2. Klik menu 'Ekstensi' > 'Apps Script'
 * 3. Hapus kode bawaan dan tempelkan seluruh isi file ini ke 'Code.gs'
 * 4. Buat file baru berformat HTML dengan nama 'Index.html' dan tempelkan isi Index.html
 * 5. Jalankan fungsi 'setupDatabaseSheets()' satu kali untuk membuat sheet & header otomatis
 * 6. Klik 'Terapkan' (Deploy) > 'Penerapan Baru' (New Deployment)
 *    - Pilih Jenis: 'Aplikasi Web' (Web app)
 *    - Akses: 'Siapa saja' (Anyone)
 *    - Klik Terapkan dan salin URL Web App Anda ke aplikasi!
 */

const APP_NAME = "Inventory Gudang Bertingkat KPP";
const DRIVE_FOLDER_ID = "1w72vnBTB1PFZeF1Br36rHDv5_mCmb0aG"; // Folder Google Drive Bukti/Gambar

function doGet(e) {
  if (!e || !e.parameter || !e.parameter.action) {
    var template = HtmlService.createTemplateFromFile('Index');
    return template.evaluate()
      .setTitle(APP_NAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return handleApiRequest(e.parameter);
}

function doPost(e) {
  try {
    var contents = e.postData ? JSON.parse(e.postData.contents) : {};
    var action = contents.action || (e.parameter ? e.parameter.action : '');
    return handleApiRequest(contents, action);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function handleApiRequest(params, postAction) {
  var action = postAction || params.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  switch (action) {
    case 'testConnection':
      return createJsonResponse({
        status: 'success',
        message: 'Koneksi ke Google Sheets ' + ss.getName() + ' Berhasil!',
        timestamp: new Date().toISOString(),
        sheets: ss.getSheets().map(function(s) { return s.getName(); })
      });

    case 'getMasterItems':
      var items = getSheetDataAsJson('MASTER_BARANG');
      return createJsonResponse({ status: 'success', data: items });

    case 'saveItem':
      var itemData = params.data || params;
      var saved = saveMasterItem(itemData);
      SpreadsheetApp.flush(); // Real-time flush!
      return createJsonResponse({ status: 'success', data: saved });

    case 'deleteItem':
      var delData = params.data || params;
      var delResult = deleteMasterItem(delData);
      SpreadsheetApp.flush(); // Real-time flush!
      return createJsonResponse({ status: 'success', data: delResult });

    case 'inboundGudangUtama':
      var inData = params.data || params;
      var inResult = processInbound(inData);
      SpreadsheetApp.flush();
      return createJsonResponse({ status: 'success', data: inResult });

    case 'outboundGudangUtama':
      var outData = params.data || params;
      var outResult = processOutbound(outData);
      SpreadsheetApp.flush();
      return createJsonResponse({ status: 'success', data: outResult });

    case 'outboundCluster':
      var clusterOutData = params.data || params;
      var cOutResult = processClusterOutbound(clusterOutData);
      SpreadsheetApp.flush();
      return createJsonResponse({ status: 'success', data: cOutResult });

    case 'clearTransactions':
      var clearResult = clearAllTransactions();
      SpreadsheetApp.flush();
      return createJsonResponse({ status: 'success', data: clearResult });

    case 'bulkSync':
      var syncResult = processBulkSync(params);
      SpreadsheetApp.flush();
      return createJsonResponse({ status: 'success', data: syncResult });

    case 'getClusterStock':
      var cluster = params.cluster || 'Cluster 1';
      var clusterData = getClusterStockData(cluster);
      return createJsonResponse({ status: 'success', cluster: cluster, data: clusterData });

    default:
      return createJsonResponse({ status: 'error', message: 'Action tidak dikenal: ' + action });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupDatabaseSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetConfigs = [
    { name: 'MASTER_BARANG', headers: ['Kode Barang', 'Nama Barang', 'Kategori', 'Satuan', 'Jumlah Masuk GU', 'Stok Akhir GU', 'Min Stok', 'Link Gambar Drive', 'Keterangan', 'Terakhir Update'] },
    { name: 'BARANG_MASUK_GU', headers: ['ID Transaksi', 'No Bukti', 'Tanggal', 'Jam', 'Kode Barang', 'Nama Barang', 'Jumlah', 'Satuan', 'Keterangan', 'Petugas'] },
    { name: 'BARANG_KELUAR_GU', headers: ['ID Transaksi', 'No Surat Jalan', 'Tanggal', 'Jam', 'Tujuan Cluster', 'Pembawa', 'Penerima', 'Kode Barang', 'Nama Barang', 'Jumlah', 'Satuan', 'Keterangan', 'Petugas'] },
    { name: 'CLUSTER_1', headers: ['Tanggal Masuk', 'No Surat Jalan GU', 'Kode Barang', 'Nama Barang', 'Jumlah Masuk', 'Jumlah Keluar Area', 'Stok Cluster', 'Area Distribusi Terakhir'] },
    { name: 'CLUSTER_2', headers: ['Tanggal Masuk', 'No Surat Jalan GU', 'Kode Barang', 'Nama Barang', 'Jumlah Masuk', 'Jumlah Keluar Area', 'Stok Cluster', 'Area Distribusi Terakhir'] },
    { name: 'CLUSTER_3', headers: ['Tanggal Masuk', 'No Surat Jalan GU', 'Kode Barang', 'Nama Barang', 'Jumlah Masuk', 'Jumlah Keluar Area', 'Stok Cluster', 'Area Distribusi Terakhir'] },
    { name: 'CLUSTER_4', headers: ['Tanggal Masuk', 'No Surat Jalan GU', 'Kode Barang', 'Nama Barang', 'Jumlah Masuk', 'Jumlah Keluar Area', 'Stok Cluster', 'Area Distribusi Terakhir'] },
    { name: 'USERS_LOG', headers: ['User ID', 'Nama', 'Email', 'Role', 'Provider', 'Terakhir Login'] }
  ];

  sheetConfigs.forEach(function(cfg) {
    var sheet = ss.getSheetByName(cfg.name);
    if (!sheet) { sheet = ss.insertSheet(cfg.name); }
    var headerRange = sheet.getRange(1, 1, 1, cfg.headers.length);
    headerRange.setValues([cfg.headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#714B67');
    headerRange.setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  });
  return "Setup Berhasil! Seluruh 8 Sheet Database KPP telah siap digunakan.";
}

function getSheetDataAsJson(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) { obj[headers[j]] = row[j]; }
    result.push(obj);
  }
  return result;
}

function saveMasterItem(item) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('MASTER_BARANG');
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == item.kodeBarang) { rowIndex = i + 1; break; }
  }
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  var rowValues = [
    item.kodeBarang, item.namaBarang, item.kategori || 'Umum', item.satuan || 'Pcs',
    item.jumlahMasukGudangUtama || 0, item.stokAkhirGudangUtama || 0, item.minStok || 5,
    item.gambarUrl || '', item.deskripsi || '', nowStr
  ];
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  return item;
}

function processInbound(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetIn = ss.getSheetByName('BARANG_MASUK_GU');
  var dateStr = payload.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm");
  payload.items.forEach(function(item) {
    var idTx = "IN-" + new Date().getTime();
    sheetIn.appendRow([idTx, payload.noBukti || idTx, dateStr, timeStr, item.kodeBarang, item.namaBarang, item.jumlah, item.satuan, item.keterangan || '', payload.dibuatOleh || 'Admin']);
  });
  return { status: 'success', count: payload.items.length };
}

function processOutbound(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetOut = ss.getSheetByName('BARANG_KELUAR_GU');
  var clusterSheetName = payload.lokasiTujuan.toUpperCase().replace(/\\s+/g, '_');
  var clusterSheet = ss.getSheetByName(clusterSheetName);
  var dateStr = payload.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm");

  payload.items.forEach(function(item) {
    var idTx = "OUT-" + new Date().getTime();
    sheetOut.appendRow([idTx, payload.nomorSurat, dateStr, timeStr, payload.lokasiTujuan, payload.namaPembawa || '-', payload.namaPenerima || '-', item.kodeBarang, item.namaBarang, item.jumlah, item.satuan, item.keterangan || '', payload.dibuatOleh || 'Admin']);
    if (clusterSheet) {
      clusterSheet.appendRow([dateStr, payload.nomorSurat, item.kodeBarang, item.namaBarang, item.jumlah, 0, item.jumlah, 'Gudang Utama -> ' + payload.lokasiTujuan]);
    }
  });
  return { status: 'success', nomorSurat: payload.nomorSurat };
}

function processClusterOutbound(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var clusterName = String(payload.lokasiAsal || payload.cluster || 'Cluster 1');
  var clusterSheetName = clusterName.toUpperCase().replace(/\\s+/g, '_');
  var clusterSheet = ss.getSheetByName(clusterSheetName);
  if (!clusterSheet) return { status: 'error', message: 'Sheet tidak ditemukan' };

  var dateStr = payload.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var timeStr = payload.jam || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm");
  var items = payload.items || [];

  items.forEach(function(item) {
    clusterSheet.appendRow([
      dateStr + " " + timeStr,
      payload.nomorSurat,
      'KELUAR KE AREA',
      item.kodeBarang,
      item.namaBarang,
      Number(item.jumlah) || 1,
      item.satuan || 'Pcs',
      payload.namaPembawa || '-',
      payload.areaTujuanDetail || '-',
      '-'
    ]);
  });
  return { status: 'success', nomorSurat: payload.nomorSurat };
}

function processBulkSync(payload) {
  var items = payload.items || [];
  items.forEach(function(it) {
    saveMasterItem(it);
  });
  return { status: 'success', syncedItems: items.length };
}

function getClusterStockData(clusterName) {
  var sheetName = clusterName.toUpperCase().replace(/\\s+/g, '_');
  return getSheetDataAsJson(sheetName);
}`;

  const codeHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Inventory Gudang Bertingkat KPP</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { font-family: Calibri, 'Segoe UI', Candara, Arial, sans-serif; }
    :root { --odoo-purple: #714B67; --odoo-teal: #017E84; }
  </style>
</head>
<body class="bg-[#F8F9FA] text-[#212529] min-h-screen flex flex-col">
  <!-- Top Navigation Bar -->
  <header class="bg-[#714B67] text-white shadow-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-white rounded-lg p-0.5 flex items-center justify-center shadow">
          <span class="font-black text-[#0A4D94] text-xs">PATRA<span class="text-[#32A028]">JASA</span></span>
        </div>
        <div>
          <h1 class="text-base font-bold leading-none">Inventory Gudang Bertingkat KPP</h1>
          <span class="text-[11px] text-purple-200">Google Apps Script Web App Edition</span>
        </div>
      </div>
      <span class="text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-medium">
        ● Live Sync
      </span>
    </div>
    <nav class="bg-[#5a3c52] px-4 overflow-x-auto text-xs font-semibold flex gap-1 border-t border-purple-800/40">
      <button onclick="switchTab('dashboard')" id="tab-dashboard" class="px-4 py-2.5 border-b-2 border-white text-white">Dashboard</button>
      <button onclick="switchTab('gudang_utama')" id="tab-gudang_utama" class="px-4 py-2.5 border-b-2 border-transparent text-purple-200 hover:text-white">Gudang Utama</button>
      <button onclick="switchTab('cluster_1')" id="tab-cluster_1" class="px-4 py-2.5 border-b-2 border-transparent text-purple-200 hover:text-white">Cluster 1</button>
      <button onclick="switchTab('cluster_2')" id="tab-cluster_2" class="px-4 py-2.5 border-b-2 border-transparent text-purple-200 hover:text-white">Cluster 2</button>
      <button onclick="switchTab('cluster_3')" id="tab-cluster_3" class="px-4 py-2.5 border-b-2 border-transparent text-purple-200 hover:text-white">Cluster 3</button>
      <button onclick="switchTab('cluster_4')" id="tab-cluster_4" class="px-4 py-2.5 border-b-2 border-transparent text-purple-200 hover:text-white">Cluster 4</button>
    </nav>
  </header>
  <main class="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h2 class="text-base font-bold text-slate-800">Aplikasi Inventory Gudang Bertingkat Siap Digunakan</h2>
      <p class="text-xs text-slate-500 mt-1">Data tersinkronisasi otomatis antara Gudang Utama dan Cluster 1, 2, 3, 4 langsung ke Google Sheets Anda.</p>
    </div>
  </main>
  <script>
    function switchTab(id) {
      alert("Membuka tampilan: " + id);
    }
  </script>
</body>
</html>`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#714B67] text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Kode Utuh Google Apps Script</h3>
              <p className="text-xs text-purple-200">
                Code.gs (Backend Google Sheets) & Index.html (Frontend Web App)
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

        {/* Tab Selection & Actions Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('gs')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'gs'
                  ? 'bg-white text-[#714B67] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-amber-600" />
              <span>Code.gs</span>
            </button>
            <button
              onClick={() => setActiveTab('html')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'html'
                  ? 'bg-white text-[#714B67] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Index.html</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-white text-[#714B67] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Petunjuk Deploy</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'gs' && (
              <>
                <button
                  onClick={() => handleCopy(codeGs, 'gs')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition flex items-center gap-1.5 shadow-sm"
                >
                  {copied === 'gs' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'gs' ? 'Tersalin!' : 'Salin Code.gs'}</span>
                </button>
                <button
                  onClick={() => handleDownload(codeGs, 'Code.gs')}
                  className="px-3 py-1.5 bg-[#714B67] hover:bg-[#5a3c52] text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .gs</span>
                </button>
              </>
            )}
            {activeTab === 'html' && (
              <>
                <button
                  onClick={() => handleCopy(codeHtml, 'html')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition flex items-center gap-1.5 shadow-sm"
                >
                  {copied === 'html' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'html' ? 'Tersalin!' : 'Salin Index.html'}</span>
                </button>
                <button
                  onClick={() => handleDownload(codeHtml, 'Index.html')}
                  className="px-3 py-1.5 bg-[#714B67] hover:bg-[#5a3c52] text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh .html</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Code Content Area */}
        <div className="p-4 flex-1 overflow-y-auto font-mono text-xs bg-slate-900 text-slate-100">
          {activeTab === 'gs' && (
            <pre className="whitespace-pre-wrap leading-relaxed select-text">{codeGs}</pre>
          )}

          {activeTab === 'html' && (
            <pre className="whitespace-pre-wrap leading-relaxed select-text">{codeHtml}</pre>
          )}

          {activeTab === 'guide' && (
            <div className="font-sans text-slate-800 bg-white p-5 rounded-xl space-y-4">
              <h4 className="text-base font-bold text-[#714B67] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Langkah Cepat Memasang di Google Spreadsheet & Apps Script
              </h4>
              <ol className="list-decimal list-inside space-y-3 text-xs text-slate-700 leading-relaxed">
                <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>Buka Google Sheets:</strong> Kunjungi{' '}
                  <a href="https://sheets.new" target="_blank" className="text-blue-600 underline">
                    sheets.new
                  </a>{' '}
                  dan beri judul spreadsheet misalnya <em>"Database Inventory Gudang Bertingkat KPP"</em>.
                </li>
                <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>Buka Apps Script:</strong> Pada menu atas Google Sheets, klik{' '}
                  <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.
                </li>
                <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>Tempel Code.gs:</strong> Hapus kode bawaan di tab <code>Code.gs</code>, klik tombol{' '}
                  <span className="font-bold text-[#714B67]">"Salin Code.gs"</span> di atas, lalu tempel (Paste).
                </li>
                <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>Buat Index.html:</strong> Di panel kiri Apps Script, klik tombol <strong>+ (Add a file)</strong> &gt;{' '}
                  <strong>HTML</strong>, beri nama <code>Index</code>, lalu tempelkan kode dari tab{' '}
                  <span className="font-bold text-blue-600">"Index.html"</span>.
                </li>
                <li className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <strong>Jalankan Setup Sheet:</strong> Pada dropdown fungsi di atas editor Apps Script, pilih fungsi{' '}
                  <code>setupDatabaseSheets</code>, lalu klik tombol <strong>Run (Jalankan)</strong>. Ini akan otomatis
                  membuat 8 sheet database lengkap dengan header bergaya Odoo.
                </li>
                <li className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <strong>Terapkan (Deploy):</strong> Klik tombol biru <strong>Terapkan (Deploy)</strong> di kanan atas &gt;{' '}
                  <strong>Penerapan Baru (New Deployment)</strong> &gt; pilih jenis <strong>Aplikasi Web</strong> &gt; set
                  Akses ke <strong>"Siapa saja" (Anyone)</strong> &gt; klik <strong>Terapkan</strong>.
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
