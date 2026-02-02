"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface MarginFormData {
  kodeMargin: string;
  namaMargin: string;
  type: string;
  kategori: string;
  metodePerhitungan: string;
  nilaiMargin: string;
  keterangan: string;
  statusAktif: boolean;
}

interface Margin {
  id: string;
  kodeMargin: string;
  namaMargin: string;
  typeId: string;
  typeName: string;
  kategoriId?: string;
  kategoriName?: string;
  metodePerhitungan: string;
  nilaiMargin: number;
  keterangan: string;
  statusAktif: boolean;
  createdAt: Date;
  operator?: string;
  updatedAt?: Date;
}

export default function DataMarginPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingMargin, setEditingMargin] = useState<Margin | null>(null);
  const [viewingMargin, setViewingMargin] = useState<Margin | null>(null);
  const [formData, setFormData] = useState<MarginFormData>({
    kodeMargin: "",
    namaMargin: "",
    type: "",
    kategori: "",
    metodePerhitungan: "",
    nilaiMargin: "",
    keterangan: "",
    statusAktif: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [margins, setMargins] = useState<Margin[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [kategoris, setKategoris] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
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

  // Calculate preview harga jual
  const calculatePreview = (metode: string, nilai: number): number => {
    const hppExample = 10000;
    let hargaJual = 0;
    
    if (!metode || !nilai) return 0;
    
    switch(metode) {
      case "persentase_hpp":
        hargaJual = hppExample + (hppExample * nilai / 100);
        break;
      case "nominal_tetap":
        hargaJual = hppExample + nilai;
        break;
      case "markup_persen":
        if (nilai >= 100) return 0; // Prevent division by zero
        hargaJual = hppExample / (1 - nilai / 100);
        break;
      default:
        return 0;
    }
    
    return Math.round(hargaJual);
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Format nilai margin berdasarkan metode
  const formatNilaiMargin = (metode: string, nilai: number): string => {
    if (metode === "nominal_tetap") {
      return formatCurrency(nilai);
    } else {
      return `${nilai}%`;
    }
  };

  // Get metode label
  const getMetodeLabel = (metode: string): string => {
    switch(metode) {
      case "persentase_hpp":
        return "Persentase dari HPP";
      case "nominal_tetap":
        return "Nominal Tetap";
      case "markup_persen":
        return "Markup Persentase";
      default:
        return metode;
    }
  };

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

  // Load types, kategoris, margins, pengajuan from API first, fallback to localStorage
  useEffect(() => {
    let cancelled = false;
    function loadFromLocalStorage() {
      const st = localStorage.getItem("types");
      if (st) try { setTypes(JSON.parse(st)); } catch (_) {}
      const sk = localStorage.getItem("kategoris");
      if (sk) try { setKategoris(JSON.parse(sk)); } catch (_) {}
      const sm = localStorage.getItem("margins");
      if (sm) try { setMargins(JSON.parse(sm).map((m: any) => ({ ...m, createdAt: new Date(m.createdAt), updatedAt: m.updatedAt ? new Date(m.updatedAt) : undefined }))); } catch (_) {}
      const sp = localStorage.getItem("pengajuanMargin");
      if (sp) try { setPengajuanList(JSON.parse(sp)); } catch (_) {}
    }
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token || cancelled) { loadFromLocalStorage(); setIsLoadingData(false); return; }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/types", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/kategoris", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/margins", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/pengajuanMargin", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      ]).then(([typesData, kategorisData, marginsData, pengajuanData]) => {
        if (cancelled) return;
        if (Array.isArray(typesData) && typesData.length > 0) { setTypes(typesData); localStorage.setItem("types", JSON.stringify(typesData)); }
        else { const st = localStorage.getItem("types"); if (st) try { setTypes(JSON.parse(st)); } catch (_) {} }
        if (Array.isArray(kategorisData) && kategorisData.length > 0) { setKategoris(kategorisData); localStorage.setItem("kategoris", JSON.stringify(kategorisData)); }
        else { const sk = localStorage.getItem("kategoris"); if (sk) try { setKategoris(JSON.parse(sk)); } catch (_) {} }
        if (Array.isArray(marginsData) && marginsData.length > 0) {
          setMargins(marginsData.map((m: any) => ({ ...m, createdAt: m.createdAt ? new Date(m.createdAt) : new Date(), updatedAt: m.updatedAt ? new Date(m.updatedAt) : undefined })));
          localStorage.setItem("margins", JSON.stringify(marginsData));
        } else { const sm = localStorage.getItem("margins"); if (sm) try { setMargins(JSON.parse(sm).map((m: any) => ({ ...m, createdAt: new Date(m.createdAt), updatedAt: m.updatedAt ? new Date(m.updatedAt) : undefined }))); } catch (_) {} }
        if (Array.isArray(pengajuanData) && pengajuanData.length > 0) { setPengajuanList(pengajuanData); localStorage.setItem("pengajuanMargin", JSON.stringify(pengajuanData)); }
        else { const sp = localStorage.getItem("pengajuanMargin"); if (sp) try { setPengajuanList(JSON.parse(sp)); } catch (_) {} }
      }).catch(() => { if (!cancelled) loadFromLocalStorage(); }).finally(() => { if (!cancelled) setIsLoadingData(false); });
    }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    return () => { cancelled = true; };
  }, []);

  // Check pengajuan status when editingMargin changes
  useEffect(() => {
    if (editingMargin) {
      const savedPengajuan = localStorage.getItem("pengajuanMargin");
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
          (p: any) => p.marginId === editingMargin.id && 
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
  }, [editingMargin]);

  // React to pengajuanList changes when editing
  useEffect(() => {
    if (!editingMargin) return;

    const activePengajuan = pengajuanList.find(
      (p: any) => p.marginId === editingMargin.id && 
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
  }, [pengajuanList, editingMargin]);

  // Poll for pengajuan status changes when modal is open
  useEffect(() => {
    if (!isModalOpen || !editingMargin) return;

    const interval = setInterval(() => {
      const savedPengajuan = localStorage.getItem("pengajuanMargin");
      if (savedPengajuan) {
        try {
          const currentList = JSON.parse(savedPengajuan);
          setPengajuanList((prevList) => {
            const prevStr = JSON.stringify(prevList);
            const currentStr = JSON.stringify(currentList);
            if (prevStr !== currentStr) {
              const activePengajuan = currentList.find(
                (p: any) => p.marginId === editingMargin.id && 
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
  }, [isModalOpen, editingMargin]);

  // Save to localStorage and sync to API whenever margins or pengajuan change
  useEffect(() => {
    if (!isLoadingData) {
      localStorage.setItem("margins", JSON.stringify(margins));
    }
  }, [margins, isLoadingData]);
  useEffect(() => {
    if (!isLoadingData) {
      getSupabaseClient().auth.getSession().then(({ data }) => {
        if (data.session?.access_token) {
          const payload = margins.map((m) => ({ ...m, createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt, updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt }));
          fetch("/api/data/margins", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: payload }) }).catch(() => {});
        }
      });
    }
  }, [margins, isLoadingData]);
  useEffect(() => {
    if (!isLoadingData) {
      getSupabaseClient().auth.getSession().then(({ data }) => {
        if (data.session?.access_token) {
          fetch("/api/data/pengajuanMargin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: pengajuanList }) }).catch(() => {});
        }
      });
    }
  }, [pengajuanList, isLoadingData]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setEditingMargin(null);
    setError(null);
    setIsSaved(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMargin(null);
    setFormData({
      kodeMargin: "",
      namaMargin: "",
      type: "",
      kategori: "",
      metodePerhitungan: "",
      nilaiMargin: "",
      keterangan: "",
      statusAktif: true,
    });
    setError(null);
    setIsSaved(false);
    setCurrentPengajuan(null);
    setPengajuanStatus(null);
    setShowNotification(false);
    setHasRefreshed(false);
  };

  const handleEditMargin = (margin: Margin) => {
    setEditingMargin(margin);
    setHasRefreshed(false);
    setShowNotification(false);
    
    let initialFormData = {
      kodeMargin: margin.kodeMargin,
      namaMargin: margin.namaMargin,
      type: margin.typeId,
      kategori: margin.kategoriId || "",
      metodePerhitungan: margin.metodePerhitungan,
      nilaiMargin: margin.nilaiMargin.toString(),
      keterangan: margin.keterangan,
      statusAktif: margin.statusAktif,
    };
    
    const savedPengajuan = localStorage.getItem("pengajuanMargin");
    if (savedPengajuan) {
      try {
        const pengajuanList = JSON.parse(savedPengajuan);
        const approvedPengajuan = pengajuanList.find(
          (p: any) => p.marginId === margin.id && p.status === "Disetujui"
        );
        
        if (approvedPengajuan) {
          setHasRefreshed(true);
          setCurrentPengajuan(approvedPengajuan);
          setPengajuanStatus("Disetujui");
          setIsSaved(false);
          
          if (approvedPengajuan.jenisPengajuan === "Edit Data" && approvedPengajuan.formData) {
            initialFormData = approvedPengajuan.formData;
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
    setIsModalOpen(true);
    setError(null);
  };

  const handleViewMargin = (margin: Margin) => {
    // Gunakan logic yang sama dengan handleEditMargin untuk langsung buka modal form
    setEditingMargin(margin);
    setHasRefreshed(false);
    setShowNotification(false);
    
    let initialFormData = {
      kodeMargin: margin.kodeMargin,
      namaMargin: margin.namaMargin,
      type: margin.typeId,
      kategori: margin.kategoriId || "",
      metodePerhitungan: margin.metodePerhitungan,
      nilaiMargin: margin.nilaiMargin.toString(),
      keterangan: margin.keterangan,
      statusAktif: margin.statusAktif,
    };
    
    // Check pengajuan status
    const savedPengajuan = localStorage.getItem("pengajuanMargin");
    if (savedPengajuan) {
      try {
        const pengajuanList = JSON.parse(savedPengajuan);
        const approvedPengajuan = pengajuanList.find(
          (p: any) => p.marginId === margin.id && p.status === "Disetujui"
        );
        
        if (approvedPengajuan) {
          setHasRefreshed(true);
          setCurrentPengajuan(approvedPengajuan);
          setPengajuanStatus("Disetujui");
          setIsSaved(false);
          
          if (approvedPengajuan.jenisPengajuan === "Edit Data" && approvedPengajuan.formData) {
            initialFormData = approvedPengajuan.formData;
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
    setIsModalOpen(true); // Langsung buka modal form
    setError(null);
  };

  const handleAjukanPerubahanFromView = () => {
    if (!viewingMargin) return;
    
    setFormData({
      kodeMargin: viewingMargin.kodeMargin,
      namaMargin: viewingMargin.namaMargin,
      type: viewingMargin.typeId,
      kategori: viewingMargin.kategoriId || "",
      metodePerhitungan: viewingMargin.metodePerhitungan,
      nilaiMargin: viewingMargin.nilaiMargin.toString(),
      keterangan: viewingMargin.keterangan,
      statusAktif: viewingMargin.statusAktif,
    });
    setEditingMargin(viewingMargin);
    setIsSaved(true);
    
    handleCloseViewModal();
    setIsModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingMargin(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (isSaved && editingMargin) {
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
      // Validasi
      if (!formData.type) {
        throw new Error("Type harus dipilih");
      }
      if (!formData.metodePerhitungan) {
        throw new Error("Metode perhitungan harus dipilih");
      }
      if (!formData.nilaiMargin || formData.nilaiMargin.trim() === "") {
        throw new Error("Nilai margin harus diisi");
      }

      const nilaiMarginNum = parseFloat(formData.nilaiMargin);
      if (isNaN(nilaiMarginNum) || nilaiMarginNum < 0) {
        throw new Error("Nilai margin harus berupa angka positif");
      }

      if (formData.metodePerhitungan === "markup_persen" && nilaiMarginNum >= 100) {
        throw new Error("Nilai margin untuk markup persentase harus kurang dari 100%");
      }

      // Validasi kode margin unik
      const isDuplicate = margins.some(
        (m) => m.kodeMargin === formData.kodeMargin && m.id !== editingMargin?.id
      );
      if (isDuplicate) {
        throw new Error("Kode margin sudah digunakan");
      }

      const userEmail = currentUserEmail || "System";
      const now = new Date();
      const selectedType = types.find((t) => t.id === formData.type);
      const selectedKategori = formData.kategori ? kategoris.find((k) => k.id === formData.kategori) : null;
      
      if (editingMargin) {
        const updatedMargins = margins.map((m) =>
          m.id === editingMargin.id
            ? {
                ...m,
                kodeMargin: formData.kodeMargin,
                namaMargin: formData.namaMargin,
                typeId: formData.type,
                typeName: selectedType?.namaType || "",
                kategoriId: formData.kategori || undefined,
                kategoriName: selectedKategori?.namaKategori || undefined,
                metodePerhitungan: formData.metodePerhitungan,
                nilaiMargin: nilaiMarginNum,
                keterangan: formData.keterangan,
                statusAktif: formData.statusAktif,
                operator: m.operator || userEmail,
                updatedAt: now,
              }
            : m
        );
        setMargins(updatedMargins);
        
        if (currentPengajuan && pengajuanStatus === "Disetujui" && currentPengajuan.jenisPengajuan === "Edit Data") {
          const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
          localStorage.setItem("pengajuanMargin", JSON.stringify(updatedPengajuanList));
          setPengajuanList(updatedPengajuanList);
          setCurrentPengajuan(null);
          setPengajuanStatus(null);
          setHasRefreshed(false);
          setIsSaved(true);
          alert("Data margin berhasil diupdate!");
        } else {
          setIsSaved(true);
        }
      } else {
        const newMargin: Margin = {
          id: Date.now().toString(),
          kodeMargin: formData.kodeMargin,
          namaMargin: formData.namaMargin,
          typeId: formData.type,
          typeName: selectedType?.namaType || "",
          kategoriId: formData.kategori || undefined,
          kategoriName: selectedKategori?.namaKategori || undefined,
          metodePerhitungan: formData.metodePerhitungan,
          nilaiMargin: nilaiMarginNum,
          keterangan: formData.keterangan,
          statusAktif: formData.statusAktif,
          createdAt: now,
          operator: userEmail,
          updatedAt: now,
        };
        
        setMargins((prev) => [newMargin, ...prev]);
        handleCloseModal();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(msg);
    } finally {
      setLoading(false);
    }
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

    if (!editingMargin) {
      alert("Tidak ada margin yang sedang diedit");
      return;
    }

    const newPengajuan = {
      id: Date.now().toString(),
      marginId: editingMargin.id,
      kodeMargin: editingMargin.kodeMargin,
      namaMargin: editingMargin.namaMargin,
      jenisPengajuan: pengajuanData.jenisPengajuan,
      alasanPengajuan: pengajuanData.alasanPengajuan,
      status: "Menunggu Persetujuan",
      createdAt: new Date().toISOString(),
      disetujuiPada: undefined,
      ditolakPada: undefined,
      alasanTolak: undefined,
      formData: formData,
      menuSystem: "Data Master",
      isNew: true,
    };

    const updatedPengajuanList = [...pengajuanList, newPengajuan];
    localStorage.setItem("pengajuanMargin", JSON.stringify(updatedPengajuanList));
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
    const savedPengajuan = localStorage.getItem("pengajuanMargin");
    if (savedPengajuan) {
      try {
        const updatedList = JSON.parse(savedPengajuan);
        setPengajuanList(updatedList);
        
        if (editingMargin) {
          const activePengajuan = updatedList.find(
            (p: any) => p.marginId === editingMargin.id && 
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
      localStorage.setItem("pengajuanMargin", JSON.stringify(updatedPengajuanList));
      setPengajuanList(updatedPengajuanList);
      
      setCurrentPengajuan(null);
      setPengajuanStatus(null);
      setShowNotification(false);
      setHasRefreshed(false);
      setIsSaved(false);
      
      alert("Pengajuan berhasil dibatalkan!");
    }
  };

  const handleHapusMargin = () => {
    if (!editingMargin) return;
    
    if (confirm(`Apakah Anda yakin ingin menghapus margin ${editingMargin.namaMargin}?`)) {
      const updatedMargins = margins.filter((m) => m.id !== editingMargin.id);
      setMargins(updatedMargins);
      localStorage.setItem("margins", JSON.stringify(updatedMargins));
      
      if (currentPengajuan) {
        const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
        localStorage.setItem("pengajuanMargin", JSON.stringify(updatedPengajuanList));
        setPengajuanList(updatedPengajuanList);
      }
      
      handleCloseModal();
      alert("Margin berhasil dihapus!");
    }
  };

  // Calculate preview harga jual
  const previewHargaJual = formData.metodePerhitungan && formData.nilaiMargin
    ? calculatePreview(formData.metodePerhitungan, parseFloat(formData.nilaiMargin) || 0)
    : 0;

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
            + Tambah Margin
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
          ) : margins.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ color: "#64748b", margin: 0 }}>
                Belum ada data margin. Klik tombol "Tambah Margin" untuk menambahkan data.
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
                    Kode Margin
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
                    Nama Margin
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
                    Metode Perhitungan
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
                    Nilai Margin
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
                    Status
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
                {margins.map((margin) => (
                  <tr
                    key={margin.id}
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
                      {margin.kodeMargin}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1e293b",
                      }}
                    >
                      {margin.namaMargin}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {margin.typeName}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {margin.kategoriName || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {getMetodeLabel(margin.metodePerhitungan)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1e293b",
                        fontWeight: "500",
                      }}
                    >
                      {formatNilaiMargin(margin.metodePerhitungan, margin.nilaiMargin)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: margin.statusAktif ? "#10b981" : "#ef4444",
                        fontWeight: "500",
                      }}
                    >
                      {margin.statusAktif ? "Aktif" : "Non-Aktif"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {margin.operator || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {margin.updatedAt 
                        ? new Date(margin.updatedAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : margin.createdAt
                        ? new Date(margin.createdAt).toLocaleDateString("id-ID", {
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
                      <button
                        onClick={() => handleViewMargin(margin)}
                        style={{
                          padding: "6px 8px",
                          backgroundColor: "transparent",
                          color: "#3b82f6",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#eff6ff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                        title="View"
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
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
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
                maxWidth: "600px",
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
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    margin: 0,
                    color: "#1e293b",
                  }}
                >
                  {editingMargin ? "Edit Margin" : "Tambah Margin"}
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
                  {/* Side Kiri */}
                  <div>
                    <div style={{ marginBottom: "20px" }}>
                      <label
                        htmlFor="kodeMargin"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Kode Margin <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="text"
                        id="kodeMargin"
                        name="kodeMargin"
                        value={formData.kodeMargin}
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
                        placeholder="Masukkan kode margin"
                      />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
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
                        Type <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        id="type"
                        name="type"
                        value={formData.type}
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
                        <option value="">Pilih Type</option>
                        {types
                          .filter((type) => type.statusAktif)
                          .map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.namaType}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <label
                        htmlFor="metodePerhitungan"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Metode Perhitungan <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        id="metodePerhitungan"
                        name="metodePerhitungan"
                        value={formData.metodePerhitungan}
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
                        <option value="">Pilih Metode Perhitungan</option>
                        <option value="persentase_hpp">Persentase dari HPP</option>
                        <option value="nominal_tetap">Nominal Tetap</option>
                        <option value="markup_persen">Markup Persentase</option>
                      </select>
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
                        rows={4}
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
                  </div>

                  {/* Side Kanan */}
                  <div>
                    <div style={{ marginBottom: "20px" }}>
                      <label
                        htmlFor="namaMargin"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        Nama Margin <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="text"
                        id="namaMargin"
                        name="namaMargin"
                        value={formData.namaMargin}
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
                        placeholder="Masukkan nama margin (contoh: Margin Obat Patent 25%)"
                      />
                    </div>

                    <div style={{ marginBottom: "20px" }}>
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
                        Kategori
                      </label>
                      <select
                        id="kategori"
                        name="kategori"
                        value={formData.kategori}
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
                        <option value="">Pilih Kategori (Opsional)</option>
                        {kategoris
                          .filter((kategori) => kategori.statusAktif)
                          .map((kategori) => (
                            <option key={kategori.id} value={kategori.id}>
                              {kategori.namaKategori}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <label
                        htmlFor="nilaiMargin"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        {formData.metodePerhitungan === "nominal_tetap" 
                          ? "Nilai Margin (Rp)" 
                          : "Nilai Margin (%)"} <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="number"
                        id="nilaiMargin"
                        name="nilaiMargin"
                        value={formData.nilaiMargin}
                        onChange={handleChange}
                        required
                        min="0"
                        max={formData.metodePerhitungan === "markup_persen" ? "99.99" : undefined}
                        step={formData.metodePerhitungan === "nominal_tetap" ? "1" : "0.01"}
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
                        placeholder={formData.metodePerhitungan === "nominal_tetap" ? "Masukkan nilai margin (Rp)" : "Masukkan nilai margin (%)"}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview Perhitungan */}
                {formData.metodePerhitungan && formData.nilaiMargin && parseFloat(formData.nilaiMargin) > 0 && (
                  <div
                    style={{
                      padding: "12px",
                      backgroundColor: "#f0f9ff",
                      border: "1px solid #bae6fd",
                      borderRadius: "6px",
                      marginBottom: "20px",
                      fontSize: "14px",
                      color: "#0369a1",
                    }}
                  >
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>Preview Perhitungan:</div>
                    <div>
                      Dengan HPP Rp {formatCurrency(10000)}, Margin {formatNilaiMargin(formData.metodePerhitungan, parseFloat(formData.nilaiMargin))}, 
                      {" "}Harga Jual = {formatCurrency(previewHargaJual)}
                    </div>
                    <div style={{ fontSize: "12px", marginTop: "4px", color: "#64748b" }}>
                      {formData.metodePerhitungan === "persentase_hpp" && (
                        <>Rumus: Harga Jual = HPP + (HPP × Nilai Margin / 100)</>
                      )}
                      {formData.metodePerhitungan === "nominal_tetap" && (
                        <>Rumus: Harga Jual = HPP + Nilai Margin</>
                      )}
                      {formData.metodePerhitungan === "markup_persen" && (
                        <>Rumus: Harga Jual = HPP / (1 - Nilai Margin / 100)</>
                      )}
                    </div>
                  </div>
                )}

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
                              onClick={handleHapusMargin}
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
        {isViewModalOpen && viewingMargin && (
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
                maxWidth: "600px",
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
                  Detail Margin
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

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Kode Margin
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                  {viewingMargin.kodeMargin}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Nama Margin
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                  {viewingMargin.namaMargin}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Type
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b" }}>
                  {viewingMargin.typeName}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Kategori
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b" }}>
                  {viewingMargin.kategoriName || "-"}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Metode Perhitungan
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b" }}>
                  {getMetodeLabel(viewingMargin.metodePerhitungan)}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Nilai Margin
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                  {formatNilaiMargin(viewingMargin.metodePerhitungan, viewingMargin.nilaiMargin)}
                </div>
              </div>

              {/* Preview Perhitungan di View Modal */}
              <div style={{ marginBottom: "20px", padding: "12px", backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#0369a1" }}>
                  Contoh Perhitungan:
                </label>
                <div style={{ fontSize: "14px", color: "#0369a1" }}>
                  Dengan HPP Rp {formatCurrency(10000)}, Margin {formatNilaiMargin(viewingMargin.metodePerhitungan, viewingMargin.nilaiMargin)}, 
                  {" "}Harga Jual = {formatCurrency(calculatePreview(viewingMargin.metodePerhitungan, viewingMargin.nilaiMargin))}
                </div>
                <div style={{ fontSize: "12px", marginTop: "4px", color: "#64748b" }}>
                  {viewingMargin.metodePerhitungan === "persentase_hpp" && (
                    <>Rumus: Harga Jual = HPP + (HPP × Nilai Margin / 100)</>
                  )}
                  {viewingMargin.metodePerhitungan === "nominal_tetap" && (
                    <>Rumus: Harga Jual = HPP + Nilai Margin</>
                  )}
                  {viewingMargin.metodePerhitungan === "markup_persen" && (
                    <>Rumus: Harga Jual = HPP / (1 - Nilai Margin / 100)</>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Keterangan
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b" }}>
                  {viewingMargin.keterangan || "-"}
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Status
                </label>
                <div style={{ fontSize: "14px", color: viewingMargin.statusAktif ? "#10b981" : "#ef4444", fontWeight: "500" }}>
                  {viewingMargin.statusAktif ? "Aktif" : "Non-Aktif"}
                </div>
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
