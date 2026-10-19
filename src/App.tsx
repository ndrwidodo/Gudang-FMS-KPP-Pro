/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  getStoredItems,
  saveStoredItems,
  getStoredTransactions,
  saveStoredTransactions,
  getCurrentUser,
  setCurrentUser,
  getSpreadsheetConfig,
  saveSpreadsheetConfig,
  resetApplicationToFreshState,
} from './utils/storage';
import { sendClearTransactionsToSpreadsheet } from './utils/spreadsheetSync';
import { InventoryItem, StockTransaction, UserAccount, SpreadsheetConfig } from './types/inventory';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { GudangUtamaView } from './components/GudangUtamaView';
import { ClusterView } from './components/ClusterView';
import { LoginModal } from './components/LoginModal';
import { SpreadsheetModal } from './components/SpreadsheetModal';
import { AppsScriptViewerModal } from './components/AppsScriptViewerModal';

export default function App() {
  // Navigation state
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [gudangUtamaSubTab, setGudangUtamaSubTab] = useState<'master' | 'masuk' | 'keluar' | 'laporan'>('master');

  // Persistence data state
  const [items, setItems] = useState<InventoryItem[]>(() => getStoredItems());
  const [transactions, setTransactions] = useState<StockTransaction[]>(() => getStoredTransactions());
  const [currentUser, setAuthUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [sheetConfig, setSheetConfig] = useState<SpreadsheetConfig>(() => getSpreadsheetConfig());

  // Modal controls
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [isAppsScriptOpen, setIsAppsScriptOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    saveStoredItems(items);
  }, [items]);

  useEffect(() => {
    saveStoredTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveSpreadsheetConfig(sheetConfig);
  }, [sheetConfig]);

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthUser(null);
    setIsLoginOpen(true);
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setAuthUser(user);
    setIsLoginOpen(false);
  };

  const handleOpenNewInbound = () => {
    setActiveTab('gudang_utama');
    setGudangUtamaSubTab('masuk');
  };

  const handleOpenNewOutbound = () => {
    setActiveTab('gudang_utama');
    setGudangUtamaSubTab('keluar');
  };

  const handleResetTransactions = () => {
    const fresh = resetApplicationToFreshState();
    setTransactions([]);
    setItems(fresh.items);
    sendClearTransactionsToSpreadsheet();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#212529] flex flex-col font-calibri">
      {/* Top Navbar in Odoo Theme */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'gudang_utama') {
            setGudangUtamaSubTab('master');
          }
        }}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
        onOpenAppsScript={() => setIsAppsScriptOpen(true)}
        sheetConfig={sheetConfig}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 flex-1">
        {activeTab === 'dashboard' && (
          <DashboardView
            items={items}
            transactions={transactions}
            sheetConfig={sheetConfig}
            onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
            onNavigateToTab={(tabId) => {
              setActiveTab(tabId);
              if (tabId === 'gudang_utama') {
                setGudangUtamaSubTab('master');
              }
            }}
            onOpenNewInbound={handleOpenNewInbound}
            onOpenNewOutbound={handleOpenNewOutbound}
            onResetTransactions={handleResetTransactions}
          />
        )}

        {activeTab === 'gudang_utama' && (
          <GudangUtamaView
            items={items}
            setItems={setItems}
            transactions={transactions}
            setTransactions={setTransactions}
            currentUser={currentUser}
            defaultSubTab={gudangUtamaSubTab}
          />
        )}

        {activeTab === 'cluster_1' && (
          <ClusterView
            clusterName="Cluster 1"
            items={items}
            transactions={transactions}
            setTransactions={setTransactions}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'cluster_2' && (
          <ClusterView
            clusterName="Cluster 2"
            items={items}
            transactions={transactions}
            setTransactions={setTransactions}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'cluster_3' && (
          <ClusterView
            clusterName="Cluster 3"
            items={items}
            transactions={transactions}
            setTransactions={setTransactions}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'cluster_4' && (
          <ClusterView
            clusterName="Cluster 4"
            items={items}
            transactions={transactions}
            setTransactions={setTransactions}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1 font-medium">
            <span className="font-bold text-[#714B67]">Inventory Gudang Bertingkat KPP</span>
            <span>&bull; Powered by Patrajasa FMS Apps</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Terhubung ke Google Apps Script & 4 Tab Cluster Terintegrasi
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <SpreadsheetModal
        isOpen={isSpreadsheetOpen}
        onClose={() => setIsSpreadsheetOpen(false)}
        config={sheetConfig}
        onUpdateConfig={setSheetConfig}
        items={items}
        transactions={transactions}
        onOpenAppsScript={() => setIsAppsScriptOpen(true)}
      />

      <AppsScriptViewerModal
        isOpen={isAppsScriptOpen}
        onClose={() => setIsAppsScriptOpen(false)}
      />
    </div>
  );
}
