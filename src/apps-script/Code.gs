/**
 * =========================================================================
 * INVENTORY GUDANG BERTINGKAT KPP - PATRAJASA FMS APPS
 * File: Code.gs (Google Apps Script Real-Time Engine & Spreadsheet Sync)
 * =========================================================================
 * Petunjuk Instalasi:
 * 1. Buka Google Sheets Anda atau buat baru: https://sheets.new
 * 2. Klik menu 'Ekstensi' > 'Apps Script'
 * 3. Hapus kode bawaan dan tempelkan seluruh isi file ini ke 'Code.gs'
 * 4. Buat file baru berformat HTML dengan nama 'Index.html' dan tempelkan isi Index.html
 * 5. Jalankan fungsi 'setupDatabaseSheets()' satu kali untuk membuat sheet & header otomatis
 * 6. Klik 'Terapkan' (Deploy) > 'Penerapan Baru' (New Deployment)
 *    - Pilih Jenis: 'Aplikasi Web' (Web app)
 *    - Konfigurasi:
 *      * Deskripsi: Inventory KPP Real-Time Sync Engine
 *      * Jalankan sebagai: Saya (Akun Anda / Me)
 *      * Akses: Siapa saja (Anyone) -> PENTING agar web app bisa merekam data secara real-time!
 *    - Klik 'Terapkan' dan salin URL Aplikasi Web Anda (akhiran /exec) ke menu 'Koneksi Sheet' di aplikasi!
 */

const APP_NAME = "Inventory Gudang KPP";
const DRIVE_FOLDER_ID = "1w72vnBTB1PFZeF1Br36rHDv5_mCmb0aG"; // Folder Google Drive Bukti/Gambar

function doGet(e) {
  // Jika dipanggil via browser biasa tanpa parameter action, tampilkan Antarmuka Web App
  if (!e || !e.parameter || !e.parameter.action) {
    var template = HtmlService.createTemplateFromFile('Index');
    return template.evaluate()
      .setTitle(APP_NAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Jika dipanggil sebagai API GET
  return handleApiRequest(e.parameter);
}

function doPost(e) {
  try {
    var contents = {};
    if (e && e.postData && e.postData.contents) {
      try {
        contents = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Fallback jika dikirim via URL encoded
        contents = e.parameter || {};
      }
    } else if (e && e.parameter) {
      contents = e.parameter;
    }

    var action = contents.action || (e && e.parameter ? e.parameter.action : '');
    return handleApiRequest(contents, action);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Router API Real-Time untuk komunikasi dari Aplikasi Web & React
 */
function handleApiRequest(params, postAction) {
  var action = postAction || params.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Pastikan seluruh sheet selalu ada sebelum operasi
  ensureSheetsExist(ss);

  switch (action) {
    case 'testConnection':
      return createJsonResponse({
        status: 'success',
        message: 'Koneksi ke Google Sheets ' + ss.getName() + ' Berhasil & Siap Real-Time!',
        timestamp: new Date().toISOString(),
        sheets: ss.getSheets().map(function(s) { return s.getName(); })
      });

    case 'getMasterItems':
      var items = getSheetDataAsJson('MASTER_BARANG');
      return createJsonResponse({ status: 'success', data: items });

    case 'saveItem':
      var itemData = params.data || params;
      var saved = saveMasterItem(itemData);
      SpreadsheetApp.flush(); // Real-time immediate disk write!
      return createJsonResponse({ status: 'success', message: 'Item berhasil disimpan ke Spreadsheet secara real-time', data: saved });

    case 'deleteItem':
      var delData = params.data || params;
      var delResult = deleteMasterItem(delData);
      SpreadsheetApp.flush(); // Real-time immediate disk write!
      return createJsonResponse({ status: 'success', message: 'Item berhasil dihapus dari Spreadsheet secara real-time', data: delResult });

    case 'inboundGudangUtama':
      var inData = params.data || params;
      var inResult = processInbound(inData);
      SpreadsheetApp.flush(); // Real-time immediate disk write!
      return createJsonResponse({ status: 'success', message: 'Penerimaan barang masuk GU berhasil terekam real-time', data: inResult });

    case 'outboundGudangUtama':
      var outData = params.data || params;
      var outResult = processOutbound(outData);
      SpreadsheetApp.flush(); // Real-time immediate disk write!
      return createJsonResponse({ status: 'success', message: 'Pengeluaran GU ke Cluster berhasil terekam real-time', data: outResult });

    case 'outboundCluster':
      var clusterOutData = params.data || params;
      var cOutResult = processClusterOutbound(clusterOutData);
      SpreadsheetApp.flush(); // Real-time immediate disk write!
      return createJsonResponse({ status: 'success', message: 'Pengeluaran Cluster ke Area berhasil terekam real-time', data: cOutResult });

    case 'clearTransactions':
      var clearResult = clearAllTransactions();
      SpreadsheetApp.flush(); // Real-time immediate disk write!
      return createJsonResponse({ status: 'success', message: 'Seluruh sheet riwayat transaksi berhasil dibersihkan (Fresh Baru)', data: clearResult });

    case 'bulkSync':
      var syncResult = processBulkSync(params);
      SpreadsheetApp.flush(); // Real-time immediate disk write!
      return createJsonResponse({ status: 'success', message: 'Sinkronisasi massal seluruh data berhasil', data: syncResult });

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

/**
 * Setup & Verifikasi seluruh Sheet & Header Otomatis
 */
function setupDatabaseSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheetsExist(ss);
  SpreadsheetApp.flush();
  return "Setup Berhasil! Seluruh 8 Sheet Database KPP telah siap digunakan untuk Real-Time Sync.";
}

function ensureSheetsExist(ss) {
  var sheetConfigs = [
    {
      name: 'MASTER_BARANG',
      headers: ['Kode Barang', 'Nama Barang', 'Kategori', 'Satuan', 'Jumlah Masuk GU', 'Stok Akhir GU', 'Min Stok', 'Link Gambar Drive', 'Keterangan', 'Terakhir Update']
    },
    {
      name: 'BARANG_MASUK_GU',
      headers: ['ID Transaksi', 'No Bukti', 'Tanggal', 'Jam', 'Kode Barang', 'Nama Barang', 'Jumlah', 'Satuan', 'Keterangan', 'Petugas']
    },
    {
      name: 'BARANG_KELUAR_GU',
      headers: ['ID Transaksi', 'No Surat Jalan', 'Tanggal', 'Jam', 'Tujuan Cluster', 'Pembawa', 'Penerima', 'Kode Barang', 'Nama Barang', 'Jumlah', 'Satuan', 'Keterangan', 'Petugas']
    },
    {
      name: 'CLUSTER_1',
      headers: ['Tanggal Mutasi', 'No Surat Jalan', 'Tipe', 'Kode Barang', 'Nama Barang', 'Jumlah', 'Satuan', 'Pembawa', 'Area / Tujuan Detail', 'Stok Sisa Cluster']
    },
    {
      name: 'CLUSTER_2',
      headers: ['Tanggal Mutasi', 'No Surat Jalan', 'Tipe', 'Kode Barang', 'Nama Barang', 'Jumlah', 'Satuan', 'Pembawa', 'Area / Tujuan Detail', 'Stok Sisa Cluster']
    },
    {
      name: 'CLUSTER_3',
      headers: ['Tanggal Mutasi', 'No Surat Jalan', 'Tipe', 'Kode Barang', 'Nama Barang', 'Jumlah', 'Satuan', 'Pembawa', 'Area / Tujuan Detail', 'Stok Sisa Cluster']
    },
    {
      name: 'CLUSTER_4',
      headers: ['Tanggal Mutasi', 'No Surat Jalan', 'Tipe', 'Kode Barang', 'Nama Barang', 'Jumlah', 'Satuan', 'Pembawa', 'Area / Tujuan Detail', 'Stok Sisa Cluster']
    },
    {
      name: 'USERS_LOG',
      headers: ['User ID', 'Nama', 'Email', 'Role', 'Provider', 'Terakhir Login']
    }
  ];

  sheetConfigs.forEach(function(cfg) {
    var sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
      var headerRange = sheet.getRange(1, 1, 1, cfg.headers.length);
      headerRange.setValues([cfg.headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#714B67');
      headerRange.setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }
  });
}

/**
 * Utility Membaca Sheet menjadi JSON Array
 */
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
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}

/**
 * Simpan atau Update Master Barang di Sheet 'MASTER_BARANG'
 */
function saveMasterItem(item) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('MASTER_BARANG');
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == String(item.kodeBarang).trim()) {
      rowIndex = i + 1;
      break;
    }
  }

  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  var rowValues = [
    item.kodeBarang,
    item.namaBarang,
    item.kategori || 'Umum',
    item.satuan || 'Pcs',
    Number(item.jumlahMasukGudangUtama) || 0,
    Number(item.stokAkhirGudangUtama) || 0,
    Number(item.minStok) || 5,
    item.gambarUrl || '',
    item.deskripsi || '',
    nowStr
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }

  SpreadsheetApp.flush();
  return item;
}

/**
 * Hapus Master Barang di Sheet 'MASTER_BARANG'
 */
function deleteMasterItem(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('MASTER_BARANG');
  if (!sheet) return null;

  var kode = (data && data.kodeBarang) ? String(data.kodeBarang).trim() : ((typeof data === 'string') ? String(data).trim() : '');
  var sheetData = sheet.getDataRange().getValues();

  for (var i = 1; i < sheetData.length; i++) {
    if (String(sheetData[i][0]).trim() == kode) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return { status: 'deleted', kodeBarang: kode, row: i + 1 };
    }
  }

  return { status: 'not_found', kodeBarang: kode };
}

/**
 * Menghapus seluruh riwayat transaksi di Sheet:
 * - BARANG_MASUK_GU
 * - BARANG_KELUAR_GU
 * - CLUSTER_1, CLUSTER_2, CLUSTER_3, CLUSTER_4
 * (Baris header tetap dipertahankan)
 */
function clearAllTransactions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var txSheets = ['BARANG_MASUK_GU', 'BARANG_KELUAR_GU', 'CLUSTER_1', 'CLUSTER_2', 'CLUSTER_3', 'CLUSTER_4'];
  var clearedCount = 0;

  txSheets.forEach(function(sName) {
    var sh = ss.getSheetByName(sName);
    if (sh) {
      var lastRow = sh.getLastRow();
      if (lastRow > 1) {
        sh.deleteRows(2, lastRow - 1);
        clearedCount++;
      }
    }
  });

  SpreadsheetApp.flush();
  return { status: 'cleared', sheetsAffected: txSheets, clearedCount: clearedCount, timestamp: new Date().toISOString() };
}

/**
 * Rekam Barang Masuk Gudang Utama di Sheet 'BARANG_MASUK_GU' & Update Stok Master
 */
function processInbound(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetIn = ss.getSheetByName('BARANG_MASUK_GU');
  var sheetMaster = ss.getSheetByName('MASTER_BARANG');

  var dateStr = payload.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var timeStr = payload.jam || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm");
  var items = payload.items || [];

  items.forEach(function(item) {
    var idTx = "IN-" + new Date().getTime() + "-" + Math.floor(Math.random()*100);
    sheetIn.appendRow([
      idTx,
      payload.nomorSurat || payload.noBukti || idTx,
      dateStr,
      timeStr,
      item.kodeBarang,
      item.namaBarang,
      Number(item.jumlah) || 1,
      item.satuan || 'Pcs',
      item.keterangan || payload.keterangan || '',
      payload.dibuatOleh || 'Admin'
    ]);

    // Update stok di Master Barang
    if (sheetMaster) {
      var mData = sheetMaster.getDataRange().getValues();
      for (var r = 1; r < mData.length; r++) {
        if (String(mData[r][0]).trim() == String(item.kodeBarang).trim()) {
          var curMasuk = Number(mData[r][4]) || 0;
          var curStok = Number(mData[r][5]) || 0;
          var qty = Number(item.jumlah) || 0;
          sheetMaster.getRange(r + 1, 5).setValue(curMasuk + qty);
          sheetMaster.getRange(r + 1, 6).setValue(curStok + qty);
          sheetMaster.getRange(r + 1, 10).setValue(dateStr + " " + timeStr);
          break;
        }
      }
    }
  });

  SpreadsheetApp.flush();
  return { status: 'success', count: items.length };
}

/**
 * Rekam Barang Keluar GU ke Cluster di Sheet 'BARANG_KELUAR_GU'
 * Otomatis mengisi sheet Cluster tujuan!
 */
function processOutbound(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetOut = ss.getSheetByName('BARANG_KELUAR_GU');
  var sheetMaster = ss.getSheetByName('MASTER_BARANG');

  var targetCluster = String(payload.lokasiTujuan || 'Cluster 1');
  var clusterSheetName = targetCluster.toUpperCase().replace(/\s+/g, '_');
  var clusterSheet = ss.getSheetByName(clusterSheetName);

  var dateStr = payload.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var timeStr = payload.jam || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm");
  var items = payload.items || [];

  items.forEach(function(item) {
    var idTx = "OUT-" + new Date().getTime() + "-" + Math.floor(Math.random()*100);
    var qty = Number(item.jumlah) || 1;

    // 1. Rekam di Barang Keluar GU
    sheetOut.appendRow([
      idTx,
      payload.nomorSurat,
      dateStr,
      timeStr,
      targetCluster,
      payload.namaPembawa || '-',
      payload.namaPenerima || '-',
      item.kodeBarang,
      item.namaBarang,
      qty,
      item.satuan || 'Pcs',
      item.keterangan || payload.keterangan || '',
      payload.dibuatOleh || 'Admin'
    ]);

    // 2. Otomatis rekam di Sheet Cluster Tujuan sebagai Penerimaan Masuk
    if (clusterSheet) {
      clusterSheet.appendRow([
        dateStr + " " + timeStr,
        payload.nomorSurat,
        'MASUK DARI GU',
        item.kodeBarang,
        item.namaBarang,
        qty,
        item.satuan || 'Pcs',
        payload.namaPembawa || '-',
        'Gudang Utama -> ' + targetCluster,
        qty // Stok sisa di cluster
      ]);
    }

    // 3. Potong stok di Master Barang
    if (sheetMaster) {
      var mData = sheetMaster.getDataRange().getValues();
      for (var r = 1; r < mData.length; r++) {
        if (String(mData[r][0]).trim() == String(item.kodeBarang).trim()) {
          var curStok = Number(mData[r][5]) || 0;
          sheetMaster.getRange(r + 1, 6).setValue(Math.max(0, curStok - qty));
          sheetMaster.getRange(r + 1, 10).setValue(dateStr + " " + timeStr);
          break;
        }
      }
    }
  });

  SpreadsheetApp.flush();
  return { status: 'success', nomorSurat: payload.nomorSurat };
}

/**
 * Rekam Barang Keluar dari Cluster ke Area Spesifik (Lantai, Ruangan)
 */
function processClusterOutbound(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var clusterName = String(payload.lokasiAsal || payload.cluster || 'Cluster 1');
  var clusterSheetName = clusterName.toUpperCase().replace(/\s+/g, '_');
  var clusterSheet = ss.getSheetByName(clusterSheetName);

  if (!clusterSheet) return { status: 'error', message: 'Sheet ' + clusterSheetName + ' tidak ditemukan' };

  var dateStr = payload.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var timeStr = payload.jam || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm");
  var items = payload.items || [];

  items.forEach(function(item) {
    var qty = Number(item.jumlah) || 1;
    clusterSheet.appendRow([
      dateStr + " " + timeStr,
      payload.nomorSurat,
      'KELUAR KE AREA',
      item.kodeBarang,
      item.namaBarang,
      qty,
      item.satuan || 'Pcs',
      payload.namaPembawa || '-',
      payload.areaTujuanDetail || payload.lokasiTujuan || '-',
      '-'
    ]);
  });

  SpreadsheetApp.flush();
  return { status: 'success', nomorSurat: payload.nomorSurat };
}

/**
 * Sinkronisasi Massal (Bulk Sync) seluruh data Master dan Transaksi
 */
function processBulkSync(payload) {
  var items = payload.items || [];

  // Sync master items
  items.forEach(function(it) {
    saveMasterItem(it);
  });

  SpreadsheetApp.flush();

  return {
    itemsCount: items.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Membaca Stok Terkini Cluster
 */
function getClusterStockData(clusterName) {
  var sheetName = clusterName.toUpperCase().replace(/\s+/g, '_');
  return getSheetDataAsJson(sheetName);
}
