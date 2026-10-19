import {
  InventoryItem,
  StockTransaction,
  UserAccount,
  SpreadsheetConfig,
  ClusterStockItem,
  LocationType,
} from '../types/inventory';

const STORAGE_KEYS = {
  ITEMS: 'kpp_inventory_items_v5_fresh',
  TRANSACTIONS: 'kpp_inventory_tx_fresh_clean_v1',
  AUTH_USER: 'kpp_inventory_auth_user_v2',
  USERS_LIST: 'kpp_inventory_users_list_v2',
  SHEET_CONFIG: 'kpp_inventory_sheet_v2',
};

// Default Users
export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user_default_admin',
    username: 'admin',
    name: 'Administrator Gudang KPP',
    email: 'admin.gudang@kpp-patrajasa.co.id',
    role: 'Super Admin',
    provider: 'default',
    registeredAt: '2026-01-10 08:00:00',
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'user_ndr_widodo',
    username: 'ndr.widodo',
    name: 'Ndr Widodo (Google Account)',
    email: 'ndr.widodo@gmail.com',
    role: 'Kepala Gudang',
    provider: 'google',
    registeredAt: '2026-02-15 09:30:00',
    lastLogin: new Date().toISOString(),
  },
];

// Initial Master Items - FRESH APPLICATION (Stok Akhir = Jumlah Masuk, 0 Transaksi Keluar)
const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: 'item_1',
    kodeBarang: 'KPP-ELE-001',
    namaBarang: 'Lampu LED Tube T8 18W Philips Ecofit',
    kategori: 'Elektrikal & ME',
    satuan: 'Pcs',
    gambarUrl: 'https://images.unsplash.com/photo-1550985543-f47f38aeee65?w=500&auto=format&fit=crop&q=60',
    jumlahMasukGudangUtama: 250,
    stokAkhirGudangUtama: 250,
    minStok: 30,
    deskripsi: 'Lampu penerangan koridor gedung bertingkat cool daylight 6500K',
    tanggalInput: '2026-01-05',
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'item_2',
    kodeBarang: 'KPP-K3-002',
    namaBarang: 'APAR Powder 6 Kg ABC Yamato / Gunnebo',
    kategori: 'Safety & K3',
    satuan: 'Tabung',
    gambarUrl: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=500&auto=format&fit=crop&q=60',
    jumlahMasukGudangUtama: 60,
    stokAkhirGudangUtama: 60,
    minStok: 10,
    deskripsi: 'Alat Pemadam Api Ringan untuk proteksi koridor dan tangga darurat',
    tanggalInput: '2026-01-08',
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'item_3',
    kodeBarang: 'KPP-NET-003',
    namaBarang: 'Kabel UTP Cat6 Commscope Roll 305M',
    kategori: 'IT & Jaringan',
    satuan: 'Roll',
    gambarUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&auto=format&fit=crop&q=60',
    jumlahMasukGudangUtama: 30,
    stokAkhirGudangUtama: 30,
    minStok: 5,
    deskripsi: 'Kabel jaringan backbone antar lantai cluster',
    tanggalInput: '2026-01-12',
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'item_4',
    kodeBarang: 'KPP-CIV-004',
    namaBarang: 'Cat Tembok Vinilex White 25 Kg Dulux/Nippon',
    kategori: 'Sipil & Finishing',
    satuan: 'Pail',
    gambarUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&auto=format&fit=crop&q=60',
    jumlahMasukGudangUtama: 45,
    stokAkhirGudangUtama: 45,
    minStok: 8,
    deskripsi: 'Cat dinding interior maintenance cluster tenant',
    tanggalInput: '2026-01-20',
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'item_5',
    kodeBarang: 'KPP-K3-005',
    namaBarang: 'Rompi Safety K3 Jaring Scotlight Hijau',
    kategori: 'Safety & K3',
    satuan: 'Pcs',
    gambarUrl: 'https://images.unsplash.com/photo-1618090584176-7132b9911657?w=500&auto=format&fit=crop&q=60',
    jumlahMasukGudangUtama: 120,
    stokAkhirGudangUtama: 120,
    minStok: 20,
    deskripsi: 'Rompi keselamatan kerja teknisi patroli gedung',
    tanggalInput: '2026-02-01',
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'item_6',
    kodeBarang: 'KPP-SAN-006',
    namaBarang: 'Kran Air Wastafel Stainless TOTO 1/2 Inch',
    kategori: 'Sanitasi & Plumbing',
    satuan: 'Unit',
    gambarUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60',
    jumlahMasukGudangUtama: 80,
    stokAkhirGudangUtama: 80,
    minStok: 15,
    deskripsi: 'Sparepart kran toilet cluster dan ruang publik',
    tanggalInput: '2026-02-10',
    updatedAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'item_7',
    kodeBarang: 'KPP-ELE-007',
    namaBarang: 'MCB Schneider 1 Phase 16A Domae',
    kategori: 'Elektrikal & ME',
    satuan: 'Pcs',
    gambarUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop&q=60',
    jumlahMasukGudangUtama: 90,
    stokAkhirGudangUtama: 90,
    minStok: 20,
    deskripsi: 'Pengaman sirkuit panel lantai bertingkat',
    tanggalInput: '2026-02-15',
    updatedAt: new Date().toISOString().split('T')[0],
  },
];

const INITIAL_SPREADSHEET: SpreadsheetConfig = {
  spreadsheetUrl:
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  webAppUrl:
    'https://script.google.com/macros/s/AKfycbz_KPP_Inventory_Apps_Script_Demo/exec',
  autoSync: true,
  status: 'connected',
  lastTestedAt: '2026-10-18 08:30:00',
  statusMessage: 'Terhubung ke Google Spreadsheet: Inventori Gudang KPP (4 Tab Sinkron)',
};

// Storage helper functions
export function getStoredItems(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!raw) {
      saveStoredItems(INITIAL_ITEMS);
      return INITIAL_ITEMS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ITEMS;
  }
}

export function saveStoredItems(items: InventoryItem[]): void {
  localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
}

export function getStoredTransactions(): StockTransaction[] {
  try {
    // Purge ALL legacy test transaction keys so the dashboard is 100% fresh
    localStorage.removeItem('kpp_inventory_tx_fresh_v4');
    localStorage.removeItem('kpp_inventory_tx_v2');
    localStorage.removeItem('kpp_inventory_tx_v1');
    localStorage.removeItem('kpp_inventory_tx');

    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      saveStoredTransactions([]);
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredTransactions(txs: StockTransaction[]): void {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
}

export function clearAllStoredTransactions(): void {
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  localStorage.removeItem('kpp_inventory_tx_fresh_v4');
  localStorage.removeItem('kpp_inventory_tx_v2');
  localStorage.removeItem('kpp_inventory_tx_v1');
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
}

/**
 * Reset seluruh data transaksi menjadi fresh baru:
 * - Menghapus semua riwayat transaksi
 * - Mengembalikan stok akhir Gudang Utama sama dengan jumlah barang masuk
 */
export function resetApplicationToFreshState(): {
  items: InventoryItem[];
  transactions: StockTransaction[];
} {
  clearAllStoredTransactions();

  const currentItems = getStoredItems();
  const resetItems = currentItems.map((item) => ({
    ...item,
    stokAkhirGudangUtama: item.jumlahMasukGudangUtama,
    updatedAt: new Date().toISOString().split('T')[0],
  }));

  saveStoredItems(resetItems);
  return { items: resetItems, transactions: [] };
}

export function getRegisteredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USERS;
  }
}

export function registerOrUpdateUser(user: UserAccount): void {
  const users = getRegisteredUsers();
  const existingIdx = users.findIndex(
    (u) => u.email.toLowerCase() === user.email.toLowerCase() || u.username === user.username
  );
  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...user, lastLogin: new Date().toISOString() };
  } else {
    users.push(user);
  }
  localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(users));
}

export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!raw) {
      // Default auto-login as Default Administrator so refresh doesn't force re-login
      const defaultUser = DEFAULT_USERS[0];
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USERS[0];
  }
}

export function setCurrentUser(user: UserAccount | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    registerOrUpdateUser(user);
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  }
}

export function getSpreadsheetConfig(): SpreadsheetConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHEET_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(INITIAL_SPREADSHEET));
      return INITIAL_SPREADSHEET;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SPREADSHEET;
  }
}

export function saveSpreadsheetConfig(config: SpreadsheetConfig): void {
  localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(config));
}

/**
 * Live stock calculation for a specific Cluster.
 * Inbound = all items sent from Gudang Utama to this cluster
 * Outbound = all items distributed from this cluster to its internal areas
 */
export function calculateClusterStock(
  clusterName: 'Cluster 1' | 'Cluster 2' | 'Cluster 3' | 'Cluster 4',
  items: InventoryItem[],
  transactions: StockTransaction[]
): ClusterStockItem[] {
  // Aggregate items that were ever sent to this cluster
  const stockMap = new Map<string, ClusterStockItem>();

  // 1. Inbound transactions to this cluster
  transactions.forEach((tx) => {
    if (tx.tipe === 'KELUAR' && tx.lokasiAsal === 'Gudang Utama' && tx.lokasiTujuan === clusterName) {
      tx.items.forEach((line) => {
        const existing = stockMap.get(line.kodeBarang);
        const masterItem = items.find((i) => i.kodeBarang === line.kodeBarang);
        if (existing) {
          existing.totalMasuk += line.jumlah;
          existing.stokAkhir += line.jumlah;
        } else {
          stockMap.set(line.kodeBarang, {
            kodeBarang: line.kodeBarang,
            namaBarang: line.namaBarang,
            kategori: masterItem?.kategori || 'Umum',
            satuan: line.satuan || masterItem?.satuan || 'Pcs',
            gambarUrl: masterItem?.gambarUrl,
            totalMasuk: line.jumlah,
            totalKeluar: 0,
            stokAkhir: line.jumlah,
            lastUpdated: tx.tanggal,
          });
        }
      });
    }

    // 2. Outbound transactions from this cluster to its sub-areas
    if (tx.tipe === 'KELUAR' && tx.lokasiAsal === clusterName) {
      tx.items.forEach((line) => {
        const existing = stockMap.get(line.kodeBarang);
        if (existing) {
          existing.totalKeluar += line.jumlah;
          existing.stokAkhir = Math.max(0, existing.stokAkhir - line.jumlah);
          existing.lastUpdated = tx.tanggal;
        }
      });
    }
  });

  return Array.from(stockMap.values());
}
