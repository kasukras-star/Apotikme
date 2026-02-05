"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

const ALLOWED_API_KEYS = new Set([
  "products", "suppliers", "customers", "apotiks", "units", "kategoris", "types", "jenis", "margins", "racikans",
  "pesananPembelian", "fakturPembelian", "penyesuaianStok", "transferBarang", "penerimaanPembelian", "terimaTransfer",
  "rencanaTransferBarang", "pengajuanTerimaTransfer", "stokOpname", "penjualan", "pengajuanPembelian", "pengajuanPenerimaanPembelian",
  "pengajuanApotik", "pengajuanUnit", "pengajuanSupplier", "pengajuanCustomer", "pengajuanKategori", "pengajuanType",
  "pengajuanJenis", "pengajuanMargin", "pengajuanProduk", "pengajuanRacikan", "pengajuanPenyesuaianStok",
  "pengajuanTransferBarang", "pengajuanPenerimaanPembelian", "pengajuanPerubahanHargaJual", "perubahanHargaJual",
  "pengaturanPerusahaan", "pengaturanSistem",
]);

const SECTIONS: { title: string; items: { key: string; label: string; description: string }[] }[] = [
  {
    title: "Data Master",
    items: [
      { key: "units", label: "Unit", description: "Data unit beserta relasi" },
      { key: "apotiks", label: "Apotik", description: "Data apotik" },
      { key: "suppliers", label: "Supplier", description: "Data supplier" },
      { key: "customers", label: "Customer", description: "Data customer beserta relasi penjualan" },
      { key: "kategoris", label: "Kategori", description: "Data kategori produk" },
      { key: "types", label: "Type", description: "Data type" },
      { key: "jenis", label: "Jenis", description: "Data jenis" },
      { key: "margins", label: "Margin", description: "Data margin" },
      { key: "racikans", label: "Racikan", description: "Data racikan" },
      { key: "products", label: "Produk", description: "Data produk" },
    ],
  },
  {
    title: "Pembelian",
    items: [
      { key: "pesananPembelian", label: "Pesanan Pembelian", description: "Data pesanan pembelian" },
      { key: "fakturPembelian", label: "Faktur Pembelian", description: "Data faktur pembelian" },
      { key: "penyesuaianStok", label: "Penyesuaian Stok", description: "Data penyesuaian stok" },
      { key: "perubahanHargaJual", label: "Perubahan Harga Jual", description: "Riwayat perubahan harga jual" },
      { key: "rencanaTransferBarang", label: "Rencana Transfer Barang", description: "Data rencana transfer barang" },
    ],
  },
  {
    title: "Penjualan",
    items: [
      { key: "penjualan", label: "Penjualan", description: "Data penjualan" },
    ],
  },
  {
    title: "Pengajuan",
    items: [
      { key: "pengajuanPembelian", label: "Pengajuan Pembelian", description: "Data pengajuan pembelian" },
      { key: "pengajuanPenerimaanPembelian", label: "Pengajuan Penerimaan Pembelian", description: "Data pengajuan penerimaan pembelian" },
      { key: "pengajuanApotik", label: "Pengajuan Apotik", description: "Data pengajuan apotik" },
      { key: "pengajuanUnit", label: "Pengajuan Unit", description: "Data pengajuan unit" },
      { key: "pengajuanSupplier", label: "Pengajuan Supplier", description: "Data pengajuan supplier" },
      { key: "pengajuanCustomer", label: "Pengajuan Customer", description: "Data pengajuan customer" },
      { key: "pengajuanKategori", label: "Pengajuan Kategori", description: "Data pengajuan kategori" },
      { key: "pengajuanType", label: "Pengajuan Type", description: "Data pengajuan type" },
      { key: "pengajuanJenis", label: "Pengajuan Jenis", description: "Data pengajuan jenis" },
      { key: "pengajuanMargin", label: "Pengajuan Margin", description: "Data pengajuan margin" },
      { key: "pengajuanProduk", label: "Pengajuan Produk", description: "Data pengajuan produk" },
      { key: "pengajuanRacikan", label: "Pengajuan Racikan", description: "Data pengajuan racikan" },
      { key: "pengajuanPenyesuaianStok", label: "Pengajuan Penyesuaian Stok", description: "Data pengajuan penyesuaian stok" },
      { key: "pengajuanTransferBarang", label: "Pengajuan Transfer Barang", description: "Data pengajuan transfer barang" },
      { key: "pengajuanPerubahanHargaJual", label: "Pengajuan Perubahan Harga Jual", description: "Data pengajuan perubahan harga jual" },
    ],
  },
  {
    title: "Warehouse",
    items: [
      { key: "penerimaanPembelian", label: "Penerimaan Pembelian", description: "Data penerimaan pembelian (terima pembelian)" },
      { key: "transferBarang", label: "Transfer Barang", description: "Data transfer barang" },
      { key: "terimaTransfer", label: "Terima Transfer", description: "Data terima transfer" },
      { key: "pengajuanTerimaTransfer", label: "Pengajuan Terima Transfer", description: "Data pengajuan terima transfer" },
      { key: "stokOpname", label: "Stok Opname", description: "Data stok opname" },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      { key: "pengaturanPerusahaan", label: "Pengaturan Perusahaan", description: "Data pengaturan perusahaan" },
      { key: "pengaturanSistem", label: "Pengaturan Sistem", description: "Data pengaturan sistem" },
    ],
  },
];

function getDataCount(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return 0;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    if (typeof parsed === "object" && parsed !== null) return 1;
    return 0;
  } catch {
    return 0;
  }
}

function IconDatabase() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export default function HapusDataPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refreshCounts = useCallback(() => {
    const next: Record<string, number> = {};
    SECTIONS.forEach((sec) => {
      sec.items.forEach((item) => {
        next[item.key] = getDataCount(item.key);
      });
    });
    setCounts(next);
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllInSection = (section: typeof SECTIONS[0]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      section.items.forEach((item) => next.add(item.key));
      return next;
    });
  };

  const deselectAllInSection = (section: typeof SECTIONS[0]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      section.items.forEach((item) => next.delete(item.key));
      return next;
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    setMessage(null);
    try {
      const token = (await getSupabaseClient().auth.getSession()).data.session?.access_token;
      for (const key of selected) {
        const isObject = key === "pengaturanPerusahaan" || key === "pengaturanSistem";
        const emptyValue = isObject ? "{}" : "[]";
        try {
          localStorage.setItem(key, emptyValue);
        } catch {
          // ignore
        }
        if (ALLOWED_API_KEYS.has(key) && token) {
          try {
            await fetch(`/api/data/${key}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ value: isObject ? {} : [] }),
            });
          } catch {
            // continue; local already cleared
          }
        }
      }
      setSelected(new Set());
      setShowConfirm(false);
      refreshCounts();
      setMessage({ type: "success", text: "Data terpilih berhasil dihapus." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Gagal menghapus data." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="hapus-data-page">
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
          Hapus Data
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px" }}>
          Pilih data yang akan dihapus. Sistem menampilkan jumlah data dan tabel terkait yang akan ikut terhapus.
        </p>

        {message && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "16px",
              backgroundColor: message.type === "success" ? "var(--success-bg, #dcfce7)" : "var(--error-bg, #fee2e2)",
              color: message.type === "success" ? "var(--success-text, #166534)" : "var(--error-text, #b91c1c)",
            }}
          >
            {message.text}
          </div>
        )}

        {SECTIONS.map((section) => (
          <div
            key={section.title}
            style={{
              marginBottom: "20px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              overflow: "hidden",
              backgroundColor: "var(--surface)",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                  {section.title}
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "2px 0 0 0" }}>
                  Select data to delete
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const allSelected = section.items.every((i) => selected.has(i.key));
                  if (allSelected) deselectAllInSection(section);
                  else selectAllInSection(section);
                }}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "var(--primary, #2563eb)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {section.items.every((i) => selected.has(i.key)) ? "Batal Pilih Semua" : "Select All"}
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "8px",
                padding: "12px",
              }}
            >
              {section.items.map((item) => (
                <label
                  key={item.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: selected.has(item.key) ? "var(--selected-bg)" : "transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(item.key)}
                    onChange={() => toggle(item.key)}
                    style={{ width: "16px", height: "16px", flexShrink: 0, accentColor: "var(--primary)" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "1px" }}>
                      {item.description}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      flexShrink: 0,
                    }}
                  >
                    <span>Data Count</span>
                    <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                      {counts[item.key] ?? getDataCount(item.key)}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", color: "var(--text-secondary)" }} aria-hidden>
                      <IconDatabase />
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: "24px" }}>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={selected.size === 0}
            style={{
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#fff",
              backgroundColor: selected.size === 0 ? "var(--text-secondary)" : "#dc2626",
              border: "none",
              borderRadius: "8px",
              cursor: selected.size === 0 ? "not-allowed" : "pointer",
            }}
          >
            Hapus Data Terpilih {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>

        {showConfirm && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
                zIndex: 1200,
              }}
              onClick={() => !deleting && setShowConfirm(false)}
              aria-hidden
            />
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "90%",
                maxWidth: "400px",
                padding: "24px",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                zIndex: 1201,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 12px 0", color: "var(--text-primary)" }}>
                Konfirmasi Hapus
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 20px 0" }}>
                Yakin akan menghapus data terpilih? Tabel terkait akan ikut terhapus.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => !deleting && setShowConfirm(false)}
                  disabled={deleting}
                  style={{
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "var(--text-primary)",
                    backgroundColor: "var(--hover-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    cursor: deleting ? "not-allowed" : "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#fff",
                    backgroundColor: "#dc2626",
                    border: "none",
                    borderRadius: "8px",
                    cursor: deleting ? "not-allowed" : "pointer",
                  }}
                >
                  {deleting ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
