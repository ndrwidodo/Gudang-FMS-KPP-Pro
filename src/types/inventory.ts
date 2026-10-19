/**
 * Type definitions for Inventory Gudang Bertingkat KPP
 */

export type ClusterId = 'cluster_1' | 'cluster_2' | 'cluster_3' | 'cluster_4';

export type LocationType = 'Gudang Utama' | 'Cluster 1' | 'Cluster 2' | 'Cluster 3' | 'Cluster 4';

export interface InventoryItem {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  kategori: string;
  satuan: string;
  gambarUrl?: string; // Google Drive or direct preview URL
  jumlahMasukGudangUtama: number;
  stokAkhirGudangUtama: number;
  minStok?: number;
  deskripsi?: string;
  tanggalInput: string;
  updatedAt: string;
}

export interface ClusterStockItem {
  kodeBarang: string;
  namaBarang: string;
  kategori: string;
  satuan: string;
  gambarUrl?: string;
  totalMasuk: number;   // Inbound from Gudang Utama
  totalKeluar: number;  // Outbound to sub-areas
  stokAkhir: number;
  lastUpdated: string;
}

export interface TransactionLine {
  kodeBarang: string;
  namaBarang: string;
  jumlah: number;
  satuan: string;
  keterangan?: string;
}

export interface StockTransaction {
  id: string;
  nomorSurat: string;
  tanggal: string; // YYYY-MM-DD
  jam: string;
  tipe: 'MASUK' | 'KELUAR';
  lokasiAsal: LocationType;
  lokasiTujuan: LocationType | string; // e.g., 'Cluster 1' or 'Cluster 1 - Lantai 2 Unit A'
  namaPembawa?: string;
  namaPenerima?: string;
  areaTujuanDetail?: string; // used for Cluster outgoing
  keterangan?: string;
  items: TransactionLine[];
  dibuatOleh: string;
  status: 'SELESAI' | 'TERVERIFIKASI' | 'DRAFT';
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Kepala Gudang' | 'Admin Cluster' | 'Operator';
  avatar?: string;
  provider: 'default' | 'google';
  registeredAt: string;
  lastLogin: string;
}

export interface SpreadsheetConfig {
  spreadsheetUrl: string;
  sheetId: string;
  webAppUrl: string;
  autoSync: boolean;
  lastTestedAt?: string;
  status: 'not_connected' | 'connected' | 'testing' | 'error';
  statusMessage?: string;
}

export interface MonthlyReportRow {
  kodeBarang: string;
  namaBarang: string;
  kategori: string;
  satuan: string;
  stokAwal: number;
  masuk: number;
  keluarCluster1: number;
  keluarCluster2: number;
  keluarCluster3: number;
  keluarCluster4: number;
  totalKeluar: number;
  stokAkhir: number;
}

export interface ClusterMonthlyReportRow {
  kodeBarang: string;
  namaBarang: string;
  kategori: string;
  satuan: string;
  stokAwal: number;
  masukDariGudangUtama: number;
  keluarArea: number;
  stokAkhir: number;
}

export interface YearlyReportRow {
  kodeBarang: string;
  namaBarang: string;
  satuan: string;
  months: {
    bulan: number; // 1-12
    namaBulan: string;
    stokAwal: number;
    masuk: number;
    keluar: number;
    stokAkhir: number;
  }[];
  finalStokDesember: number;
}
