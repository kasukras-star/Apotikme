"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface DetailBarangPO {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string;
  namaUnit: string;
  qty: number;
  satuan?: string;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
}

interface DetailBarangTerima {
  produkId: string;
  qtyTerima: number;
  unitId?: string;
}

interface PenerimaanPembelian {
  id: string;
  pesananId: string;
  detailBarang: DetailBarangTerima[];
}

interface PesananPembelian {
  id: string;
  nomorPesanan: string;
  tanggalPesanan: string;
  supplierId: string;
  tujuanPengirimanId?: string;
  detailBarang: DetailBarangPO[];
  diskonGlobal?: number;
  ppn?: number;
}

interface DetailBarangRetur {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string;
  namaUnit: string;
  qtyPesan: number;
  qtyDiterima: number;
  qtyRetur: number;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
  alasanRetur?: string;
}

interface ReturPembelian {
  id: string;
  nomorRetur: string;
  tanggalRetur: string;
  pesananId: string;
  nomorPesanan: string;
  supplierId: string;
  tujuanPengirimanId?: string;
  detailBarang: DetailBarangRetur[];
  diskonGlobal: number;
  ppn: number;
  subtotal: number;
  total: number;
  keterangan?: string;
  createdAt: string;
  operator?: string;
  updatedAt?: string;
}

interface Supplier {
  id: string;
  kodeSupplier: string;
  namaSupplier: string;
  alamat?: string;
  kota?: string;
  provinsi?: string;
}

interface Apotik {
  id: string;
  kodeApotik: string;
  namaApotik: string;
}

interface Product {
  id: string;
  kodeProduk: string;
  namaProduk: string;
  units?: { id: string; konversi: number }[];
  stokPerApotik?: { [apotikId: string]: number };
}

function getQtyDiterimaByProduk(
  pesananId: string,
  produkId: string,
  penerimaanList: PenerimaanPembelian[]
): number {
  const penerimaanForPo = penerimaanList.filter((p) => p.pesananId === pesananId);
  let total = 0;
  for (const p of penerimaanForPo) {
    for (const d of p.detailBarang || []) {
      if (d.produkId === produkId) total += d.qtyTerima || 0;
    }
  }
  return total;
}

export default function ReturPembelianPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pesananList, setPesananList] = useState<PesananPembelian[]>([]);
  const [penerimaanList, setPenerimaanList] = useState<PenerimaanPembelian[]>([]);
  const [returList, setReturList] = useState<ReturPembelian[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPesananId, setSelectedPesananId] = useState<string>("");
  const [formData, setFormData] = useState<{
    nomorRetur: string;
    tanggalRetur: string;
    diskonGlobal: number;
    ppn: number;
    keterangan: string;
    detailBarang: DetailBarangRetur[];
  }>({
    nomorRetur: "",
    tanggalRetur: "",
    diskonGlobal: 0,
    ppn: 11,
    keterangan: "",
    detailBarang: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [isLoadingData, setIsLoadingData] = useState(true);

  const getTodayDateInput = (): string => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  };

  useEffect(() => {
    const loadUserEmail = async () => {
      try {
        const { data } = await getSupabaseClient().auth.getSession();
        if (data.session?.user?.email) setCurrentUserEmail(data.session.user.email);
      } catch (_) {}
    };
    loadUserEmail();
  }, []);

  useEffect(() => {
    let cancelled = false;
    function loadFromStorage() {
      try {
        const sp = localStorage.getItem("pesananPembelian"); if (sp) setPesananList(JSON.parse(sp));
        const pr = localStorage.getItem("penerimaanPembelian"); if (pr) setPenerimaanList(JSON.parse(pr));
        const sr = localStorage.getItem("returPembelian"); if (sr) setReturList(JSON.parse(sr));
        const ss = localStorage.getItem("suppliers"); if (ss) setSuppliers(JSON.parse(ss));
        const sa = localStorage.getItem("apotiks"); if (sa) setApotiks(JSON.parse(sa));
        const spr = localStorage.getItem("products"); if (spr) setProducts(JSON.parse(spr));
      } catch (_) {}
    }
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token || cancelled) { loadFromStorage(); setIsLoadingData(false); return; }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/pesananPembelian", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/penerimaanPembelian", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/returPembelian", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/suppliers", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/apotiks", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/products", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      ]).then(([poData, penerimaanData, returData, supData, apData, prodData]) => {
        if (cancelled) return;
        if (Array.isArray(poData) && poData.length > 0) { setPesananList(poData); localStorage.setItem("pesananPembelian", JSON.stringify(poData)); }
        else { const sp = localStorage.getItem("pesananPembelian"); if (sp) try { setPesananList(JSON.parse(sp)); } catch (_) {} }
        if (Array.isArray(penerimaanData) && penerimaanData.length > 0) { setPenerimaanList(penerimaanData); localStorage.setItem("penerimaanPembelian", JSON.stringify(penerimaanData)); }
        else { const pr = localStorage.getItem("penerimaanPembelian"); if (pr) try { setPenerimaanList(JSON.parse(pr)); } catch (_) {} }
        if (Array.isArray(returData) && returData.length > 0) { setReturList(returData); localStorage.setItem("returPembelian", JSON.stringify(returData)); }
        else { const sr = localStorage.getItem("returPembelian"); if (sr) try { setReturList(JSON.parse(sr)); } catch (_) {} }
        if (Array.isArray(supData) && supData.length > 0) { setSuppliers(supData); localStorage.setItem("suppliers", JSON.stringify(supData)); }
        else { const ss = localStorage.getItem("suppliers"); if (ss) try { setSuppliers(JSON.parse(ss)); } catch (_) {} }
        if (Array.isArray(apData) && apData.length > 0) { setApotiks(apData); localStorage.setItem("apotiks", JSON.stringify(apData)); }
        else { const sa = localStorage.getItem("apotiks"); if (sa) try { setApotiks(JSON.parse(sa)); } catch (_) {} }
        if (Array.isArray(prodData) && prodData.length > 0) { setProducts(prodData); localStorage.setItem("products", JSON.stringify(prodData)); }
        else { const spr = localStorage.getItem("products"); if (spr) try { setProducts(JSON.parse(spr)); } catch (_) {} }
        setIsLoadingData(false);
      }).catch(() => { loadFromStorage(); setIsLoadingData(false); });
    });
    return () => { cancelled = true; };
  }, []);

  // PO yang sudah ada penerimaan (bisa diretur)
  const availablePesanan = pesananList.filter((po) =>
    penerimaanList.some((p) => p.pesananId === po.id)
  );

  const selectedPesanan = pesananList.find((p) => p.id === selectedPesananId);

  useEffect(() => {
    if (!selectedPesananId || !selectedPesanan) {
      setFormData((prev) => ({ ...prev, detailBarang: [] }));
      return;
    }
    const po = pesananList.find((p) => p.id === selectedPesananId);
    if (!po || !po.detailBarang?.length) {
      setFormData((prev) => ({ ...prev, detailBarang: [] }));
      return;
    }
    const detailBarang: DetailBarangRetur[] = po.detailBarang
      .map((item) => {
        const qtyDiterima = getQtyDiterimaByProduk(po.id, item.produkId, penerimaanList);
        return {
          id: item.id || `db-${item.produkId}-${Date.now()}`,
          produkId: item.produkId,
          kodeProduk: item.kodeProduk,
          namaProduk: item.namaProduk,
          unitId: item.unitId,
          namaUnit: item.namaUnit,
          qtyPesan: item.qty,
          qtyDiterima,
          qtyRetur: 0,
          hargaSatuan: item.hargaSatuan,
          diskon: item.diskon ?? 0,
          subtotal: 0,
          alasanRetur: "",
        };
      })
      .filter((row) => row.qtyDiterima > 0);
    setFormData((prev) => ({ ...prev, detailBarang }));
  }, [selectedPesananId, pesananList, penerimaanList]);

  const handleOpenModal = () => {
    setError(null);
    setSelectedPesananId("");
    const today = getTodayDateInput();
    const sameDayRetur = returList.filter((r) => r.tanggalRetur === today);
    const nextNum = String((sameDayRetur.length + 1)).padStart(3, "0");
    setFormData({
      nomorRetur: `RET-${today.replace(/-/g, "")}-${nextNum}`,
      tanggalRetur: today,
      diskonGlobal: 0,
      ppn: 11,
      keterangan: "",
      detailBarang: [],
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPesananId("");
    setError(null);
  };

  const handleDetailChange = (
    id: string,
    field: keyof DetailBarangRetur,
    value: string | number
  ) => {
    setFormData((prev) => {
      const updated = prev.detailBarang.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d, [field]: value };
        if (field === "qtyRetur") {
          const qty = typeof value === "number" ? value : parseFloat(String(value)) || 0;
          const maxQty = d.qtyDiterima;
          const safeQty = Math.min(Math.max(0, qty), maxQty);
          next.qtyRetur = safeQty;
          next.subtotal = safeQty * d.hargaSatuan * (1 - (d.diskon || 0) / 100);
        }
        return next;
      });
      return { ...prev, detailBarang: updated };
    });
  };

  const subtotalForm = formData.detailBarang.reduce((s, d) => s + d.subtotal, 0);
  const afterDiskon = subtotalForm * (1 - formData.diskonGlobal / 100);
  const ppnAmount = afterDiskon * (formData.ppn / 100);
  const totalForm = afterDiskon + ppnAmount;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateString;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!selectedPesananId || !selectedPesanan) {
        throw new Error("Pilih PO terlebih dahulu");
      }
      const hasQtyRetur = formData.detailBarang.some((d) => d.qtyRetur > 0);
      if (!hasQtyRetur) {
        throw new Error("Minimal satu item dengan Qty Retur > 0");
      }
      const invalid = formData.detailBarang.find((d) => d.qtyRetur > d.qtyDiterima);
      if (invalid) {
        throw new Error(`Qty retur tidak boleh melebihi qty diterima (${invalid.namaProduk})`);
      }

      const userEmail = currentUserEmail || "System";
      const now = new Date().toISOString();
      const newRetur: ReturPembelian = {
        id: Date.now().toString(),
        nomorRetur: formData.nomorRetur,
        tanggalRetur: formData.tanggalRetur,
        pesananId: selectedPesanan.id,
        nomorPesanan: selectedPesanan.nomorPesanan,
        supplierId: selectedPesanan.supplierId,
        tujuanPengirimanId: selectedPesanan.tujuanPengirimanId,
        detailBarang: formData.detailBarang.filter((d) => d.qtyRetur > 0),
        diskonGlobal: formData.diskonGlobal,
        ppn: formData.ppn,
        subtotal: subtotalForm,
        total: totalForm,
        keterangan: formData.keterangan || undefined,
        createdAt: now,
        operator: userEmail,
        updatedAt: now,
      };

      const updatedReturList = [...returList, newRetur];
      setReturList(updatedReturList);
      localStorage.setItem("returPembelian", JSON.stringify(updatedReturList));

      const apotikId = selectedPesanan.tujuanPengirimanId;
      if (apotikId) {
        const updatedProducts = products.map((product) => {
          const detail = newRetur.detailBarang.find((d) => d.produkId === product.id);
          if (!detail || detail.qtyRetur <= 0) return product;
          let qtyInPieces = detail.qtyRetur;
          if (product.units?.length) {
            const unit = product.units.find((u) => u.id === detail.unitId);
            if (unit) qtyInPieces = detail.qtyRetur * unit.konversi;
          }
          const currentStokPerApotik = product.stokPerApotik || {};
          const currentStok = currentStokPerApotik[apotikId] || 0;
          return {
            ...product,
            stokPerApotik: {
              ...currentStokPerApotik,
              [apotikId]: Math.max(0, currentStok - qtyInPieces),
            },
          };
        });
        localStorage.setItem("products", JSON.stringify(updatedProducts));
        setProducts(updatedProducts);
      }

      const token = (await getSupabaseClient().auth.getSession()).data.session?.access_token;
      if (token) {
        try {
          await fetch("/api/data/returPembelian", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ value: updatedReturList }),
          });
        } catch (_) {}
      }

      handleCloseModal();
      alert("Retur pembelian berhasil disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.namaSupplier || id;
  const getSupplierAlamat = (id: string) => {
    const s = suppliers.find((s) => s.id === id);
    if (!s) return "-";
    const parts = [s.alamat, s.kota, s.provinsi].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "-";
  };
  const getApotikName = (id?: string) => (id ? apotiks.find((a) => a.id === id)?.namaApotik : null) || "-";

  if (isLoadingData) {
    return (
      <DashboardLayout>
        <div style={{ padding: "24px" }}>Memuat data...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
          Retur Pembelian
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "16px" }}>
          Kelola retur barang dari pembelian berdasarkan PO.
        </p>

        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleOpenModal}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#fff",
              backgroundColor: "var(--primary, #2563eb)",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Tambah Retur
          </button>
        </div>

        {returList.length > 0 ? (
          <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", backgroundColor: "var(--surface)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--hover-bg)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Nomor Retur</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Tanggal</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Nomor PO</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Supplier</th>
                  <th style={{ padding: "12px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {returList.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-primary)" }}>{r.nomorRetur}</td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>{formatDate(r.tanggalRetur)}</td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>{r.nomorPesanan}</td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>{getSupplierName(r.supplierId)}</td>
                    <td style={{ padding: "12px", fontSize: "13px", textAlign: "right", fontWeight: "500", color: "var(--text-primary)" }}>{formatCurrency(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: "8px", backgroundColor: "var(--surface)" }}>
            Belum ada data retur pembelian.
          </div>
        )}

        {/* Modal - full panel right */}
        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              left: "var(--sidebar-width, 260px)",
              backgroundColor: "var(--surface)",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "var(--hover-bg)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button type="button" onClick={handleCloseModal} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-secondary)", padding: "4px 8px", borderRadius: "4px" }}>
                    ←
                  </button>
                  <h3 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                    Retur Pembelian
                  </h3>
                </div>
                <button type="button" onClick={handleCloseModal} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "var(--text-secondary)", padding: 0, width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" }}>
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div style={{ padding: "24px", flex: 1, minHeight: 0, overflowY: "auto" }}>
                  {error && (
                    <div style={{ padding: "12px", marginBottom: "16px", borderRadius: "8px", backgroundColor: "var(--error-bg, #fee2e2)", color: "var(--error-text, #b91c1c)", fontSize: "14px" }}>
                      {error}
                    </div>
                  )}

                  <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
                    <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 20px 0", color: "var(--text-primary)", borderBottom: "2px solid var(--primary)", paddingBottom: "8px" }}>
                      Detail Retur
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", alignItems: "stretch" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "var(--text-primary)" }}>Nomor Retur <span style={{ color: "#ef4444" }}>*</span></label>
                        <input
                          type="text"
                          value={formData.nomorRetur}
                          onChange={(e) => setFormData((prev) => ({ ...prev, nomorRetur: e.target.value }))}
                          required
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--input-border)", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "var(--text-primary)" }}>Tanggal Retur <span style={{ color: "#ef4444" }}>*</span></label>
                        <input
                          type="date"
                          value={formData.tanggalRetur}
                          onChange={(e) => setFormData((prev) => ({ ...prev, tanggalRetur: e.target.value }))}
                          required
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--input-border)", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "var(--text-primary)" }}>Pilih PO <span style={{ color: "#ef4444" }}>*</span></label>
                        <select
                          value={selectedPesananId}
                          onChange={(e) => setSelectedPesananId(e.target.value)}
                          required
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--input-border)", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", backgroundColor: "var(--surface)" }}
                        >
                          <option value="">-- Pilih PO --</option>
                          {availablePesanan.map((po) => (
                            <option key={po.id} value={po.id}>{po.nomorPesanan} - {getSupplierName(po.supplierId)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {selectedPesanan && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" }}>
                          <div>
                            <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Nomor Pesanan</label>
                            <input type="text" value={selectedPesanan.nomorPesanan} readOnly style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--hover-bg)", color: "var(--text-secondary)" }} />
                          </div>
                          <div>
                            <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Nama Supplier</label>
                            <input type="text" value={getSupplierName(selectedPesanan.supplierId)} readOnly style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--hover-bg)", color: "var(--text-secondary)" }} />
                          </div>
                          <div>
                            <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Tujuan Pengiriman</label>
                            <input type="text" value={getApotikName(selectedPesanan.tujuanPengirimanId)} readOnly style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--hover-bg)", color: "var(--text-secondary)" }} />
                          </div>
                        </div>
                        <div style={{ marginTop: "12px" }}>
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Alamat Supplier</label>
                          <input type="text" value={getSupplierAlamat(selectedPesanan.supplierId)} readOnly style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--hover-bg)", color: "var(--text-secondary)" }} />
                        </div>
                      </>
                    )}
                    <div style={{ marginTop: "12px" }}>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "var(--text-primary)" }}>Keterangan</label>
                      <textarea
                        value={formData.keterangan}
                        onChange={(e) => setFormData((prev) => ({ ...prev, keterangan: e.target.value }))}
                        rows={2}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--input-border)", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", resize: "vertical" }}
                      />
                    </div>
                  </div>

                  <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
                    <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px 0", color: "var(--text-primary)", borderBottom: "2px solid var(--primary)", paddingBottom: "8px" }}>
                      Detail Barang
                    </h4>
                    {formData.detailBarang.length > 0 ? (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
                          <thead>
                            <tr style={{ backgroundColor: "var(--hover-bg)" }}>
                              <th style={{ padding: "10px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Produk</th>
                              <th style={{ padding: "10px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Kode</th>
                              <th style={{ padding: "10px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Unit</th>
                              <th style={{ padding: "10px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Qty Pesanan</th>
                              <th style={{ padding: "10px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Qty Diterima</th>
                              <th style={{ padding: "10px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Qty Retur</th>
                              <th style={{ padding: "10px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Harga Satuan</th>
                              <th style={{ padding: "10px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", width: "10%" }}>Diskon %</th>
                              <th style={{ padding: "10px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Subtotal</th>
                              <th style={{ padding: "10px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Alasan Retur</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.detailBarang.map((d) => (
                              <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "10px", fontSize: "13px", color: "var(--text-primary)" }}>{d.namaProduk}</td>
                                <td style={{ padding: "10px", fontSize: "13px", color: "var(--text-secondary)" }}>{d.kodeProduk}</td>
                                <td style={{ padding: "10px", fontSize: "13px", color: "var(--text-secondary)" }}>{d.namaUnit}</td>
                                <td style={{ padding: "10px", fontSize: "13px", textAlign: "right", color: "var(--text-secondary)" }}>{d.qtyPesan}</td>
                                <td style={{ padding: "10px", fontSize: "13px", textAlign: "right", color: "var(--text-secondary)" }}>{d.qtyDiterima}</td>
                                <td style={{ padding: "10px" }}>
                                  <input
                                    type="number"
                                    min={0}
                                    max={d.qtyDiterima}
                                    value={d.qtyRetur || ""}
                                    onChange={(e) => handleDetailChange(d.id, "qtyRetur", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                                    style={{ width: "80px", padding: "6px 8px", border: "1px solid var(--input-border)", borderRadius: "4px", fontSize: "13px", textAlign: "right", boxSizing: "border-box" }}
                                  />
                                </td>
                                <td style={{ padding: "10px", fontSize: "13px", textAlign: "right", color: "var(--text-secondary)" }}>{formatCurrency(d.hargaSatuan)}</td>
                                <td style={{ padding: "10px", fontSize: "13px", textAlign: "center", color: "var(--text-secondary)" }}>{d.diskon}</td>
                                <td style={{ padding: "10px", fontSize: "13px", textAlign: "right", fontWeight: "500", color: "var(--text-primary)" }}>{formatCurrency(d.subtotal)}</td>
                                <td style={{ padding: "10px" }}>
                                  <input
                                    type="text"
                                    value={d.alasanRetur || ""}
                                    onChange={(e) => handleDetailChange(d.id, "alasanRetur", e.target.value)}
                                    placeholder="Opsional"
                                    style={{ width: "100%", minWidth: "100px", padding: "6px 8px", border: "1px solid var(--input-border)", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        {selectedPesananId ? "Tidak ada barang yang sudah diterima untuk PO ini, atau PO belum memiliki penerimaan." : "Pilih PO untuk menampilkan detail barang."}
                      </p>
                    )}
                  </div>

                  <div style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
                    <h4 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 16px 0", color: "var(--text-primary)", borderBottom: "2px solid var(--primary)", paddingBottom: "8px" }}>
                      Total
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", maxWidth: "400px" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Diskon Global %</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={formData.diskonGlobal}
                          onChange={(e) => setFormData((prev) => ({ ...prev, diskonGlobal: parseFloat(e.target.value) || 0 }))}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--input-border)", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>PPN %</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={formData.ppn}
                          onChange={(e) => setFormData((prev) => ({ ...prev, ppn: parseFloat(e.target.value) || 0 }))}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--input-border)", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: "16px", fontSize: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                        <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>{formatCurrency(subtotalForm)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Total</span>
                        <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>{formatCurrency(totalForm)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px", padding: "0 24px 24px" }}>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      style={{ padding: "10px 20px", fontSize: "14px", fontWeight: "500", color: "var(--text-primary)", backgroundColor: "var(--hover-bg)", border: "1px solid var(--border)", borderRadius: "8px", cursor: "pointer" }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !selectedPesananId || !formData.detailBarang.some((d) => d.qtyRetur > 0)}
                      style={{ padding: "10px 20px", fontSize: "14px", fontWeight: "600", color: "#fff", backgroundColor: loading ? "var(--text-secondary)" : "var(--primary, #2563eb)", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer" }}
                    >
                      {loading ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
