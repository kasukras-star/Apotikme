"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";
import {
  calculateTotalHutang,
  getFakturBelumLunas,
  getFakturJatuhTempo,
  getFakturOverdue,
  formatCurrency,
  getDaysUntilDue,
  getStatusBadgeColor,
  getSisaHutang,
  type FakturPembelian,
  type PembayaranItem,
} from "../../../../lib/financeHelpers";

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

interface Apotik {
  id: string;
  kodeApotik: string;
  namaApotik: string;
}

export default function HutangPage() {
  const [fakturList, setFakturList] = useState<FakturPembelian[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [filteredFaktur, setFilteredFaktur] = useState<FakturPembelian[]>([]);
  const [selectedFaktur, setSelectedFaktur] = useState<FakturPembelian | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPembayaranModal, setShowPembayaranModal] = useState(false);
  const [newStatusBayar, setNewStatusBayar] = useState<string>("");
  // Form pembayaran
  const [pembayaranTanggal, setPembayaranTanggal] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [pembayaranJumlah, setPembayaranJumlah] = useState<string>("");
  const [pembayaranMetode, setPembayaranMetode] = useState<string>("Transfer");
  const [pembayaranReferensi, setPembayaranReferensi] = useState<string>("");
  // Setelah simpan: tampilkan bukti & upload (jika Transfer)
  const [lastSavedPayment, setLastSavedPayment] = useState<PembayaranItem | null>(null);
  const [showPembayaranSuccess, setShowPembayaranSuccess] = useState(false);
  const [uploadedBuktiFileName, setUploadedBuktiFileName] = useState<string | null>(null);
  /** File bukti yang dipilih di form (sebelum simpan) - untuk metode Transfer */
  const [formBuktiFileName, setFormBuktiFileName] = useState<string | null>(null);

  // Default date range: first and last day of current month
  const getDefaultDateFrom = () => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  };
  const getDefaultDateTo = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().slice(0, 10);
  };

  // Filters
  const [filterSupplier, setFilterSupplier] = useState<string>("");
  const [filterApotik, setFilterApotik] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [filterDateFrom, setFilterDateFrom] = useState<string>(() => getDefaultDateFrom());
  const [filterDateTo, setFilterDateTo] = useState<string>(() => getDefaultDateTo());

  // User access
  const [userApotikIds, setUserApotikIds] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedApotikId, setSelectedApotikId] = useState<string | null>(null);

  // Load user access
  useEffect(() => {
    const loadUserAccess = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session) {
        const apotikIds = session.user?.app_metadata?.apotikIds as string[] | undefined;
        const superAdmin = session.user?.app_metadata?.isSuperAdmin as boolean | undefined;

        setUserApotikIds(apotikIds || []);
        setIsSuperAdmin(superAdmin || false);

        const saved = sessionStorage.getItem("selectedApotikId");
        if (superAdmin) {
          setSelectedApotikId(saved === "all" ? null : saved || null);
        } else if (apotikIds && apotikIds.length > 0) {
          setSelectedApotikId(saved && apotikIds.includes(saved) ? saved : apotikIds[0]);
        }
      }
    };

    loadUserAccess();
  }, []);

  // Load data
  useEffect(() => {
    const savedFaktur = localStorage.getItem("fakturPembelian");
    const savedSuppliers = localStorage.getItem("suppliers");
    const savedApotiks = localStorage.getItem("apotiks");

    if (savedFaktur) {
      try {
        const parsed = JSON.parse(savedFaktur);
        setFakturList(parsed);
      } catch (err) {
        console.error("Error loading faktur:", err);
      }
    }

    if (savedSuppliers) {
      try {
        setSuppliers(JSON.parse(savedSuppliers));
      } catch (err) {
        console.error("Error loading suppliers:", err);
      }
    }

    if (savedApotiks) {
      try {
        setApotiks(JSON.parse(savedApotiks));
      } catch (err) {
        console.error("Error loading apotiks:", err);
      }
    }
  }, []);

  // Filter faktur
  useEffect(() => {
    let filtered = [...fakturList];

    // Filter by apotik access
    if (!isSuperAdmin && selectedApotikId) {
      filtered = filtered.filter((f) => f.apotikId === selectedApotikId);
    } else if (!isSuperAdmin && userApotikIds.length > 0) {
      // Filter faktur yang memiliki apotikId dan sesuai dengan user access
      // Jika faktur tidak punya apotikId, skip (untuk backward compatibility)
      filtered = filtered.filter((f) => {
        if (!f.apotikId) return false; // Skip faktur tanpa apotikId
        return userApotikIds.includes(f.apotikId);
      });
    }

    // Filter by supplier
    if (filterSupplier) {
      filtered = filtered.filter((f) => f.supplierId === filterSupplier);
    }

    // Filter by apotik
    if (filterApotik) {
      filtered = filtered.filter((f) => f.apotikId === filterApotik);
    }

    // Filter by status
    if (filterStatus === "belum-lunas") {
      filtered = filtered.filter((f) => f.statusBayar !== "Lunas");
    } else if (filterStatus === "jatuh-tempo") {
      const jatuhTempo = getFakturJatuhTempo(filtered, 7);
      filtered = jatuhTempo;
    } else if (filterStatus === "overdue") {
      const overdue = getFakturOverdue(filtered);
      filtered = overdue;
    }

    // Filter by date range
    if (filterDateFrom) {
      filtered = filtered.filter((f) => f.tanggalFaktur >= filterDateFrom);
    }
    if (filterDateTo) {
      filtered = filtered.filter((f) => f.tanggalFaktur <= filterDateTo);
    }

    // Sort by tanggal jatuh tempo (ascending)
    filtered.sort((a, b) => {
      const dateA = new Date(a.tanggalJatuhTempo).getTime();
      const dateB = new Date(b.tanggalJatuhTempo).getTime();
      return dateA - dateB;
    });

    setFilteredFaktur(filtered);
  }, [
    fakturList,
    filterSupplier,
    filterApotik,
    filterStatus,
    filterDateFrom,
    filterDateTo,
    isSuperAdmin,
    selectedApotikId,
    userApotikIds,
  ]);

  const fakturBelumLunas = getFakturBelumLunas(filteredFaktur);
  const totalHutang = calculateTotalHutang(filteredFaktur);
  const fakturJatuhTempo = getFakturJatuhTempo(filteredFaktur, 7);
  const fakturOverdue = getFakturOverdue(filteredFaktur);

  const getSupplierName = (supplierId: string): string => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier ? supplier.namaSupplier : supplierId;
  };

  const getApotikName = (apotikId?: string): string => {
    if (!apotikId) return "-";
    const apotik = apotiks.find((a) => a.id === apotikId);
    return apotik ? apotik.namaApotik : apotikId;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleViewDetail = (faktur: FakturPembelian) => {
    setSelectedFaktur(faktur);
    setShowDetailModal(true);
  };

  const handleUpdateStatus = (faktur: FakturPembelian) => {
    setSelectedFaktur(faktur);
    setNewStatusBayar(faktur.statusBayar);
    setShowUpdateModal(true);
  };

  const handleSaveStatus = () => {
    if (!selectedFaktur) return;

    const updatedFakturList = fakturList.map((f) =>
      f.id === selectedFaktur.id
        ? {
            ...f,
            statusBayar: newStatusBayar,
            updatedAt: new Date().toISOString(),
          }
        : f
    );

    setFakturList(updatedFakturList);
    localStorage.setItem("fakturPembelian", JSON.stringify(updatedFakturList));
    setShowUpdateModal(false);
    setSelectedFaktur(null);
    alert("Status pembayaran berhasil diupdate!");
  };

  const handleBayar = (faktur: FakturPembelian) => {
    setSelectedFaktur(faktur);
    setPembayaranTanggal(new Date().toISOString().slice(0, 10));
    setPembayaranJumlah("");
    setPembayaranMetode("Transfer");
    setPembayaranReferensi("");
    setLastSavedPayment(null);
    setShowPembayaranSuccess(false);
    setUploadedBuktiFileName(null);
    setFormBuktiFileName(null);
    setShowPembayaranModal(true);
  };

  const generateNoBukti = () => {
    const d = new Date();
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `BAYAR-${Y}${M}${D}-${h}${m}${s}`;
  };

  const handleSavePembayaran = () => {
    if (!selectedFaktur) return;
    const jumlah = Number(pembayaranJumlah.replace(/\D/g, "")) || 0;
    const sisa = getSisaHutang(selectedFaktur);
    if (jumlah <= 0) {
      alert("Masukkan jumlah pembayaran.");
      return;
    }
    if (jumlah > sisa) {
      alert(`Jumlah pembayaran tidak boleh melebihi sisa hutang (${formatCurrency(sisa)}).`);
      return;
    }

    const noBukti = generateNoBukti();
    const totalDibayarSekarang = (selectedFaktur.totalDibayar ?? 0) + jumlah;
    const statusBaru = totalDibayarSekarang >= selectedFaktur.total ? "Lunas" : "Sebagian";
    const newPayment: PembayaranItem = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      noBukti,
      tanggal: pembayaranTanggal,
      jumlah,
      metode: pembayaranMetode || undefined,
      referensi: pembayaranReferensi.trim() || undefined,
      buktiFileName: formBuktiFileName || undefined,
      createdAt: new Date().toISOString(),
    };
    const pembayaranBaru = [...(selectedFaktur.pembayaran || []), newPayment];

    const updatedFakturList = fakturList.map((f) =>
      f.id === selectedFaktur.id
        ? {
            ...f,
            totalDibayar: totalDibayarSekarang,
            statusBayar: statusBaru,
            pembayaran: pembayaranBaru,
            updatedAt: new Date().toISOString(),
          }
        : f
    );

    setFakturList(updatedFakturList);
    localStorage.setItem("fakturPembelian", JSON.stringify(updatedFakturList));
    setLastSavedPayment(newPayment);
    setShowPembayaranSuccess(true);
    setPembayaranJumlah("");
    setFormBuktiFileName(null);
  };

  const handleClosePembayaranSuccess = () => {
    setShowPembayaranModal(false);
    setSelectedFaktur(null);
    setLastSavedPayment(null);
    setShowPembayaranSuccess(false);
    setUploadedBuktiFileName(null);
    setFormBuktiFileName(null);
  };

  /** Upload bukti di form (sebelum simpan) - untuk metode Transfer */
  const handleFormUploadBukti = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormBuktiFileName(file.name);
    e.target.value = "";
  };

  const handleUploadBukti = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFaktur || !lastSavedPayment) return;
    const fileName = file.name;
    setUploadedBuktiFileName(fileName);
    const updatedPembayaran = (selectedFaktur.pembayaran || []).map((p) =>
      p.id === lastSavedPayment.id ? { ...p, buktiFileName: fileName } : p
    );
    const updatedFakturList = fakturList.map((f) =>
      f.id === selectedFaktur.id
        ? { ...f, pembayaran: updatedPembayaran, updatedAt: new Date().toISOString() }
        : f
    );
    setFakturList(updatedFakturList);
    localStorage.setItem("fakturPembelian", JSON.stringify(updatedFakturList));
    setLastSavedPayment((prev) => (prev ? { ...prev, buktiFileName: fileName } : null));
    e.target.value = "";
  };

  const formatRupiahInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    if (!num) return "";
    return Number(num).toLocaleString("id-ID");
  };

  return (
    <DashboardLayout>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
          Hutang (Accounts Payable)
        </h2>

        {/* Summary Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
              Total Hutang
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#dc2626" }}>
              {formatCurrency(totalHutang)}
            </div>
          </div>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
              Faktur Belum Bayar
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>
              {fakturBelumLunas.length}
            </div>
          </div>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
              Jatuh Tempo (7 hari)
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#f59e0b" }}>
              {fakturJatuhTempo.length}
            </div>
          </div>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
              Overdue
            </div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#dc2626" }}>
              {fakturOverdue.length}
            </div>
          </div>
        </div>

        {/* Filters - satu baris, rapat */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "12px 16px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "nowrap",
              alignItems: "flex-end",
              gap: "10px",
            }}
          >
            <div style={{ minWidth: "140px", flex: "1 1 0" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Supplier
              </label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              >
                <option value="">Semua Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.namaSupplier}
                  </option>
                ))}
              </select>
            </div>

            {isSuperAdmin && (
              <div style={{ minWidth: "120px", flex: "1 1 0" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "#374151",
                  }}
                >
                  Apotik
                </label>
                <select
                  value={filterApotik}
                  onChange={(e) => setFilterApotik(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                >
                  <option value="">Semua Apotik</option>
                  {apotiks.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.namaApotik}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ minWidth: "120px", flex: "0 0 auto" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              >
                <option value="semua">Semua</option>
                <option value="belum-lunas">Belum Lunas</option>
                <option value="jatuh-tempo">Jatuh Tempo (7 hari)</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div style={{ minWidth: "130px", flex: "0 0 auto" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Dari Tanggal
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              />
            </div>

            <div style={{ minWidth: "130px", flex: "0 0 auto" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>
                    No. Faktur
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>
                    Supplier
                  </th>
                  {isSuperAdmin && (
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>
                      Apotik
                    </th>
                  )}
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>
                    Tanggal Faktur
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#374151" }}>
                    Jatuh Tempo
                  </th>
                  <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#374151" }}>
                    Total
                  </th>
                  <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", color: "#374151" }}>
                    Status
                  </th>
                  <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#374151" }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredFaktur.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isSuperAdmin ? 8 : 7}
                      style={{ padding: "24px", textAlign: "center", color: "#64748b" }}
                    >
                      Tidak ada faktur yang ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredFaktur.map((faktur) => {
                    const statusBadge = getStatusBadgeColor(faktur);
                    const daysUntilDue = getDaysUntilDue(faktur.tanggalJatuhTempo);
                    const isOverdue = daysUntilDue < 0;
                    const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 7;

                    return (
                      <tr
                        key={faktur.id}
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          backgroundColor: isOverdue
                            ? "#fef2f2"
                            : isDueSoon && faktur.statusBayar !== "Lunas"
                              ? "#fffbeb"
                              : "transparent",
                        }}
                      >
                        <td style={{ padding: "12px", color: "#1e293b", fontWeight: "500" }}>
                          {faktur.nomorFaktur}
                        </td>
                        <td style={{ padding: "12px", color: "#64748b" }}>
                          {getSupplierName(faktur.supplierId)}
                        </td>
                        {isSuperAdmin && (
                          <td style={{ padding: "12px", color: "#64748b" }}>
                            {getApotikName(faktur.apotikId)}
                          </td>
                        )}
                        <td style={{ padding: "12px", color: "#64748b" }}>
                          {formatDate(faktur.tanggalFaktur)}
                        </td>
                        <td style={{ padding: "12px", color: "#64748b" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>{formatDate(faktur.tanggalJatuhTempo)}</span>
                            {faktur.statusBayar !== "Lunas" && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor:
                                    daysUntilDue < 0
                                      ? "#fee2e2"
                                      : daysUntilDue <= 7
                                        ? "#fef3c7"
                                        : "transparent",
                                  color:
                                    daysUntilDue < 0
                                      ? "#991b1b"
                                      : daysUntilDue <= 7
                                        ? "#92400e"
                                        : "#64748b",
                                }}
                              >
                                {daysUntilDue < 0
                                  ? `${Math.abs(daysUntilDue)} hari terlambat`
                                  : daysUntilDue === 0
                                    ? "Hari ini"
                                    : `${daysUntilDue} hari lagi`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: "500", color: "#1e293b" }}>
                          {formatCurrency(faktur.total)}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "500",
                              backgroundColor: statusBadge.backgroundColor,
                              color: statusBadge.color,
                            }}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleViewDetail(faktur)}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                              }}
                            >
                              Detail
                            </button>
                            {faktur.statusBayar !== "Lunas" && (
                              <>
                                <button
                                  onClick={() => handleBayar(faktur)}
                                  style={{
                                    padding: "6px 12px",
                                    backgroundColor: "#059669",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                  }}
                                >
                                  Bayar
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(faktur)}
                                  style={{
                                    padding: "6px 12px",
                                    backgroundColor: "#6b7280",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                  }}
                                >
                                  Update Status
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedFaktur && (
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
              padding: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "24px",
                width: "100%",
                maxWidth: "800px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <h3 style={{ fontSize: "20px", fontWeight: "600", margin: 0 }}>
                  Detail Faktur Pembelian
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
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
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                      No. Faktur
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
                      {selectedFaktur.nomorFaktur}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                      Supplier
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
                      {getSupplierName(selectedFaktur.supplierId)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                      Tanggal Faktur
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
                      {formatDate(selectedFaktur.tanggalFaktur)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                      Jatuh Tempo
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
                      {formatDate(selectedFaktur.tanggalJatuhTempo)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                      Status Pembayaran
                    </div>
                    <div>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          ...getStatusBadgeColor(selectedFaktur),
                        }}
                      >
                        {getStatusBadgeColor(selectedFaktur).label}
                      </span>
                    </div>
                  </div>
                  {isSuperAdmin && selectedFaktur.apotikId && (
                    <div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                        Apotik
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
                        {getApotikName(selectedFaktur.apotikId)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ringkasan & Sisa Hutang */}
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Total Faktur</div>
                    <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>{formatCurrency(selectedFaktur.total)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Sudah Dibayar</div>
                    <div style={{ fontSize: "16px", fontWeight: "600", color: "#059669" }}>{formatCurrency(selectedFaktur.totalDibayar ?? 0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Sisa Hutang</div>
                    <div style={{ fontSize: "16px", fontWeight: "600", color: getSisaHutang(selectedFaktur) > 0 ? "#dc2626" : "#059669" }}>
                      {formatCurrency(getSisaHutang(selectedFaktur))}
                    </div>
                  </div>
                </div>
                {selectedFaktur.statusBayar !== "Lunas" && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleBayar(selectedFaktur);
                    }}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#059669",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Catat Pembayaran
                  </button>
                )}

                {/* Riwayat Pembayaran */}
                {(selectedFaktur.pembayaran?.length ?? 0) > 0 && (
                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Riwayat Pembayaran</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8fafc" }}>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>No. Bukti</th>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Tanggal</th>
                            <th style={{ padding: "8px", textAlign: "right", fontSize: "12px", fontWeight: "600" }}>Jumlah</th>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Metode</th>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>Referensi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFaktur.pembayaran!.map((p) => (
                            <tr key={p.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "8px", fontWeight: "500" }}>{p.noBukti ?? "-"}</td>
                              <td style={{ padding: "8px" }}>{formatDate(p.tanggal)}</td>
                              <td style={{ padding: "8px", textAlign: "right", fontWeight: "500" }}>{formatCurrency(p.jumlah)}</td>
                              <td style={{ padding: "8px" }}>{p.metode ?? "-"}</td>
                              <td style={{ padding: "8px" }}>{p.referensi ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>
                    Detail Barang
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc" }}>
                          <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600" }}>
                            Produk
                          </th>
                          <th style={{ padding: "8px", textAlign: "center", fontSize: "12px", fontWeight: "600" }}>
                            Qty
                          </th>
                          <th style={{ padding: "8px", textAlign: "right", fontSize: "12px", fontWeight: "600" }}>
                            Harga Satuan
                          </th>
                          <th style={{ padding: "8px", textAlign: "right", fontSize: "12px", fontWeight: "600" }}>
                            Diskon
                          </th>
                          <th style={{ padding: "8px", textAlign: "right", fontSize: "12px", fontWeight: "600" }}>
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedFaktur.detailBarang.map((item: DetailBarangFaktur) => (
                          <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "8px" }}>
                              <div style={{ fontWeight: "500" }}>{item.namaProduk}</div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                {item.kodeProduk} - {item.namaUnit}
                              </div>
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>{item.qtyTerima}</td>
                            <td style={{ padding: "8px", textAlign: "right" }}>
                              {formatCurrency(item.hargaSatuan)}
                            </td>
                            <td style={{ padding: "8px", textAlign: "right" }}>
                              {formatCurrency(item.diskon)}
                            </td>
                            <td style={{ padding: "8px", textAlign: "right", fontWeight: "500" }}>
                              {formatCurrency(item.subtotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#64748b" }}>Subtotal</span>
                    <span style={{ fontSize: "14px", fontWeight: "500" }}>
                      {formatCurrency(selectedFaktur.subtotal)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#64748b" }}>Diskon Global</span>
                    <span style={{ fontSize: "14px", fontWeight: "500" }}>
                      {formatCurrency(selectedFaktur.diskonGlobal)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "14px", color: "#64748b" }}>PPN ({selectedFaktur.ppn}%)</span>
                    <span style={{ fontSize: "14px", fontWeight: "500" }}>
                      {formatCurrency(selectedFaktur.ppnAmount)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingTop: "12px",
                      borderTop: "2px solid #e2e8f0",
                      marginTop: "8px",
                    }}
                  >
                    <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>Total</span>
                    <span style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>
                      {formatCurrency(selectedFaktur.total)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Tutup
                </button>
                {selectedFaktur.statusBayar !== "Lunas" && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleUpdateStatus(selectedFaktur);
                    }}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Update Status
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Update Status Modal */}
        {showUpdateModal && selectedFaktur && (
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
              padding: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "24px",
                width: "100%",
                maxWidth: "500px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <h3 style={{ fontSize: "20px", fontWeight: "600", margin: 0 }}>
                  Update Status Pembayaran
                </h3>
                <button
                  onClick={() => setShowUpdateModal(false)}
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
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
                  No. Faktur: <strong>{selectedFaktur.nomorFaktur}</strong>
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "16px" }}>
                  Total: <strong>{formatCurrency(selectedFaktur.total)}</strong>
                </div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                  }}
                >
                  Status Pembayaran
                </label>
                <select
                  value={newStatusBayar}
                  onChange={(e) => setNewStatusBayar(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                >
                  <option value="Belum Bayar">Belum Bayar</option>
                  <option value="Sebagian">Sebagian</option>
                  <option value="Lunas">Lunas</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowUpdateModal(false)}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveStatus}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pembayaran Hutang */}
        {showPembayaranModal && selectedFaktur && (
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
              padding: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "24px",
                width: "100%",
                maxWidth: showPembayaranSuccess ? "720px" : "720px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {showPembayaranSuccess && lastSavedPayment ? (
                <>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 8px 0", color: "#059669" }}>
                    Transaksi Berhasil Disimpan
                  </h3>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                    No. Faktur: <strong style={{ color: "#1e293b" }}>{selectedFaktur.nomorFaktur}</strong>
                    {" · "}
                    {getSupplierName(selectedFaktur.supplierId)}
                  </div>
                  {/* 2 side: kiri = No. Bukti, Metode Bayar, No. Referensi; kanan = Tanggal, Jumlah Bayar, Upload Photo */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px", marginBottom: "20px", alignItems: "stretch" }}>
                    <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: "24px" }}>
                      <div style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>No. Bukti</div>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b", letterSpacing: "0.02em" }}>
                          {lastSavedPayment.noBukti}
                        </div>
                      </div>
                      <div style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Metode Bayar</div>
                        <div style={{ fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>
                          {lastSavedPayment.metode ?? "-"}
                        </div>
                      </div>
                      <div style={{ padding: "12px 0" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>No. Referensi</div>
                        <div style={{ fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>
                          {lastSavedPayment.referensi ?? "-"}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Tanggal</div>
                        <div style={{ fontSize: "15px", fontWeight: "600", color: "#1e293b" }}>
                          {formatDate(lastSavedPayment.tanggal)}
                        </div>
                      </div>
                      <div style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Jumlah Bayar</div>
                        <div style={{ fontSize: "16px", fontWeight: "700", color: "#059669" }}>
                          {formatCurrency(lastSavedPayment.jumlah)}
                        </div>
                      </div>
                      <div style={{ padding: "12px 0" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>Upload Photo</div>
                        {lastSavedPayment.metode === "Transfer" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <label
                              style={{
                                padding: "6px 14px",
                                backgroundColor: "#eff6ff",
                                color: "#2563eb",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "500",
                                cursor: "pointer",
                                border: "1px solid #bfdbfe",
                              }}
                            >
                              Pilih File
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleUploadBukti}
                                style={{ display: "none" }}
                              />
                            </label>
                            {(uploadedBuktiFileName || lastSavedPayment.buktiFileName) && (
                              <span style={{ fontSize: "13px", color: "#059669", fontWeight: "500" }}>
                                ✓ {lastSavedPayment.buktiFileName ?? uploadedBuktiFileName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "13px", color: "#94a3b8" }}>—</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={handleClosePembayaranSuccess}
                      style={{
                        padding: "10px 24px",
                        backgroundColor: "#059669",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}
                    >
                      Selesai
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 20px 0" }}>
                    Pembayaran ke Supplier
                  </h3>
                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                    <div>No. Faktur: <strong style={{ color: "#1e293b" }}>{selectedFaktur.nomorFaktur}</strong></div>
                    <div>Supplier: <strong style={{ color: "#1e293b" }}>{getSupplierName(selectedFaktur.supplierId)}</strong></div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px 16px",
                      marginBottom: "16px",
                      padding: "12px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ color: "#64748b" }}>Total Faktur</span>
                    <span style={{ fontWeight: "600", textAlign: "right" }}>{formatCurrency(selectedFaktur.total)}</span>
                    <span style={{ color: "#64748b" }}>Sudah Dibayar</span>
                    <span style={{ fontWeight: "500", textAlign: "right" }}>{formatCurrency(selectedFaktur.totalDibayar ?? 0)}</span>
                    <span style={{ color: "#64748b" }}>Sisa Hutang</span>
                    <span style={{ fontWeight: "600", color: "#dc2626", textAlign: "right" }}>{formatCurrency(getSisaHutang(selectedFaktur))}</span>
                  </div>
                  {/* Form 2 side: kiri = No. Bukti, Metode Bayar, No. Referensi; kanan = Tanggal, Jumlah Bayar, Upload Photo */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px", marginBottom: "20px", alignItems: "stretch" }}>
                    <div style={{ borderRight: "1px solid #e2e8f0", paddingRight: "24px" }}>
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>No. Bukti</label>
                        <input
                          type="text"
                          readOnly
                          placeholder="Akan tampil setelah transaksi disimpan"
                          value=""
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            fontSize: "14px",
                            backgroundColor: "#f8fafc",
                            color: "#94a3b8",
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>Metode Bayar</label>
                        <select
                          value={pembayaranMetode}
                          onChange={(e) => {
                            setPembayaranMetode(e.target.value);
                            if (e.target.value !== "Transfer") setFormBuktiFileName(null);
                          }}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}
                        >
                          <option value="Transfer">Transfer</option>
                          <option value="Tunai">Tunai</option>
                          <option value="Cek">Cek</option>
                          <option value="Giro">Giro</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>No. Referensi (opsional)</label>
                        <input
                          type="text"
                          placeholder="No. bukti transfer / cek"
                          value={pembayaranReferensi}
                          onChange={(e) => setPembayaranReferensi(e.target.value)}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}
                        />
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>Tanggal</label>
                        <input
                          type="date"
                          value={pembayaranTanggal}
                          onChange={(e) => setPembayaranTanggal(e.target.value)}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}
                        />
                      </div>
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>Jumlah Bayar (Rp)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={pembayaranJumlah}
                          onChange={(e) => setPembayaranJumlah(formatRupiahInput(e.target.value))}
                          style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>Upload Photo</label>
                        {pembayaranMetode === "Transfer" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <label
                              style={{
                                padding: "6px 14px",
                                backgroundColor: "#eff6ff",
                                color: "#2563eb",
                                borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "500",
                                cursor: "pointer",
                                border: "1px solid #bfdbfe",
                              }}
                            >
                              Pilih File
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleFormUploadBukti}
                                style={{ display: "none" }}
                              />
                            </label>
                            {formBuktiFileName && (
                              <span style={{ fontSize: "13px", color: "#059669", fontWeight: "500" }}>✓ {formBuktiFileName}</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "13px", color: "#94a3b8" }}>Pilih metode Transfer untuk upload</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setShowPembayaranModal(false)}
                      style={{ padding: "10px 20px", backgroundColor: "#f3f4f6", color: "#374151", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSavePembayaran}
                      style={{ padding: "10px 20px", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}
                    >
                      Simpan Pembayaran
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
