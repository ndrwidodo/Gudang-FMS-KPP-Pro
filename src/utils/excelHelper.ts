import * as XLSX from 'xlsx';
import { InventoryItem, StockTransaction, MonthlyReportRow, YearlyReportRow } from '../types/inventory';

export function exportItemsToExcel(items: InventoryItem[], filename = 'Master_Barang_Gudang_Utama_KPP.xlsx') {
  const data = items.map((item, idx) => ({
    'No': idx + 1,
    'Kode Barang': item.kodeBarang,
    'Nama Barang': item.namaBarang,
    'Kategori': item.kategori,
    'Satuan': item.satuan,
    'Jumlah Masuk': item.jumlahMasukGudangUtama,
    'Stok Akhir': item.stokAkhirGudangUtama,
    'Min Stok': item.minStok || 0,
    'Link Gambar Drive': item.gambarUrl || '',
    'Keterangan': item.deskripsi || '',
    'Tanggal Update': item.updatedAt
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Barang');
  XLSX.writeFile(workbook, filename);
}

export function parseItemsFromExcel(file: File): Promise<Partial<InventoryItem>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        const parsedItems: Partial<InventoryItem>[] = rawJson.map((row) => {
          // Normalize column headers
          const kode = row['Kode Barang'] || row['Kode'] || row['kodeBarang'] || row['KODE'] || `BRG-${Date.now().toString().slice(-4)}`;
          const nama = row['Nama Barang'] || row['Nama'] || row['namaBarang'] || 'Barang Baru';
          const kategori = row['Kategori'] || row['kategori'] || 'Umum';
          const satuan = row['Satuan'] || row['satuan'] || 'Pcs';
          const masuk = Number(row['Jumlah Masuk'] || row['Masuk'] || row['jumlahMasukGudangUtama'] || 0);
          const stok = Number(row['Stok Akhir'] || row['Stok'] || row['stokAkhirGudangUtama'] || masuk);
          const gambar = row['Link Gambar Drive'] || row['Gambar'] || row['gambarUrl'] || '';
          const deskripsi = row['Keterangan'] || row['Deskripsi'] || '';

          return {
            kodeBarang: String(kode).trim(),
            namaBarang: String(nama).trim(),
            kategori: String(kategori).trim(),
            satuan: String(satuan).trim(),
            jumlahMasukGudangUtama: isNaN(masuk) ? 0 : masuk,
            stokAkhirGudangUtama: isNaN(stok) ? 0 : stok,
            gambarUrl: String(gambar).trim(),
            deskripsi: String(deskripsi).trim(),
          };
        });

        resolve(parsedItems);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export function exportSuratJalanToExcel(transaction: StockTransaction) {
  const headerData = [
    ['INVENTORY GUDANG BERTINGKAT KPP - PATRAJASA FMS'],
    ['SURAT JALAN / SURAT KELUAR BARANG'],
    ['Nomor Surat:', transaction.nomorSurat],
    ['Tanggal:', transaction.tanggal, 'Waktu:', transaction.jam],
    ['Lokasi Asal:', transaction.lokasiAsal],
    ['Lokasi Tujuan:', transaction.lokasiTujuan],
    ['Pembawa:', transaction.namaPembawa || '-'],
    ['Area Detail:', transaction.areaTujuanDetail || '-'],
    ['Keterangan:', transaction.keterangan || '-'],
    []
  ];

  const itemsData = transaction.items.map((it, idx) => ({
    'No': idx + 1,
    'Kode Barang': it.kodeBarang,
    'Nama Barang': it.namaBarang,
    'Jumlah': it.jumlah,
    'Satuan': it.satuan,
    'Keterangan': it.keterangan || '-'
  }));

  const ws = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.sheet_add_json(ws, itemsData, { origin: 10 });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Surat Jalan');
  XLSX.writeFile(wb, `Surat_Jalan_${transaction.nomorSurat.replace(/[\/\\:]/g, '_')}.xlsx`);
}

export function exportMonthlyReportToExcel(rows: MonthlyReportRow[], bulanName: string, tahun: number, lokasi: string) {
  const data = rows.map((r, i) => ({
    'No': i + 1,
    'Kode Barang': r.kodeBarang,
    'Nama Barang': r.namaBarang,
    'Kategori': r.kategori,
    'Satuan': r.satuan,
    'Stok Awal': r.stokAwal,
    'Masuk': r.masuk,
    'Keluar Cluster 1': r.keluarCluster1,
    'Keluar Cluster 2': r.keluarCluster2,
    'Keluar Cluster 3': r.keluarCluster3,
    'Keluar Cluster 4': r.keluarCluster4,
    'Total Keluar': r.totalKeluar,
    'Stok Akhir': r.stokAkhir,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Laporan ${bulanName}`);
  XLSX.writeFile(wb, `Laporan_Bulanan_${lokasi.replace(/\s+/g, '_')}_${bulanName}_${tahun}.xlsx`);
}

export function exportYearlyReportToExcel(rows: YearlyReportRow[], tahun: number, lokasi: string) {
  const flatData: any[] = [];
  rows.forEach((r) => {
    const rowObj: any = {
      'Kode Barang': r.kodeBarang,
      'Nama Barang': r.namaBarang,
      'Satuan': r.satuan,
    };
    r.months.forEach((m) => {
      rowObj[`${m.namaBulan} - Awal`] = m.stokAwal;
      rowObj[`${m.namaBulan} - Masuk`] = m.masuk;
      rowObj[`${m.namaBulan} - Keluar`] = m.keluar;
      rowObj[`${m.namaBulan} - Akhir`] = m.stokAkhir;
    });
    rowObj['Stok Akhir Tahun'] = r.finalStokDesember;
    flatData.push(rowObj);
  });

  const ws = XLSX.utils.json_to_sheet(flatData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Tahunan ${tahun}`);
  XLSX.writeFile(wb, `Laporan_Tahunan_${lokasi.replace(/\s+/g, '_')}_${tahun}.xlsx`);
}
