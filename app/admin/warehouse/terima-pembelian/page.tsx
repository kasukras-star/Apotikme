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

interface DetailBarangPO {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string;
  namaUnit: string;
  qty: number; // Qty yang dipesan
  satuan: string;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
}

interface DetailBarangTerima {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string;
  namaUnit: string;
  qtyPesan: number; // Qty yang dipesan di PO
  qtyTerima: number; // Qty yang diterima
  satuan: string;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
}

interface PesananPembelian {
  id: string;
  nomorPesanan: string;
  tanggalPesanan: string;
  tanggalDibutuhkan: string;
  supplierId: string;
  tujuanPengirimanId?: string; // ID apotik tujuan pengiriman
  deskripsi: string;
  jangkaWaktuPembayaran: string;
  picPembelian: string;
  diskonGlobal: number;
  ppn: number;
  keterangan: string;
  detailBarang: DetailBarangPO[];
  statusKirim?: string;
  subtotal: number;
  diskonAmount: number;
  ppnAmount: number;
  total: number;
}

interface Supplier {
  id: string;
  kodeSupplier: string;
  namaSupplier: string;
}

interface Product {
  id: string;
  kodeProduk: string;
  namaProduk: string;
  satuan: string;
  hargaBeli: number;
  units?: ProductUnit[];
  stokAwal: number;
  stokPerApotik?: { [apotikId: string]: number }; // Stok per apotik
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
  tujuanPengirimanId?: string; // ID apotik tujuan pengiriman
  createdAt: string;
  operator?: string;
  updatedAt?: string;
}

export default function TerimaPembelianPage() {
  const [activeTab, setActiveTab] = useState<"po" | "penerimaan">("po");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pesananList, setPesananList] = useState<PesananPembelian[]>([]);
  const [penerimaanList, setPenerimaanList] = useState<PenerimaanPembelian[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [apotiks, setApotiks] = useState<any[]>([]);
  const [selectedPesanan, setSelectedPesanan] = useState<PesananPembelian | null>(null);
  const [editingPenerimaan, setEditingPenerimaan] = useState<PenerimaanPembelian | null>(null);
  const [viewingPenerimaan, setViewingPenerimaan] = useState<PenerimaanPembelian | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPengajuanModalOpen, setIsPengajuanModalOpen] = useState(false);
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [pengajuanData, setPengajuanData] = useState({
    jenisPengajuan: "",
    alasanPengajuan: "",
  });
  const [formData, setFormData] = useState<{
    nomorPenerimaan: string;
    nomorSuratJalan: string;
    tanggalPenerimaan: string;
    pesananId: string;
    detailBarang: DetailBarangTerima[];
  }>({
    nomorPenerimaan: "",
    nomorSuratJalan: "",
    tanggalPenerimaan: "",
    pesananId: "",
    detailBarang: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Get today in yyyy-mm-dd format for date input
  const getTodayDateInput = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    let cancelled = false;
    function loadFromLocalStorage() {
      const spe = localStorage.getItem("pesananPembelian"); if (spe) try { setPesananList(JSON.parse(spe)); } catch (_) {}
      const sp = localStorage.getItem("penerimaanPembelian"); if (sp) try { setPenerimaanList(JSON.parse(sp)); } catch (_) {}
      const ss = localStorage.getItem("suppliers"); if (ss) try { setSuppliers(JSON.parse(ss)); } catch (_) {}
      const spr = localStorage.getItem("products"); if (spr) try { setProducts(JSON.parse(spr)); } catch (_) {}
      const sa = localStorage.getItem("apotiks"); if (sa) try { setApotiks(JSON.parse(sa).filter((a: any) => a.statusAktif)); } catch (_) {}
      const spg = localStorage.getItem("pengajuanPenerimaanPembelian"); if (spg) try { setPengajuanList(JSON.parse(spg)); } catch (_) {}
    }
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token || cancelled) { loadFromLocalStorage(); return; }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/pesananPembelian", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/penerimaanPembelian", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/suppliers", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/products", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/apotiks", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/pengajuanPenerimaanPembelian", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      ]).then(([pesananData, penerimaanData, suppliersData, productsData, apotiksData, pengajuanData]) => {
        if (cancelled) return;
        if (Array.isArray(pesananData) && pesananData.length > 0) { setPesananList(pesananData); localStorage.setItem("pesananPembelian", JSON.stringify(pesananData)); }
        else { const spe = localStorage.getItem("pesananPembelian"); if (spe) try { setPesananList(JSON.parse(spe)); } catch (_) {} }
        if (Array.isArray(penerimaanData) && penerimaanData.length > 0) { setPenerimaanList(penerimaanData); localStorage.setItem("penerimaanPembelian", JSON.stringify(penerimaanData)); }
        else { const sp = localStorage.getItem("penerimaanPembelian"); if (sp) try { setPenerimaanList(JSON.parse(sp)); } catch (_) {} }
        if (Array.isArray(suppliersData) && suppliersData.length > 0) { setSuppliers(suppliersData); localStorage.setItem("suppliers", JSON.stringify(suppliersData)); }
        else { const ss = localStorage.getItem("suppliers"); if (ss) try { setSuppliers(JSON.parse(ss)); } catch (_) {} }
        if (Array.isArray(productsData) && productsData.length > 0) { setProducts(productsData); localStorage.setItem("products", JSON.stringify(productsData)); }
        else { const spr = localStorage.getItem("products"); if (spr) try { setProducts(JSON.parse(spr)); } catch (_) {} }
        if (Array.isArray(apotiksData) && apotiksData.length > 0) { setApotiks(apotiksData.filter((a: any) => a.statusAktif)); localStorage.setItem("apotiks", JSON.stringify(apotiksData)); }
        else { const sa = localStorage.getItem("apotiks"); if (sa) try { setApotiks(JSON.parse(sa).filter((a: any) => a.statusAktif)); } catch (_) {} }
        if (Array.isArray(pengajuanData) && pengajuanData.length > 0) { setPengajuanList(pengajuanData); localStorage.setItem("pengajuanPenerimaanPembelian", JSON.stringify(pengajuanData)); }
        else { const spg = localStorage.getItem("pengajuanPenerimaanPembelian"); if (spg) try { setPengajuanList(JSON.parse(spg)); } catch (_) {} }
        if (!cancelled) setIsLoadingData(false);
      }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    return () => { cancelled = true; };
  }, []);

  // Sync penerimaanPembelian and pengajuanPenerimaanPembelian to API (guard: jangan POST saat initial load)
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/penerimaanPembelian", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: penerimaanList }) }).catch(() => {});
      }
    });
  }, [penerimaanList, isLoadingData]);
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/pengajuanPenerimaanPembelian", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: pengajuanList }) }).catch(() => {});
      }
    });
  }, [pengajuanList, isLoadingData]);

  useEffect(() => {
    // Fix existing penerimaan yang belum memiliki tujuanPengirimanId
    // dan update stok ke apotik yang benar berdasarkan PO
    const fixExistingPenerimaan = () => {
      const savedPenerimaan = localStorage.getItem("penerimaanPembelian");
      const savedPesanan = localStorage.getItem("pesananPembelian");
      const savedProducts = localStorage.getItem("products");
      
      if (!savedPenerimaan || !savedPesanan || !savedProducts) return;
      
      try {
        const penerimaanList = JSON.parse(savedPenerimaan);
        const pesananList = JSON.parse(savedPesanan);
        const products = JSON.parse(savedProducts);
        let needsUpdate = false;
        
        penerimaanList.forEach((penerimaan: PenerimaanPembelian) => {
          const pesanan = pesananList.find((p: PesananPembelian) => p.id === penerimaan.pesananId);
          if (pesanan && pesanan.tujuanPengirimanId) {
            // Update tujuanPengirimanId dari PO jika belum ada atau berbeda
            if (!penerimaan.tujuanPengirimanId || penerimaan.tujuanPengirimanId !== pesanan.tujuanPengirimanId) {
              penerimaan.tujuanPengirimanId = pesanan.tujuanPengirimanId;
              needsUpdate = true;
              
              // Update stok ke apotik yang benar
              const apotikId = pesanan.tujuanPengirimanId;
              penerimaan.detailBarang.forEach((detail: DetailBarangTerima) => {
                const product = products.find((p: Product) => p.id === detail.produkId);
                if (product && apotikId) {
                  let qtyInPieces = detail.qtyTerima;
                  if (product.units && product.units.length > 0) {
                    const unit = product.units.find((u: ProductUnit) => u.id === detail.unitId);
                    if (unit) {
                      qtyInPieces = detail.qtyTerima * unit.konversi;
                    }
                  }
                  
                  const currentStokPerApotik = product.stokPerApotik || {};
                  const currentStok = currentStokPerApotik[apotikId] || 0;
                  
                  product.stokPerApotik = {
                    ...currentStokPerApotik,
                    [apotikId]: currentStok + qtyInPieces,
                  };
                }
              });
            }
          }
        });
        
        if (needsUpdate) {
          localStorage.setItem("penerimaanPembelian", JSON.stringify(penerimaanList));
          localStorage.setItem("products", JSON.stringify(products));
          console.log("Penerimaan yang sudah ada telah diperbaiki dengan tujuanPengirimanId dari PO");
          // Reload state
          setPenerimaanList(penerimaanList);
          setProducts(products);
        }
      } catch (err) {
        console.error("Error fixing existing penerimaan:", err);
      }
    };
    
    // Run fix setelah semua data dimuat
    setTimeout(() => {
      fixExistingPenerimaan();
    }, 500);
  }, []);

  // Check if there's edit parameter in URL (from persetujuan pengajuan)
  useEffect(() => {
    if (typeof window !== "undefined" && penerimaanList.length > 0 && !editingPenerimaan) {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get("edit");
      if (editId) {
        const penerimaanToEdit = penerimaanList.find((p) => p.id === editId);
        if (penerimaanToEdit) {
          handleEditPenerimaan(penerimaanToEdit);
          // Clean URL
          window.history.replaceState({}, "", "/admin/warehouse/terima-pembelian");
        }
      }
    }
  }, [penerimaanList]);

  // Generate nomor penerimaan
  useEffect(() => {
    if (isModalOpen && !formData.nomorPenerimaan) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const count = penerimaanList.length + 1;
      setFormData((prev) => ({
        ...prev,
        nomorPenerimaan: `TR-${year}${month}-${String(count).padStart(4, "0")}`,
        tanggalPenerimaan: getTodayDateInput(),
      }));
    }
  }, [isModalOpen, penerimaanList.length]);

  const handleOpenModal = (pesanan: PesananPembelian) => {
    setSelectedPesanan(pesanan);
    setError(null);
    
    // Convert detail barang PO ke detail barang terima
    const detailBarangTerima: DetailBarangTerima[] = pesanan.detailBarang.map((item) => ({
      id: Date.now().toString() + Math.random(),
      produkId: item.produkId,
      kodeProduk: item.kodeProduk,
      namaProduk: item.namaProduk,
      unitId: item.unitId,
      namaUnit: item.namaUnit,
      qtyPesan: item.qty,
      qtyTerima: item.qty, // Default sama dengan qty pesan
      satuan: item.satuan,
      hargaSatuan: item.hargaSatuan,
      diskon: item.diskon,
      subtotal: item.subtotal,
    }));

    setFormData({
      nomorPenerimaan: "",
      nomorSuratJalan: "",
      tanggalPenerimaan: getTodayDateInput(),
      pesananId: pesanan.id,
      detailBarang: detailBarangTerima,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPesanan(null);
    setEditingPenerimaan(null);
    setError(null);
    setFormData({
      nomorPenerimaan: "",
      nomorSuratJalan: "",
      tanggalPenerimaan: "",
      pesananId: "",
      detailBarang: [],
    });
  };

  const handleEditPenerimaan = (penerimaan: PenerimaanPembelian) => {
    const pesanan = pesananList.find((p) => p.id === penerimaan.pesananId);
    if (!pesanan) return;

    setEditingPenerimaan(penerimaan);
    setSelectedPesanan(pesanan);
    setFormData({
      nomorPenerimaan: penerimaan.nomorPenerimaan,
      nomorSuratJalan: penerimaan.nomorSuratJalan,
      tanggalPenerimaan: penerimaan.tanggalPenerimaan,
      pesananId: penerimaan.pesananId,
      detailBarang: penerimaan.detailBarang,
    });
    setIsModalOpen(true);
    setError(null);
  };

  const handleViewPenerimaan = (penerimaan: PenerimaanPembelian) => {
    setViewingPenerimaan(penerimaan);
    setIsViewModalOpen(true);
  };

  const handleOpenPengajuanModal = () => {
    setIsPengajuanModalOpen(true);
    setPengajuanData({
      jenisPengajuan: "",
      alasanPengajuan: "",
    });
  };

  const handleClosePengajuanModal = () => {
    setIsPengajuanModalOpen(false);
    setPengajuanData({
      jenisPengajuan: "",
      alasanPengajuan: "",
    });
  };

  const handleSubmitPengajuan = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pengajuanData.jenisPengajuan) {
      alert("Jenis pengajuan harus dipilih");
      return;
    }

    if (!pengajuanData.alasanPengajuan.trim()) {
      alert("Alasan pengajuan harus diisi");
      return;
    }

    if (!editingPenerimaan) {
      alert("Tidak ada penerimaan yang sedang diedit");
      return;
    }

    const newPengajuan = {
      id: Date.now().toString(),
      penerimaanId: editingPenerimaan.id,
      nomorPenerimaan: editingPenerimaan.nomorPenerimaan,
      jenisPengajuan: pengajuanData.jenisPengajuan,
      alasanPengajuan: pengajuanData.alasanPengajuan,
      status: "Menunggu Persetujuan",
      createdAt: new Date().toISOString(),
      disetujuiPada: undefined,
      ditolakPada: undefined,
      alasanTolak: undefined,
      menuSystem: "Warehouse",
      isNew: true, // Flag untuk notifikasi baru
    };

    const updatedPengajuanList = [...pengajuanList, newPengajuan];
    localStorage.setItem("pengajuanPenerimaanPembelian", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);

    handleClosePengajuanModal();
    alert("Pengajuan perubahan berhasil dikirim!");
  };

  const handleBatalPengajuan = () => {
    const approvedPengajuan = pengajuanList.find(
      (p) => p.penerimaanId === editingPenerimaan?.id && p.status === "Disetujui"
    );
    if (!approvedPengajuan) return;

    if (confirm("Apakah Anda yakin ingin membatalkan pengajuan ini?")) {
      const updatedPengajuanList = pengajuanList.filter((p) => p.id !== approvedPengajuan.id);
      localStorage.setItem("pengajuanPenerimaanPembelian", JSON.stringify(updatedPengajuanList));
      setPengajuanList(updatedPengajuanList);
      alert("Pengajuan berhasil dibatalkan!");
    }
  };

  const handleHapusPenerimaan = () => {
    if (!editingPenerimaan) return;

    const approvedPengajuan = pengajuanList.find(
      (p) => p.penerimaanId === editingPenerimaan.id && p.status === "Disetujui"
    );
    if (!approvedPengajuan) return;

    if (confirm(`Apakah Anda yakin ingin menghapus penerimaan ${editingPenerimaan.nomorPenerimaan}?`)) {
      // Revert stock changes from apotik
      const apotikId = editingPenerimaan.tujuanPengirimanId;
      const updatedProducts = products.map((product) => {
        const detailTerima = editingPenerimaan.detailBarang.find((d) => d.produkId === product.id);
        if (detailTerima && apotikId) {
          let qtyInPieces = detailTerima.qtyTerima;
          if (product.units && product.units.length > 0) {
            const unit = product.units.find((u) => u.id === detailTerima.unitId);
            if (unit) {
              qtyInPieces = detailTerima.qtyTerima * unit.konversi;
            }
          }
          // Revert from stokPerApotik
          const currentStokPerApotik = product.stokPerApotik || {};
          const currentStok = currentStokPerApotik[apotikId] || 0;
          return {
            ...product,
            stokPerApotik: {
              ...currentStokPerApotik,
              [apotikId]: Math.max(0, currentStok - qtyInPieces),
            },
          };
        }
        return product;
      });
      localStorage.setItem("products", JSON.stringify(updatedProducts));
      setProducts(updatedProducts);

      // Delete penerimaan
      const updatedPenerimaanList = penerimaanList.filter((p) => p.id !== editingPenerimaan.id);
      localStorage.setItem("penerimaanPembelian", JSON.stringify(updatedPenerimaanList));
      setPenerimaanList(updatedPenerimaanList);

      // Update pengajuan status
      const updatedPengajuanList = pengajuanList.map((p) =>
        p.id === approvedPengajuan.id
          ? { ...p, status: "Selesai", selesaiPada: new Date().toISOString() }
          : p
      );
      localStorage.setItem("pengajuanPenerimaanPembelian", JSON.stringify(updatedPengajuanList));
      setPengajuanList(updatedPengajuanList);

      alert("Penerimaan berhasil dihapus!");
      handleCloseModal();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDetailChange = (
    id: string,
    field: keyof DetailBarangTerima,
    value: string | number
  ) => {
    setFormData((prev) => {
      const updatedDetails = prev.detailBarang.map((detail) => {
        if (detail.id === id) {
          return { ...detail, [field]: value };
        }
        return detail;
      });
      
      return { ...prev, detailBarang: updatedDetails };
    });
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
    // Handle yyyy-mm-dd format
    const dateParts = dateString.split("-");
    if (dateParts.length === 3) {
      const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }
    // Fallback: try parsing as ISO date
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return dateString;
  };

  // Check if there's approved pengajuan for current editing penerimaan
  const approvedPengajuan = editingPenerimaan
    ? pengajuanList.find((p) => p.penerimaanId === editingPenerimaan.id && p.status === "Disetujui")
    : null;

  // Check if pengajuan exists for current editing penerimaan (but not approved)
  const hasPengajuan = editingPenerimaan
    ? pengajuanList.some((p) => p.penerimaanId === editingPenerimaan.id && p.status !== "Disetujui" && p.status !== "Selesai" && p.status !== "Dibatalkan")
    : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!selectedPesanan) {
        throw new Error("Pesanan tidak ditemukan");
      }

      if (formData.detailBarang.length === 0) {
        throw new Error("Minimal harus ada 1 item barang");
      }

      // Validate qty terima tidak boleh lebih dari qty pesan
      const invalidQty = formData.detailBarang.find(
        (item) => item.qtyTerima > item.qtyPesan
      );
      if (invalidQty) {
        throw new Error(
          `Qty terima tidak boleh lebih dari qty pesan untuk ${invalidQty.namaProduk}`
        );
      }

      const userEmail = currentUserEmail || "System";
      const now = new Date().toISOString();
      
      const newPenerimaan: PenerimaanPembelian = {
        id: editingPenerimaan ? editingPenerimaan.id : Date.now().toString(),
        nomorPenerimaan: formData.nomorPenerimaan,
        nomorSuratJalan: formData.nomorSuratJalan,
        pesananId: selectedPesanan.id,
        nomorPesanan: selectedPesanan.nomorPesanan,
        tanggalPenerimaan: formData.tanggalPenerimaan,
        supplierId: selectedPesanan.supplierId,
        deskripsi: selectedPesanan.deskripsi,
        detailBarang: formData.detailBarang,
        tujuanPengirimanId: selectedPesanan.tujuanPengirimanId,
        createdAt: editingPenerimaan ? editingPenerimaan.createdAt : now,
        operator: editingPenerimaan ? (editingPenerimaan.operator || userEmail) : userEmail,
        updatedAt: now,
      };

      if (editingPenerimaan) {
        // Update existing penerimaan
        // Revert old stock first (from old apotik)
        const oldApotikId = editingPenerimaan.tujuanPengirimanId;
        const oldProducts = products.map((product) => {
          const detailTerima = editingPenerimaan.detailBarang.find((d) => d.produkId === product.id);
          if (detailTerima && oldApotikId) {
            let qtyInPieces = detailTerima.qtyTerima;
            if (product.units && product.units.length > 0) {
              const unit = product.units.find((u) => u.id === detailTerima.unitId);
              if (unit) {
                qtyInPieces = detailTerima.qtyTerima * unit.konversi;
              }
            }
            // Revert from stokPerApotik
            const currentStokPerApotik = product.stokPerApotik || {};
            const currentStok = currentStokPerApotik[oldApotikId] || 0;
            return {
              ...product,
              stokPerApotik: {
                ...currentStokPerApotik,
                [oldApotikId]: Math.max(0, currentStok - qtyInPieces),
              },
            };
          }
          return product;
        });

        // Apply new stock (to new apotik)
        const newApotikId = selectedPesanan.tujuanPengirimanId;
        const updatedProducts = oldProducts.map((product) => {
          const detailTerima = formData.detailBarang.find((d) => d.produkId === product.id);
          if (detailTerima && newApotikId) {
            let qtyInPieces = detailTerima.qtyTerima;
            if (product.units && product.units.length > 0) {
              const unit = product.units.find((u) => u.id === detailTerima.unitId);
              if (unit) {
                qtyInPieces = detailTerima.qtyTerima * unit.konversi;
              }
            }
            // Add to stokPerApotik
            const currentStokPerApotik = product.stokPerApotik || {};
            const currentStok = currentStokPerApotik[newApotikId] || 0;
            return {
              ...product,
              stokPerApotik: {
                ...currentStokPerApotik,
                [newApotikId]: currentStok + qtyInPieces,
              },
            };
          }
          return product;
        });
        localStorage.setItem("products", JSON.stringify(updatedProducts));
        setProducts(updatedProducts);

        // Update penerimaan
        const updatedPenerimaanList = penerimaanList.map((p) =>
          p.id === editingPenerimaan.id ? newPenerimaan : p
        );
        localStorage.setItem("penerimaanPembelian", JSON.stringify(updatedPenerimaanList));
        setPenerimaanList(updatedPenerimaanList);

        // Update pengajuan status if approved
        if (approvedPengajuan && approvedPengajuan.jenisPengajuan === "Edit Transaksi") {
          const updatedPengajuanList = pengajuanList.map((p) =>
            p.id === approvedPengajuan.id
              ? { ...p, status: "Selesai", selesaiPada: new Date().toISOString() }
              : p
          );
          localStorage.setItem("pengajuanPenerimaanPembelian", JSON.stringify(updatedPengajuanList));
          setPengajuanList(updatedPengajuanList);
        }

        alert("Penerimaan pembelian berhasil diupdate!");
      } else {
        // Save new penerimaan
        const updatedPenerimaanList = [...penerimaanList, newPenerimaan];
        localStorage.setItem("penerimaanPembelian", JSON.stringify(updatedPenerimaanList));
        setPenerimaanList(updatedPenerimaanList);

        // Update stock produk per apotik
        const apotikId = selectedPesanan.tujuanPengirimanId;
        
        if (!apotikId) {
          throw new Error("Tujuan pengiriman tidak ditemukan pada PO. Pastikan PO memiliki tujuan pengiriman yang valid.");
        }
        
        const updatedProducts = products.map((product) => {
          const detailTerima = formData.detailBarang.find((d) => d.produkId === product.id);
          if (detailTerima && apotikId) {
            // Convert qty terima ke unit terkecil (pieces)
            let qtyInPieces = detailTerima.qtyTerima;
            
            if (product.units && product.units.length > 0) {
              // Find the unit used
              const unit = product.units.find((u) => u.id === detailTerima.unitId);
              if (unit) {
                // Convert to pieces
                qtyInPieces = detailTerima.qtyTerima * unit.konversi;
              }
            }
            
            // Initialize stokPerApotik if not exists
            const currentStokPerApotik = product.stokPerApotik || {};
            const currentStok = currentStokPerApotik[apotikId] || 0;
            
            return {
              ...product,
              stokPerApotik: {
                ...currentStokPerApotik,
                [apotikId]: currentStok + qtyInPieces,
              },
            };
          }
          return product;
        });
        localStorage.setItem("products", JSON.stringify(updatedProducts));
        setProducts(updatedProducts);
        
        // Log untuk debugging
        console.log(`Stok berhasil ditambahkan ke apotik ID: ${apotikId} untuk penerimaan ${formData.nomorPenerimaan}`);

        handleCloseModal();
        alert("Penerimaan pembelian berhasil dibuat!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Filter pesanan yang belum diterima atau belum diterima semua
  const availablePesanan = pesananList.filter((pesanan) => {
    // Check if there's already a penerimaan for this pesanan
    const existingPenerimaan = penerimaanList.find((p) => p.pesananId === pesanan.id);
    return !existingPenerimaan; // Only show pesanan that haven't been received
  });

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
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: "20px", display: "flex", gap: "12px", borderBottom: "2px solid #e2e8f0" }}>
          <button
            onClick={() => setActiveTab("po")}
            style={{
              padding: "12px 20px",
              backgroundColor: "transparent",
              color: activeTab === "po" ? "#3b82f6" : "#64748b",
              border: "none",
              borderBottom: activeTab === "po" ? "2px solid #3b82f6" : "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "-2px",
            }}
          >
            Daftar PO Belum Diterima
          </button>
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
            Daftar Penerimaan
          </button>
        </div>

        {/* Table - Daftar PO Belum Diterima */}
        {activeTab === "po" && availablePesanan.length > 0 ? (
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
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Nomor PO</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Tanggal PO</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Supplier</th>
                  <th style={{ padding: "12px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Qty</th>
                  <th style={{ padding: "12px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#475569", width: "120px" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {availablePesanan.map((pesanan) => (
                  <tr
                    key={pesanan.id}
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
                    <td style={{ padding: "12px", fontSize: "13px", color: "#1e293b" }}>{pesanan.nomorPesanan}</td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{pesanan.tanggalPesanan}</td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>
                      {suppliers.find(s => s.id === pesanan.supplierId)?.namaSupplier || pesanan.supplierId}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", fontWeight: "500", color: "#1e293b" }}>
                      {pesanan.detailBarang?.reduce((sum, item) => sum + item.qty, 0) || 0}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px" }}>
                      <button
                        onClick={() => handleOpenModal(pesanan)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#10b981",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "500",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#059669";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#10b981";
                        }}
                      >
                        Terima
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === "po" ? (
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
              Tidak ada pesanan pembelian yang tersedia untuk diterima.
            </p>
          </div>
        ) : null}

        {/* Table - Daftar Penerimaan */}
        {activeTab === "penerimaan" && penerimaanList.length > 0 ? (
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
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Nomor Penerimaan</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Tanggal Penerimaan</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Nomor PO</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Supplier</th>
                  <th style={{ padding: "12px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Qty Pesan</th>
                  <th style={{ padding: "12px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Qty Terima</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Operator</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>Last Update</th>
                  <th style={{ padding: "12px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#475569", width: "150px" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {penerimaanList.flatMap((penerimaan) => {
                  if (!penerimaan.detailBarang || penerimaan.detailBarang.length === 0) {
                    return [
                      <tr key={penerimaan.id}>
                        <td colSpan={9} style={{ padding: "12px", fontSize: "13px", color: "#64748b", textAlign: "center" }}>
                          Tidak ada detail barang
                        </td>
                      </tr>
                    ];
                  }
                  return penerimaan.detailBarang.map((detail, index) => (
                    <tr
                      key={`${penerimaan.id}-${detail.id || index}`}
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
                      {index === 0 ? (
                        <>
                          <td rowSpan={penerimaan.detailBarang.length} style={{ padding: "12px", fontSize: "13px", color: "#1e293b", verticalAlign: "top" }}>{penerimaan.nomorPenerimaan}</td>
                          <td rowSpan={penerimaan.detailBarang.length} style={{ padding: "12px", fontSize: "13px", color: "#64748b", verticalAlign: "top" }}>{penerimaan.tanggalPenerimaan}</td>
                          <td rowSpan={penerimaan.detailBarang.length} style={{ padding: "12px", fontSize: "13px", color: "#64748b", verticalAlign: "top" }}>{penerimaan.nomorPesanan}</td>
                          <td rowSpan={penerimaan.detailBarang.length} style={{ padding: "12px", fontSize: "13px", color: "#64748b", verticalAlign: "top" }}>
                            {suppliers.find(s => s.id === penerimaan.supplierId)?.namaSupplier || penerimaan.supplierId}
                          </td>
                        </>
                      ) : null}
                      <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", color: "#64748b" }}>{detail.qtyPesan}</td>
                      <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", fontWeight: "500", color: "#1e293b" }}>{detail.qtyTerima}</td>
                      {index === 0 ? (
                        <>
                          <td rowSpan={penerimaan.detailBarang.length} style={{ padding: "12px", fontSize: "13px", color: "#64748b", verticalAlign: "top" }}>
                            {penerimaan.operator || "-"}
                          </td>
                          <td rowSpan={penerimaan.detailBarang.length} style={{ padding: "12px", fontSize: "13px", color: "#64748b", verticalAlign: "top" }}>
                            {penerimaan.updatedAt 
                              ? new Date(penerimaan.updatedAt).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : penerimaan.createdAt
                              ? new Date(penerimaan.createdAt).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </td>
                          <td rowSpan={penerimaan.detailBarang.length} style={{ padding: "12px", fontSize: "13px", verticalAlign: "top" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}>
                            <button
                              onClick={() => handleViewPenerimaan(penerimaan)}
                              title="View"
                              style={{
                                padding: "4px",
                                backgroundColor: "transparent",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "opacity 0.2s",
                                width: "24px",
                                height: "24px",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "0.7";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "1";
                              }}
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#475569"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEditPenerimaan(penerimaan)}
                              title="Edit"
                              style={{
                                padding: "4px",
                                backgroundColor: "transparent",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "opacity 0.2s",
                                width: "24px",
                                height: "24px",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "0.7";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "1";
                              }}
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#475569"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        </>) : null}
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
              Tidak ada data penerimaan pembelian.
            </p>
          </div>
        ) : null}

        {/* Modal */}
        {isModalOpen && selectedPesanan && (
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
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "20px",
                      cursor: "pointer",
                      color: "#64748b",
                      padding: "4px 8px",
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
                    ←
                  </button>
                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: "600",
                      margin: 0,
                      color: "#1e293b",
                    }}
                  >
                    {editingPenerimaan ? "Edit Penerimaan Pembelian" : "Terima Pembelian"}
                  </h3>
                </div>
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

              <form onSubmit={handleSubmit}>
                <div
                  style={{ padding: "24px", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}
                >
                  {/* Order Details Card */}
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "20px",
                      marginBottom: "20px",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        margin: "0 0 20px 0",
                        color: "#1e293b",
                        borderBottom: "2px solid #3b82f6",
                        paddingBottom: "8px",
                      }}
                    >
                      Informasi Penerimaan
                    </h4>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <label
                          htmlFor="nomorPenerimaan"
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Nomor Penerimaan
                        </label>
                        <input
                          type="text"
                          id="nomorPenerimaan"
                          name="nomorPenerimaan"
                          value={formData.nomorPenerimaan}
                          readOnly
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
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="tanggalPenerimaan"
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Tanggal Penerimaan <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          type="date"
                          id="tanggalPenerimaan"
                          name="tanggalPenerimaan"
                          value={formData.tanggalPenerimaan}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              tanggalPenerimaan: e.target.value,
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
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Nomor PO
                        </label>
                        <input
                          type="text"
                          value={selectedPesanan.nomorPesanan}
                          readOnly
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
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <label
                        htmlFor="nomorSuratJalan"
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontSize: "13px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Nomor Surat Jalan <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="text"
                        id="nomorSuratJalan"
                        name="nomorSuratJalan"
                        value={formData.nomorSuratJalan}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            nomorSuratJalan: e.target.value,
                          }))
                        }
                        required
                        placeholder="Masukkan nomor surat jalan"
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
                  </div>

                  {/* Order Items Card */}
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "20px",
                      marginBottom: "20px",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        margin: "0 0 20px 0",
                        color: "#1e293b",
                        borderBottom: "2px solid #3b82f6",
                        paddingBottom: "8px",
                      }}
                    >
                      Detail Barang Diterima
                    </h4>

                    {formData.detailBarang.length > 0 ? (
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
                            minWidth: "1000px",
                          }}
                        >
                          <thead>
                            <tr style={{ backgroundColor: "#f8fafc" }}>
                              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>DESCRIPTION</th>
                              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>CODE</th>
                              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>UNIT</th>
                              <th style={{ padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>QTY PESAN</th>
                              <th style={{ padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>QTY TERIMA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.detailBarang.map((detail) => (
                              <tr key={detail.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                <td style={{ padding: "12px", fontSize: "13px", color: "#1e293b" }}>
                                  {detail.namaProduk}
                                </td>
                                <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>
                                  {detail.kodeProduk || "-"}
                                </td>
                                <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>
                                  {detail.namaUnit || detail.satuan || "-"}
                                </td>
                                <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", color: "#64748b" }}>
                                  {detail.qtyPesan}
                                </td>
                                <td style={{ padding: "12px" }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max={detail.qtyPesan}
                                    value={detail.qtyTerima}
                                    onChange={(e) =>
                                      handleDetailChange(
                                        detail.id,
                                        "qtyTerima",
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    required
                                    style={{
                                      width: "80px",
                                      padding: "8px",
                                      border: "1px solid #d1d5db",
                                      borderRadius: "4px",
                                      fontSize: "13px",
                                      textAlign: "center",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "40px",
                          textAlign: "center",
                          border: "1px dashed #d1d5db",
                          borderRadius: "6px",
                          color: "#64748b",
                          fontSize: "14px",
                        }}
                      >
                        No items.
                      </div>
                    )}
                  </div>


                  {error && (
                    <div
                      style={{
                        padding: "12px",
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "6px",
                        marginBottom: "20px",
                        color: "#dc2626",
                        fontSize: "14px",
                      }}
                    >
                      {error}
                    </div>
                  )}
                </div>

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
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "#e5e7eb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                      }
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: loading ? "#9ca3af" : "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "#059669";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "#10b981";
                      }
                    }}
                  >
                    {loading ? "Saving..." : "Simpan Penerimaan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {isViewModalOpen && viewingPenerimaan && (
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
                  Detail Penerimaan Pembelian
                </h3>
                <button
                  onClick={() => setIsViewModalOpen(false)}
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
              <div style={{ padding: "24px", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
                {/* Order Details */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      margin: "0 0 20px 0",
                      color: "#1e293b",
                      borderBottom: "2px solid #3b82f6",
                      paddingBottom: "8px",
                    }}
                  >
                    Informasi Penerimaan
                  </h4>
                  
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                        Nomor Penerimaan
                      </label>
                      <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>{viewingPenerimaan.nomorPenerimaan}</div>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                        Nomor PO
                      </label>
                      <div style={{ fontSize: "14px", color: "#1e293b" }}>{viewingPenerimaan.nomorPesanan}</div>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                        Tanggal Penerimaan
                      </label>
                      <div style={{ fontSize: "14px", color: "#1e293b" }}>{formatDate(viewingPenerimaan.tanggalPenerimaan)}</div>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                        Nomor Surat Jalan
                      </label>
                      <div style={{ fontSize: "14px", color: "#1e293b" }}>{viewingPenerimaan.nomorSuratJalan}</div>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                        Supplier
                      </label>
                      <div style={{ fontSize: "14px", color: "#1e293b" }}>
                        {suppliers.find(s => s.id === viewingPenerimaan.supplierId)?.namaSupplier || viewingPenerimaan.supplierId}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      margin: "0 0 20px 0",
                      color: "#1e293b",
                      borderBottom: "2px solid #3b82f6",
                      paddingBottom: "8px",
                    }}
                  >
                    Detail Barang Diterima
                  </h4>

                  {viewingPenerimaan.detailBarang && viewingPenerimaan.detailBarang.length > 0 ? (
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8fafc" }}>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>DESCRIPTION</th>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>CODE</th>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>UNIT</th>
                            <th style={{ padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>QTY PESAN</th>
                            <th style={{ padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>QTY TERIMA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingPenerimaan.detailBarang.map((detail: DetailBarangTerima, index: number) => (
                            <tr key={detail.id || index} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "12px", fontSize: "13px", color: "#1e293b" }}>{detail.namaProduk}</td>
                              <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{detail.kodeProduk || "-"}</td>
                              <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{detail.namaUnit || detail.satuan || "-"}</td>
                              <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", color: "#64748b" }}>{detail.qtyPesan}</td>
                              <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", color: "#1e293b", fontWeight: "500" }}>{detail.qtyTerima}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                      No items
                    </div>
                  )}
                </div>
              </div>

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
                  onClick={() => setIsViewModalOpen(false)}
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
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pengajuan Perubahan */}
        {isPengajuanModalOpen && (
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
              zIndex: 1001,
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                width: "90%",
                maxWidth: "600px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
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
                  Pengajuan Perubahan
                </h3>
                <button
                  onClick={handleClosePengajuanModal}
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
              <form onSubmit={handleSubmitPengajuan}>
                <div style={{ padding: "24px" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <label
                      htmlFor="jenisPengajuan"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Jenis Pengajuan <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      id="jenisPengajuan"
                      name="jenisPengajuan"
                      value={pengajuanData.jenisPengajuan}
                      onChange={(e) =>
                        setPengajuanData((prev) => ({
                          ...prev,
                          jenisPengajuan: e.target.value,
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
                      <option value="">Pilih Jenis Pengajuan</option>
                      <option value="Edit Transaksi">Edit Transaksi</option>
                      <option value="Hapus Transaksi">Hapus Transaksi</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label
                      htmlFor="alasanPengajuan"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Alasan Pengajuan <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <textarea
                      id="alasanPengajuan"
                      name="alasanPengajuan"
                      value={pengajuanData.alasanPengajuan}
                      onChange={(e) =>
                        setPengajuanData((prev) => ({
                          ...prev,
                          alasanPengajuan: e.target.value,
                        }))
                      }
                      required
                      rows={5}
                      placeholder="Masukkan alasan pengajuan perubahan..."
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        resize: "vertical",
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
                </div>

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
                    onClick={handleClosePengajuanModal}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#e5e7eb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
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
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
