"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface ProductUnit {
  id: string;
  namaUnit: string;
  hargaBeli: number;
  hargaJual: number;
  konversi: number; // Faktor konversi ke unit terkecil (pieces)
  isBaseUnit: boolean; // Unit terkecil (pieces)
  urutan: number; // Urutan dari terbesar ke terkecil
}

interface ProductFormData {
  kodeProduk: string;
  namaProduk: string;
  kategori: string;
  type: string;
  jenis: string;
  satuan: string;
  hargaBeli: string;
  hargaJual: string;
  stokMinimum: string;
  stokMaksimum: string;
  stokAwal: string;
  supplier: string;
  keterangan: string;
  statusAktif: boolean;
}

interface Product {
  id: string;
  kodeProduk: string;
  namaProduk: string;
  kategori: string;
  type?: string;
  jenis?: string;
  satuan: string;
  hargaBeli: number;
  hargaJual: number;
  units?: ProductUnit[]; // Array multiple unit
  stokMinimum: number;
  stokMaksimum: number;
  stokAwal: number;
  supplier: string;
  keterangan: string;
  statusAktif: boolean;
  createdAt: Date;
  operator?: string; // User yang membuat/mengupdate
  updatedAt?: Date; // Tanggal terakhir update
}

export default function DataProductPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    kodeProduk: "",
    namaProduk: "",
    kategori: "",
    type: "",
    jenis: "",
    satuan: "",
    hargaBeli: "",
    hargaJual: "",
    stokMinimum: "",
    stokMaksimum: "",
    stokAwal: "",
    supplier: "",
    keterangan: "",
    statusAktif: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [jenisList, setJenisList] = useState<any[]>([]);
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isPengajuanModalOpen, setIsPengajuanModalOpen] = useState(false);
  const [pengajuanData, setPengajuanData] = useState({
    jenisPengajuan: "",
    alasanPengajuan: "",
  });
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [currentPengajuan, setCurrentPengajuan] = useState<any | null>(null);
  const [pengajuanStatus, setPengajuanStatus] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

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

  // Load suppliers, units, types, and jenis from localStorage
  useEffect(() => {
    const savedSuppliers = localStorage.getItem("suppliers");
    if (savedSuppliers) {
      try {
        setSuppliers(JSON.parse(savedSuppliers));
      } catch (err) {
        console.error("Error loading suppliers:", err);
      }
    }

    const savedUnits = localStorage.getItem("units");
    if (savedUnits) {
      try {
        setUnits(JSON.parse(savedUnits));
      } catch (err) {
        console.error("Error loading units:", err);
      }
    }

    const savedTypes = localStorage.getItem("types");
    if (savedTypes) {
      try {
        setTypes(JSON.parse(savedTypes));
      } catch (err) {
        console.error("Error loading types:", err);
      }
    }

    const savedJenis = localStorage.getItem("jenis");
    if (savedJenis) {
      try {
        setJenisList(JSON.parse(savedJenis));
      } catch (err) {
        console.error("Error loading jenis:", err);
      }
    }
  }, []);

  // Load products and pengajuan from API (Supabase) first, fallback to localStorage
  useEffect(() => {
    let cancelled = false;
    function loadFromLocalStorage() {
      const saved = localStorage.getItem("products");
      if (saved) try {
        const parsed = JSON.parse(saved);
        setProducts(parsed.map((p: any) => ({ ...p, createdAt: new Date(p.createdAt), updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined })));
      } catch (_) {}
      const sp = localStorage.getItem("pengajuanProduk");
      if (sp) try { setPengajuanList(JSON.parse(sp)); } catch (_) {}
    }
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token || cancelled) { loadFromLocalStorage(); setIsLoadingData(false); return; }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/products", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/pengajuanProduk", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      ]).then(([arr, pengajuan]) => {
        if (cancelled) return;
        if (Array.isArray(arr) && arr.length > 0) {
          setProducts(arr.map((p: any) => ({ ...p, createdAt: p.createdAt ? new Date(p.createdAt) : new Date(), updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined })));
          localStorage.setItem("products", JSON.stringify(arr));
        } else loadFromLocalStorage();
        if (Array.isArray(pengajuan) && pengajuan.length > 0) { setPengajuanList(pengajuan); localStorage.setItem("pengajuanProduk", JSON.stringify(pengajuan)); }
        else { const sp = localStorage.getItem("pengajuanProduk"); if (sp) try { setPengajuanList(JSON.parse(sp)); } catch (_) {} }
      }).catch(() => { if (!cancelled) loadFromLocalStorage(); }).finally(() => { if (!cancelled) setIsLoadingData(false); });
    }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    return () => { cancelled = true; };
  }, []);

  // Check pengajuan status when editingProduct changes
  useEffect(() => {
    if (editingProduct) {
      const savedPengajuan = localStorage.getItem("pengajuanProduk");
      let currentPengajuanList: any[] = [];
      
      if (savedPengajuan) {
        try {
          currentPengajuanList = JSON.parse(savedPengajuan);
          setPengajuanList((prevList) => {
            if (JSON.stringify(currentPengajuanList) !== JSON.stringify(prevList)) {
              return currentPengajuanList;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan:", err);
        }
      }
      
      if (currentPengajuanList.length > 0) {
        const activePengajuan = currentPengajuanList.find(
          (p: any) => p.produkId === editingProduct.id && 
          (p.status === "Menunggu Persetujuan" || p.status === "Disetujui" || p.status === "Ditolak")
        );
        
        if (activePengajuan) {
          setCurrentPengajuan(activePengajuan);
          setPengajuanStatus(activePengajuan.status);
          
          if (activePengajuan.status === "Ditolak") {
            setIsSaved(false);
            setShowNotification(false);
            setHasRefreshed(false);
          } else if (activePengajuan.status === "Disetujui") {
            setHasRefreshed(true);
            setShowNotification(false);
            if (activePengajuan.jenisPengajuan === "Edit Data" && activePengajuan.formData) {
              setFormData(activePengajuan.formData);
              if (activePengajuan.productUnits) {
                setProductUnits(activePengajuan.productUnits);
              }
            }
            setIsSaved(false);
          } else {
            setShowNotification(false);
          }
        } else {
          setCurrentPengajuan(null);
          setPengajuanStatus(null);
          setShowNotification(false);
        }
      } else {
        setCurrentPengajuan(null);
        setPengajuanStatus(null);
        setShowNotification(false);
      }
    } else {
      setCurrentPengajuan(null);
      setPengajuanStatus(null);
      setShowNotification(false);
      setHasRefreshed(false);
    }
  }, [editingProduct]);

  // React to pengajuanList changes when editing
  useEffect(() => {
    if (!editingProduct) return;

    const activePengajuan = pengajuanList.find(
      (p: any) => p.produkId === editingProduct.id && 
      (p.status === "Menunggu Persetujuan" || p.status === "Disetujui" || p.status === "Ditolak")
    );
    
    if (activePengajuan) {
      setCurrentPengajuan(activePengajuan);
      setPengajuanStatus(activePengajuan.status);
      
      if (activePengajuan.status === "Ditolak") {
        setIsSaved(false);
        setShowNotification(false);
        setHasRefreshed(false);
      } else if (activePengajuan.status === "Disetujui") {
        setHasRefreshed(true);
        setShowNotification(false);
        if (activePengajuan.jenisPengajuan === "Edit Data" && activePengajuan.formData) {
          setFormData(activePengajuan.formData);
          if (activePengajuan.productUnits) {
            setProductUnits(activePengajuan.productUnits);
          }
        }
        setIsSaved(false);
      } else {
        setShowNotification(false);
      }
    } else {
      setCurrentPengajuan(null);
      setPengajuanStatus(null);
      setShowNotification(false);
    }
  }, [pengajuanList, editingProduct]);

  // Poll for pengajuan status changes when modal is open
  useEffect(() => {
    if (!isModalOpen || !editingProduct) return;

    const interval = setInterval(() => {
      const savedPengajuan = localStorage.getItem("pengajuanProduk");
      if (savedPengajuan) {
        try {
          const currentList = JSON.parse(savedPengajuan);
          setPengajuanList((prevList) => {
            const prevStr = JSON.stringify(prevList);
            const currentStr = JSON.stringify(currentList);
            if (prevStr !== currentStr) {
              const activePengajuan = currentList.find(
                (p: any) => p.produkId === editingProduct.id && 
                (p.status === "Menunggu Persetujuan" || p.status === "Disetujui" || p.status === "Ditolak")
              );
              if (activePengajuan) {
                setCurrentPengajuan(activePengajuan);
                setPengajuanStatus(activePengajuan.status);
                if (activePengajuan.status === "Disetujui") {
                  setHasRefreshed(true);
                  setIsSaved(false);
                }
              }
              return currentList;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error polling pengajuan:", err);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isModalOpen, editingProduct]);

  // Save to localStorage and sync to API whenever products or pengajuan change
  useEffect(() => {
    if (!isLoadingData) {
      localStorage.setItem("products", JSON.stringify(products));
    }
  }, [products, isLoadingData]);
  useEffect(() => {
    if (!isLoadingData) {
      getSupabaseClient().auth.getSession().then(({ data }) => {
        if (data.session?.access_token) {
          const payload = products.map((p) => ({ ...p, createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt, updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt }));
          fetch("/api/data/products", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: payload }) }).catch(() => {});
        }
      });
    }
  }, [products, isLoadingData]);
  useEffect(() => {
    if (!isLoadingData) {
      getSupabaseClient().auth.getSession().then(({ data }) => {
        if (data.session?.access_token) {
          fetch("/api/data/pengajuanProduk", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: pengajuanList }) }).catch(() => {});
        }
      });
    }
  }, [pengajuanList, isLoadingData]);

  // Generate kode produk otomatis
  const generateKodeProduk = (): string => {
    const existingProducts = products.filter((p) => {
      // Ambil hanya produk dengan kode yang match pattern OB-XXXXXXXX
      return p.kodeProduk && p.kodeProduk.startsWith("OB-");
    });
    
    if (existingProducts.length === 0) {
      return "OB-00000001";
    }
    
    // Ambil nomor terbesar dari kode yang ada
    const numbers = existingProducts
      .map((p) => {
        const match = p.kodeProduk.match(/OB-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    
    // Format dengan 8 digit leading zeros
    return `OB-${String(nextNumber).padStart(8, "0")}`;
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setEditingProduct(null);
    setError(null);
    setProductUnits([]);
    setIsSaved(false);
    // Reset form dan generate kode otomatis untuk produk baru
    setFormData({
      kodeProduk: generateKodeProduk(),
      namaProduk: "",
      kategori: "",
      type: "",
      jenis: "",
      satuan: "",
      hargaBeli: "",
      hargaJual: "",
      stokMinimum: "",
      stokMaksimum: "",
      stokAwal: "",
      supplier: "",
      keterangan: "",
      statusAktif: true,
    });
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setHasRefreshed(false);
    setShowNotification(false);
    
    let initialFormData = {
      kodeProduk: product.kodeProduk,
      namaProduk: product.namaProduk,
      kategori: product.kategori,
      type: product.type || "",
      jenis: product.jenis || "",
      satuan: product.satuan,
      hargaBeli: product.hargaBeli.toString(),
      hargaJual: product.hargaJual.toString(),
      stokMinimum: product.stokMinimum.toString(),
      stokMaksimum: product.stokMaksimum.toString(),
      stokAwal: product.stokAwal.toString(),
      supplier: product.supplier,
      keterangan: product.keterangan,
      statusAktif: product.statusAktif,
    };
    
    let initialProductUnits = product.units || [];
    
    const savedPengajuan = localStorage.getItem("pengajuanProduk");
    if (savedPengajuan) {
      try {
        const pengajuanList = JSON.parse(savedPengajuan);
        const approvedPengajuan = pengajuanList.find(
          (p: any) => p.produkId === product.id && p.status === "Disetujui"
        );
        
        if (approvedPengajuan) {
          setHasRefreshed(true);
          setCurrentPengajuan(approvedPengajuan);
          setPengajuanStatus("Disetujui");
          setIsSaved(false);
          
          if (approvedPengajuan.jenisPengajuan === "Edit Data" && approvedPengajuan.formData) {
            initialFormData = approvedPengajuan.formData;
            if (approvedPengajuan.productUnits) {
              initialProductUnits = approvedPengajuan.productUnits;
            }
          }
        } else {
          setIsSaved(true);
        }
      } catch (err) {
        console.error("Error checking pengajuan:", err);
        setIsSaved(true);
      }
    } else {
      setIsSaved(true);
    }
    
    setFormData(initialFormData);
    setProductUnits(initialProductUnits);
    setIsModalOpen(true);
    setError(null);
  };

  const handleViewProduct = (product: Product) => {
    // Gunakan logic yang sama dengan handleEditProduct untuk langsung buka modal form
    setEditingProduct(product);
    setHasRefreshed(false);
    setShowNotification(false);
    
    let initialFormData = {
      kodeProduk: product.kodeProduk,
      namaProduk: product.namaProduk,
      kategori: product.kategori,
      type: product.type || "",
      jenis: product.jenis || "",
      satuan: product.satuan,
      hargaBeli: product.hargaBeli.toString(),
      hargaJual: product.hargaJual.toString(),
      stokMinimum: product.stokMinimum.toString(),
      stokMaksimum: product.stokMaksimum.toString(),
      stokAwal: product.stokAwal.toString(),
      supplier: product.supplier,
      keterangan: product.keterangan,
      statusAktif: product.statusAktif,
    };
    
    let initialProductUnits = product.units || [];
    
    // Check pengajuan status
    const savedPengajuan = localStorage.getItem("pengajuanProduk");
    if (savedPengajuan) {
      try {
        const pengajuanList = JSON.parse(savedPengajuan);
        const approvedPengajuan = pengajuanList.find(
          (p: any) => p.produkId === product.id && p.status === "Disetujui"
        );
        
        if (approvedPengajuan) {
          setHasRefreshed(true);
          setCurrentPengajuan(approvedPengajuan);
          setPengajuanStatus("Disetujui");
          setIsSaved(false);
          
          if (approvedPengajuan.jenisPengajuan === "Edit Data" && approvedPengajuan.formData) {
            initialFormData = approvedPengajuan.formData;
            if (approvedPengajuan.productUnits) {
              initialProductUnits = approvedPengajuan.productUnits;
            }
          }
        } else {
          setIsSaved(true);
        }
      } catch (err) {
        console.error("Error checking pengajuan:", err);
        setIsSaved(true);
      }
    } else {
      setIsSaved(true);
    }
    
    setFormData(initialFormData);
    setProductUnits(initialProductUnits);
    setIsModalOpen(true); // Langsung buka modal form
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      kodeProduk: "",
      namaProduk: "",
      kategori: "",
      type: "",
      jenis: "",
      satuan: "",
      hargaBeli: "",
      hargaJual: "",
      stokMinimum: "",
      stokMaksimum: "",
      stokAwal: "",
      supplier: "",
      keterangan: "",
      statusAktif: true,
    });
    setProductUnits([]);
    setError(null);
    setIsSaved(false);
    setCurrentPengajuan(null);
    setPengajuanStatus(null);
    setShowNotification(false);
    setHasRefreshed(false);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingProduct(null);
  };

  // Fungsi untuk menambah unit
  const handleAddUnit = () => {
    const newUnit: ProductUnit = {
      id: Date.now().toString(),
      namaUnit: "",
      hargaBeli: 0,
      hargaJual: 0,
      konversi: 1,
      isBaseUnit: productUnits.length === 0, // Unit pertama adalah base unit
      urutan: productUnits.length + 1
    };
    setProductUnits([...productUnits, newUnit]);
  };

  // Fungsi untuk menghapus unit
  const handleRemoveUnit = (id: string) => {
    const unitToRemove = productUnits.find(u => u.id === id);
    if (unitToRemove?.isBaseUnit) {
      setError("Unit dasar tidak dapat dihapus");
      return;
    }
    setProductUnits(productUnits.filter(unit => unit.id !== id));
  };

  // Fungsi untuk update unit
  const handleUnitChange = (id: string, field: keyof ProductUnit, value: any) => {
    setProductUnits(productUnits.map(unit => {
      if (unit.id === id) {
        const updated = { ...unit, [field]: value };
        // Jika mengubah isBaseUnit menjadi true, set yang lain menjadi false
        if (field === "isBaseUnit" && value === true) {
          return { ...updated, konversi: 1 };
        }
        return updated;
      }
      // Jika ada unit lain yang di-set sebagai base unit, set isBaseUnit menjadi false
      if (field === "isBaseUnit" && value === true) {
        return { ...unit, isBaseUnit: false };
      }
      return unit;
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (isSaved && editingProduct) {
      setIsSaved(false);
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validasi: minimal harus ada 1 unit jika menggunakan multiple unit
      if (productUnits.length > 0) {
        const hasBaseUnit = productUnits.some(u => u.isBaseUnit);
        if (!hasBaseUnit) {
          throw new Error("Harus ada minimal 1 unit dasar (base unit)");
        }
        
        // Validasi semua unit harus memiliki nama
        const invalidUnits = productUnits.filter(u => !u.namaUnit.trim());
        if (invalidUnits.length > 0) {
          throw new Error("Semua unit harus memiliki nama");
        }
      }
      
      // Generate kode otomatis jika belum ada atau untuk produk baru
      let kodeProdukFinal = formData.kodeProduk;
      if (!editingProduct && (!kodeProdukFinal || kodeProdukFinal.trim() === "")) {
        kodeProdukFinal = generateKodeProduk();
      }
      
      // Validasi kode produk tidak boleh duplikat (kecuali sedang edit produk yang sama)
      const isDuplicate = products.some(
        (p) => p.kodeProduk === kodeProdukFinal && p.id !== editingProduct?.id
      );
      if (isDuplicate) {
        throw new Error("Kode produk sudah digunakan. Kode akan di-generate otomatis.");
      }
      
      // Simulasi delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Tentukan harga default (untuk backward compatibility)
      let defaultHargaBeli = parseFloat(formData.hargaBeli) || 0;
      let defaultHargaJual = parseFloat(formData.hargaJual) || 0;
      let defaultSatuan = formData.satuan;
      
      // Jika ada multiple unit, gunakan unit pertama sebagai default
      if (productUnits.length > 0) {
        const sortedUnits = [...productUnits].sort((a, b) => a.urutan - b.urutan);
        const firstUnit = sortedUnits[0];
        defaultHargaBeli = firstUnit.hargaBeli;
        defaultHargaJual = firstUnit.hargaJual;
        defaultSatuan = firstUnit.namaUnit;
      }
      
      // Tambahkan atau update produk
      const now = new Date();
      const userEmail = currentUserEmail || "System";
      
      const newProduct: Product = {
        id: editingProduct ? editingProduct.id : Date.now().toString(),
        kodeProduk: kodeProdukFinal,
        namaProduk: formData.namaProduk,
        kategori: formData.kategori,
        type: formData.type || undefined,
        jenis: formData.jenis || undefined,
        satuan: defaultSatuan,
        hargaBeli: defaultHargaBeli,
        hargaJual: defaultHargaJual,
        units: productUnits.length > 0 ? productUnits : undefined,
        stokMinimum: parseFloat(formData.stokMinimum) || 0,
        stokMaksimum: parseFloat(formData.stokMaksimum) || 0,
        stokAwal: parseFloat(formData.stokAwal) || 0,
        supplier: formData.supplier,
        keterangan: formData.keterangan,
        statusAktif: formData.statusAktif,
        createdAt: editingProduct ? editingProduct.createdAt : now,
        operator: editingProduct ? (editingProduct.operator || userEmail) : userEmail,
        updatedAt: now,
      };
      
      if (editingProduct) {
        // Update existing product - preserve original operator, update updatedAt
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? newProduct : p))
        );
        
        if (currentPengajuan && pengajuanStatus === "Disetujui" && currentPengajuan.jenisPengajuan === "Edit Data") {
          const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
          localStorage.setItem("pengajuanProduk", JSON.stringify(updatedPengajuanList));
          setPengajuanList(updatedPengajuanList);
          setCurrentPengajuan(null);
          setPengajuanStatus(null);
          setHasRefreshed(false);
          setIsSaved(true);
          alert("Data produk berhasil diupdate!");
        } else {
          setIsSaved(true);
        }
      } else {
        // Add new product
        setProducts((prev) => [newProduct, ...prev]);
        handleCloseModal();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAjukanPerubahanFromView = () => {
    if (!viewingProduct) return;
    
    setFormData({
      kodeProduk: viewingProduct.kodeProduk,
      namaProduk: viewingProduct.namaProduk,
      kategori: viewingProduct.kategori,
      type: viewingProduct.type || "",
      jenis: viewingProduct.jenis || "",
      satuan: viewingProduct.satuan,
      hargaBeli: viewingProduct.hargaBeli.toString(),
      hargaJual: viewingProduct.hargaJual.toString(),
      stokMinimum: viewingProduct.stokMinimum.toString(),
      stokMaksimum: viewingProduct.stokMaksimum.toString(),
      stokAwal: viewingProduct.stokAwal.toString(),
      supplier: viewingProduct.supplier,
      keterangan: viewingProduct.keterangan,
      statusAktif: viewingProduct.statusAktif,
    });
    setProductUnits(viewingProduct.units || []);
    setEditingProduct(viewingProduct);
    setIsSaved(true);
    
    handleCloseViewModal();
    setIsModalOpen(true);
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

    if (!editingProduct) {
      alert("Tidak ada produk yang sedang diedit");
      return;
    }

    const newPengajuan = {
      id: Date.now().toString(),
      produkId: editingProduct.id,
      kodeProduk: editingProduct.kodeProduk,
      namaProduk: editingProduct.namaProduk,
      jenisPengajuan: pengajuanData.jenisPengajuan,
      alasanPengajuan: pengajuanData.alasanPengajuan,
      status: "Menunggu Persetujuan",
      createdAt: new Date().toISOString(),
      disetujuiPada: undefined,
      ditolakPada: undefined,
      alasanTolak: undefined,
      formData: formData,
      productUnits: productUnits,
      menuSystem: "Data Master",
      isNew: true,
    };

    const updatedPengajuanList = [...pengajuanList, newPengajuan];
    localStorage.setItem("pengajuanProduk", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);
    setIsSaved(false);
    setCurrentPengajuan(newPengajuan);
    setPengajuanStatus("Menunggu Persetujuan");
    setShowNotification(false);
    setHasRefreshed(false);

    handleClosePengajuanModal();
    alert("Pengajuan perubahan berhasil dikirim!");
  };

  const handleRefresh = () => {
    const savedPengajuan = localStorage.getItem("pengajuanProduk");
    if (savedPengajuan) {
      try {
        const updatedList = JSON.parse(savedPengajuan);
        setPengajuanList(updatedList);
        
        if (editingProduct) {
          const activePengajuan = updatedList.find(
            (p: any) => p.produkId === editingProduct.id && 
            (p.status === "Menunggu Persetujuan" || p.status === "Disetujui" || p.status === "Ditolak")
          );
          
          if (activePengajuan) {
            setCurrentPengajuan(activePengajuan);
            setPengajuanStatus(activePengajuan.status);
            
            if (activePengajuan.status === "Disetujui") {
              setHasRefreshed(true);
              setShowNotification(false);
              if (activePengajuan.jenisPengajuan === "Edit Data" && activePengajuan.formData) {
                setFormData(activePengajuan.formData);
                if (activePengajuan.productUnits) {
                  setProductUnits(activePengajuan.productUnits);
                }
              }
            } else if (activePengajuan.status === "Ditolak") {
              setIsSaved(false);
              setCurrentPengajuan(null);
              setPengajuanStatus(null);
              setShowNotification(false);
              setHasRefreshed(false);
              alert("Pengajuan telah ditolak. Anda dapat mengubah data dan mengajukan kembali.");
            }
          }
        }
      } catch (err) {
        console.error("Error refreshing pengajuan:", err);
      }
    }
  };

  const handleBatalAjukan = () => {
    if (!currentPengajuan) return;
    
    if (confirm("Apakah Anda yakin ingin membatalkan pengajuan ini?")) {
      const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
      localStorage.setItem("pengajuanProduk", JSON.stringify(updatedPengajuanList));
      setPengajuanList(updatedPengajuanList);
      
      setCurrentPengajuan(null);
      setPengajuanStatus(null);
      setShowNotification(false);
      setHasRefreshed(false);
      setIsSaved(false);
      
      alert("Pengajuan berhasil dibatalkan!");
    }
  };

  const handleHapusProduct = () => {
    if (!editingProduct) return;
    
    if (confirm(`Apakah Anda yakin ingin menghapus produk ${editingProduct.namaProduk}?`)) {
      const updatedProducts = products.filter((p) => p.id !== editingProduct.id);
      setProducts(updatedProducts);
      localStorage.setItem("products", JSON.stringify(updatedProducts));
      
      if (currentPengajuan) {
        const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
        localStorage.setItem("pengajuanProduk", JSON.stringify(updatedPengajuanList));
        setPengajuanList(updatedPengajuanList);
      }
      
      handleCloseModal();
      alert("Produk berhasil dihapus!");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Format stok untuk ditampilkan dengan multiple unit
  const formatStock = (product: Product): string => {
    if (!product.units || product.units.length === 0) {
      return `${product.stokAwal} ${product.satuan}`;
    }
    
    // Tampilkan dalam unit terbesar yang memungkinkan
    const sortedUnits = [...product.units].sort((a, b) => a.urutan - b.urutan);
    let remainingStock = product.stokAwal;
    const parts: string[] = [];
    
    for (const unit of sortedUnits) {
      if (remainingStock >= unit.konversi && unit.konversi > 0) {
        const count = Math.floor(remainingStock / unit.konversi);
        if (count > 0) {
          parts.push(`${count} ${unit.namaUnit}`);
          remainingStock = remainingStock % unit.konversi;
        }
      }
    }
    
    if (remainingStock > 0) {
      const baseUnit = sortedUnits.find(u => u.isBaseUnit);
      if (baseUnit) {
        parts.push(`${remainingStock} ${baseUnit.namaUnit}`);
      }
    }
    
    return parts.join(" + ") || "0";
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
            + Tambah Produk
          </button>
        </div>

        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {isLoadingData ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ color: "#64748b", margin: 0 }}>Memuat data...</p>
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ color: "#64748b", margin: 0 }}>
                Belum ada data produk. Klik tombol "Tambah Produk" untuk menambahkan data.
              </p>
            </div>
          ) : (
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
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Kode
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                      minWidth: "200px",
                      width: "250px",
                    }}
                  >
                    Nama Produk
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Kategori
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Jenis
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Satuan
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Harga Beli
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Harga Jual
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Stok
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Operator
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#475569",
                    }}
                  >
                    Last Update
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #e2e8f0",
                      padding: "12px 16px",
                      fontSize: "14px",
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
                {products.map((product) => (
                  <tr
                    key={product.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1e293b",
                        fontWeight: "500",
                      }}
                    >
                      {product.kodeProduk}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1e293b",
                      }}
                    >
                      {product.namaProduk}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {product.kategori}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {product.type || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {product.jenis || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {product.satuan}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                        textAlign: "right",
                      }}
                    >
                      {formatCurrency(product.hargaBeli)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1e293b",
                        textAlign: "right",
                        fontWeight: "500",
                      }}
                    >
                      {formatCurrency(product.hargaJual)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: product.stokAwal <= product.stokMinimum ? "#ef4444" : "#1e293b",
                        textAlign: "right",
                        fontWeight: "500",
                      }}
                    >
                      {formatStock(product)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {product.operator || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {product.updatedAt 
                        ? new Date(product.updatedAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : product.createdAt
                        ? new Date(product.createdAt).toLocaleDateString("id-ID", {
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
                        fontSize: "14px",
                      }}
                    >
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <button
                          onClick={() => handleViewProduct(product)}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
              alignItems: "center",
              zIndex: 1000,
              overflowY: "auto",
              padding: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "24px",
                width: "90%",
                maxWidth: "700px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                margin: "auto",
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
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    margin: 0,
                    color: "#1e293b",
                  }}
                >
                  {editingProduct ? "Edit Produk" : "Tambah Produk"}
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
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <label
                      htmlFor="kodeProduk"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Kode Produk <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="kodeProduk"
                      name="kodeProduk"
                      value={formData.kodeProduk}
                      onChange={handleChange}
                      required
                      readOnly={!editingProduct}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                        backgroundColor: editingProduct ? "white" : "#f3f4f6",
                        cursor: editingProduct ? "text" : "not-allowed",
                      }}
                      onFocus={(e) => {
                        if (editingProduct) {
                          e.currentTarget.style.borderColor = "#3b82f6";
                          e.currentTarget.style.outline = "none";
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#d1d5db";
                      }}
                      placeholder="Kode akan di-generate otomatis"
                    />
                    {!editingProduct && (
                      <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                        Kode produk akan di-generate otomatis saat menyimpan
                      </span>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="namaProduk"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Nama Produk <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="namaProduk"
                      name="namaProduk"
                      value={formData.namaProduk}
                      onChange={handleChange}
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
                      placeholder="Masukkan nama produk"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <label
                      htmlFor="kategori"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Kategori <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      id="kategori"
                      name="kategori"
                      value={formData.kategori}
                      onChange={handleChange}
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
                      <option value="">Pilih Kategori</option>
                      <option value="Obat Bebas">Obat Bebas</option>
                      <option value="Obat Keras">Obat Keras</option>
                      <option value="Obat Herbal">Obat Herbal</option>
                      <option value="Alat Kesehatan">Alat Kesehatan</option>
                      <option value="Vitamin & Suplemen">Vitamin & Suplemen</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

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
                      name="supplier"
                      value={formData.supplier}
                      onChange={handleChange}
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
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.namaSupplier}>
                          {supplier.namaSupplier}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <label
                      htmlFor="type"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Type
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
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
                      <option value="">Pilih Type</option>
                      {types
                        .filter((type) => type.statusAktif)
                        .map((type) => (
                          <option key={type.id} value={type.namaType}>
                            {type.namaType}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="jenis"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Jenis
                    </label>
                    <select
                      id="jenis"
                      name="jenis"
                      value={formData.jenis}
                      onChange={handleChange}
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
                      <option value="">Pilih Jenis</option>
                      {jenisList
                        .filter((jenis) => jenis.statusAktif)
                        .map((jenis) => (
                          <option key={jenis.id} value={jenis.namaJenis}>
                            {jenis.namaJenis}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Section Multiple Unit */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    marginBottom: "12px"
                  }}>
                    <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Unit & Harga <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddUnit}
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
                      + Tambah Unit
                    </button>
                  </div>

                  {productUnits.length === 0 ? (
                    <div style={{ 
                      padding: "16px", 
                      border: "1px dashed #d1d5db", 
                      borderRadius: "6px",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: "13px"
                    }}>
                      Belum ada unit. Klik "Tambah Unit" untuk menambahkan unit dengan harga berbeda (misal: Box, Pack, Pieces).
                      <br />
                      <span style={{ fontSize: "12px", marginTop: "8px", display: "block" }}>
                        Atau gunakan field Harga Beli/Jual di bawah untuk produk dengan 1 unit saja.
                      </span>
                    </div>
                  ) : (
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8fafc" }}>
                            <th style={{ padding: "10px", textAlign: "left", fontSize: "12px", fontWeight: "600", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                              Unit <span style={{ color: "#ef4444" }}>*</span>
                            </th>
                            <th style={{ padding: "10px", textAlign: "right", fontSize: "12px", fontWeight: "600", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                              Harga Beli <span style={{ color: "#ef4444" }}>*</span>
                            </th>
                            <th style={{ padding: "10px", textAlign: "right", fontSize: "12px", fontWeight: "600", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                              Harga Jual <span style={{ color: "#ef4444" }}>*</span>
                            </th>
                            <th style={{ padding: "10px", textAlign: "center", fontSize: "12px", fontWeight: "600", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                              Konversi <span style={{ color: "#ef4444" }}>*</span>
                            </th>
                            <th style={{ padding: "10px", textAlign: "center", fontSize: "12px", fontWeight: "600", borderBottom: "1px solid #e2e8f0", color: "#475569", width: "150px" }}>
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {productUnits.map((unit) => (
                            <tr key={unit.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px" }}>
                                <select
                                  value={unit.namaUnit}
                                  onChange={(e) => handleUnitChange(unit.id, "namaUnit", e.target.value)}
                                  required
                                  style={{
                                    width: "100%",
                                    padding: "8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                    boxSizing: "border-box",
                                    backgroundColor: "white",
                                  }}
                                >
                                  <option value="">Pilih Unit</option>
                                  {units
                                    .filter((u) => {
                                      // Filter unit yang belum dipilih di row lain
                                      const isUsed = productUnits.some(
                                        (pu) => pu.id !== unit.id && pu.namaUnit === u.namaUnit
                                      );
                                      return !isUsed;
                                    })
                                    .map((u) => (
                                      <option key={u.id} value={u.namaUnit}>
                                        {u.namaUnit}
                                      </option>
                                    ))}
                                  {/* Jika unit yang dipilih tidak ada di master data, tetap tampilkan */}
                                  {unit.namaUnit && !units.some((u) => u.namaUnit === unit.namaUnit) && (
                                    <option value={unit.namaUnit}>{unit.namaUnit}</option>
                                  )}
                                </select>
                              </td>
                              <td style={{ padding: "10px" }}>
                                <input
                                  type="number"
                                  value={unit.hargaBeli || ""}
                                  onChange={(e) => handleUnitChange(unit.id, "hargaBeli", parseFloat(e.target.value) || 0)}
                                  min="0"
                                  required
                                  style={{
                                    width: "100%",
                                    padding: "8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                    textAlign: "right",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </td>
                              <td style={{ padding: "10px" }}>
                                <input
                                  type="number"
                                  value={unit.hargaJual || ""}
                                  onChange={(e) => handleUnitChange(unit.id, "hargaJual", parseFloat(e.target.value) || 0)}
                                  min="0"
                                  required
                                  style={{
                                    width: "100%",
                                    padding: "8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                    textAlign: "right",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </td>
                              <td style={{ padding: "10px" }}>
                                <input
                                  type="number"
                                  value={unit.konversi || 1}
                                  onChange={(e) => handleUnitChange(unit.id, "konversi", parseFloat(e.target.value) || 1)}
                                  min="1"
                                  required
                                  disabled={unit.isBaseUnit}
                                  style={{
                                    width: "100%",
                                    padding: "8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                    textAlign: "center",
                                    backgroundColor: unit.isBaseUnit ? "#f3f4f6" : "white",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </td>
                              <td style={{ padding: "10px", textAlign: "center" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                                  {unit.isBaseUnit && (
                                    <span style={{ 
                                      fontSize: "10px", 
                                      color: "#059669", 
                                      fontWeight: "500",
                                      padding: "2px 6px",
                                      backgroundColor: "#d1fae5",
                                      borderRadius: "4px"
                                    }}>
                                      Unit Dasar
                                    </span>
                                  )}
                                  {!unit.isBaseUnit && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveUnit(unit.id)}
                                      style={{
                                        padding: "4px 8px",
                                        backgroundColor: "#ef4444",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "11px",
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
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ padding: "8px 12px", backgroundColor: "#f8fafc", fontSize: "11px", color: "#64748b", borderTop: "1px solid #e2e8f0" }}>
                        <strong>Catatan:</strong> Konversi adalah jumlah unit terkecil (pieces) dalam unit ini. Contoh: 1 Box = 120 Pieces, maka konversi Box = 120.
                      </div>
                    </div>
                  )}
                </div>

                {/* Harga default untuk backward compatibility (jika tidak menggunakan multiple unit) */}
                {productUnits.length === 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                    <div>
                      <label
                        htmlFor="hargaBeli"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Harga Beli <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="number"
                        id="hargaBeli"
                        name="hargaBeli"
                        value={formData.hargaBeli}
                        onChange={handleChange}
                        required
                        min="0"
                        step="100"
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
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="hargaJual"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Harga Jual <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="number"
                        id="hargaJual"
                        name="hargaJual"
                        value={formData.hargaJual}
                        onChange={handleChange}
                        required
                        min="0"
                        step="100"
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
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <label
                      htmlFor="stokMinimum"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Stok Minimum <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="number"
                      id="stokMinimum"
                      name="stokMinimum"
                      value={formData.stokMinimum}
                      onChange={handleChange}
                      required
                      min="0"
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
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="stokMaksimum"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Stok Maksimum
                    </label>
                    <input
                      type="number"
                      id="stokMaksimum"
                      name="stokMaksimum"
                      value={formData.stokMaksimum}
                      onChange={handleChange}
                      min="0"
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
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="stokAwal"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Stok Awal
                    </label>
                    <input
                      type="number"
                      id="stokAwal"
                      name="stokAwal"
                      value={formData.stokAwal}
                      onChange={handleChange}
                      min="0"
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
                      placeholder="0"
                    />
                  </div>
                </div>


                <div style={{ marginBottom: "20px" }}>
                  <label
                    htmlFor="keterangan"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Keterangan
                  </label>
                  <textarea
                    id="keterangan"
                    name="keterangan"
                    value={formData.keterangan}
                    onChange={handleChange}
                    rows={3}
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
                    placeholder="Masukkan keterangan (opsional)"
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="statusAktif"
                      name="statusAktif"
                      checked={formData.statusAktif}
                      onChange={handleChange}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                      }}
                    />
                    <span>Status Aktif</span>
                  </label>
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

                {showNotification && (
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#d1fae5",
                      border: "1px solid #10b981",
                      borderRadius: "6px",
                      marginBottom: "20px",
                      color: "#065f46",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    Pengajuan telah disetujui silahkan refresh
                  </div>
                )}

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
                    Batal
                  </button>
                  
                  {(() => {
                    if (isSaved && !currentPengajuan) {
                      return (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={handleOpenPengajuanModal}
                          style={{
                            padding: "10px 20px",
                            backgroundColor: loading ? "#9ca3af" : "#3b82f6",
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
                              e.currentTarget.style.backgroundColor = "#2563eb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!loading) {
                              e.currentTarget.style.backgroundColor = "#3b82f6";
                            }
                          }}
                        >
                          Ajukan Perubahan
                        </button>
                      );
                    }
                    
                    if (pengajuanStatus === "Disetujui" && currentPengajuan) {
                      if (currentPengajuan.jenisPengajuan === "Hapus Data") {
                        return (
                          <>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={handleHapusProduct}
                              style={{
                                padding: "10px 20px",
                                backgroundColor: loading ? "#9ca3af" : "#ef4444",
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
                                  e.currentTarget.style.backgroundColor = "#dc2626";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!loading) {
                                  e.currentTarget.style.backgroundColor = "#ef4444";
                                }
                              }}
                            >
                              Hapus
                            </button>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={handleBatalAjukan}
                              style={{
                                padding: "10px 20px",
                                backgroundColor: loading ? "#9ca3af" : "#ef4444",
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
                                  e.currentTarget.style.backgroundColor = "#dc2626";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!loading) {
                                  e.currentTarget.style.backgroundColor = "#ef4444";
                                }
                              }}
                            >
                              Batal Ajukan
                            </button>
                          </>
                        );
                      }
                      
                      if (currentPengajuan.jenisPengajuan === "Edit Data") {
                        return (
                          <>
                            <button
                              type="submit"
                              disabled={loading}
                              style={{
                                padding: "10px 20px",
                                backgroundColor: loading ? "#9ca3af" : "#3b82f6",
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
                                  e.currentTarget.style.backgroundColor = "#2563eb";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!loading) {
                                  e.currentTarget.style.backgroundColor = "#3b82f6";
                                }
                              }}
                            >
                              {loading ? "Menyimpan..." : "Simpan"}
                            </button>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={handleBatalAjukan}
                              style={{
                                padding: "10px 20px",
                                backgroundColor: loading ? "#9ca3af" : "#ef4444",
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
                                  e.currentTarget.style.backgroundColor = "#dc2626";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!loading) {
                                  e.currentTarget.style.backgroundColor = "#ef4444";
                                }
                              }}
                            >
                              Batal Ajukan
                            </button>
                          </>
                        );
                      }
                    }
                    
                    if (pengajuanStatus === "Menunggu Persetujuan") {
                      return (
                        <>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={handleRefresh}
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
                            Refresh
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={handleBatalAjukan}
                            style={{
                              padding: "10px 20px",
                              backgroundColor: loading ? "#9ca3af" : "#ef4444",
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
                                e.currentTarget.style.backgroundColor = "#dc2626";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!loading) {
                                e.currentTarget.style.backgroundColor = "#ef4444";
                              }
                            }}
                          >
                            Batal Ajukan
                          </button>
                        </>
                      );
                    }
                    
                    return (
                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          padding: "10px 20px",
                          backgroundColor: loading ? "#9ca3af" : "#3b82f6",
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
                            e.currentTarget.style.backgroundColor = "#2563eb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!loading) {
                            e.currentTarget.style.backgroundColor = "#3b82f6";
                          }
                        }}
                      >
                        {loading ? "Menyimpan..." : "Simpan"}
                      </button>
                    );
                  })()}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {isViewModalOpen && viewingProduct && (
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
              overflowY: "auto",
              padding: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "24px",
                width: "90%",
                maxWidth: "700px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                margin: "auto",
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
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    margin: 0,
                    color: "#1e293b",
                  }}
                >
                  Detail Produk
                </h3>
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
                    borderRadius: "4px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Kode Produk
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                    {viewingProduct.kodeProduk}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Nama Produk
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                    {viewingProduct.namaProduk}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Kategori
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingProduct.kategori}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Type
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingProduct.type || "-"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Jenis
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingProduct.jenis || "-"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Satuan
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingProduct.satuan}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Harga Beli
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                    {formatCurrency(viewingProduct.hargaBeli)}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Harga Jual
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                    {formatCurrency(viewingProduct.hargaJual)}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Stok Minimum
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingProduct.stokMinimum}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Stok Maksimum
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingProduct.stokMaksimum}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Stok Awal
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                    {formatStock(viewingProduct)}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Supplier
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingProduct.supplier}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Status
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor: viewingProduct.statusAktif ? "#d1fae5" : "#fee2e2",
                      color: viewingProduct.statusAktif ? "#065f46" : "#991b1b",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}>
                      {viewingProduct.statusAktif ? "Aktif" : "Tidak Aktif"}
                    </span>
                  </div>
                </div>
              </div>

              {viewingProduct.units && viewingProduct.units.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "12px" }}>
                    Unit & Harga
                  </label>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc" }}>
                          <th style={{ padding: "10px", textAlign: "left", fontSize: "12px", fontWeight: "600", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                            Unit
                          </th>
                          <th style={{ padding: "10px", textAlign: "right", fontSize: "12px", fontWeight: "600", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                            Harga Beli
                          </th>
                          <th style={{ padding: "10px", textAlign: "right", fontSize: "12px", fontWeight: "600", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                            Harga Jual
                          </th>
                          <th style={{ padding: "10px", textAlign: "center", fontSize: "12px", fontWeight: "600", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                            Konversi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingProduct.units
                          .sort((a, b) => a.urutan - b.urutan)
                          .map((unit) => (
                            <tr key={unit.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px", fontSize: "13px", color: "#1e293b" }}>
                                {unit.namaUnit}
                                {unit.isBaseUnit && (
                                  <span style={{ fontSize: "10px", color: "#64748b", marginLeft: "8px" }}>
                                    (Unit Dasar)
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "10px", fontSize: "13px", color: "#1e293b", textAlign: "right" }}>
                                {formatCurrency(unit.hargaBeli)}
                              </td>
                              <td style={{ padding: "10px", fontSize: "13px", color: "#1e293b", textAlign: "right" }}>
                                {formatCurrency(unit.hargaJual)}
                              </td>
                              <td style={{ padding: "10px", fontSize: "13px", color: "#64748b", textAlign: "center" }}>
                                {unit.konversi}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewingProduct.keterangan && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", display: "block", marginBottom: "4px" }}>
                    Keterangan
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b", padding: "12px", backgroundColor: "#f8fafc", borderRadius: "6px" }}>
                    {viewingProduct.keterangan}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                  marginTop: "24px",
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseViewModal}
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
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleAjukanPerubahanFromView}
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
                  Ajukan Perubahan
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
                maxWidth: "420px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "16px 20px",
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
                    fontSize: "18px",
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

              <form onSubmit={handleSubmitPengajuan}>
                <div style={{ padding: "20px" }}>
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      htmlFor="jenisPengajuan"
                      style={{
                        display: "block",
                        marginBottom: "6px",
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
                      <option value="Edit Data">Edit Data</option>
                      <option value="Hapus Data">Hapus Data</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label
                      htmlFor="alasanPengajuan"
                      style={{
                        display: "block",
                        marginBottom: "6px",
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
                      rows={3}
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
                      placeholder="Masukkan alasan pengajuan perubahan"
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "flex-end",
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
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
