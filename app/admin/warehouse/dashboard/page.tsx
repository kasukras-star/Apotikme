"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, Trash2 } from "lucide-react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

function getTodayDateStr(): string {
  const t = new Date();
  return t.toISOString().split("T")[0];
}

type StatusRencana =
  | "Menunggu Disiapkan"
  | "Sedang Disiapkan"
  | "Siap Dikirim"
  | "Sudah Jadi Transfer"
  | "Dibatalkan";

interface DetailBarangRencana {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId: string;
  namaUnit: string;
  qtyRencana: number;
}

interface RencanaTransferBarang {
  id: string;
  nomorRencana: string;
  tanggal: string;
  tanggalRencanaKirim: string;
  apotikAsalId: string;
  apotikTujuanId: string;
  detailBarang: DetailBarangRencana[];
  keterangan: string;
  status: StatusRencana;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  transferId?: string;
  dikirimKeGudangAt?: string;
}

interface Apotik {
  id: string;
  namaApotik: string;
  statusAktif: boolean;
}

interface DetailBarangTransfer {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId: string;
  namaUnit: string;
  qtyTransfer: number;
}

interface TransferBarang {
  id: string;
  nomorTransfer: string;
  nomorBukti: string;
  tanggalTransfer: string;
  apotikAsalId: string;
  apotikTujuanId: string;
  status: "Draft" | "Dikirim" | "Diterima" | "Dibatalkan";
  detailBarang: DetailBarangTransfer[];
  keterangan: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  operator?: string;
}

const RENCANA_STORAGE_KEY = "rencanaTransferBarang";
const TRANSFER_STORAGE_KEY = "transferBarang";

function generateNomorTransfer(existingTransfers: TransferBarang[]): string {
  let maxNumber = 0;
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  existingTransfers.forEach((t) => {
    const m = (t.nomorTransfer || "").match(/TRF-(\d{6})-(\d+)/);
    if (m && m[1] === yyyymm) {
      const n = parseInt(m[2], 10);
      if (n > maxNumber) maxNumber = n;
    }
  });
  const next = maxNumber + 1;
  return `TRF-${yyyymm}-${String(next).padStart(4, "0")}`;
}

function generateNomorBukti(existingTransfers: TransferBarang[]): string {
  let maxNumber = 0;
  const currentYear = new Date().getFullYear();
  existingTransfers.forEach((t) => {
    const nb = (t as any).nomorBukti;
    if (nb) {
      const m = nb.match(/TFB-(\d{4})-(\d+)/);
      if (m && parseInt(m[1], 10) === currentYear) {
        const n = parseInt(m[2], 10);
        if (n > maxNumber) maxNumber = n;
      }
    }
  });
  const next = maxNumber + 1;
  return `TFB-${currentYear}-${String(next).padStart(5, "0")}`;
}

export default function WarehouseDashboardPage() {
  const router = useRouter();
  const [rencanaList, setRencanaList] = useState<RencanaTransferBarang[]>([]);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState(getTodayDateStr);
  const [filterDateTo, setFilterDateTo] = useState(getTodayDateStr);
  const [showSudahJadi, setShowSudahJadi] = useState(false);
  const [viewingRencana, setViewingRencana] = useState<RencanaTransferBarang | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadLocal = () => {
      const sa = localStorage.getItem("apotiks");
      const sr = localStorage.getItem(RENCANA_STORAGE_KEY);
      if (sa) try { setApotiks(JSON.parse(sa).filter((a: Apotik) => a.statusAktif)); } catch (_) {}
      if (sr) try { setRencanaList(JSON.parse(sr)); } catch (_) {}
      if (!cancelled) setIsLoadingData(false);
    };
    getSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!data.session?.access_token || cancelled) {
          loadLocal();
          return;
        }
        const token = data.session.access_token;
        Promise.all([
          fetch("/api/data/rencanaTransferBarang", { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch("/api/data/apotiks", { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
            r.ok ? r.json() : []
          ),
        ]).then(([rencanaData, apotiksData]) => {
          if (cancelled) return;
          if (Array.isArray(rencanaData) && rencanaData.length > 0) {
            setRencanaList(rencanaData);
            localStorage.setItem(RENCANA_STORAGE_KEY, JSON.stringify(rencanaData));
          } else {
            const sr = localStorage.getItem(RENCANA_STORAGE_KEY);
            if (sr) try { setRencanaList(JSON.parse(sr)); } catch (_) {}
          }
          if (Array.isArray(apotiksData) && apotiksData.length > 0) {
            setApotiks(apotiksData.filter((a: Apotik) => a.statusAktif));
            localStorage.setItem("apotiks", JSON.stringify(apotiksData));
          } else {
            const sa = localStorage.getItem("apotiks");
            if (sa) try { setApotiks(JSON.parse(sa).filter((a: Apotik) => a.statusAktif)); } catch (_) {}
          }
          if (!cancelled) setIsLoadingData(false);
        }).catch(() => {
          if (!cancelled) loadLocal();
        });
    }).catch(() => {
      if (!cancelled) loadLocal();
    });
    return () => { cancelled = true; };
  }, []);

  const rencanaDikirim = rencanaList.filter((r) => r.dikirimKeGudangAt);

  const countByStatus = (status: StatusRencana) =>
    rencanaDikirim.filter((r) => r.status === status).length;

  const countMenunggu = countByStatus("Menunggu Disiapkan");
  const countSedang = countByStatus("Sedang Disiapkan");
  const countSiap = countByStatus("Siap Dikirim");

  // Tanggal informasi masuk ke warehouse = dikirimKeGudangAt (tanggal kirim ke gudang)
  const getTanggalMasukGudang = (r: RencanaTransferBarang) =>
    r.dikirimKeGudangAt ? r.dikirimKeGudangAt.slice(0, 10) : "";

  const filteredList = rencanaDikirim.filter((r) => {
    if (r.status === "Dibatalkan") return false;
    if (!showSudahJadi && r.status === "Sudah Jadi Transfer") return false;
    if (filterStatus && r.status !== filterStatus) return false;
    const tglMasuk = getTanggalMasukGudang(r);
    if (filterDateFrom && tglMasuk < filterDateFrom) return false;
    if (filterDateTo && tglMasuk > filterDateTo) return false;
    return true;
  });

  const getApotikName = (id: string) => apotiks.find((a) => a.id === id)?.namaApotik || id;

  const updateRencanaInStorage = (updated: RencanaTransferBarang[]) => {
    setRencanaList(updated);
    localStorage.setItem(RENCANA_STORAGE_KEY, JSON.stringify(updated));
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/rencanaTransferBarang", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ value: updated }),
        }).catch(() => {});
      }
    });
  };

  const handleMulaiSiapkan = (r: RencanaTransferBarang) => {
    if (r.status !== "Menunggu Disiapkan") return;
    if (!confirm(`Mulai menyiapkan rencana ${r.nomorRencana}?`)) return;
    const updated = rencanaList.map((x) =>
      x.id === r.id
        ? { ...x, status: "Sedang Disiapkan" as StatusRencana, updatedAt: new Date().toISOString() }
        : x
    );
    updateRencanaInStorage(updated);
    alert("Status diubah menjadi Sedang Disiapkan.");
  };

  const handleTandaiSiapDikirim = (r: RencanaTransferBarang) => {
    if (r.status !== "Sedang Disiapkan") return;
    if (!confirm(`Tandai rencana ${r.nomorRencana} sebagai Siap Dikirim?`)) return;
    const updated = rencanaList.map((x) =>
      x.id === r.id
        ? { ...x, status: "Siap Dikirim" as StatusRencana, updatedAt: new Date().toISOString() }
        : x
    );
    updateRencanaInStorage(updated);
    alert("Status diubah menjadi Siap Dikirim.");
  };

  const handleBuatTransfer = (r: RencanaTransferBarang) => {
    if (r.status !== "Siap Dikirim") {
      alert("Hanya rencana dengan status Siap Dikirim yang dapat dikonversi ke Transfer Barang.");
      return;
    }
    if (r.detailBarang.length === 0) {
      alert("Rencana tidak memiliki detail barang.");
      return;
    }
    if (!confirm(`Buat dokumen Transfer Barang dari rencana ${r.nomorRencana}?`)) return;

    const savedTransfers = localStorage.getItem(TRANSFER_STORAGE_KEY);
    const existingTransfers: TransferBarang[] = savedTransfers ? JSON.parse(savedTransfers) : [];
    const now = new Date();
    const nowStr = now.toISOString().split("T")[0];

    const detailBarangTransfer: DetailBarangTransfer[] = r.detailBarang.map((d) => ({
      id: Date.now().toString() + "-" + Math.random().toString(36).slice(2),
      produkId: d.produkId,
      kodeProduk: d.kodeProduk,
      namaProduk: d.namaProduk,
      unitId: d.unitId,
      namaUnit: d.namaUnit,
      qtyTransfer: d.qtyRencana,
    }));

    const newTransfer: TransferBarang = {
      id: Date.now().toString(),
      nomorTransfer: generateNomorTransfer(existingTransfers),
      nomorBukti: generateNomorBukti(existingTransfers),
      tanggalTransfer: nowStr,
      apotikAsalId: r.apotikAsalId,
      apotikTujuanId: r.apotikTujuanId,
      status: "Draft",
      detailBarang: detailBarangTransfer,
      keterangan: r.keterangan ? `Dari rencana: ${r.nomorRencana}. ${r.keterangan}` : `Dari rencana: ${r.nomorRencana}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      operator: r.createdBy,
    };

    const nextTransfers = [...existingTransfers, newTransfer];
    localStorage.setItem(TRANSFER_STORAGE_KEY, JSON.stringify(nextTransfers));
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        const payload = nextTransfers.map((t) => ({
          ...t,
          createdAt: t.createdAt instanceof Date ? (t.createdAt as Date).toISOString() : t.createdAt,
          updatedAt: t.updatedAt instanceof Date ? (t.updatedAt as Date).toISOString() : t.updatedAt,
        }));
        fetch("/api/data/transferBarang", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ value: payload }),
        }).catch(() => {});
      }
    });

    const updatedRencana = rencanaList.map((x) =>
      x.id === r.id
        ? {
            ...x,
            status: "Sudah Jadi Transfer" as StatusRencana,
            transferId: newTransfer.id,
            updatedAt: new Date().toISOString(),
          }
        : x
    );
    updateRencanaInStorage(updatedRencana);

    alert(`Transfer Barang ${newTransfer.nomorTransfer} berhasil dibuat dari rencana. Anda dapat melanjutkan di menu Transfer Barang.`);
    router.push("/admin/warehouse/transfer-barang");
  };

  const handleViewDetail = (r: RencanaTransferBarang) => {
    setViewingRencana(r);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingRencana(null);
  };

  const handleBatalRencana = (r: RencanaTransferBarang) => {
    if (r.status !== "Menunggu Disiapkan") return;
    if (!confirm(`Batalkan rencana ${r.nomorRencana}?`)) return;
    const updated = rencanaList.map((x) =>
      x.id === r.id ? { ...x, status: "Dibatalkan" as StatusRencana, updatedAt: new Date().toISOString() } : x
    );
    updateRencanaInStorage(updated);
  };

  return (
    <DashboardLayout>
      <div style={{ padding: "8px 24px 24px 24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              Menunggu Disiapkan
            </div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--primary)" }}>
              {isLoadingData ? "-" : countMenunggu}
            </div>
          </div>
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              Sedang Disiapkan
            </div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#d97706" }}>
              {isLoadingData ? "-" : countSedang}
            </div>
          </div>
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              Siap Dikirim
            </div>
            <div style={{ fontSize: "28px", fontWeight: "700", color: "#059669" }}>
              {isLoadingData ? "-" : countSiap}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              alignItems: "flex-end",
              marginBottom: "16px",
            }}
          >
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.35", minHeight: "18px" }}>
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                  minWidth: "180px",
                  height: "38px",
                  boxSizing: "border-box",
                }}
              >
                <option value="">Semua</option>
                <option value="Menunggu Disiapkan">Menunggu Disiapkan</option>
                <option value="Sedang Disiapkan">Sedang Disiapkan</option>
                <option value="Siap Dikirim">Siap Dikirim</option>
                <option value="Sudah Jadi Transfer">Sudah Jadi Transfer</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.35", minHeight: "18px" }}>
                Dari
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                  height: "38px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.35", minHeight: "18px" }}>
                Sampai
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                  height: "38px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", color: "var(--text-primary)" }}>
              <input
                type="checkbox"
                checked={showSudahJadi}
                onChange={(e) => setShowSudahJadi(e.target.checked)}
                style={{ width: "18px", height: "18px" }}
              />
              Tampilkan Sudah Jadi Transfer
            </label>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", backgroundColor: "var(--surface-hover)" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                    No. Rencana
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                    Rencana Kirim
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                    Apotik Asal
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                    Apotik Tujuan
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                    Status
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                    Dibuat oleh
                  </th>
                  <th style={{ textAlign: "center", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                      {isLoadingData ? "Memuat..." : "Tidak ada rencana transfer untuk ditampilkan."}
                    </td>
                  </tr>
                ) : (
                  filteredList.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-primary)" }}>{r.nomorRencana}</td>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-primary)" }}>{r.tanggalRencanaKirim}</td>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-primary)" }}>{getApotikName(r.apotikAsalId)}</td>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-primary)" }}>{getApotikName(r.apotikTujuanId)}</td>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-primary)" }}>{r.status}</td>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-secondary)" }}>{r.createdBy}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleViewDetail(r)}
                            title="Lihat"
                            style={{
                              padding: "6px",
                              border: "1px solid var(--border)",
                              borderRadius: "6px",
                              background: "var(--surface)",
                              color: "var(--text-primary)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Eye size={16} />
                          </button>
                          {r.status === "Menunggu Disiapkan" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleBatalRencana(r)}
                                title="Batal"
                                style={{
                                  padding: "6px",
                                  border: "1px solid var(--border)",
                                  borderRadius: "6px",
                                  background: "var(--surface)",
                                  color: "#dc2626",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMulaiSiapkan(r)}
                                style={{
                                  padding: "6px 12px",
                                  border: "none",
                                  borderRadius: "6px",
                                  background: "var(--primary)",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                }}
                              >
                                Mulai Siapkan
                              </button>
                            </>
                          )}
                          {r.status === "Sedang Disiapkan" && (
                            <button
                              type="button"
                              onClick={() => handleTandaiSiapDikirim(r)}
                              style={{
                                padding: "6px 12px",
                                border: "none",
                                borderRadius: "6px",
                                background: "#059669",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "13px",
                              }}
                            >
                              Tandai Siap Dikirim
                            </button>
                          )}
                          {r.status === "Siap Dikirim" && (
                            <button
                              type="button"
                              onClick={() => handleBuatTransfer(r)}
                              style={{
                                padding: "6px 12px",
                                border: "none",
                                borderRadius: "6px",
                                background: "#7c3aed",
                                color: "white",
                                cursor: "pointer",
                                fontSize: "13px",
                              }}
                            >
                              Buat Transfer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Detail Modal */}
      {isViewModalOpen && viewingRencana && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => e.target === e.currentTarget && handleCloseViewModal()}
        >
          <div
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "8px",
              maxWidth: "560px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "var(--surface-hover)",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                Detail Rencana {viewingRencana.nomorRencana}
              </h3>
              <button
                type="button"
                onClick={handleCloseViewModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: "24px", overflowY: "auto" }}>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>No Rencana</div>
                <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{viewingRencana.nomorRencana}</div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Tanggal</div>
                <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                  {viewingRencana.tanggal || (viewingRencana.createdAt ? viewingRencana.createdAt.slice(0, 10) : "-")}
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Tanggal Rencana Kirim</div>
                <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{viewingRencana.tanggalRencanaKirim}</div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Apotik Asal / Tujuan</div>
                <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                  {getApotikName(viewingRencana.apotikAsalId)} → {getApotikName(viewingRencana.apotikTujuanId)}
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Status</div>
                <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{viewingRencana.status}</div>
              </div>
              {viewingRencana.keterangan && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Keterangan</div>
                  <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{viewingRencana.keterangan}</div>
                </div>
              )}
              <div style={{ marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Detail Barang</div>
              <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--surface-hover)" }}>
                      <th style={{ padding: "10px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Produk</th>
                      <th style={{ padding: "10px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Unit</th>
                      <th style={{ padding: "10px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingRencana.detailBarang.map((d) => (
                      <tr key={d.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px", fontSize: "14px", color: "var(--text-primary)" }}>{d.namaProduk}</td>
                        <td style={{ padding: "10px", fontSize: "14px", color: "var(--text-primary)" }}>{d.namaUnit}</td>
                        <td style={{ padding: "10px", fontSize: "14px", textAlign: "right", color: "var(--text-primary)" }}>{d.qtyRencana}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: "16px", fontSize: "12px", color: "var(--text-secondary)" }}>
                Dibuat oleh {viewingRencana.createdBy} • {new Date(viewingRencana.createdAt).toLocaleString("id-ID")}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
