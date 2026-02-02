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
}

interface Product {
  id: string;
  kodeProduk: string;
  namaProduk: string;
  kategori: string;
  satuan: string;
  hargaBeli: number;
  hargaJual: number;
  stokAwal: number;
  units?: ProductUnit[];
  stokPerApotik?: { [apotikId: string]: number };
}

interface Apotik {
  id: string;
  kodeApotik: string;
  namaApotik: string;
  alamat: string;
  kota: string;
  provinsi: string;
  telepon: string;
  email: string;
  picApotik: string;
  statusAktif: boolean;
}

interface DetailOpname {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string;
  namaUnit: string;
  stokSistem: number;
  stokFisik: number;
  selisih: number;
  keterangan: string;
}

interface StokOpname {
  id: string;
  nomorOpname: string;
  tanggalOpname: string;
  apotikId: string;
  detailOpname: DetailOpname[];
  status: string; // "Draft" | "Selesai"
  createdAt: string;
  operator?: string;
  updatedAt?: string;
}

export default function StokOpnamePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [opnameList, setOpnameList] = useState<StokOpname[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [selectedApotikId, setSelectedApotikId] = useState<string>("");
  const [formData, setFormData] = useState({
    tanggalOpname: new Date().toISOString().split("T")[0],
  });
  const [detailOpname, setDetailOpname] = useState<DetailOpname[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [editingOpname, setEditingOpname] = useState<StokOpname | null>(null);
  const [viewingOpname, setViewingOpname] = useState<StokOpname | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loading, setLoading] = useState(false);
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
      const so = localStorage.getItem("stokOpname"); if (so) try { setOpnameList(JSON.parse(so)); } catch (_) {}
      const sp = localStorage.getItem("products"); if (sp) try { setProducts(JSON.parse(sp)); } catch (_) {}
      const sa = localStorage.getItem("apotiks"); if (sa) try { setApotiks(JSON.parse(sa).filter((a: Apotik) => a.statusAktif)); } catch (_) {}
    }
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token || cancelled) { loadFromLocalStorage(); return; }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/stokOpname", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/products", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/apotiks", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      ]).then(([opnameData, productsData, apotiksData]) => {
        if (cancelled) return;
        if (Array.isArray(opnameData) && opnameData.length > 0) { setOpnameList(opnameData); localStorage.setItem("stokOpname", JSON.stringify(opnameData)); }
        else { const so = localStorage.getItem("stokOpname"); if (so) try { setOpnameList(JSON.parse(so)); } catch (_) {} }
        if (Array.isArray(productsData) && productsData.length > 0) { setProducts(productsData); localStorage.setItem("products", JSON.stringify(productsData)); }
        else { const sp = localStorage.getItem("products"); if (sp) try { setProducts(JSON.parse(sp)); } catch (_) {} }
        if (Array.isArray(apotiksData) && apotiksData.length > 0) { setApotiks(apotiksData.filter((a: Apotik) => a.statusAktif)); localStorage.setItem("apotiks", JSON.stringify(apotiksData)); }
        else { const sa = localStorage.getItem("apotiks"); if (sa) try { setApotiks(JSON.parse(sa).filter((a: Apotik) => a.statusAktif)); } catch (_) {} }
        if (!cancelled) setIsLoadingData(false);
      }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    return () => { cancelled = true; };
  }, []);

  // Sync stokOpname to API (guard: jangan POST saat initial load agar tidak menimpa data server)
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/stokOpname", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: opnameList }) }).catch(() => {});
      }
    });
  }, [opnameList, isLoadingData]);

  const getTodayDateInput = () => {
    return new Date().toISOString().split("T")[0];
  };

  const generateNomorOpname = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const savedOpname = localStorage.getItem("stokOpname");
    const opnameList = savedOpname ? JSON.parse(savedOpname) : [];
    const sequence = String(opnameList.length + 1).padStart(4, "0");
    return `OPN-${year}${month}-${sequence}`;
  };

  const getAvailableStock = (product: Product, apotikId: string): number => {
    if (product.stokPerApotik && apotikId) {
      return product.stokPerApotik[apotikId] || 0;
    }
    return product.stokAwal || 0;
  };

  const getProductUnits = (product: Product): ProductUnit[] => {
    if (product.units && product.units.length > 0) {
      return product.units;
    }
    return [
      {
        id: "default",
        namaUnit: product.satuan,
        hargaBeli: product.hargaBeli,
        hargaJual: product.hargaJual,
        konversi: 1,
        isBaseUnit: true,
      },
    ];
  };

  const filteredProducts = products.filter(
    (product) =>
      product.namaProduk.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.kodeProduk.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setFormData({
      tanggalOpname: getTodayDateInput(),
    });
    setDetailOpname([]);
    setSelectedApotikId("");
    setEditingOpname(null);
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      tanggalOpname: getTodayDateInput(),
    });
    setDetailOpname([]);
    setSelectedApotikId("");
    setEditingOpname(null);
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const handleProductSelect = (product: Product) => {
    if (!selectedApotikId) {
      alert("Pilih apotik terlebih dahulu");
      return;
    }

    const units = getProductUnits(product);
    const defaultUnit = units.find((u) => u.isBaseUnit) || units[0];
    const stokSistem = getAvailableStock(product, selectedApotikId);
    const unit = units.find((u) => u.id === defaultUnit.id);
    const stokSistemInUnit = unit ? Math.floor(stokSistem / unit.konversi) : stokSistem;

    const newDetail: DetailOpname = {
      id: Date.now().toString(),
      produkId: product.id,
      kodeProduk: product.kodeProduk,
      namaProduk: product.namaProduk,
      unitId: defaultUnit.id,
      namaUnit: defaultUnit.namaUnit,
      stokSistem: stokSistemInUnit,
      stokFisik: stokSistemInUnit,
      selisih: 0,
      keterangan: "",
    };

    setDetailOpname([...detailOpname, newDetail]);
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const handleLoadAllProducts = () => {
    if (!selectedApotikId) {
      alert("Pilih apotik terlebih dahulu");
      return;
    }

    // Ambil semua produk yang ada stoknya di apotik yang dipilih
    const productsWithStock = products.filter((product) => {
      const stok = getAvailableStock(product, selectedApotikId);
      return stok > 0;
    });

    if (productsWithStock.length === 0) {
      alert("Tidak ada produk dengan stok di apotik ini");
      return;
    }

    // Buat detail opname untuk semua produk
    const newDetails: DetailOpname[] = productsWithStock.map((product, index) => {
      const units = getProductUnits(product);
      const defaultUnit = units.find((u) => u.isBaseUnit) || units[0];
      const stokSistem = getAvailableStock(product, selectedApotikId);
      const unit = units.find((u) => u.id === defaultUnit.id);
      const stokSistemInUnit = unit ? Math.floor(stokSistem / unit.konversi) : stokSistem;

      return {
        id: `${product.id}-${Date.now()}-${index}`,
        produkId: product.id,
        kodeProduk: product.kodeProduk,
        namaProduk: product.namaProduk,
        unitId: defaultUnit.id,
        namaUnit: defaultUnit.namaUnit,
        stokSistem: stokSistemInUnit,
        stokFisik: stokSistemInUnit,
        selisih: 0,
        keterangan: "",
      };
    });

    setDetailOpname(newDetails);
    alert(`${newDetails.length} produk berhasil dimuat`);
  };

  const handleDetailChange = (
    id: string,
    field: keyof DetailOpname,
    value: any
  ) => {
    setDetailOpname(
      detailOpname.map((detail) => {
        if (detail.id === id) {
          const updated = { ...detail, [field]: value };
          if (field === "stokFisik") {
            updated.selisih = updated.stokFisik - updated.stokSistem;
          }
          return updated;
        }
        return detail;
      })
    );
  };

  const handleRemoveDetail = (id: string) => {
    setDetailOpname(detailOpname.filter((detail) => detail.id !== id));
  };

  const handleSubmit = async () => {
    if (!selectedApotikId) {
      alert("Pilih apotik terlebih dahulu");
      return;
    }

    if (detailOpname.length === 0) {
      alert("Tambahkan produk terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      const nomorOpname = editingOpname
        ? editingOpname.nomorOpname
        : generateNomorOpname();

      const userEmail = currentUserEmail || "System";
      const now = new Date().toISOString();
      
      const opnameData: StokOpname = {
        id: editingOpname ? editingOpname.id : Date.now().toString(),
        nomorOpname,
        tanggalOpname: formData.tanggalOpname,
        apotikId: selectedApotikId,
        detailOpname,
        status: "Draft",
        createdAt: editingOpname
          ? editingOpname.createdAt
          : now,
        operator: editingOpname ? (editingOpname.operator || userEmail) : userEmail,
        updatedAt: now,
      };

      const savedOpname = localStorage.getItem("stokOpname");
      const opnameList = savedOpname ? JSON.parse(savedOpname) : [];

      if (editingOpname) {
        const updatedList = opnameList.map((o: StokOpname) =>
          o.id === editingOpname.id ? opnameData : o
        );
        localStorage.setItem("stokOpname", JSON.stringify(updatedList));
        setOpnameList(updatedList);
      } else {
        opnameList.push(opnameData);
        localStorage.setItem("stokOpname", JSON.stringify(opnameList));
        setOpnameList(opnameList);
      }

      alert(`Stok opname berhasil ${editingOpname ? "diupdate" : "disimpan"}!`);
      handleCloseModal();
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan stok opname.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpname = (opname: StokOpname) => {
    if (opname.status === "Selesai") {
      alert("Stok opname yang sudah selesai tidak dapat diedit");
      return;
    }
    setEditingOpname(opname);
    setSelectedApotikId(opname.apotikId);
    setFormData({
      tanggalOpname: opname.tanggalOpname,
    });
    
    // Recalculate stok sistem dari stok terbaru di sistem
    const updatedDetailOpname = opname.detailOpname.map((detail) => {
      const product = products.find((p) => p.id === detail.produkId);
      if (product) {
        const units = getProductUnits(product);
        const currentUnit = units.find((u) => u.id === detail.unitId) || units[0];
        const stokSistem = getAvailableStock(product, opname.apotikId);
        const stokSistemInUnit = currentUnit ? Math.floor(stokSistem / currentUnit.konversi) : stokSistem;
        
        return {
          ...detail,
          stokSistem: stokSistemInUnit,
          selisih: detail.stokFisik - stokSistemInUnit,
        };
      }
      return detail;
    });
    
    setDetailOpname(updatedDetailOpname);
    setIsModalOpen(true);
  };

  const handleViewOpname = (opname: StokOpname) => {
    setViewingOpname(opname);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingOpname(null);
  };

  const handleSelesaiOpname = (opname: StokOpname) => {
    if (confirm("Apakah Anda yakin ingin menyelesaikan stok opname ini?")) {
      const updatedList = opnameList.map((o) =>
        o.id === opname.id ? { ...o, status: "Selesai" } : o
      );
      localStorage.setItem("stokOpname", JSON.stringify(updatedList));
      setOpnameList(updatedList);
      alert("Stok opname berhasil diselesaikan!");
    }
  };

  const handleDeleteOpname = (opname: StokOpname) => {
    if (opname.status === "Selesai") {
      alert("Stok opname yang sudah selesai tidak dapat dihapus");
      return;
    }
    if (confirm("Apakah Anda yakin ingin menghapus stok opname ini?")) {
      const updatedList = opnameList.filter((o) => o.id !== opname.id);
      localStorage.setItem("stokOpname", JSON.stringify(updatedList));
      setOpnameList(updatedList);
      alert("Stok opname berhasil dihapus!");
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getApotikName = (apotikId: string): string => {
    const apotik = apotiks.find((a) => a.id === apotikId);
    return apotik ? apotik.namaApotik : "-";
  };

  return (
    <DashboardLayout>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <button
            onClick={handleOpenModal}
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
            + Buat Stok Opname
          </button>
        </div>

        {/* Table */}
        {opnameList.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "40px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            Belum ada stok opname. Klik tombol "Buat Stok Opname" untuk membuat baru.
          </div>
        ) : (
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
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    No. Opname
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Tanggal
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Apotik
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Jumlah Item
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Operator
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Last Update
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                      width: "150px",
                    }}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {opnameList.map((opname) => (
                  <tr
                    key={opname.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        fontWeight: "500",
                        color: "#1e293b",
                      }}
                    >
                      {opname.nomorOpname}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {formatDate(opname.tanggalOpname)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {getApotikName(opname.apotikId)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {opname.detailOpname.length} item
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                      }}
                    >
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor:
                            opname.status === "Selesai"
                              ? "#d1fae5"
                              : "#fef3c7",
                          color:
                            opname.status === "Selesai"
                              ? "#065f46"
                              : "#92400e",
                        }}
                      >
                        {opname.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {opname.operator || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {opname.updatedAt 
                        ? new Date(opname.updatedAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : opname.createdAt
                        ? new Date(opname.createdAt).toLocaleDateString("id-ID", {
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
                        padding: "12px 16px",
                        fontSize: "13px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          onClick={() => handleViewOpname(opname)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Lihat Detail"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ color: "#3b82f6" }}
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        {opname.status === "Draft" && (
                          <>
                            <button
                              onClick={() => handleEditOpname(opname)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="Edit"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ color: "#64748b" }}
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleSelesaiOpname(opname)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="Selesai"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ color: "#10b981" }}
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteOpname(opname)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="Hapus"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ color: "#ef4444" }}
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Form */}
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
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "24px",
                width: "90%",
                maxWidth: "900px",
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
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    margin: 0,
                    color: "#1e293b",
                  }}
                >
                  {editingOpname ? "Edit Stok Opname" : "Buat Stok Opname"}
                </h2>
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
                  }}
                >
                  ×
                </button>
              </div>

              {/* Form Fields */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Tanggal Opname <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.tanggalOpname}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggalOpname: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Apotik <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    value={selectedApotikId}
                    onChange={(e) => {
                      setSelectedApotikId(e.target.value);
                      setDetailOpname([]);
                      setProductSearch("");
                      setShowProductDropdown(false);
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="">Pilih Apotik</option>
                    {apotiks.map((apotik) => (
                      <option key={apotik.id} value={apotik.id}>
                        {apotik.namaApotik}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Load All Products Button */}
              {selectedApotikId && detailOpname.length === 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <button
                    type="button"
                    onClick={handleLoadAllProducts}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      backgroundColor: "#3b82f6",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#2563eb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#3b82f6";
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Muat Semua Produk dengan Stok
                  </button>
                </div>
              )}

              {/* Product Search (Optional - untuk menambah produk secara manual) */}
              {selectedApotikId && detailOpname.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Tambah Produk (Opsional)
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Ketik nama atau kode produk..."
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "13px",
                      }}
                    />
                    {showProductDropdown &&
                      productSearch &&
                      filteredProducts.length > 0 && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            backgroundColor: "#ffffff",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            marginTop: "4px",
                            maxHeight: "300px",
                            overflowY: "auto",
                            zIndex: 1000,
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          }}
                        >
                          {filteredProducts
                            .filter(
                              (p) =>
                                !detailOpname.some((d) => d.produkId === p.id)
                            )
                            .map((product) => {
                              const availableStock = getAvailableStock(
                                product,
                                selectedApotikId
                              );
                              return (
                                <div
                                  key={product.id}
                                  onClick={() => handleProductSelect(product)}
                                  style={{
                                    padding: "12px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid #f1f5f9",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "#f8fafc";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: "500" }}>
                                      {product.namaProduk}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "12px",
                                        color: "#64748b",
                                      }}
                                    >
                                      {product.kodeProduk} | Stok: {availableStock}{" "}
                                      {product.satuan}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Detail Opname Table */}
              {detailOpname.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      marginBottom: "12px",
                    }}
                  >
                    Detail Opname
                  </h3>
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
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
                        <tr style={{ backgroundColor: "#f8fafc" }}>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "10px 12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Produk
                          </th>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "10px 12px",
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
                              textAlign: "center",
                              padding: "10px 12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Stok Sistem
                          </th>
                          <th
                            style={{
                              textAlign: "center",
                              padding: "10px 12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Stok Fisik
                          </th>
                          <th
                            style={{
                              textAlign: "center",
                              padding: "10px 12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Selisih
                          </th>
                          <th
                            style={{
                              textAlign: "left",
                              padding: "10px 12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Keterangan
                          </th>
                          <th
                            style={{
                              textAlign: "center",
                              padding: "10px 12px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              borderBottom: "1px solid #e2e8f0",
                              width: "50px",
                            }}
                          >
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOpname.map((detail) => {
                          const product = products.find(
                            (p) => p.id === detail.produkId
                          );
                          const units = product
                            ? getProductUnits(product)
                            : [];

                          return (
                            <tr key={detail.id}>
                              <td
                                style={{
                                  padding: "10px 12px",
                                  fontSize: "12px",
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>
                                  {detail.namaProduk}
                                </div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#64748b",
                                  }}
                                >
                                  {detail.kodeProduk}
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: "10px 12px",
                                  fontSize: "12px",
                                }}
                              >
                                <select
                                  value={detail.unitId || "default"}
                                  onChange={(e) => {
                                    const unit = units.find(
                                      (u) => u.id === e.target.value
                                    );
                                    if (unit && product) {
                                      // Ambil stok sistem terbaru dari sistem
                                      const stokSistem = getAvailableStock(
                                        product,
                                        selectedApotikId
                                      );
                                      const stokSistemInUnit = Math.floor(
                                        stokSistem / unit.konversi
                                      );
                                      handleDetailChange(
                                        detail.id,
                                        "unitId",
                                        e.target.value
                                      );
                                      handleDetailChange(
                                        detail.id,
                                        "namaUnit",
                                        unit.namaUnit
                                      );
                                      handleDetailChange(
                                        detail.id,
                                        "stokSistem",
                                        stokSistemInUnit
                                      );
                                      // Stok fisik tetap, hanya update selisih
                                      handleDetailChange(
                                        detail.id,
                                        "stokFisik",
                                        detail.stokFisik
                                      );
                                    }
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "5px 6px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                  }}
                                >
                                  {units.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                      {unit.namaUnit}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td
                                style={{
                                  padding: "10px 12px",
                                  fontSize: "12px",
                                  textAlign: "center",
                                }}
                              >
                                {detail.stokSistem}
                              </td>
                              <td
                                style={{
                                  padding: "10px 12px",
                                  fontSize: "12px",
                                }}
                              >
                                <input
                                  type="number"
                                  value={detail.stokFisik}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      detail.id,
                                      "stokFisik",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    padding: "5px 6px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    textAlign: "center",
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  padding: "10px 12px",
                                  fontSize: "12px",
                                  textAlign: "center",
                                  fontWeight: "500",
                                  color:
                                    detail.selisih > 0
                                      ? "#10b981"
                                      : detail.selisih < 0
                                      ? "#ef4444"
                                      : "#64748b",
                                }}
                              >
                                {detail.selisih > 0 ? "+" : ""}
                                {detail.selisih}
                              </td>
                              <td
                                style={{
                                  padding: "10px 12px",
                                  fontSize: "12px",
                                }}
                              >
                                <input
                                  type="text"
                                  value={detail.keterangan}
                                  onChange={(e) =>
                                    handleDetailChange(
                                      detail.id,
                                      "keterangan",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Keterangan..."
                                  style={{
                                    width: "100%",
                                    padding: "5px 6px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  padding: "10px 12px",
                                  textAlign: "center",
                                }}
                              >
                                <button
                                  onClick={() => handleRemoveDetail(detail.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    fontSize: "18px",
                                    padding: "0 4px",
                                  }}
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={loading}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "6px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !selectedApotikId || detailOpname.length === 0}
                  style={{
                    padding: "10px 20px",
                    backgroundColor:
                      loading || !selectedApotikId || detailOpname.length === 0
                        ? "#9ca3af"
                        : "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor:
                      loading || !selectedApotikId || detailOpname.length === 0
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && viewingOpname && (
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
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "24px",
                width: "90%",
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
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    margin: 0,
                    color: "#1e293b",
                  }}
                >
                  Detail Stok Opname
                </h2>
                <button
                  onClick={handleCloseViewModal}
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
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "#64748b" }}>No. Opname:</span>
                  <span style={{ fontWeight: "500" }}>
                    {viewingOpname.nomorOpname}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Tanggal:</span>
                  <span>{formatDate(viewingOpname.tanggalOpname)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Apotik:</span>
                  <span>{getApotikName(viewingOpname.apotikId)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "#64748b" }}>Status:</span>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "500",
                      backgroundColor:
                        viewingOpname.status === "Selesai"
                          ? "#d1fae5"
                          : "#fef3c7",
                      color:
                        viewingOpname.status === "Selesai"
                          ? "#065f46"
                          : "#92400e",
                    }}
                  >
                    {viewingOpname.status}
                  </span>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid #e2e8f0",
                  borderBottom: "1px solid #e2e8f0",
                  padding: "16px 0",
                  marginBottom: "20px",
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    marginBottom: "12px",
                  }}
                >
                  Detail Opname
                </h3>
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
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
                      <tr style={{ backgroundColor: "#f8fafc" }}>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#475569",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Produk
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
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
                            textAlign: "center",
                            padding: "10px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#475569",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Stok Sistem
                        </th>
                        <th
                          style={{
                            textAlign: "center",
                            padding: "10px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#475569",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Stok Fisik
                        </th>
                        <th
                          style={{
                            textAlign: "center",
                            padding: "10px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#475569",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Selisih
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#475569",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Keterangan
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingOpname.detailOpname.map((detail, index) => (
                        <tr key={index}>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "12px",
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>
                              {detail.namaProduk}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#64748b",
                              }}
                            >
                              {detail.kodeProduk}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "12px",
                            }}
                          >
                            {detail.namaUnit}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {detail.stokSistem}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "12px",
                              textAlign: "center",
                            }}
                          >
                            {detail.stokFisik}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "12px",
                              textAlign: "center",
                              fontWeight: "500",
                              color:
                                detail.selisih > 0
                                  ? "#10b981"
                                  : detail.selisih < 0
                                  ? "#ef4444"
                                  : "#64748b",
                            }}
                          >
                            {detail.selisih > 0 ? "+" : ""}
                            {detail.selisih}
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: "12px",
                              color: "#64748b",
                            }}
                          >
                            {detail.keterangan || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={handleCloseViewModal}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

