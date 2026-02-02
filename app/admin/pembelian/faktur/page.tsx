"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface ProductUnit {
  id: string;
  namaUnit: string;
  hargaBeli: number;
  hargaJual: number;
  konversi: number;
  isBaseUnit: boolean;
  urutan: number;
}

interface DetailBarangTerima {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string;
  namaUnit: string;
  qtyPesan: number;
  qtyTerima: number;
  satuan: string;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
}

interface PenerimaanPembelian {
  id: string;
  nomorPenerimaan: string;
  nomorSuratJalan: string;
  pesananId: string;
  nomorPesanan: string;
  tanggalPenerimaan: string;
  supplierId: string;
  deskripsi: string;
  detailBarang: DetailBarangTerima[];
  createdAt: string;
  operator?: string;
  updatedAt?: string;
  apotikId?: string;
}

interface FakturPembelian {
  id: string;
  nomorFaktur: string;
  nomorBukti: string;
  nomorFakturSupplier: string;
  nomorFakturPajak: string;
  tanggalFaktur: string;
  tanggalJatuhTempo: string;
  supplierId: string;
  penerimaanIds: string[]; // Array ID penerimaan yang digunakan
  detailBarang: DetailBarangFaktur[];
  subtotal: number;
  diskonGlobal: number;
  ppn: number;
  ppnAmount: number;
  total: number;
  statusBayar: string;
  createdAt: string;
  operator?: string;
  updatedAt?: string;
  apotikId?: string; // Apotik ID untuk filtering
}

interface DetailBarangFaktur {
  id: string;
  penerimaanId: string;
  nomorPenerimaan: string;
  nomorPesanan: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string;
  namaUnit: string;
  qtyTerima: number;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
}

interface Supplier {
  id: string;
  kodeSupplier: string;
  namaSupplier: string;
}

export default function FakturPembelianPage() {
  const [activeTab, setActiveTab] = useState<"penerimaan" | "faktur">("penerimaan");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [penerimaanList, setPenerimaanList] = useState<PenerimaanPembelian[]>([]);
  const [fakturList, setFakturList] = useState<FakturPembelian[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedPenerimaanIds, setSelectedPenerimaanIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<{
    nomorFakturSupplier: string;
    nomorFakturPajak: string;
    tanggalFaktur: string;
    tanggalJatuhTempo: string;
    diskonGlobal: number;
    ppn: number;
  }>({
    nomorFakturSupplier: "",
    nomorFakturPajak: "",
    tanggalFaktur: "",
    tanggalJatuhTempo: "",
    diskonGlobal: 0,
    ppn: 11,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hargaBarang, setHargaBarang] = useState<{ [key: string]: number }>({});
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load current user email
  useEffect(() => {
    const loadUserEmail = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.email) {
          setCurrentUserEmail(data.session.user.email);
        }
      } catch (err) {
        console.error("Error loading user email:", err);
      }
    };
    loadUserEmail();
  }, []);

  useEffect(() => {
    let cancelled = false;
    function loadFromLocalStorage() {
      const sp = localStorage.getItem("penerimaanPembelian"); if (sp) try { setPenerimaanList(JSON.parse(sp)); } catch (_) {}
      const sf = localStorage.getItem("fakturPembelian"); if (sf) try { setFakturList(JSON.parse(sf)); } catch (_) {}
      const ss = localStorage.getItem("suppliers"); if (ss) try { setSuppliers(JSON.parse(ss)); } catch (_) {}
    }
    const today = new Date().toISOString().split("T")[0];
    setFormData((prev) => ({ ...prev, tanggalFaktur: today, tanggalJatuhTempo: today }));
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token || cancelled) { loadFromLocalStorage(); setIsLoadingData(false); return; }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/penerimaanPembelian", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/fakturPembelian", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/suppliers", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      ]).then(([penerimaanData, fakturData, suppliersData]) => {
        if (cancelled) return;
        if (Array.isArray(penerimaanData) && penerimaanData.length > 0) { setPenerimaanList(penerimaanData); localStorage.setItem("penerimaanPembelian", JSON.stringify(penerimaanData)); }
        else loadFromLocalStorage();
        if (Array.isArray(fakturData) && fakturData.length > 0) { setFakturList(fakturData); localStorage.setItem("fakturPembelian", JSON.stringify(fakturData)); }
        else { const sf = localStorage.getItem("fakturPembelian"); if (sf) try { setFakturList(JSON.parse(sf)); } catch (_) {} }
        if (Array.isArray(suppliersData) && suppliersData.length > 0) { setSuppliers(suppliersData); localStorage.setItem("suppliers", JSON.stringify(suppliersData)); }
        else { const ss = localStorage.getItem("suppliers"); if (ss) try { setSuppliers(JSON.parse(ss)); } catch (_) {} }
        if (!cancelled) setIsLoadingData(false);
      }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    return () => { cancelled = true; };
  }, []);

  // Sync faktur and penerimaan to API (guard: jangan POST saat initial load)
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/fakturPembelian", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: fakturList }) }).catch(() => {});
      }
    });
  }, [fakturList, isLoadingData]);
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/penerimaanPembelian", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: penerimaanList }) }).catch(() => {});
      }
    });
  }, [penerimaanList, isLoadingData]);

  // Get available penerimaan (yang belum dibuat faktur)
  const getAvailablePenerimaan = () => {
    const fakturPenerimaanIds = new Set<string>();
    fakturList.forEach((faktur) => {
      faktur.penerimaanIds.forEach((id) => fakturPenerimaanIds.add(id));
    });

    return penerimaanList.filter(
      (p) => !fakturPenerimaanIds.has(p.id)
    );
  };

  // Group penerimaan by supplier
  const getPenerimaanBySupplier = () => {
    const available = getAvailablePenerimaan();
    const grouped: { [key: string]: PenerimaanPembelian[] } = {};

    available.forEach((penerimaan) => {
      if (!grouped[penerimaan.supplierId]) {
        grouped[penerimaan.supplierId] = [];
      }
      grouped[penerimaan.supplierId].push(penerimaan);
    });

    return grouped;
  };

  // Get penerimaan for selected supplier
  const getPenerimaanForSupplier = () => {
    if (!selectedSupplierId) return [];
    const grouped = getPenerimaanBySupplier();
    return grouped[selectedSupplierId] || [];
  };

  const handleOpenModal = (supplierId?: string, penerimaanIds?: string[]) => {
    setIsModalOpen(true);
    setSelectedSupplierId(supplierId || "");
    setSelectedPenerimaanIds(penerimaanIds || []);
    setError(null);
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      nomorFakturSupplier: "",
      nomorFakturPajak: "",
      tanggalFaktur: today,
      tanggalJatuhTempo: today,
      diskonGlobal: 0,
      ppn: 11,
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSupplierId("");
    setSelectedPenerimaanIds([]);
    setError(null);
  };

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setSelectedPenerimaanIds([]);
    setHargaBarang({});
  };

  const handleHargaChange = (penerimaanId: string, detailId: string, harga: number) => {
    const key = `${penerimaanId}-${detailId}`;
    setHargaBarang((prev) => ({
      ...prev,
      [key]: harga,
    }));
  };

  const getHargaSatuan = (penerimaanId: string, detailId: string, defaultHarga: number) => {
    const key = `${penerimaanId}-${detailId}`;
    return hargaBarang[key] !== undefined ? hargaBarang[key] : defaultHarga;
  };

  const handlePenerimaanToggle = (penerimaanId: string) => {
    setSelectedPenerimaanIds((prev) => {
      if (prev.includes(penerimaanId)) {
        return prev.filter((id) => id !== penerimaanId);
      } else {
        return [...prev, penerimaanId];
      }
    });
  };

  const handleSelectAll = () => {
    const penerimaanForSupplier = getPenerimaanForSupplier();
    if (selectedPenerimaanIds.length === penerimaanForSupplier.length) {
      setSelectedPenerimaanIds([]);
    } else {
      setSelectedPenerimaanIds(penerimaanForSupplier.map((p) => p.id));
    }
  };

  // Calculate totals from selected penerimaan
  const calculateTotals = () => {
    if (selectedPenerimaanIds.length === 0) {
      return { subtotal: 0, diskonAmount: 0, ppnAmount: 0, total: 0 };
    }

    const selectedPenerimaan = penerimaanList.filter((p) =>
      selectedPenerimaanIds.includes(p.id)
    );

    let subtotal = 0;
    selectedPenerimaan.forEach((penerimaan) => {
      penerimaan.detailBarang.forEach((detail) => {
        const hargaSatuan = getHargaSatuan(penerimaan.id, detail.id, detail.hargaSatuan);
        const itemSubtotal = hargaSatuan * detail.qtyTerima;
        const itemDiskon = (itemSubtotal * detail.diskon) / 100;
        subtotal += itemSubtotal - itemDiskon;
      });
    });

    const diskonAmount = (subtotal * formData.diskonGlobal) / 100;
    const afterDiskon = subtotal - diskonAmount;
    const ppnAmount = (afterDiskon * formData.ppn) / 100;
    const total = afterDiskon + ppnAmount;

    return { subtotal, diskonAmount, ppnAmount, total };
  };

  const generateNomorFaktur = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const existingFaktur = fakturList.filter(
      (f) => f.nomorFaktur.startsWith(`FA-${year}${month}-`)
    );
    const nextNumber = String(existingFaktur.length + 1).padStart(4, "0");
    return `FA-${year}${month}-${nextNumber}`;
  };

  const generateNomorBukti = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const existingFaktur = fakturList.filter(
      (f) => f.nomorBukti && f.nomorBukti.startsWith(`BUK-${year}${month}-`)
    );
    const nextNumber = String(existingFaktur.length + 1).padStart(4, "0");
    return `BUK-${year}${month}-${nextNumber}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!selectedSupplierId) {
        throw new Error("Pilih supplier terlebih dahulu");
      }

      if (selectedPenerimaanIds.length === 0) {
        throw new Error("Pilih minimal 1 penerimaan pembelian");
      }

      if (!formData.nomorFakturSupplier.trim()) {
        throw new Error("Nomor Faktur Supplier wajib diisi");
      }

      const selectedPenerimaan = penerimaanList.filter((p) =>
        selectedPenerimaanIds.includes(p.id)
      );

      // Build detail barang from all selected penerimaan
      const detailBarang: DetailBarangFaktur[] = [];
      selectedPenerimaan.forEach((penerimaan) => {
        penerimaan.detailBarang.forEach((detail) => {
          const hargaSatuan = getHargaSatuan(penerimaan.id, detail.id, detail.hargaSatuan);
          const itemSubtotal = hargaSatuan * detail.qtyTerima;
          const itemDiskon = (itemSubtotal * detail.diskon) / 100;
          const finalSubtotal = itemSubtotal - itemDiskon;

          detailBarang.push({
            id: `${penerimaan.id}-${detail.id}`,
            penerimaanId: penerimaan.id,
            nomorPenerimaan: penerimaan.nomorPenerimaan,
            nomorPesanan: penerimaan.nomorPesanan,
            produkId: detail.produkId,
            kodeProduk: detail.kodeProduk,
            namaProduk: detail.namaProduk,
            unitId: detail.unitId,
            namaUnit: detail.namaUnit,
            qtyTerima: detail.qtyTerima,
            hargaSatuan: hargaSatuan,
            diskon: detail.diskon,
            subtotal: finalSubtotal,
          });
        });
      });

      const totals = calculateTotals();
      const userEmail = currentUserEmail || "System";
      const now = new Date().toISOString();

      // Get apotikId from first penerimaan (if available) or from session
      const firstPenerimaan = selectedPenerimaan[0];
      const apotikId = firstPenerimaan?.apotikId || 
        (typeof window !== "undefined" ? sessionStorage.getItem("selectedApotikId") : null) || 
        undefined;

      const newFaktur: FakturPembelian = {
        id: Date.now().toString(),
        nomorFaktur: generateNomorFaktur(),
        nomorBukti: generateNomorBukti(),
        nomorFakturSupplier: formData.nomorFakturSupplier.trim(),
        nomorFakturPajak: formData.nomorFakturPajak.trim(),
        tanggalFaktur: formData.tanggalFaktur,
        tanggalJatuhTempo: formData.tanggalJatuhTempo,
        supplierId: selectedSupplierId,
        penerimaanIds: selectedPenerimaanIds,
        detailBarang,
        subtotal: totals.subtotal,
        diskonGlobal: formData.diskonGlobal,
        ppn: formData.ppn,
        ppnAmount: totals.ppnAmount,
        total: totals.total,
        statusBayar: "Belum Lunas",
        createdAt: now,
        operator: userEmail,
        updatedAt: now,
        apotikId: apotikId || undefined,
      };

      const updatedFakturList = [...fakturList, newFaktur];
      localStorage.setItem("fakturPembelian", JSON.stringify(updatedFakturList));
      setFakturList(updatedFakturList);

      handleCloseModal();
      setActiveTab("faktur"); // Switch to Daftar Faktur tab after saving
      alert("Faktur pembelian berhasil dibuat!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const dateParts = dateString.split("-");
    if (dateParts.length === 3) {
      const date = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2])
      );
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }
    return dateString;
  };

  const totals = calculateTotals();
  const penerimaanBySupplier = getPenerimaanBySupplier();
  const penerimaanForSupplier = getPenerimaanForSupplier();

  return (
    <DashboardLayout>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <button
            onClick={() => handleOpenModal()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#3b82f6";
            }}
          >
            + Buat Faktur Pembelian
          </button>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: "20px", display: "flex", gap: "12px", borderBottom: "2px solid #e2e8f0" }}>
          <button
            onClick={() => setActiveTab("penerimaan")}
            style={{
              padding: "12px 20px",
              backgroundColor: "transparent",
              color: activeTab === "penerimaan" ? "#3b82f6" : "#64748b",
              border: "none",
              borderBottom: activeTab === "penerimaan" ? "2px solid #3b82f6" : "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "-2px",
            }}
          >
            Penerimaan Belum Faktur
          </button>
          <button
            onClick={() => setActiveTab("faktur")}
            style={{
              padding: "12px 20px",
              backgroundColor: "transparent",
              color: activeTab === "faktur" ? "#3b82f6" : "#64748b",
              border: "none",
              borderBottom: activeTab === "faktur" ? "2px solid #3b82f6" : "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "-2px",
            }}
          >
            Daftar Faktur
          </button>
        </div>

        {/* Table - Penerimaan Belum Faktur */}
        {activeTab === "penerimaan" && getAvailablePenerimaan().length > 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Supplier
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Nomor Penerimaan
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Nomor PO
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Tanggal Penerimaan
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Jumlah Item
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      width: "150px",
                    }}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(penerimaanBySupplier).map(([supplierId, penerimaanListForSupplier]) => {
                  const supplier = suppliers.find((s) => s.id === supplierId);
                  return penerimaanListForSupplier.map((penerimaan, index) => (
                    <tr
                      key={penerimaan.id}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {index === 0 && (
                        <td
                          rowSpan={penerimaanListForSupplier.length}
                          style={{
                            padding: "12px",
                            fontSize: "13px",
                            color: "#1e293b",
                            fontWeight: "500",
                            verticalAlign: "top",
                          }}
                        >
                          {supplier?.namaSupplier || supplierId}
                        </td>
                      )}
                      <td
                        style={{
                          padding: "12px",
                          fontSize: "13px",
                          color: "#1e293b",
                        }}
                      >
                        {penerimaan.nomorPenerimaan}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: "13px",
                          color: "#64748b",
                        }}
                      >
                        {penerimaan.nomorPesanan}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: "13px",
                          color: "#64748b",
                        }}
                      >
                        {formatDate(penerimaan.tanggalPenerimaan)}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: "13px",
                          textAlign: "center",
                          color: "#64748b",
                        }}
                      >
                        {penerimaan.detailBarang.length} item
                      </td>
                      {index === 0 && (
                        <td
                          rowSpan={penerimaanListForSupplier.length}
                          style={{
                            padding: "12px",
                            fontSize: "13px",
                            textAlign: "center",
                            verticalAlign: "top",
                          }}
                        >
                          <button
                            onClick={() => {
                              handleOpenModal(supplierId, []);
                            }}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                              transition: "background-color 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#2563eb";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#3b82f6";
                            }}
                          >
                            Buat Faktur
                          </button>
                        </td>
                      )}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        ) : activeTab === "penerimaan" ? (
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "24px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              textAlign: "center",
          }}
        >
          <p style={{ color: "#64748b" }}>
              Semua penerimaan pembelian sudah dibuat faktur.
          </p>
        </div>
        ) : null}

        {/* Table - Daftar Faktur */}
        {activeTab === "faktur" && fakturList.length > 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0",
                  }}
                >
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Nomor Faktur
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Kode Bukti
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Nomor Faktur Supplier
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Tanggal Faktur
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Supplier
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Jumlah Penerimaan
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Total
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Operator
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Last Update
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Status Bayar
                  </th>
                </tr>
              </thead>
              <tbody>
                {fakturList.map((faktur) => (
                  <tr
                    key={faktur.id}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "13px",
                        color: "#1e293b",
                      }}
                    >
                      {faktur.nomorFaktur}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {faktur.nomorBukti || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {faktur.nomorFakturSupplier || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {formatDate(faktur.tanggalFaktur)}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {suppliers.find((s) => s.id === faktur.supplierId)
                        ?.namaSupplier || faktur.supplierId}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {faktur.penerimaanIds.length} penerimaan
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "13px",
                        textAlign: "right",
                        fontWeight: "500",
                        color: "#1e293b",
                      }}
                    >
                      {formatCurrency(faktur.total)}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {faktur.operator || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {faktur.updatedAt 
                        ? new Date(faktur.updatedAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : faktur.createdAt
                        ? new Date(faktur.createdAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "13px",
                        textAlign: "center",
                      }}
                    >
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor:
                            faktur.statusBayar === "Lunas"
                              ? "#d1fae5"
                              : "#fee2e2",
                          color:
                            faktur.statusBayar === "Lunas"
                              ? "#065f46"
                              : "#991b1b",
                        }}
                      >
                        {faktur.statusBayar}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
      </div>
        ) : activeTab === "faktur" ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#64748b" }}>
              Belum ada faktur pembelian. Klik "Buat Faktur Pembelian" untuk membuat faktur baru.
            </p>
          </div>
        ) : null}

        {/* Modal */}
        {isModalOpen && (
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
              alignItems: "flex-start",
              zIndex: 1000,
              overflowY: "auto",
              padding: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                width: "95%",
                maxWidth: "1200px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                margin: "auto",
                marginTop: "20px",
                marginBottom: "20px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#f8fafc",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                }}
              >
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    margin: 0,
                    color: "#1e293b",
                  }}
                >
                  Buat Faktur Pembelian
                </h3>
                <button
                  onClick={handleCloseModal}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "#64748b",
                    padding: 0,
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "4px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#e2e8f0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit}>
                <div style={{ padding: "24px" }}>
                  {/* Row 1: Supplier, Kode Bukti, Tanggal Faktur */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "16px",
                      marginBottom: "24px",
                    }}
                  >
                    <div>
                      <label
                        htmlFor="supplier"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Supplier <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        id="supplier"
                        value={selectedSupplierId}
                        onChange={(e) => handleSupplierChange(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          transition: "border-color 0.2s",
                          backgroundColor: "white",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#3b82f6";
                          e.currentTarget.style.outline = "none";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                      >
                        <option value="">Pilih Supplier</option>
                        {Object.keys(penerimaanBySupplier).map((supplierId) => {
                          const supplier = suppliers.find((s) => s.id === supplierId);
                          const count = penerimaanBySupplier[supplierId].length;
                          return (
                            <option key={supplierId} value={supplierId}>
                              {supplier?.namaSupplier || supplierId} ({count}{" "}
                              penerimaan tersedia)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Kode Bukti
                      </label>
                      <div
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          backgroundColor: "#f3f4f6",
                          color: "#64748b",
                        }}
                      >
                        {selectedPenerimaanIds.length > 0 ? generateNomorBukti() : "-"}
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="tanggalFaktur"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Tanggal Faktur <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="date"
                        id="tanggalFaktur"
                        value={formData.tanggalFaktur}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            tanggalFaktur: e.target.value,
                          }))
                        }
                        required
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 2: Nomor Faktur Supplier, No Faktur Pajak, Tanggal Jatuh Tempo */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "16px",
                      marginBottom: "24px",
                    }}
                  >
                    <div>
                      <label
                        htmlFor="nomorFakturSupplier"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Nomor Faktur Supplier{" "}
                        <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="text"
                        id="nomorFakturSupplier"
                        value={formData.nomorFakturSupplier}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            nomorFakturSupplier: e.target.value,
                          }))
                        }
                        required
                        placeholder="Masukkan nomor faktur dari supplier"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#3b82f6";
                          e.currentTarget.style.outline = "none";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="nomorFakturPajak"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        No Faktur Pajak
                      </label>
                      <input
                        type="text"
                        id="nomorFakturPajak"
                        value={formData.nomorFakturPajak}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            nomorFakturPajak: e.target.value,
                          }))
                        }
                        placeholder="Masukkan nomor faktur pajak"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#3b82f6";
                          e.currentTarget.style.outline = "none";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tanggalJatuhTempo"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Tanggal Jatuh Tempo{" "}
                        <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="date"
                        id="tanggalJatuhTempo"
                        value={formData.tanggalJatuhTempo}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            tanggalJatuhTempo: e.target.value,
                          }))
                        }
                        required
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Penerimaan Selection */}
                  {selectedSupplierId && (
                    <div style={{ marginBottom: "24px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "12px",
                        }}
                      >
                        <label
                          style={{
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Pilih Penerimaan Pembelian{" "}
                          <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        {penerimaanForSupplier.length > 0 && (
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "transparent",
                              color: "#3b82f6",
                              border: "1px solid #3b82f6",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                            }}
                          >
                            {selectedPenerimaanIds.length ===
                            penerimaanForSupplier.length
                              ? "Batal Pilih Semua"
                              : "Pilih Semua"}
                          </button>
                        )}
                      </div>
                      {penerimaanForSupplier.length > 0 ? (
                        <div
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            maxHeight: "300px",
                            overflowY: "auto",
                          }}
                        >
                          {penerimaanForSupplier.map((penerimaan) => (
                            <div
                              key={penerimaan.id}
                              style={{
                                padding: "12px",
                                borderBottom: "1px solid #e2e8f0",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f8fafc";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }}
                              onClick={() =>
                                handlePenerimaanToggle(penerimaan.id)
                              }
                            >
                              <input
                                type="checkbox"
                                checked={selectedPenerimaanIds.includes(
                                  penerimaan.id
                                )}
                                onChange={() =>
                                  handlePenerimaanToggle(penerimaan.id)
                                }
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  cursor: "pointer",
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#1e293b",
                                  }}
                                >
                                  {penerimaan.nomorPenerimaan}
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#64748b",
                                    marginTop: "4px",
                                  }}
                                >
                                  PO: {penerimaan.nomorPesanan} | Tanggal:{" "}
                                  {formatDate(penerimaan.tanggalPenerimaan)} |
                                  {penerimaan.detailBarang.length} item
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "24px",
                            textAlign: "center",
                            color: "#64748b",
                            fontSize: "14px",
                          }}
                        >
                          Tidak ada penerimaan tersedia untuk supplier ini
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detail Barang Preview */}
                  {selectedPenerimaanIds.length > 0 && (
                    <div style={{ marginBottom: "24px" }}>
                      <h4
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          margin: "0 0 12px 0",
                          color: "#1e293b",
                        }}
                      >
                        Detail Barang
                      </h4>
                      <div
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          overflowX: "auto",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            minWidth: "800px",
                          }}
                        >
                          <thead>
                            <tr style={{ backgroundColor: "#f8fafc" }}>
                              <th
                                style={{
                                  padding: "12px",
                                  textAlign: "left",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                Nomor Penerimaan
                              </th>
                              <th
                                style={{
                                  padding: "12px",
                                  textAlign: "left",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                No Surat Jalan
                              </th>
                              <th
                                style={{
                                  padding: "12px",
                                  textAlign: "left",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                Nama Produk
                              </th>
                              <th
                                style={{
                                  padding: "12px",
                                  textAlign: "left",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                Unit
                              </th>
                              <th
                                style={{
                                  padding: "12px",
                                  textAlign: "center",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                Qty Terima
                              </th>
                              <th
                                style={{
                                  padding: "12px",
                                  textAlign: "right",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                Harga Satuan
                              </th>
                              <th
                                style={{
                                  padding: "12px",
                                  textAlign: "right",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                Subtotal
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {penerimaanList
                              .filter((p) =>
                                selectedPenerimaanIds.includes(p.id)
                              )
                              .map((penerimaan) =>
                                penerimaan.detailBarang.map((detail) => {
                                  const hargaSatuan = getHargaSatuan(penerimaan.id, detail.id, detail.hargaSatuan);
                                  const itemSubtotal = hargaSatuan * detail.qtyTerima;
                                  const itemDiskon = (itemSubtotal * detail.diskon) / 100;
                                  const finalSubtotal = itemSubtotal - itemDiskon;

                                  return (
                                    <tr
                                      key={`${penerimaan.id}-${detail.id}`}
                                      style={{
                                        borderBottom: "1px solid #e2e8f0",
                                      }}
                                    >
                                      <td
                                        style={{
                                          padding: "12px",
                                          fontSize: "13px",
                                          color: "#64748b",
                                        }}
                                      >
                                        {penerimaan.nomorPenerimaan}
                                      </td>
                                      <td
                                        style={{
                                          padding: "12px",
                                          fontSize: "13px",
                                          color: "#64748b",
                                        }}
                                      >
                                        {penerimaan.nomorSuratJalan}
                                      </td>
                                      <td
                                        style={{
                                          padding: "12px",
                                          fontSize: "13px",
                                          color: "#1e293b",
                                        }}
                                      >
                                        {detail.namaProduk}
                                      </td>
                                      <td
                                        style={{
                                          padding: "12px",
                                          fontSize: "13px",
                                          color: "#64748b",
                                        }}
                                      >
                                        {detail.namaUnit || detail.satuan}
                                      </td>
                                      <td
                                        style={{
                                          padding: "12px",
                                          fontSize: "13px",
                                          textAlign: "center",
                                          color: "#64748b",
                                        }}
                                      >
                                        {detail.qtyTerima}
                                      </td>
                                      <td
                                        style={{
                                          padding: "12px",
                                          fontSize: "13px",
                                          textAlign: "right",
                                        }}
                                      >
                                        <input
                                          type="number"
                                          value={hargaSatuan}
                                          onChange={(e) =>
                                            handleHargaChange(
                                              penerimaan.id,
                                              detail.id,
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                          min="0"
                                          step="100"
                                          style={{
                                            width: "120px",
                                            padding: "6px 8px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "4px",
                                            fontSize: "13px",
                                            textAlign: "right",
                                          }}
                                          onFocus={(e) => {
                                            e.currentTarget.style.borderColor = "#3b82f6";
                                            e.currentTarget.style.outline = "none";
                                          }}
                                          onBlur={(e) => {
                                            e.currentTarget.style.borderColor = "#d1d5db";
                                          }}
                                        />
                                      </td>
                                      <td
                                        style={{
                                          padding: "12px",
                                          fontSize: "13px",
                                          textAlign: "right",
                                          fontWeight: "500",
                                          color: "#1e293b",
                                        }}
                                      >
                                        {formatCurrency(finalSubtotal)}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Form Fields - Diskon & PPN */}
                  {selectedPenerimaanIds.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "16px",
                        marginBottom: "24px",
                      }}
                    >
                      <div style={{ width: "25%" }}>
                        <label
                          htmlFor="diskonGlobal"
                          style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Diskon Global (%)
                        </label>
                        <input
                          type="number"
                          id="diskonGlobal"
                          value={formData.diskonGlobal}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              diskonGlobal: parseFloat(e.target.value) || 0,
                            }))
                          }
                          min="0"
                          max="100"
                          step="0.01"
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div style={{ width: "25%" }}>
                        <label
                          htmlFor="ppn"
                          style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          PPN (%)
                        </label>
                        <select
                          id="ppn"
                          value={formData.ppn}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              ppn: parseFloat(e.target.value),
                            }))
                          }
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="11">11%</option>
                          <option value="12">12%</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {selectedPenerimaanIds.length > 0 && (
                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        padding: "20px",
                        borderRadius: "6px",
                        marginBottom: "24px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span style={{ fontSize: "14px", color: "#64748b" }}>
                          Subtotal:
                        </span>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#1e293b",
                          }}
                        >
                          {formatCurrency(totals.subtotal)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span style={{ fontSize: "14px", color: "#64748b" }}>
                          Diskon Global ({formData.diskonGlobal}%):
                        </span>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#1e293b",
                          }}
                        >
                          -{formatCurrency(totals.diskonAmount)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <span style={{ fontSize: "14px", color: "#64748b" }}>
                          PPN ({formData.ppn}%):
                        </span>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#1e293b",
                          }}
                        >
                          {formatCurrency(totals.ppnAmount)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          paddingTop: "12px",
                          borderTop: "2px solid #e2e8f0",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#1e293b",
                          }}
                        >
                          Total:
                        </span>
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#1e293b",
                          }}
                        >
                          {formatCurrency(totals.total)}
                        </span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "#fee2e2",
                        border: "1px solid #fecaca",
                        borderRadius: "6px",
                        marginBottom: "20px",
                        color: "#991b1b",
                        fontSize: "14px",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  {/* Footer */}
                  <div
                    style={{
                      padding: "20px 24px",
                      borderTop: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                      display: "flex",
                      gap: "12px",
                      justifyContent: "flex-end",
                      borderBottomLeftRadius: "8px",
                      borderBottomRightRadius: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "transparent",
                        color: "#64748b",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading || selectedPenerimaanIds.length === 0}
                      style={{
                        padding: "10px 20px",
                        backgroundColor:
                          loading || selectedPenerimaanIds.length === 0
                            ? "#9ca3af"
                            : "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor:
                          loading || selectedPenerimaanIds.length === 0
                            ? "not-allowed"
                            : "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!loading && selectedPenerimaanIds.length > 0) {
                          e.currentTarget.style.backgroundColor = "#059669";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading && selectedPenerimaanIds.length > 0) {
                          e.currentTarget.style.backgroundColor = "#10b981";
                        }
                      }}
                    >
                      {loading ? "Menyimpan..." : "Simpan Faktur"}
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
