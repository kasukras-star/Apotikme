"use client";

import { useState, useEffect, useRef } from "react";
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

interface DetailBarang {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string; // ID unit yang dipilih
  namaUnit: string; // Nama unit yang dipilih
  qty: number;
  satuan: string; // Untuk backward compatibility
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
}

interface PesananPembelianFormData {
  nomorPesanan: string;
  tanggalPesanan: string;
  tanggalDibutuhkan: string;
  supplierId: string;
  tujuanPengirimanId: string;
  deskripsi: string;
  jangkaWaktuPembayaran: string;
  picPembelian: string;
  diskonGlobal: number;
  ppn: number;
  keterangan: string;
  detailBarang: DetailBarang[];
  statusKirim?: string; // "Belum Dikirim" | "Sudah Dikirim" | "PO Terkirim"
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
  alamat: string;
  kota: string;
  provinsi: string;
  telepon: string;
  email: string;
  picApotik: string;
  statusAktif: boolean;
  defaultPO?: boolean;
  defaultTerimaBarang?: boolean;
}

interface Product {
  id: string;
  kodeProduk: string;
  namaProduk: string;
  satuan: string;
  hargaBeli: number;
  units?: ProductUnit[]; // Array multiple unit
}

export default function PesananPembelianPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState<PesananPembelianFormData>({
    nomorPesanan: "",
    tanggalPesanan: "",
    tanggalDibutuhkan: "",
    supplierId: "",
    tujuanPengirimanId: "",
    deskripsi: "",
    jangkaWaktuPembayaran: "",
    picPembelian: "",
    diskonGlobal: 0,
    ppn: 11,
    keterangan: "",
    detailBarang: [],
  });
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pesananList, setPesananList] = useState<any[]>([]);
  const [editingPesanan, setEditingPesanan] = useState<any | null>(null);
  const [viewingPesanan, setViewingPesanan] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPengajuanModalOpen, setIsPengajuanModalOpen] = useState(false);
  const [pengajuanData, setPengajuanData] = useState({
    jenisPengajuan: "",
    alasanPengajuan: "",
  });
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalDetailId, setProductModalDetailId] = useState<string | null>(null);
  const [productModalPage, setProductModalPage] = useState(1);
  const PRODUCTS_PER_PAGE = 15;
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [apiLoadError, setApiLoadError] = useState<string | null>(null);

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

  // Format date from yyyy-mm-dd to "dd MMM yyyy"
  const formatDateDDMMMYYYY = (dateString: string): string => {
    if (!dateString) return "";
    try {
    const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
    const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  // Load suppliers, apotiks, products, pesanan, pengajuan from API first, fallback to localStorage
  useEffect(() => {
    let cancelled = false;
    function loadFromLocalStorage() {
      const ss = localStorage.getItem("suppliers"); if (ss) try { setSuppliers(JSON.parse(ss)); } catch (_) {}
      const sa = localStorage.getItem("apotiks"); if (sa) try { setApotiks(JSON.parse(sa).filter((a: Apotik) => a.statusAktif)); } catch (_) {}
      const sp = localStorage.getItem("products"); if (sp) try { setProducts(JSON.parse(sp)); } catch (_) {}
      const spe = localStorage.getItem("pesananPembelian"); if (spe) try { setPesananList(JSON.parse(spe)); } catch (_) {}
      const spg = localStorage.getItem("pengajuanPembelian"); if (spg) try { setPengajuanList(JSON.parse(spg)); } catch (_) {}
    }
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token || cancelled) {
        loadFromLocalStorage();
        setIsLoadingData(false);
        return;
      }
      const token = data.session.access_token;
      setApiLoadError(null);
      const handleRes = (r: Response): Promise<unknown> => {
        if (r.status === 401) setApiLoadError("Sesi habis, silakan login lagi.");
        else if (r.status === 500) setApiLoadError("Gagal memuat dari server. Cek koneksi dan env Vercel.");
        return r.ok ? r.json() : Promise.resolve([]);
      };
      Promise.all([
        fetch("/api/data/suppliers", { headers: { Authorization: `Bearer ${token}` } }).then(handleRes),
        fetch("/api/data/apotiks", { headers: { Authorization: `Bearer ${token}` } }).then(handleRes),
        fetch("/api/data/products", { headers: { Authorization: `Bearer ${token}` } }).then(handleRes),
        fetch("/api/data/pesananPembelian", { headers: { Authorization: `Bearer ${token}` } }).then(handleRes),
        fetch("/api/data/pengajuanPembelian", { headers: { Authorization: `Bearer ${token}` } }).then(handleRes),
      ]).then(([suppliersData, apotiksData, productsData, pesananData, pengajuanData]) => {
        if (cancelled) return;
        if (Array.isArray(suppliersData) && suppliersData.length > 0) { setSuppliers(suppliersData); localStorage.setItem("suppliers", JSON.stringify(suppliersData)); }
        else { const ss = localStorage.getItem("suppliers"); if (ss) try { setSuppliers(JSON.parse(ss)); } catch (_) {} }
        if (Array.isArray(apotiksData) && apotiksData.length > 0) { setApotiks(apotiksData.filter((a: Apotik) => a.statusAktif)); localStorage.setItem("apotiks", JSON.stringify(apotiksData)); }
        else { const sa = localStorage.getItem("apotiks"); if (sa) try { setApotiks(JSON.parse(sa).filter((a: Apotik) => a.statusAktif)); } catch (_) {} }
        if (Array.isArray(productsData) && productsData.length > 0) { setProducts(productsData); localStorage.setItem("products", JSON.stringify(productsData)); }
        else { const sp = localStorage.getItem("products"); if (sp) try { setProducts(JSON.parse(sp)); } catch (_) {} }
        if (Array.isArray(pesananData) && pesananData.length > 0) { setPesananList(pesananData); localStorage.setItem("pesananPembelian", JSON.stringify(pesananData)); }
        else { const spe = localStorage.getItem("pesananPembelian"); if (spe) try { setPesananList(JSON.parse(spe)); } catch (_) {} }
        if (Array.isArray(pengajuanData) && pengajuanData.length > 0) { setPengajuanList(pengajuanData); localStorage.setItem("pengajuanPembelian", JSON.stringify(pengajuanData)); }
        else { const spg = localStorage.getItem("pengajuanPembelian"); if (spg) try { setPengajuanList(JSON.parse(spg)); } catch (_) {} }
      }).catch(() => { if (!cancelled) loadFromLocalStorage(); }).finally(() => { if (!cancelled) setIsLoadingData(false); });
    }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    return () => { cancelled = true; };
  }, []);

  // Generate nomor pesanan and set default tanggal
  useEffect(() => {
    if (isModalOpen && !formData.nomorPesanan) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const count = pesananList.length + 1;
      setFormData((prev) => ({
        ...prev,
        nomorPesanan: `PO-${year}${month}-${String(count).padStart(4, "0")}`,
        tanggalPesanan: getTodayDateInput(),
        tanggalDibutuhkan: getTodayDateInput(),
      }));
    }
  }, [isModalOpen, pesananList.length]);

  // Sync pesanan and pengajuan to API (only after initial load, so we do not overwrite Supabase with [])
  useEffect(() => {
    if (!isLoadingData) {
      getSupabaseClient().auth.getSession().then(({ data }) => {
        if (data.session?.access_token) {
          const token = data.session.access_token;
          fetch("/api/data/pesananPembelian", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ value: pesananList }) }).catch(() => {});
        }
      });
    }
  }, [pesananList, isLoadingData]);
  useEffect(() => {
    if (!isLoadingData) {
      getSupabaseClient().auth.getSession().then(({ data }) => {
        if (data.session?.access_token) {
          fetch("/api/data/pengajuanPembelian", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: pengajuanList }) }).catch(() => {});
        }
      });
    }
  }, [pengajuanList, isLoadingData]);

  // Check if there's edit parameter in URL (from persetujuan pengajuan)
  useEffect(() => {
    if (typeof window !== "undefined" && pesananList.length > 0 && !editingPesanan) {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get("edit");
      if (editId) {
        const pesananToEdit = pesananList.find((p) => p.id === editId);
        if (pesananToEdit) {
          handleEditPesanan(pesananToEdit);
          // Clean URL
          window.history.replaceState({}, "", "/admin/pembelian/pesanan");
        }
      }
    }
  }, [pesananList]);

  // Tutup dropdown supplier saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSupplierDropdown && supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSupplierDropdown]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setEditingPesanan(null);
    setError(null);
    
    // Find apotik with defaultPO checked, or fallback to "Apotik Maju Lancar"
    const defaultApotik = apotiks.find((a) => a.defaultPO) || apotiks.find((a) => a.namaApotik === "Apotik Maju Lancar");
    
    setFormData({
      nomorPesanan: "",
      tanggalPesanan: getTodayDateInput(),
      tanggalDibutuhkan: getTodayDateInput(),
      supplierId: "",
      tujuanPengirimanId: defaultApotik?.id || "",
      deskripsi: "",
      jangkaWaktuPembayaran: "",
      picPembelian: "",
      diskonGlobal: 0,
      ppn: 11,
      keterangan: "",
      detailBarang: [],
      statusKirim: "Belum Dikirim",
    });
    setShowSupplierDropdown(false);
    setSupplierSearch("");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPesanan(null);
    setError(null);
    setShowProductModal(false);
    setProductModalDetailId(null);
  };

  const handleEditPesanan = (pesanan: any) => {
    setEditingPesanan(pesanan);
    setFormData({
      nomorPesanan: pesanan.nomorPesanan,
      tanggalPesanan: pesanan.tanggalPesanan,
      tanggalDibutuhkan: pesanan.tanggalDibutuhkan,
      supplierId: pesanan.supplierId,
      tujuanPengirimanId: pesanan.tujuanPengirimanId || "",
      deskripsi: pesanan.deskripsi || "",
      jangkaWaktuPembayaran: pesanan.jangkaWaktuPembayaran || "",
      picPembelian: pesanan.picPembelian || "",
      diskonGlobal: pesanan.diskonGlobal || 0,
      ppn: pesanan.ppn || 11,
      keterangan: pesanan.keterangan || "",
      detailBarang: pesanan.detailBarang || [],
      statusKirim: pesanan.statusKirim || "Belum Dikirim",
    });
    setIsModalOpen(true);
    setError(null);
    setShowSupplierDropdown(false);
    setSupplierSearch("");
  };

  const handleViewPesanan = (pesanan: any) => {
    setViewingPesanan(pesanan);
    setIsViewModalOpen(true);
  };

  const handleKirimPO = (pesananId: string) => {
    const updatedList = pesananList.map((p) =>
      p.id === pesananId
        ? { ...p, statusKirim: "PO Terkirim" }
        : p
    );
    localStorage.setItem("pesananPembelian", JSON.stringify(updatedList));
    setPesananList(updatedList);
    
    // Update juga jika sedang diedit
    if (editingPesanan && editingPesanan.id === pesananId) {
    setFormData((prev) => ({
      ...prev,
        statusKirim: "PO Terkirim",
      }));
      setEditingPesanan({ ...editingPesanan, statusKirim: "PO Terkirim" });
    }
    
    alert("PO berhasil dikirim!");
  };

  const handlePrint = () => {
    window.print();
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

    if (!editingPesanan) {
      alert("Tidak ada PO yang sedang diedit");
      return;
    }

    const newPengajuan = {
      id: Date.now().toString(),
      pesananId: editingPesanan.id,
      nomorPesanan: editingPesanan.nomorPesanan,
      jenisPengajuan: pengajuanData.jenisPengajuan,
      alasanPengajuan: pengajuanData.alasanPengajuan,
      status: "Menunggu Persetujuan",
      createdAt: new Date().toISOString(),
      disetujuiPada: undefined,
      ditolakPada: undefined,
      alasanTolak: undefined,
      menuSystem: "Merchandise",
      isNew: true, // Flag untuk notifikasi baru
    };

    const updatedPengajuanList = [...pengajuanList, newPengajuan];
    localStorage.setItem("pengajuanPembelian", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);

    handleClosePengajuanModal();
    alert("Pengajuan perubahan berhasil dikirim!");
  };

  const handleRefresh = () => {
    // Reload data dari localStorage
    const savedPesanan = localStorage.getItem("pesananPembelian");
    if (savedPesanan) {
      try {
        const updatedList = JSON.parse(savedPesanan);
        setPesananList(updatedList);
        
        // Update editingPesanan jika sedang diedit
        if (editingPesanan) {
          const updatedPesanan = updatedList.find((p: any) => p.id === editingPesanan.id);
          if (updatedPesanan) {
            setEditingPesanan(updatedPesanan);
            setFormData({
              nomorPesanan: updatedPesanan.nomorPesanan,
              tanggalPesanan: updatedPesanan.tanggalPesanan,
              tanggalDibutuhkan: updatedPesanan.tanggalDibutuhkan,
              supplierId: updatedPesanan.supplierId,
              tujuanPengirimanId: updatedPesanan.tujuanPengirimanId || "",
              deskripsi: updatedPesanan.deskripsi || "",
              jangkaWaktuPembayaran: updatedPesanan.jangkaWaktuPembayaran || "",
              picPembelian: updatedPesanan.picPembelian || "",
              diskonGlobal: updatedPesanan.diskonGlobal || 0,
              ppn: updatedPesanan.ppn || 11,
              keterangan: updatedPesanan.keterangan || "",
              detailBarang: updatedPesanan.detailBarang || [],
              statusKirim: updatedPesanan.statusKirim || "Belum Dikirim",
            });
          }
        }
      } catch (err) {
        console.error("Error loading pesanan:", err);
      }
    }

    // Reload pengajuan list
    const savedPengajuan = localStorage.getItem("pengajuanPembelian");
    if (savedPengajuan) {
      try {
        setPengajuanList(JSON.parse(savedPengajuan));
      } catch (err) {
        console.error("Error loading pengajuan:", err);
      }
    }

    alert("Data berhasil di-refresh!");
  };

  const handleBatalPengajuan = () => {
    if (!approvedPengajuan) return;

    if (confirm("Apakah Anda yakin ingin membatalkan pengajuan ini?")) {
      // Hapus pengajuan dari list (bukan update status, tapi hapus)
      const updatedPengajuanList = pengajuanList.filter((p) => p.id !== approvedPengajuan.id);
      localStorage.setItem("pengajuanPembelian", JSON.stringify(updatedPengajuanList));
      
      // Update state langsung untuk trigger re-render
      setPengajuanList(updatedPengajuanList);

      alert("Pengajuan berhasil dibatalkan!");
    }
  };

  const handleHapusPO = () => {
    if (!editingPesanan || !approvedPengajuan) return;

    if (confirm(`Apakah Anda yakin ingin menghapus PO ${editingPesanan.nomorPesanan}?`)) {
      // Hapus PO dari list
      const updatedPesananList = pesananList.filter((p) => p.id !== editingPesanan.id);
      localStorage.setItem("pesananPembelian", JSON.stringify(updatedPesananList));
      setPesananList(updatedPesananList);

      // Update status pengajuan menjadi Selesai
      const updatedPengajuanList = pengajuanList.map((p) =>
        p.id === approvedPengajuan.id
          ? { ...p, status: "Selesai", selesaiPada: new Date().toISOString() }
          : p
      );
      localStorage.setItem("pengajuanPembelian", JSON.stringify(updatedPengajuanList));
      setPengajuanList(updatedPengajuanList);

      alert("PO berhasil dihapus!");
      handleCloseModal();
    }
  };

  // Check if there's approved pengajuan for current editing pesanan
  const approvedPengajuan = editingPesanan
    ? pengajuanList.find((p) => p.pesananId === editingPesanan.id && p.status === "Disetujui")
    : null;

  // Check if pengajuan exists for current editing pesanan (but not approved)
  const hasPengajuan = editingPesanan
    ? pengajuanList.some((p) => p.pesananId === editingPesanan.id && p.status !== "Disetujui" && p.status !== "Selesai" && p.status !== "Dibatalkan")
    : false;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
      setFormData((prev) => ({
        ...prev,
      [name]: type === "checkbox" ? checked : name === "ppn" || name === "diskonGlobal" ? parseFloat(value) || 0 : value,
      }));
  };


  const handleAddDetail = () => {
    const newDetail: DetailBarang = {
      id: Date.now().toString(),
      produkId: "",
      kodeProduk: "",
      namaProduk: "",
      unitId: "",
      namaUnit: "",
      qty: 1,
      satuan: "",
      hargaSatuan: 0,
      diskon: 0,
      subtotal: 0,
    };
    setFormData((prev) => ({
      ...prev,
      detailBarang: [...prev.detailBarang, newDetail],
    }));
  };

  const handleRemoveDetail = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      detailBarang: prev.detailBarang.filter((item) => item.id !== id),
    }));
  };

  const handleDetailChange = (
    id: string,
    field: keyof DetailBarang,
    value: string | number
  ) => {
    setFormData((prev) => {
      const updatedDetails = prev.detailBarang.map((detail) => {
        if (detail.id === id) {
          const updated = { ...detail, [field]: value };
          
          // Auto-fill produk info when produkId changes
          if (field === "produkId" && typeof value === "string") {
            const product = products.find((p) => p.id === value);
            if (product) {
              updated.kodeProduk = product.kodeProduk;
              updated.namaProduk = product.namaProduk;
              
              // Jika produk memiliki multiple unit
              if (product.units && product.units.length > 0) {
                // Set unit pertama sebagai default
                const sortedUnits = [...product.units].sort((a, b) => a.urutan - b.urutan);
                const defaultUnit = sortedUnits[0];
                updated.unitId = defaultUnit.id;
                updated.namaUnit = defaultUnit.namaUnit;
                updated.satuan = defaultUnit.namaUnit;
                updated.hargaSatuan = defaultUnit.hargaBeli;
              } else {
                // Backward compatibility: produk tanpa multiple unit
              updated.satuan = product.satuan;
              updated.hargaSatuan = product.hargaBeli;
                updated.namaUnit = product.satuan;
              }
            }
          }
          
          // Handle unit change
          if (field === "unitId" && typeof value === "string") {
            const product = products.find((p) => p.id === detail.produkId);
            if (product && product.units) {
              const selectedUnit = product.units.find((u) => u.id === value);
              if (selectedUnit) {
                updated.namaUnit = selectedUnit.namaUnit;
                updated.satuan = selectedUnit.namaUnit;
                updated.hargaSatuan = selectedUnit.hargaBeli;
              }
            }
          }
          
          // Calculate subtotal
          const subtotal =
            updated.qty *
            updated.hargaSatuan *
            (1 - updated.diskon / 100);
          updated.subtotal = subtotal;
          
          return updated;
        }
        return detail;
      });
      
      return { ...prev, detailBarang: updatedDetails };
    });
  };

  const calculateTotal = () => {
    const subtotal = formData.detailBarang.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );
    const afterDiskon = subtotal * (1 - formData.diskonGlobal / 100);
    const ppnAmount = afterDiskon * (formData.ppn / 100);
    return {
      subtotal,
      diskonAmount: subtotal - afterDiskon,
      ppnAmount,
      total: afterDiskon + ppnAmount,
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.supplierId) {
        throw new Error("Supplier harus dipilih");
      }

      // Validate supplier exists
      const selectedSupplier = suppliers.find((s) => s.id === formData.supplierId);
      if (!selectedSupplier) {
        throw new Error("Supplier yang dipilih tidak valid");
      }
      
      if (formData.detailBarang.length === 0) {
        throw new Error("Minimal harus ada 1 item barang");
      }

      if (!formData.tanggalPesanan) {
        throw new Error("Tanggal pesanan harus diisi");
      }

      const totals = calculateTotal();
      const userEmail = currentUserEmail || "System";
      const now = new Date().toISOString();
      
      const newPesanan = {
        id: editingPesanan ? editingPesanan.id : Date.now().toString(),
        ...formData,
        statusKirim: formData.statusKirim || "Belum Dikirim",
        ...totals,
        createdAt: editingPesanan ? editingPesanan.createdAt : now,
        operator: editingPesanan ? (editingPesanan.operator || userEmail) : userEmail,
        updatedAt: now,
      };

      if (editingPesanan) {
        // Update existing pesanan
        const updatedList = pesananList.map((p) =>
          p.id === editingPesanan.id ? newPesanan : p
        );
        localStorage.setItem("pesananPembelian", JSON.stringify(updatedList));
        setPesananList(updatedList);
        
        // Jika ada pengajuan yang disetujui, update status menjadi Selesai
        if (approvedPengajuan && approvedPengajuan.jenisPengajuan === "Edit Transaksi") {
          const updatedPengajuanList = pengajuanList.map((p) =>
            p.id === approvedPengajuan.id
              ? { ...p, status: "Selesai", selesaiPada: new Date().toISOString() }
              : p
          );
          localStorage.setItem("pengajuanPembelian", JSON.stringify(updatedPengajuanList));
          setPengajuanList(updatedPengajuanList);
        }
        
        alert("Pesanan pembelian berhasil diupdate!");
      } else {
        // Add new pesanan
      const updatedList = [...pesananList, newPesanan];
      localStorage.setItem("pesananPembelian", JSON.stringify(updatedList));
      setPesananList(updatedList);
        alert("Pesanan pembelian berhasil dibuat!");
      }

      handleCloseModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotal();

  return (
    <DashboardLayout>
      <div>
        {apiLoadError && (
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              marginBottom: "16px",
              color: "#dc2626",
              fontSize: "14px",
            }}
          >
            {apiLoadError}
          </div>
        )}
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
              backgroundColor: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--primary)";
            }}
          >
            + Buat Pesanan Pembelian
          </button>
        </div>

        {/* Table */}
        {pesananList.length > 0 ? (
          <div
            style={{
              backgroundColor: "var(--surface)",
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
                <tr style={{ backgroundColor: "var(--hover-bg)", borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Nomor Pesanan</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Tanggal</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Supplier</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Status Kirim</th>
                  <th style={{ padding: "12px", textAlign: "right", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Total</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Operator</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Last Update</th>
                  <th style={{ padding: "12px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", width: "120px" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pesananList.map((pesanan) => (
                  <tr
                    key={pesanan.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-primary)" }}>{pesanan.nomorPesanan}</td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>{pesanan.tanggalPesanan}</td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {suppliers.find(s => s.id === pesanan.supplierId)?.namaSupplier || pesanan.supplierId}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor:
                            pesanan.statusKirim === "PO Terkirim"
                              ? "#dbeafe"
                              : pesanan.statusKirim === "Sudah Dikirim"
                              ? "#d1fae5"
                              : "#fee2e2",
                          color:
                            pesanan.statusKirim === "PO Terkirim"
                              ? "#1e40af"
                              : pesanan.statusKirim === "Sudah Dikirim"
                              ? "#065f46"
                              : "#991b1b",
                        }}
                      >
                        {pesanan.statusKirim || "Belum Dikirim"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", textAlign: "right", fontWeight: "500", color: "var(--text-primary)" }}>
                      {formatCurrency(pesanan.total || 0)}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {pesanan.operator || "-"}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {pesanan.updatedAt 
                        ? new Date(pesanan.updatedAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : pesanan.createdAt
                        ? new Date(pesanan.createdAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                        <button
                          onClick={() => handleViewPesanan(pesanan)}
                          title="Lihat Detail"
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
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditPesanan(pesanan)}
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
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "var(--surface)",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--text-secondary)" }}>
              Belum ada pesanan pembelian. Klik tombol "Buat Pesanan Pembelian" untuk membuat pesanan baru.
            </p>
          </div>
        )}

        {/* Modal - full page panel di sebelah kanan sidebar */}
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
            <div
              style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header */}
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
                  <button
                    onClick={handleCloseModal}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "20px",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--hover-bg)";
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
                      color: "var(--text-primary)",
                    }}
                  >
                    {editingPesanan ? "Edit Pesanan Pembelian" : "Purchase Order"}
                  </h3>
                </div>
                <button
                  onClick={handleCloseModal}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
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
                    e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="pesanan-form-modal" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <style dangerouslySetInnerHTML={{ __html: `
                  .pesanan-form-modal input::placeholder,
                  .pesanan-form-modal textarea::placeholder { font-size: 13px; font-weight: 400; color: var(--text-secondary); }
                  .pesanan-form-modal input,
                  .pesanan-form-modal select,
                  .pesanan-form-modal textarea { font-size: 13px !important; line-height: 1.4; background-color: var(--surface) !important; color: var(--text-primary) !important; border-color: var(--input-border); }
                ` }} />
                <div 
                  style={{ padding: "24px", flex: 1, minHeight: 0, overflowY: "auto" }}
                  onClick={(e) => {
                    if (showSupplierDropdown && supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) {
                    setShowSupplierDropdown(false);
                    }
                  }}
                >
                  {/* Order Details Card */}
                  <div
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
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
                        color: "var(--text-primary)",
                        borderBottom: "2px solid var(--primary)",
                        paddingBottom: "8px",
                      }}
                    >
                      Order Details
                    </h4>
                    
                    {/* 3 outline group ke samping: Group 1 | Group 2 | Group 3 - rapat, tinggi sama */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", alignItems: "stretch" }}>
                    {/* Outline Group 1: Baris 1 = Document No | Date, Baris 2 = Payment Terms | Required Date */}
                    <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", paddingTop: "12px", position: "relative", backgroundColor: "var(--hover-bg)", display: "flex", flexDirection: "column", minHeight: "100%" }}>
                      <span style={{ position: "absolute", top: "-8px", left: "10px", background: "var(--surface)", padding: "0 4px", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}>Detail Order 1</span>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto", gap: "0px 4px", alignItems: "start" }}>
                      {/* Baris 1: Document No (kiri) | Date (kanan) */}
                      <div style={{ gridColumn: "1", gridRow: "1" }}>
                        <div style={{ minHeight: "40px" }}>
                        <label
                          htmlFor="nomorPesanan"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            minHeight: "22px",
                            marginBottom: "0px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "var(--text-primary)",
                            width: "fit-content",
                            maxWidth: "200px",
                          }}
                        >
                          Document No
                        </label>
                        <input
                          type="text"
                          id="nomorPesanan"
                          name="nomorPesanan"
                          value={formData.nomorPesanan}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            maxWidth: "180px",
                            padding: "8px 10px",
                            border: "1px solid var(--input-border)",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "400",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                            transition: "border-color 0.2s",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.outline = "none";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "var(--input-border)";
                          }}
                        />
                      </div>
                      </div>
                      {/* Date - di samping Document No (baris 1, kolom 2) */}
                      <div style={{ gridColumn: "2", gridRow: "1" }}>
                        <div style={{ minHeight: "40px" }}>
                        <label
                          htmlFor="tanggalPesanan"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            minHeight: "22px",
                            marginBottom: "0px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "var(--text-primary)",
                            width: "fit-content",
                            maxWidth: "200px",
                          }}
                        >
                          Date
                        </label>
                          <input
                          type="date"
                            id="tanggalPesanan"
                            name="tanggalPesanan"
                            value={formData.tanggalPesanan}
                          onChange={handleChange}
                            style={{
                              width: "100%",
                            maxWidth: "160px",
                            padding: "8px 10px",
                            border: "1px solid var(--input-border)",
                              borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "400",
                            fontFamily: "inherit",
                              boxSizing: "border-box",
                              transition: "border-color 0.2s",
                            }}
                            onFocus={(e) => {
                            e.currentTarget.style.borderColor = "var(--primary)";
                              e.currentTarget.style.outline = "none";
                            }}
                            onBlur={(e) => {
                            e.currentTarget.style.borderColor = "var(--input-border)";
                            }}
                          />
                      </div>
                      </div>
                      {/* Payment Terms - baris 2, kolom 1 */}
                      <div style={{ gridColumn: "1", gridRow: "2" }}>
                        <div style={{ minHeight: "40px" }}>
                        <label
                          htmlFor="jangkaWaktuPembayaran"
                              style={{
                            display: "flex",
                            alignItems: "center",
                            minHeight: "22px",
                            marginBottom: "0px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "var(--text-primary)",
                            width: "fit-content",
                            maxWidth: "200px",
                          }}
                        >
                          Payment Terms <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <select
                          id="jangkaWaktuPembayaran"
                          name="jangkaWaktuPembayaran"
                          value={formData.jangkaWaktuPembayaran}
                          onChange={handleChange}
                          required
                          style={{
                            width: "100%",
                            maxWidth: "180px",
                            padding: "8px 10px",
                            border: "1px solid var(--input-border)",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "400",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                            transition: "border-color 0.2s",
                            backgroundColor: "var(--surface)",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.outline = "none";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "var(--input-border)";
                          }}
                        >
                          <option value="">Select Payment Terms</option>
                          <option value="Cash">Cash (Langsung)</option>
                          <option value="7 Hari">7 Hari</option>
                          <option value="14 Hari">14 Hari</option>
                          <option value="30 Hari">30 Hari</option>
                          <option value="45 Hari">45 Hari</option>
                          <option value="60 Hari">60 Hari</option>
                          <option value="90 Hari">90 Hari</option>
                        </select>
                        </div>
                      </div>
                      {/* Required Date - di samping Payment Terms (baris 2, kolom 2) */}
                      <div style={{ gridColumn: "2", gridRow: "2" }}>
                        <div style={{ minHeight: "40px" }}>
                        <label
                          htmlFor="tanggalDibutuhkan"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            minHeight: "22px",
                            marginBottom: "0px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "var(--text-primary)",
                            width: "fit-content",
                            maxWidth: "200px",
                          }}
                        >
                          Required Date <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          type="date"
                          id="tanggalDibutuhkan"
                          name="tanggalDibutuhkan"
                          value={formData.tanggalDibutuhkan}
                          onChange={handleChange}
                          required
                          style={{
                            width: "100%",
                            maxWidth: "160px",
                            padding: "8px 10px",
                            border: "1px solid var(--input-border)",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "400",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                            transition: "border-color 0.2s",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.outline = "none";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "var(--input-border)";
                          }}
                        />
                        </div>
                      </div>
                      </div>
                    </div>

                    {/* Outline Group 2: Supplier, Alamat */}
                    <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", paddingTop: "12px", position: "relative", backgroundColor: "var(--hover-bg)", display: "flex", flexDirection: "column", minHeight: "100%" }}>
                      <span style={{ position: "absolute", top: "-8px", left: "10px", background: "var(--surface)", padding: "0 4px", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}>Detail Order 2</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0px", maxWidth: "100%" }}>
                      {/* Supplier, Alamat */}
                        <div style={{ minHeight: "40px" }}>
                        <label
                          htmlFor="supplierId"
                          style={{
                            display: "block",
                            marginBottom: "0px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "var(--text-primary)",
                            width: "fit-content",
                            maxWidth: "200px",
                          }}
                        >
                          Supplier <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <div style={{ position: "relative" }} ref={supplierDropdownRef}>
                          <input
                            type="text"
                            readOnly
                            value={
                              formData.supplierId
                                ? suppliers.find((s) => s.id === formData.supplierId)?.namaSupplier || ""
                                : ""
                            }
                            onClick={() => {
                              setShowSupplierDropdown(true);
                              setSupplierSearch("");
                            }}
                            onFocus={(e) => {
                              setShowSupplierDropdown(true);
                              setSupplierSearch("");
                              e.currentTarget.style.borderColor = "var(--primary)";
                              e.currentTarget.style.outline = "none";
                            }}
                            placeholder="Select Supplier"
                            required={!formData.supplierId}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              paddingRight: "32px",
                              border: "1px solid var(--input-border)",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: "400",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                              transition: "border-color 0.2s",
                              cursor: "pointer",
                              backgroundColor: "var(--surface)",
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = "var(--input-border)";
                            }}
                          />
                          <span
                            style={{
                              position: "absolute",
                              right: "10px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              pointerEvents: "none",
                              color: "var(--text-secondary)",
                              fontSize: "12px",
                            }}
                          >
                            ▼
                          </span>
                          {showSupplierDropdown && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                right: 0,
                                marginTop: "4px",
                                zIndex: 20,
                                backgroundColor: "var(--surface)",
                                border: "1px solid var(--input-border)",
                                borderRadius: "6px",
                                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                maxHeight: "280px",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <div style={{ padding: "8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                  <span style={{ position: "absolute", left: "10px", color: "var(--text-secondary)", fontSize: "14px" }}>🔍</span>
                                  <input
                                    type="text"
                                    placeholder="Search..."
                                    value={supplierSearch}
                                    onChange={(e) => setSupplierSearch(e.target.value)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    style={{
                                      width: "100%",
                                      padding: "8px 10px 8px 32px",
                                      border: "1px solid var(--border)",
                                      borderRadius: "6px",
                                      fontSize: "13px",
                                      boxSizing: "border-box",
                                      outline: "none",
                                    }}
                                  />
                                </div>
                              </div>
                              <div style={{ overflowY: "auto", maxHeight: "220px" }}>
                              {suppliers
                                .filter(
                                  (supplier) =>
                                    supplier.namaSupplier
                                      .toLowerCase()
                                      .includes(supplierSearch.toLowerCase()) ||
                                    supplier.kodeSupplier
                                      .toLowerCase()
                                      .includes(supplierSearch.toLowerCase())
                                )
                                .map((supplier) => (
                                  <div
                                    key={supplier.id}
                                    onClick={() => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        supplierId: supplier.id,
                                      }));
                                      setSupplierSearch("");
                                      setShowSupplierDropdown(false);
                                    }}
                                    style={{
                                      padding: "10px 12px",
                                      cursor: "pointer",
                                      fontSize: "13px",
                                      transition: "background-color 0.2s",
                                      borderBottom: "1px solid var(--border)",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "var(--surface)";
                                    }}
                                  >
                                    <div style={{ fontWeight: "500", color: "var(--text-primary)" }}>
                                      {supplier.namaSupplier}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                      {supplier.kodeSupplier}
                                    </div>
                                  </div>
                                ))}
                              {suppliers.filter(
                                (supplier) =>
                                  supplier.namaSupplier
                                    .toLowerCase()
                                    .includes(supplierSearch.toLowerCase()) ||
                                  supplier.kodeSupplier
                                    .toLowerCase()
                                    .includes(supplierSearch.toLowerCase())
                              ).length === 0 && (
                                <div
                                  style={{
                                    padding: "10px 12px",
                                      fontSize: "13px",
                                      color: "var(--text-secondary)",
                                    textAlign: "center",
                                  }}
                                >
                                  No supplier found
                                </div>
                              )}
                              </div>
                            </div>
                          )}
                        </div>
                        </div>
                        <div>
                          <label
                            htmlFor="alamatSupplier"
                              style={{
                              display: "block",
                              marginBottom: "0px",
                                fontSize: "12px",
                              fontWeight: "500",
                              color: "var(--text-primary)",
                              width: "fit-content",
                              maxWidth: "200px",
                            }}
                          >
                            Alamat
                          </label>
                          <textarea
                            id="alamatSupplier"
                            readOnly
                            rows={2}
                            value={
                              formData.supplierId
                                ? (() => {
                                  const selectedSupplier = suppliers.find((s) => s.id === formData.supplierId);
                                    if (selectedSupplier) {
                                    const alamatParts = [
                                      selectedSupplier.alamat,
                                      selectedSupplier.kota,
                                      selectedSupplier.provinsi,
                                    ].filter(Boolean);
                                    return alamatParts.join(", ") || "-";
                                  }
                                    return "";
                                  })()
                                : ""
                            }
                            placeholder="Pilih supplier untuk menampilkan alamat"
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              border: "1px solid var(--border)",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: "400",
                              fontFamily: "inherit",
                              boxSizing: "border-box",
                              backgroundColor: "var(--hover-bg)",
                              color: "var(--text-primary)",
                              cursor: "default",
                              resize: "none",
                            }}
                          />
                              </div>
                            </div>
                      </div>

                    {/* Outline Group 3: Tujuan Pengiriman, Status Kirim, Description */}
                    <div style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "8px", paddingTop: "12px", position: "relative", backgroundColor: "var(--hover-bg)", display: "flex", flexDirection: "column", minHeight: "100%" }}>
                      <span style={{ position: "absolute", top: "-8px", left: "10px", background: "var(--surface)", padding: "0 4px", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}>Detail Order 3</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0px", alignItems: "stretch" }}>
                        <div style={{ minHeight: "40px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flexWrap: "nowrap" }}>
                            <div style={{ flex: "1 1 200px", minWidth: "140px", maxWidth: "280px" }}>
                          <label
                            htmlFor="tujuanPengirimanId"
                            style={{
                              display: "block",
                                  marginBottom: "0px",
                                  fontSize: "12px",
                              fontWeight: "500",
                                  color: "var(--text-primary)",
                                  width: "fit-content",
                                  minWidth: "120px",
                                  maxWidth: "260px",
                            }}
                          >
                            Tujuan Pengiriman
                          </label>
                          <select
                            id="tujuanPengirimanId"
                            name="tujuanPengirimanId"
                            value={formData.tujuanPengirimanId}
                            onChange={handleChange}
                            style={{
                              width: "100%",
                                maxWidth: "280px",
                                padding: "8px 10px",
                                border: "1px solid var(--input-border)",
                              borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "400",
                                fontFamily: "inherit",
                              boxSizing: "border-box",
                              transition: "border-color 0.2s",
                                backgroundColor: "var(--surface)",
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = "var(--primary)";
                              e.currentTarget.style.outline = "none";
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = "var(--input-border)";
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
                          <div style={{ flex: "1 1 160px", minWidth: "120px", maxWidth: "220px" }}>
                        <label
                              htmlFor="statusKirim"
                          style={{
                            display: "block",
                                marginBottom: "0px",
                                fontSize: "12px",
                            fontWeight: "500",
                                color: "var(--text-primary)",
                                width: "fit-content",
                                minWidth: "100px",
                                maxWidth: "220px",
                              }}
                            >
                              Status Kirim <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                            <select
                              id="statusKirim"
                              name="statusKirim"
                              value={formData.statusKirim || "Belum Dikirim"}
                          onChange={handleChange}
                              required
                          style={{
                            width: "100%",
                                maxWidth: "220px",
                                padding: "8px 10px",
                                border: "1px solid var(--input-border)",
                            borderRadius: "6px",
                                fontSize: "13px",
                                fontWeight: "400",
                            fontFamily: "inherit",
                            boxSizing: "border-box",
                            transition: "border-color 0.2s",
                                backgroundColor: "var(--surface)",
                          }}
                          onFocus={(e) => {
                                e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.outline = "none";
                          }}
                          onBlur={(e) => {
                                e.currentTarget.style.borderColor = "var(--input-border)";
                              }}
                            >
                              <option value="Belum Dikirim">Belum Dikirim</option>
                              <option value="Sudah Dikirim">Sudah Dikirim</option>
                              <option value="PO Terkirim">PO Terkirim</option>
                            </select>
                        </div>
                      </div>
                        </div>
                      <div>
                        <label
                          htmlFor="deskripsi"
                          style={{
                            display: "block",
                              marginBottom: "0px",
                              fontSize: "12px",
                            fontWeight: "500",
                              color: "var(--text-primary)",
                              width: "fit-content",
                              maxWidth: "200px",
                          }}
                        >
                            Description
                        </label>
                          <textarea
                            id="deskripsi"
                            name="deskripsi"
                            value={formData.deskripsi}
                          onChange={handleChange}
                            rows={2}
                            placeholder="Enter Description"
                                style={{
                            width: "100%",
                              padding: "8px 10px",
                              border: "1px solid var(--input-border)",
                            borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: "400",
                              fontFamily: "inherit",
                              resize: "vertical",
                            boxSizing: "border-box",
                            transition: "border-color 0.2s",
                          }}
                          onFocus={(e) => {
                              e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.outline = "none";
                          }}
                          onBlur={(e) => {
                              e.currentTarget.style.borderColor = "var(--input-border)";
                          }}
                        />
                      </div>
                      </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Card */}
                  <div
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "20px",
                      marginBottom: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "16px",
                        borderBottom: "2px solid var(--primary)",
                        paddingBottom: "8px",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          margin: 0,
                          color: "var(--text-primary)",
                        }}
                      >
                        Order Items
                      </h4>
                      <button
                        type="button"
                        onClick={handleAddDetail}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "var(--primary)",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "500",
                          transition: "background-color 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--primary)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--primary)";
                        }}
                      >
                        + Add
                      </button>
                    </div>

                    {formData.detailBarang.length > 0 ? (
                      <div
                        style={{
                          border: "1px solid var(--border)",
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
                            <tr style={{ backgroundColor: "var(--hover-bg)" }}>
                              <th style={{ padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>ACTION</th>
                              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>DESCRIPTION</th>
                              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>CODE</th>
                              <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>UNIT</th>
                              <th style={{ padding: "12px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>MASTER PRICE</th>
                              <th style={{ padding: "12px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>PRICE</th>
                              <th style={{ padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>QTY</th>
                              <th style={{ padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.detailBarang.map((detail) => (
                              <tr key={detail.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "12px", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDetail(detail.id)}
                                    title="Hapus"
                                    style={{
                                      padding: "6px 8px",
                                      backgroundColor: "#ef4444",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      transition: "background-color 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "#dc2626";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "#ef4444";
                                    }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      <line x1="10" y1="11" x2="10" y2="17" />
                                      <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                  </button>
                                </td>
                                <td style={{ padding: "12px" }}>
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                      setProductModalDetailId(detail.id);
                                      setShowProductModal(true);
                                      setProductModalPage(1);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setProductModalDetailId(detail.id);
                                        setShowProductModal(true);
                                        setProductModalPage(1);
                                      }
                                    }}
                                    style={{
                                      width: "100%",
                                      padding: "8px",
                                      border: "1px solid var(--input-border)",
                                      borderRadius: "4px",
                                      fontSize: "13px",
                                      boxSizing: "border-box",
                                      cursor: "pointer",
                                      backgroundColor: "var(--surface)",
                                      minHeight: "36px",
                                      display: "flex",
                                      alignItems: "center",
                                      color: detail.namaProduk ? "#1e293b" : "#64748b",
                                    }}
                                  >
                                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{detail.namaProduk || "Select Product"}</span>
                                    <span style={{ marginLeft: "8px", flexShrink: 0, fontSize: "12px", color: "var(--text-secondary)" }}>▼</span>
                                  </div>
                                </td>
                                <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                  {detail.kodeProduk || "-"}
                                </td>
                                <td style={{ padding: "12px" }}>
                                  {(() => {
                                    const product = products.find((p) => p.id === detail.produkId);
                                    if (product && product.units && product.units.length > 0) {
                                      return (
                                        <select
                                          value={detail.unitId || ""}
                                          onChange={(e) =>
                                            handleDetailChange(detail.id, "unitId", e.target.value)
                                          }
                                          required
                                          style={{
                                            width: "100%",
                                            padding: "8px",
                                            border: "1px solid var(--input-border)",
                                            borderRadius: "4px",
                                            fontSize: "13px",
                                            boxSizing: "border-box",
                                          }}
                                        >
                                          {product.units
                                            .sort((a, b) => a.urutan - b.urutan)
                                            .map((unit) => (
                                              <option key={unit.id} value={unit.id}>
                                                {unit.namaUnit} - {formatCurrency(unit.hargaBeli)}
                                              </option>
                                            ))}
                                        </select>
                                      );
                                    }
                                    return <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{detail.satuan || "-"}</span>;
                                  })()}
                                </td>
                                <td style={{ padding: "12px", textAlign: "right", fontSize: "13px", color: "var(--text-secondary)" }}>
                                  {formatCurrency(detail.hargaSatuan || 0)}
                                </td>
                                <td style={{ padding: "12px" }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={detail.hargaSatuan}
                                    onChange={(e) =>
                                      handleDetailChange(detail.id, "hargaSatuan", parseFloat(e.target.value) || 0)
                                    }
                                    required
                                    style={{
                                      width: "120px",
                                      padding: "8px",
                                      border: "1px solid var(--input-border)",
                                      borderRadius: "4px",
                                      fontSize: "13px",
                                      textAlign: "right",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "12px" }}>
                                  <input
                                    type="number"
                                    min="1"
                                    value={detail.qty}
                                    onChange={(e) =>
                                      handleDetailChange(detail.id, "qty", parseInt(e.target.value) || 0)
                                    }
                                    required
                                    style={{
                                      width: "80px",
                                      padding: "8px",
                                      border: "1px solid var(--input-border)",
                                      borderRadius: "4px",
                                      fontSize: "13px",
                                      textAlign: "center",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "12px" }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={detail.diskon}
                                    onChange={(e) =>
                                      handleDetailChange(detail.id, "diskon", parseFloat(e.target.value) || 0)
                                    }
                                    style={{
                                      width: "70px",
                                      padding: "8px",
                                      border: "1px solid var(--input-border)",
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
                          border: "1px dashed var(--input-border)",
                          borderRadius: "6px",
                          color: "var(--text-secondary)",
                          fontSize: "14px",
                        }}
                      >
                        No items. Click Add to add items.
                      </div>
                    )}
                  </div>

                  {/* Summary Card */}
                  <div
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
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
                        color: "var(--text-primary)",
                        borderBottom: "2px solid var(--primary)",
                        paddingBottom: "8px",
                      }}
                    >
                      Summary
                    </h4>

                    <div style={{ display: "grid", gridTemplateColumns: "10% 10%", gap: "16px", marginBottom: "20px" }}>
                      <div style={{ minWidth: 0 }}>
                        <label
                          htmlFor="diskonGlobal"
                          style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "10px",
                            fontWeight: "500",
                            color: "var(--text-primary)",
                            width: "100%",
                          }}
                        >
                          Global Discount (%)
                        </label>
                        <input
                          type="number"
                          id="diskonGlobal"
                          name="diskonGlobal"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.diskonGlobal}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "1px solid var(--input-border)",
                            borderRadius: "6px",
                            fontSize: "13px",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <label
                          htmlFor="ppn"
                          style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "10px",
                            fontWeight: "500",
                            color: "var(--text-primary)",
                            width: "100%",
                          }}
                        >
                          PPN (%) <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <select
                          id="ppn"
                          name="ppn"
                          value={formData.ppn.toString()}
                          onChange={handleChange}
                          required
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "1px solid var(--input-border)",
                            borderRadius: "6px",
                            fontSize: "13px",
                            boxSizing: "border-box",
                            backgroundColor: "var(--surface)",
                            transition: "border-color 0.2s",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.outline = "none";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "var(--input-border)";
                          }}
                        >
                          <option value="11">11%</option>
                          <option value="12">12%</option>
                        </select>
                      </div>
                    </div>

                    <div
                      style={{
                        paddingTop: "16px",
                        borderTop: "2px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
                        <span>Subtotal:</span>
                        <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>{formatCurrency(totals.subtotal)}</span>
                      </div>
                      {totals.diskonAmount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
                          <span>Discount:</span>
                          <span style={{ fontWeight: "500", color: "#10b981" }}>-{formatCurrency(totals.diskonAmount)}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
                        <span>PPN ({formData.ppn}%):</span>
                        <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>{formatCurrency(totals.ppnAmount)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "12px", borderTop: "2px solid var(--border)", fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
                        <span>Total:</span>
                        <span>{formatCurrency(totals.total)}</span>
                      </div>
                    </div>
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

                {/* Footer */}
                <div
                  style={{
                    padding: "20px 24px",
                    borderTop: "1px solid var(--border)",
                    backgroundColor: "var(--hover-bg)",
                    display: "flex",
                    gap: "12px",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottomLeftRadius: "8px",
                    borderBottomRightRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", gap: "12px" }}>
                    {editingPesanan && (
                      <>
                        <button
                          type="button"
                          onClick={handlePrint}
                          style={{
                            padding: "10px 20px",
                            backgroundColor: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "500",
                            transition: "background-color 0.2s",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#059669";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#10b981";
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                          </svg>
                          Print
                        </button>
                        {editingPesanan.statusKirim !== "PO Terkirim" && (
                          <button
                            type="button"
                            onClick={() => handleKirimPO(editingPesanan.id)}
                            style={{
                              padding: "10px 20px",
                              backgroundColor: "#f59e0b",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: "500",
                              transition: "background-color 0.2s",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#d97706";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#f59e0b";
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="22" y1="2" x2="11" y2="13" />
                              <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            Kirim PO
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={loading}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "var(--surface)";
                      }
                    }}
                  >
                    Cancel
                  </button>
                    {approvedPengajuan ? (
                      <>
                        {approvedPengajuan.jenisPengajuan === "Edit Transaksi" ? (
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
                            {loading ? "Saving..." : "Simpan"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleHapusPO}
                            style={{
                              padding: "10px 20px",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: "500",
                              transition: "background-color 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#dc2626";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#ef4444";
                            }}
                          >
                            Hapus
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleBatalPengajuan}
                          style={{
                            padding: "10px 20px",
                            backgroundColor: "#f59e0b",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "500",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#d97706";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#f59e0b";
                          }}
                        >
                          Batal Pengajuan
                        </button>
                      </>
                    ) : hasPengajuan ? (
                      <button
                        type="button"
                        onClick={handleRefresh}
                        style={{
                          padding: "10px 20px",
                          backgroundColor: "#10b981",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "background-color 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#059669";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#10b981";
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="23 4 23 10 17 10" />
                          <polyline points="1 20 1 14 7 14" />
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        Refresh
                      </button>
                    ) : (
                      <button
                        type={editingPesanan ? "button" : "submit"}
                        onClick={editingPesanan ? handleOpenPengajuanModal : undefined}
                    disabled={loading}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: loading ? "#9ca3af" : "var(--primary)",
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
                        e.currentTarget.style.backgroundColor = "var(--primary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "var(--primary)";
                      }
                    }}
                  >
                        {loading
                          ? "Saving..."
                          : editingPesanan
                          ? "Ajukan Perubahan"
                          : "Save Order"}
                  </button>
                    )}
                  </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Pilih Produk */}
            {showProductModal && productModalDetailId && (
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
                  zIndex: 1002,
                }}
                onClick={() => { setShowProductModal(false); setProductModalDetailId(null); }}
              >
                <div
                  style={{
                    backgroundColor: "var(--surface)",
                    borderRadius: "8px",
                    padding: "24px",
                    width: "90%",
                    maxWidth: "800px",
                    maxHeight: "85vh",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                      <h3 style={{ fontSize: "18px", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>Pilih Produk</h3>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>Pilih produk dari daftar di bawah ini</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowProductModal(false); setProductModalDetailId(null); }}
                      style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "var(--text-secondary)", padding: 0, width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ overflow: "auto", flex: 1, border: "1px solid var(--border)", borderRadius: "6px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--hover-bg)", position: "sticky", top: 0 }}>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Kode</th>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", minWidth: "200px" }}>Nama</th>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Satuan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const usedProdukIds = formData.detailBarang.filter((d) => d.id !== productModalDetailId && d.produkId).map((d) => d.produkId);
                          const availableProducts = products.filter((p) => formData.detailBarang.some((d) => d.id === productModalDetailId && d.produkId === p.id) || !usedProdukIds.includes(p.id));
                          const start = (productModalPage - 1) * PRODUCTS_PER_PAGE;
                          const paginatedProducts = availableProducts.slice(start, start + PRODUCTS_PER_PAGE);
                          const totalPages = Math.max(1, Math.ceil(availableProducts.length / PRODUCTS_PER_PAGE));
                          return (
                            <>
                              {paginatedProducts.length === 0 ? (
                                <tr><td colSpan={3} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>Tidak ada produk</td></tr>
                              ) : (
                                paginatedProducts.map((p) => (
                                  <tr
                                    key={p.id}
                                    onClick={() => {
                                      if (productModalDetailId) {
                                        handleDetailChange(productModalDetailId, "produkId", p.id);
                                        setShowProductModal(false);
                                        setProductModalDetailId(null);
                                      }
                                    }}
                                    style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--hover-bg)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--surface)"; }}
                                  >
                                    <td style={{ padding: "10px 12px", color: "var(--text-primary)" }}>{p.kodeProduk}</td>
                                    <td style={{ padding: "10px 12px", color: "var(--text-primary)" }}>{p.namaProduk}</td>
                                    <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{p.satuan || "-"}</td>
                                  </tr>
                                ))
                              )}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const usedProdukIds = formData.detailBarang.filter((d) => d.id !== productModalDetailId && d.produkId).map((d) => d.produkId);
                    const availableProducts = products.filter((p) => formData.detailBarang.some((d) => d.id === productModalDetailId && d.produkId === p.id) || !usedProdukIds.includes(p.id));
                    const totalPages = Math.max(1, Math.ceil(availableProducts.length / PRODUCTS_PER_PAGE));
                    const start = (productModalPage - 1) * PRODUCTS_PER_PAGE;
                    const end = Math.min(start + PRODUCTS_PER_PAGE, availableProducts.length);
                    return (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border)", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <span>Menampilkan {availableProducts.length === 0 ? 0 : start + 1} - {end} dari {availableProducts.length} item</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button type="button" onClick={() => setProductModalPage((prev) => Math.max(1, prev - 1))} disabled={productModalPage <= 1} style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "6px", backgroundColor: "var(--surface)", cursor: productModalPage <= 1 ? "not-allowed" : "pointer", fontSize: "13px", opacity: productModalPage <= 1 ? 0.6 : 1 }}>←</button>
                          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Halaman {productModalPage} dari {totalPages}</span>
                          <button type="button" onClick={() => setProductModalPage((prev) => Math.min(totalPages, prev + 1))} disabled={productModalPage >= totalPages} style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "6px", backgroundColor: "var(--surface)", cursor: productModalPage >= totalPages ? "not-allowed" : "pointer", fontSize: "13px", opacity: productModalPage >= totalPages ? 0.6 : 1 }}>→</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

        {/* View Modal */}
        {isViewModalOpen && viewingPesanan && (
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
            onClick={() => setIsViewModalOpen(false)}
          >
            <div
              style={{
                backgroundColor: "var(--surface)",
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
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "var(--hover-bg)",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                }}
              >
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    margin: 0,
                    color: "var(--text-primary)",
                  }}
                >
                  Detail Pesanan Pembelian
                </h3>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
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
                    e.currentTarget.style.backgroundColor = "var(--hover-bg)";
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
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
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
                      color: "var(--text-primary)",
                      borderBottom: "2px solid var(--primary)",
                      paddingBottom: "8px",
                    }}
                  >
                    Order Details
                  </h4>
                  
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "16px",
                    }}
                  >
                    {/* Row 1: Document No, Date */}
                    <div>
                      <label style={{ display: "block", marginBottom: "0px", fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>
                        Document No
                      </label>
                      <div style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: "500" }}>{viewingPesanan.nomorPesanan}</div>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0px", fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>
                        Date
                      </label>
                      <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{formatDateDDMMMYYYY(viewingPesanan.tanggalPesanan)}</div>
                    </div>
                    {/* Row 2: Payment Terms, Required Date */}
                    <div>
                      <label style={{ display: "block", marginBottom: "0px", fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>
                        Payment Terms
                      </label>
                      <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{viewingPesanan.jangkaWaktuPembayaran || "-"}</div>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0px", fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>
                        Required Date
                      </label>
                      <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{formatDateDDMMMYYYY(viewingPesanan.tanggalDibutuhkan)}</div>
                    </div>
                    {/* Row 3: Supplier, Tujuan Pengiriman */}
                    <div>
                      <label style={{ display: "block", marginBottom: "0px", fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>
                        Supplier
                      </label>
                      <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                        {suppliers.find(s => s.id === viewingPesanan.supplierId)?.namaSupplier || viewingPesanan.supplierId}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0px", fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>
                        Tujuan Pengiriman
                      </label>
                      <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                        {viewingPesanan.tujuanPengirimanId 
                          ? apotiks.find((a) => a.id === viewingPesanan.tujuanPengirimanId)?.namaApotik || "-"
                          : "-"}
                      </div>
                    </div>
                    {/* Row 4: Description */}
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", marginBottom: "0px", fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>
                        Description
                      </label>
                      <div style={{ fontSize: "14px", color: "var(--text-primary)" }}>{viewingPesanan.deskripsi || "-"}</div>
                    </div>
                    {/* Status Kirim */}
                    <div>
                      <label style={{ display: "block", marginBottom: "0px", fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>
                        Status Kirim
                      </label>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor:
                            viewingPesanan.statusKirim === "PO Terkirim"
                              ? "#dbeafe"
                              : viewingPesanan.statusKirim === "Sudah Dikirim"
                              ? "#d1fae5"
                              : "#fee2e2",
                          color:
                            viewingPesanan.statusKirim === "PO Terkirim"
                              ? "#1e40af"
                              : viewingPesanan.statusKirim === "Sudah Dikirim"
                              ? "#065f46"
                              : "#991b1b",
                        }}
                      >
                        {viewingPesanan.statusKirim || "Belum Dikirim"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
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
                      color: "var(--text-primary)",
                      borderBottom: "2px solid var(--primary)",
                      paddingBottom: "8px",
                    }}
                  >
                    Order Items
                  </h4>

                  {viewingPesanan.detailBarang && viewingPesanan.detailBarang.length > 0 ? (
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "var(--hover-bg)" }}>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>DESCRIPTION</th>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>CODE</th>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>UNIT</th>
                            <th style={{ padding: "12px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>PRICE</th>
                            <th style={{ padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>QTY</th>
                            <th style={{ padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>DISKON (%)</th>
                            <th style={{ padding: "12px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>SUBTOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingPesanan.detailBarang.map((detail: DetailBarang, index: number) => (
                            <tr key={detail.id || index} style={{ borderBottom: "1px solid var(--border)" }}>
                              <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-primary)" }}>{detail.namaProduk}</td>
                              <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>{detail.kodeProduk || "-"}</td>
                              <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>{detail.namaUnit || detail.satuan || "-"}</td>
                              <td style={{ padding: "12px", fontSize: "13px", textAlign: "right", color: "var(--text-primary)" }}>{formatCurrency(detail.hargaSatuan || 0)}</td>
                              <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", color: "var(--text-primary)" }}>{detail.qty}</td>
                              <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", color: "var(--text-primary)" }}>{detail.diskon || 0}%</td>
                              <td style={{ padding: "12px", fontSize: "13px", textAlign: "right", fontWeight: "500", color: "var(--text-primary)" }}>{formatCurrency(detail.subtotal || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
                      No items
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "20px",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      margin: "0 0 20px 0",
                      color: "var(--text-primary)",
                      borderBottom: "2px solid var(--primary)",
                      paddingBottom: "8px",
                    }}
                  >
                    Summary
                  </h4>

                  <div style={{ paddingTop: "16px", borderTop: "2px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
                      <span>Subtotal:</span>
                      <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>{formatCurrency(viewingPesanan.subtotal || 0)}</span>
                    </div>
                    {viewingPesanan.diskonAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
                        <span>Discount:</span>
                        <span style={{ fontWeight: "500", color: "#10b981" }}>-{formatCurrency(viewingPesanan.diskonAmount || 0)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
                      <span>PPN ({viewingPesanan.ppn || 11}%):</span>
                      <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>{formatCurrency(viewingPesanan.ppnAmount || 0)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "12px", borderTop: "2px solid var(--border)", fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
                      <span>Total:</span>
                      <span>{formatCurrency(viewingPesanan.total || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "20px 24px",
                  borderTop: "1px solid var(--border)",
                  backgroundColor: "var(--hover-bg)",
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
                    backgroundColor: "var(--primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--primary)";
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
                backgroundColor: "var(--surface)",
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
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "var(--hover-bg)",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px",
                }}
              >
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    margin: 0,
                    color: "var(--text-primary)",
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
                    color: "var(--text-secondary)",
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
                    e.currentTarget.style.backgroundColor = "var(--hover-bg)";
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
                        color: "var(--text-primary)",
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
                        border: "1px solid var(--input-border)",
                        borderRadius: "6px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                        backgroundColor: "var(--surface)",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--primary)";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--input-border)";
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
                        color: "var(--text-primary)",
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
                        border: "1px solid var(--input-border)",
                        borderRadius: "6px",
                        fontSize: "14px",
                        fontFamily: "inherit",
                        resize: "vertical",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--primary)";
                        e.currentTarget.style.outline = "none";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "var(--input-border)";
                      }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div
                  style={{
                    padding: "20px 24px",
                    borderTop: "1px solid var(--border)",
                    backgroundColor: "var(--hover-bg)",
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
                      color: "var(--text-primary)",
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
                      backgroundColor: "var(--primary)",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--primary)";
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
