"use client";

import { useState } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface Product {
  id: string;
  kodeProduk: string;
  namaProduk: string;
  kategori: string;
  satuan: string;
  hargaBeli: number;
  hargaJual: number;
  stokMinimum: number;
  stokMaksimum: number;
  stokAwal: number;
  stokPerApotik?: { [apotikId: string]: number };
  supplier: string;
  keterangan: string;
  statusAktif: boolean;
  createdAt: Date;
  operator?: string;
  updatedAt?: Date;
  units?: any[];
  [key: string]: any;
}

export default function ResetDataPage() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmResetTransactions, setShowConfirmResetTransactions] = useState(false);
  const [showConfirmResetStock, setShowConfirmResetStock] = useState(false);
  const [showConfirmResetAll, setShowConfirmResetAll] = useState(false);

  const transactionKeys = [
    "pesananPembelian",
    "penerimaanPembelian",
    "returPembelian",
    "fakturPembelian",
    "transferBarang",
    "terimaTransfer",
    "rencanaTransferBarang",
    "penyesuaianStok",
    "stokOpname",
    "perubahanHargaJual",
    "penjualan",
    "pengajuanPembelian",
    "pengajuanPenerimaanPembelian",
    "pengajuanTerimaTransfer",
    "pengajuanTransferBarang",
    "pengajuanPenyesuaianStok",
    "pengajuanPerubahanHargaJual",
  ];

  // Fungsi untuk menghapus transaksi dari localStorage
  const clearTransactionDataFromLocalStorage = () => {
    transactionKeys.forEach((key) => {
      localStorage.removeItem(key);
    });
  };

  // Fungsi untuk menghapus transaksi dari API
  const clearTransactionDataFromAPI = async (): Promise<void> => {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    
    if (!data.session?.access_token) {
      throw new Error("Tidak ada sesi aktif. Silakan login terlebih dahulu.");
    }

    const token = data.session.access_token;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < transactionKeys.length; i++) {
      const key = transactionKeys[i];
      setProgress(`Menghapus ${key}... (${i + 1}/${transactionKeys.length})`);

      try {
        const response = await fetch(`/api/data/${key}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ value: [] }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error clearing ${key}:`, errorData);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Error clearing ${key}:`, err);
        errorCount++;
      }
    }

    if (errorCount > 0) {
      throw new Error(`Berhasil menghapus ${successCount} data, gagal ${errorCount} data.`);
    }
  };

  // Fungsi untuk reset stok produk
  const resetProductStock = async (): Promise<void> => {
    setProgress("Memuat data produk...");

    // Load products dari localStorage atau API
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();

    let products: Product[] = [];

    if (data.session?.access_token) {
      // Load dari API
      const token = data.session.access_token;
      const response = await fetch("/api/data/products", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        products = await response.json();
      } else {
        // Fallback ke localStorage
        const savedProducts = localStorage.getItem("products");
        if (savedProducts) {
          products = JSON.parse(savedProducts);
        }
      }
    } else {
      // Load dari localStorage
      const savedProducts = localStorage.getItem("products");
      if (savedProducts) {
        products = JSON.parse(savedProducts);
      }
    }

    if (products.length === 0) {
      throw new Error("Tidak ada data produk yang ditemukan.");
    }

    setProgress(`Mereset stok ${products.length} produk...`);

    // Reset stock untuk setiap produk
    // Pastikan mempertahankan semua field termasuk createdAt, updatedAt, units, dll
    const resetProducts = products.map((product) => {
      // Pastikan createdAt dan updatedAt tetap ada jika ada
      const resetProduct: Product = {
        ...product,
        stokPerApotik: {},
        stokAwal: 0,
      };
      
      // Pastikan field penting tetap ada
      if (product.createdAt) {
        resetProduct.createdAt = product.createdAt instanceof Date 
          ? product.createdAt 
          : new Date(product.createdAt);
      }
      
      if (product.updatedAt) {
        resetProduct.updatedAt = product.updatedAt instanceof Date 
          ? product.updatedAt 
          : new Date(product.updatedAt);
      }
      
      return resetProduct;
    });

    // Save ke localStorage
    localStorage.setItem("products", JSON.stringify(resetProducts));

    // Sync ke API
    if (data.session?.access_token) {
      setProgress("Menyinkronkan ke server...");
      const token = data.session.access_token;
      const response = await fetch("/api/data/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: resetProducts }),
      });

      if (!response.ok) {
        throw new Error("Gagal menyinkronkan data ke server.");
      }
    }
  };

  // Handler untuk reset transaksi
  const handleResetTransactions = async () => {
    setShowConfirmResetTransactions(false);
    setLoading(true);
    setProgress("");
    setSuccess(null);
    setError(null);

    try {
      setProgress("Menghapus data transaksi dari localStorage...");
      clearTransactionDataFromLocalStorage();

      setProgress("Menghapus data transaksi dari server...");
      await clearTransactionDataFromAPI();

      setSuccess(`Berhasil menghapus semua data transaksi (${transactionKeys.length} jenis data).`);
      setProgress("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus data transaksi.";
      setError(msg);
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk reset stok
  const handleResetStock = async () => {
    setShowConfirmResetStock(false);
    setLoading(true);
    setProgress("");
    setSuccess(null);
    setError(null);

    try {
      await resetProductStock();
      setSuccess("Berhasil mereset stok semua produk menjadi 0.");
      setProgress("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mereset stok produk.";
      setError(msg);
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk reset semua
  const handleResetAll = async () => {
    setShowConfirmResetAll(false);
    setLoading(true);
    setProgress("");
    setSuccess(null);
    setError(null);

    try {
      // Reset transaksi
      setProgress("Menghapus data transaksi...");
      clearTransactionDataFromLocalStorage();
      await clearTransactionDataFromAPI();

      // Reset stok
      setProgress("Mereset stok produk...");
      await resetProductStock();

      setSuccess("Berhasil mereset semua data transaksi dan stok produk.");
      setProgress("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mereset data.";
      setError(msg);
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "600",
            marginBottom: "8px",
            color: "var(--text-primary)",
          }}
        >
          Reset Data Sistem
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "14px" }}>
          Halaman ini digunakan untuk menghapus semua record transaksi dan mereset stok produk. Operasi ini tidak dapat dibatalkan.
        </p>

        {/* Warning Box */}
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
            <div style={{ color: "#dc2626", fontSize: "20px", flexShrink: 0 }}>⚠️</div>
            <div>
              <h3 style={{ color: "#991b1b", fontWeight: "600", marginBottom: "8px", fontSize: "16px" }}>
                Peringatan Penting
              </h3>
              <ul style={{ color: "#7f1d1d", fontSize: "14px", lineHeight: "1.8", margin: 0, paddingLeft: "20px" }}>
                <li>Operasi ini akan menghapus semua data transaksi secara permanen</li>
                <li>Stok produk akan direset menjadi 0 untuk semua apotik</li>
                <li>Data master (produk, supplier, apotik, dll) akan tetap utuh</li>
                <li>Operasi ini tidak dapat dibatalkan setelah dieksekusi</li>
                <li>Pastikan Anda sudah melakukan backup data penting sebelum melanjutkan</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        {loading && progress && (
          <div
            style={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                border: "3px solid #3b82f6",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ color: "#1e40af", fontSize: "14px" }}>{progress}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            style={{
              backgroundColor: "#d1fae5",
              border: "1px solid #86efac",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
              color: "#065f46",
              fontSize: "14px",
            }}
          >
            ✓ {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
              color: "#991b1b",
              fontSize: "14px",
            }}
          >
            ✗ {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Reset Transaksi */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
              Reset Semua Transaksi
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
              Menghapus semua record transaksi termasuk: Pesanan Pembelian, Penerimaan Pembelian, Transfer Barang, Penjualan, dan semua Pengajuan terkait.
            </p>
            <button
              onClick={() => setShowConfirmResetTransactions(true)}
              disabled={loading}
              style={{
                padding: "10px 20px",
                backgroundColor: loading ? "#94a3b8" : "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#dc2626";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#ef4444";
              }}
            >
              Reset Transaksi
            </button>
          </div>

          {/* Reset Stok */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
              Reset Stok Produk
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
              Mereset stok semua produk menjadi 0 untuk semua apotik. Data master produk (nama, harga, kategori, dll) tetap utuh.
            </p>
            <button
              onClick={() => setShowConfirmResetStock(true)}
              disabled={loading}
              style={{
                padding: "10px 20px",
                backgroundColor: loading ? "#94a3b8" : "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#d97706";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#f59e0b";
              }}
            >
              Reset Stok Produk
            </button>
          </div>

          {/* Reset Semua */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "2px solid #dc2626",
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: "#dc2626" }}>
              Reset Semua (Transaksi + Stok)
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
              Menghapus semua transaksi dan mereset stok produk sekaligus. Operasi ini akan memakan waktu lebih lama.
            </p>
            <button
              onClick={() => setShowConfirmResetAll(true)}
              disabled={loading}
              style={{
                padding: "10px 20px",
                backgroundColor: loading ? "#94a3b8" : "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#b91c1c";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#dc2626";
              }}
            >
              Reset Semua
            </button>
          </div>
        </div>

        {/* Confirmation Modals */}
        {showConfirmResetTransactions && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowConfirmResetTransactions(false)}
          >
            <div
              style={{
                backgroundColor: "var(--surface)",
                borderRadius: "8px",
                padding: "24px",
                maxWidth: "500px",
                width: "90%",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px", color: "var(--text-primary)" }}>
                Konfirmasi Reset Transaksi
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
                Apakah Anda yakin ingin menghapus semua data transaksi? Operasi ini tidak dapat dibatalkan.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowConfirmResetTransactions(false)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "var(--hover-bg)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleResetTransactions}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  Ya, Hapus Semua
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmResetStock && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowConfirmResetStock(false)}
          >
            <div
              style={{
                backgroundColor: "var(--surface)",
                borderRadius: "8px",
                padding: "24px",
                maxWidth: "500px",
                width: "90%",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px", color: "var(--text-primary)" }}>
                Konfirmasi Reset Stok Produk
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
                Apakah Anda yakin ingin mereset stok semua produk menjadi 0? Operasi ini tidak dapat dibatalkan.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowConfirmResetStock(false)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "var(--hover-bg)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleResetStock}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  Ya, Reset Stok
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmResetAll && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
            onClick={() => setShowConfirmResetAll(false)}
          >
            <div
              style={{
                backgroundColor: "var(--surface)",
                borderRadius: "8px",
                padding: "24px",
                maxWidth: "500px",
                width: "90%",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px", color: "#dc2626" }}>
                Konfirmasi Reset Semua Data
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
                Apakah Anda yakin ingin menghapus semua transaksi dan mereset stok produk? Operasi ini tidak dapat dibatalkan dan akan memakan waktu beberapa saat.
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowConfirmResetAll(false)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "var(--hover-bg)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleResetAll}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Ya, Reset Semua
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CSS untuk animasi spinner */}
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
