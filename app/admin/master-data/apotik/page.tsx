"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface ApotikFormData {
  kodeApotik: string;
  namaApotik: string;
  alamat: string;
  kota: string;
  provinsi: string;
  telepon: string;
  email: string;
  picApotik: string;
  statusAktif: boolean;
  defaultPO: boolean;
  defaultTerimaBarang: boolean;
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
  createdAt: Date;
}

export default function DataApotikPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingApotik, setEditingApotik] = useState<Apotik | null>(null);
  const [viewingApotik, setViewingApotik] = useState<Apotik | null>(null);
  const [formData, setFormData] = useState<ApotikFormData>({
    kodeApotik: "",
    namaApotik: "",
    alamat: "",
    kota: "",
    provinsi: "",
    telepon: "",
    email: "",
    picApotik: "",
    statusAktif: true,
    defaultPO: false,
    defaultTerimaBarang: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiLoadError, setApiLoadError] = useState<string | null>(null);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isPengajuanModalOpen, setIsPengajuanModalOpen] = useState(false);
  const [pengajuanData, setPengajuanData] = useState({
    jenisPengajuan: "",
    alasanPengajuan: "",
  });
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [hasCheckedUrl, setHasCheckedUrl] = useState(false);
  const [currentPengajuan, setCurrentPengajuan] = useState<any | null>(null);
  const [pengajuanStatus, setPengajuanStatus] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);

  // Load data from API (Supabase) first, fallback to localStorage
  useEffect(() => {
    let cancelled = false;
    function loadFromLocalStorageApotiks() {
      const saved = localStorage.getItem("apotiks");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const withDates = parsed.map((a: any) => ({ ...a, createdAt: new Date(a.createdAt) }));
          setApotiks(withDates);
        } catch (err) {
          console.error("Error loading apotiks from localStorage:", err);
        }
      }
    }
    function loadFromLocalStoragePengajuan() {
      const saved = localStorage.getItem("pengajuanApotik");
      if (saved) {
        try {
          setPengajuanList(JSON.parse(saved));
        } catch (err) {
          console.error("Error loading pengajuan apotik:", err);
        }
      }
    }
    function loadFromLocalStorage() {
      loadFromLocalStorageApotiks();
      loadFromLocalStoragePengajuan();
    }
    getSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!data.session?.access_token || cancelled) {
          loadFromLocalStorage();
          setIsLoadingData(false);
          return;
        }
        const token = data.session.access_token;
        setApiLoadError(null);
        const handleRes = (r: Response, key: string): Promise<unknown> => {
          if (r.status === 401 && !cancelled) setApiLoadError("Sesi habis, silakan login lagi.");
          else if (r.status === 500 && !cancelled) setApiLoadError("Gagal memuat dari server. Cek koneksi dan env Vercel.");
          if (r.ok) return r.json();
          return Promise.resolve(key === "apotiks" ? [] : []);
        };
        Promise.all([
          fetch("/api/data/apotiks", { headers: { Authorization: `Bearer ${token}` } }).then((r) => handleRes(r, "apotiks")),
          fetch("/api/data/pengajuanApotik", { headers: { Authorization: `Bearer ${token}` } }).then((r) => handleRes(r, "pengajuan")),
        ])
          .then(([apotiksData, pengajuanData]) => {
            if (cancelled) return;
            if (Array.isArray(apotiksData) && apotiksData.length > 0) {
              const withDates = apotiksData.map((a: any) => ({ ...a, createdAt: a.createdAt ? new Date(a.createdAt) : new Date() }));
              setApotiks(withDates);
              localStorage.setItem("apotiks", JSON.stringify(apotiksData));
            } else {
              loadFromLocalStorageApotiks();
            }
            if (Array.isArray(pengajuanData) && pengajuanData.length > 0) {
              setPengajuanList(pengajuanData);
              localStorage.setItem("pengajuanApotik", JSON.stringify(pengajuanData));
            } else {
              loadFromLocalStoragePengajuan();
            }
          })
          .catch(() => { if (!cancelled) loadFromLocalStorage(); })
          .finally(() => { if (!cancelled) setIsLoadingData(false); });
      })
      .catch(() => {
        if (!cancelled) {
          loadFromLocalStorage();
          setIsLoadingData(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Check if there's edit parameter in URL (from persetujuan pengajuan)
  // Only check once after data is loaded
  useEffect(() => {
    if (typeof window !== "undefined" && !isLoadingData && !hasCheckedUrl && apotiks.length > 0 && !editingApotik) {
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get("edit");
      if (editId) {
        const apotikToEdit = apotiks.find((a) => a.id === editId);
        if (apotikToEdit) {
          // Jika salah satu true, set keduanya true (untuk checkbox gabungan)
          const defaultPOValue = apotikToEdit.defaultPO || false;
          const defaultTerimaBarangValue = apotikToEdit.defaultTerimaBarang || false;
          const bothChecked = defaultPOValue || defaultTerimaBarangValue;
          
          setFormData({
            kodeApotik: apotikToEdit.kodeApotik,
            namaApotik: apotikToEdit.namaApotik,
            alamat: apotikToEdit.alamat,
            kota: apotikToEdit.kota,
            provinsi: apotikToEdit.provinsi,
            telepon: apotikToEdit.telepon,
            email: apotikToEdit.email,
            picApotik: apotikToEdit.picApotik,
            statusAktif: apotikToEdit.statusAktif,
            defaultPO: bothChecked,
            defaultTerimaBarang: bothChecked,
          });
          setEditingApotik(apotikToEdit);
          setIsModalOpen(true);
          setIsSaved(true); // Set to true so button shows "Ajukan Perubahan" for existing data
          setHasCheckedUrl(true);
          // Clean URL
          window.history.replaceState({}, "", window.location.pathname);
        } else {
          setHasCheckedUrl(true);
        }
      } else {
        setHasCheckedUrl(true);
      }
    }
  }, [isLoadingData, hasCheckedUrl, apotiks.length, editingApotik]);

  // Check pengajuan status when editingApotik changes
  useEffect(() => {
    if (editingApotik) {
      // Always reload from localStorage to get latest status
      const savedPengajuan = localStorage.getItem("pengajuanApotik");
      let currentPengajuanList: any[] = [];
      
      if (savedPengajuan) {
        try {
          currentPengajuanList = JSON.parse(savedPengajuan);
          // Update state if different using functional update
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
        // Find active pengajuan for current apotik
        const activePengajuan = currentPengajuanList.find(
          (p: any) => p.apotikId === editingApotik.id && 
          (p.status === "Menunggu Persetujuan" || p.status === "Disetujui" || p.status === "Ditolak")
        );
        
        if (activePengajuan) {
          setCurrentPengajuan(activePengajuan);
          setPengajuanStatus(activePengajuan.status);
          
          // If rejected, reset states
          if (activePengajuan.status === "Ditolak") {
            setIsSaved(false);
            setShowNotification(false);
            setHasRefreshed(false);
          } else if (activePengajuan.status === "Disetujui") {
            // Auto-refresh when approved - set hasRefreshed to true automatically
            setHasRefreshed(true);
            setShowNotification(false);
            
            // If Edit Data, update formData with data from pengajuan
            if (activePengajuan.jenisPengajuan === "Edit Data" && activePengajuan.formData) {
              setFormData(activePengajuan.formData);
            }
            // Reset isSaved to false so button shows "Simpan" or "Hapus" instead of "Ajukan Perubahan"
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
      // Reset when not editing
      setCurrentPengajuan(null);
      setPengajuanStatus(null);
      setShowNotification(false);
      setHasRefreshed(false);
    }
  }, [editingApotik]);

  // React to pengajuanList changes when editing
  useEffect(() => {
    if (!editingApotik) return;

    const activePengajuan = pengajuanList.find(
      (p: any) => p.apotikId === editingApotik.id && 
      (p.status === "Menunggu Persetujuan" || p.status === "Disetujui" || p.status === "Ditolak")
    );
    
    if (activePengajuan) {
      console.log("Active Pengajuan found:", {
        id: activePengajuan.id,
        status: activePengajuan.status,
        jenisPengajuan: activePengajuan.jenisPengajuan,
        apotikId: activePengajuan.apotikId,
        editingApotikId: editingApotik.id
      });
      
      setCurrentPengajuan(activePengajuan);
      setPengajuanStatus(activePengajuan.status);
      
      // If rejected, reset states
      if (activePengajuan.status === "Ditolak") {
        setIsSaved(false);
        setShowNotification(false);
        setHasRefreshed(false);
      } else if (activePengajuan.status === "Disetujui") {
        // Auto-refresh when approved - set hasRefreshed to true automatically
        setHasRefreshed(true);
        setShowNotification(false);
        
        // If Edit Data, update formData with data from pengajuan
        if (activePengajuan.jenisPengajuan === "Edit Data" && activePengajuan.formData) {
          setFormData(activePengajuan.formData);
        }
        // Reset isSaved to false so button shows "Simpan" or "Hapus" instead of "Ajukan Perubahan"
        setIsSaved(false);
        
        console.log("Pengajuan approved - jenisPengajuan:", activePengajuan.jenisPengajuan);
      } else {
        setShowNotification(false);
      }
    } else {
      console.log("No active pengajuan found for apotik:", editingApotik.id);
      setCurrentPengajuan(null);
      setPengajuanStatus(null);
      setShowNotification(false);
    }
  }, [pengajuanList, editingApotik]);

  // Poll for pengajuan status changes when modal is open
  useEffect(() => {
    if (!isModalOpen || !editingApotik) return;

    const interval = setInterval(() => {
      const savedPengajuan = localStorage.getItem("pengajuanApotik");
      if (savedPengajuan) {
        try {
          const currentList = JSON.parse(savedPengajuan);
          setPengajuanList((prevList) => {
            // Only update if different
            const prevStr = JSON.stringify(prevList);
            const currentStr = JSON.stringify(currentList);
            if (prevStr !== currentStr) {
              console.log("Pengajuan list updated from polling");
              // Force update by finding active pengajuan and updating states
              const activePengajuan = currentList.find(
                (p: any) => p.apotikId === editingApotik.id && 
                (p.status === "Menunggu Persetujuan" || p.status === "Disetujui" || p.status === "Ditolak")
              );
              if (activePengajuan) {
                console.log("Found active pengajuan in polling:", {
                  status: activePengajuan.status,
                  jenisPengajuan: activePengajuan.jenisPengajuan
                });
                // Update states immediately
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
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [isModalOpen, editingApotik]);

  // Save to localStorage whenever apotiks change
  useEffect(() => {
    if (!isLoadingData) {
      localStorage.setItem("apotiks", JSON.stringify(apotiks));
    }
  }, [apotiks, isLoadingData]);

  // Sync apotiks ke server agar data sinkron antar perangkat dan via URL
  useEffect(() => {
    if (!isLoadingData && apotiks.length >= 0) {
      getSupabaseClient()
        .auth.getSession()
        .then(({ data }) => {
          if (data.session?.access_token) {
            const payload = apotiks.map((a) => ({
              ...a,
              createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
            }));
            fetch("/api/data/apotiks", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.session.access_token}`,
              },
              body: JSON.stringify({ apotiks: payload }),
            }).catch(() => {});
          }
        });
    }
  }, [apotiks, isLoadingData]);

  // Sync pengajuanApotik ke server
  useEffect(() => {
    if (!isLoadingData && pengajuanList.length >= 0) {
      getSupabaseClient()
        .auth.getSession()
        .then(({ data }) => {
          if (data.session?.access_token) {
            fetch("/api/data/pengajuanApotik", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.session.access_token}`,
              },
              body: JSON.stringify({ value: pengajuanList }),
            }).catch(() => {});
          }
        });
    }
  }, [pengajuanList, isLoadingData]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setEditingApotik(null);
    setError(null);
    setIsSaved(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingApotik(null);
    setFormData({
      kodeApotik: "",
      namaApotik: "",
      alamat: "",
      kota: "",
      provinsi: "",
      telepon: "",
      email: "",
      picApotik: "",
      statusAktif: true,
      defaultPO: false,
      defaultTerimaBarang: false,
    });
    setError(null);
    setIsSaved(false);
    // Reset pengajuan states
    setCurrentPengajuan(null);
    setPengajuanStatus(null);
    setShowNotification(false);
    setHasRefreshed(false);
  };

  const handleEditApotik = (apotik: Apotik) => {
    setEditingApotik(apotik);
    // Reset pengajuan states when opening edit
    setHasRefreshed(false);
    setShowNotification(false);
    
    // Jika salah satu true, set keduanya true (untuk checkbox gabungan)
    const defaultPOValue = apotik.defaultPO || false;
    const defaultTerimaBarangValue = apotik.defaultTerimaBarang || false;
    const bothChecked = defaultPOValue || defaultTerimaBarangValue;
    
    // Set formData dengan data apotik terlebih dahulu
    let initialFormData = {
      kodeApotik: apotik.kodeApotik,
      namaApotik: apotik.namaApotik,
      alamat: apotik.alamat,
      kota: apotik.kota,
      provinsi: apotik.provinsi,
      telepon: apotik.telepon,
      email: apotik.email,
      picApotik: apotik.picApotik,
      statusAktif: apotik.statusAktif,
      defaultPO: bothChecked,
      defaultTerimaBarang: bothChecked,
    };
    
    // Check if there's an approved pengajuan for this apotik
    const savedPengajuan = localStorage.getItem("pengajuanApotik");
    if (savedPengajuan) {
      try {
        const pengajuanList = JSON.parse(savedPengajuan);
        const approvedPengajuan = pengajuanList.find(
          (p: any) => p.apotikId === apotik.id && p.status === "Disetujui"
        );
        
        if (approvedPengajuan) {
          // If there's approved pengajuan, auto-refresh
          setHasRefreshed(true);
          setCurrentPengajuan(approvedPengajuan);
          setPengajuanStatus("Disetujui");
          setIsSaved(false); // Set to false so button shows "Simpan" or "Hapus"
          
          // If Edit Data, update formData with data from pengajuan (override initial formData)
          if (approvedPengajuan.jenisPengajuan === "Edit Data" && approvedPengajuan.formData) {
            initialFormData = approvedPengajuan.formData;
          }
        } else {
          // No approved pengajuan, set isSaved to true for normal edit
          setIsSaved(true);
        }
      } catch (err) {
        console.error("Error checking pengajuan:", err);
        setIsSaved(true);
      }
    } else {
      // No pengajuan at all, set isSaved to true for normal edit
      setIsSaved(true);
    }
    
    setFormData(initialFormData);
    setIsModalOpen(true);
    setError(null);
  };

  const handleViewApotik = (apotik: Apotik) => {
    // Gunakan logic yang sama dengan handleEditApotik untuk langsung buka modal form
    setEditingApotik(apotik);
    setHasRefreshed(false);
    setShowNotification(false);
    
    // Handle defaultPO dan defaultTerimaBarang logic
    const defaultPOValue = apotik.defaultPO || false;
    const defaultTerimaBarangValue = apotik.defaultTerimaBarang || false;
    const bothChecked = defaultPOValue || defaultTerimaBarangValue;
    
    let initialFormData = {
      kodeApotik: apotik.kodeApotik,
      namaApotik: apotik.namaApotik,
      alamat: apotik.alamat,
      kota: apotik.kota,
      provinsi: apotik.provinsi,
      telepon: apotik.telepon,
      email: apotik.email,
      picApotik: apotik.picApotik,
      statusAktif: apotik.statusAktif,
      defaultPO: bothChecked,
      defaultTerimaBarang: bothChecked,
    };
    
    // Check pengajuan status
    const savedPengajuan = localStorage.getItem("pengajuanApotik");
    if (savedPengajuan) {
      try {
        const pengajuanList = JSON.parse(savedPengajuan);
        const approvedPengajuan = pengajuanList.find(
          (p: any) => p.apotikId === apotik.id && p.status === "Disetujui"
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
    if (!viewingApotik) return;
    
    // Set editing apotik and form data
    const defaultPOValue = viewingApotik.defaultPO || false;
    const defaultTerimaBarangValue = viewingApotik.defaultTerimaBarang || false;
    const bothChecked = defaultPOValue || defaultTerimaBarangValue;
    
    setFormData({
      kodeApotik: viewingApotik.kodeApotik,
      namaApotik: viewingApotik.namaApotik,
      alamat: viewingApotik.alamat,
      kota: viewingApotik.kota,
      provinsi: viewingApotik.provinsi,
      telepon: viewingApotik.telepon,
      email: viewingApotik.email,
      picApotik: viewingApotik.picApotik,
      statusAktif: viewingApotik.statusAktif,
      defaultPO: bothChecked,
      defaultTerimaBarang: bothChecked,
    });
    setEditingApotik(viewingApotik);
    setIsSaved(true);
    
    // Close view modal and open edit modal
    handleCloseViewModal();
    setIsModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingApotik(null);
  };

  const handleDeleteApotik = (apotik: Apotik) => {
    if (confirm("Apakah Anda yakin ingin menghapus apotik ini?")) {
      const updatedApotiks = apotiks.filter((a) => a.id !== apotik.id);
      setApotiks(updatedApotiks);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    // Reset isSaved jika ada perubahan data (hanya jika sedang edit data yang sudah tersimpan)
    if (isSaved && editingApotik) {
      setIsSaved(false);
    }
    
    // Jika checkbox "Default PO & Terima Barang" dicentang, set kedua nilai sama
    if (name === "defaultPOAndTerimaBarang") {
      setFormData((prev) => ({
        ...prev,
        defaultPO: checked,
        defaultTerimaBarang: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // TODO: Implementasi save ke database
      console.log("Form Data:", formData);
      
      // Simulasi delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (editingApotik) {
        // Update existing apotik
        const updatedApotiks = apotiks.map((a) =>
          a.id === editingApotik.id
            ? {
                ...a,
                ...formData,
              }
            : a
        );
        setApotiks(updatedApotiks);
        
        // If this is after approved edit pengajuan, remove the pengajuan
        if (currentPengajuan && pengajuanStatus === "Disetujui" && currentPengajuan.jenisPengajuan === "Edit Data") {
          const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
          localStorage.setItem("pengajuanApotik", JSON.stringify(updatedPengajuanList));
          setPengajuanList(updatedPengajuanList);
          setCurrentPengajuan(null);
          setPengajuanStatus(null);
          setHasRefreshed(false);
          // Set isSaved menjadi true agar tombol kembali menjadi "Ajukan Perubahan"
          setIsSaved(true);
          alert("Data apotik berhasil diupdate!");
        } else {
          // Set isSaved untuk mengubah tombol menjadi "Ajukan Perubahan"
          setIsSaved(true);
        }
      } else {
        // Tambahkan apotik baru ke state
        const newApotik: Apotik = {
          id: Date.now().toString(),
          ...formData,
          createdAt: new Date(),
        };
        
        setApotiks((prev) => [newApotik, ...prev]);
        // Reset form dan tutup modal untuk data baru
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

    if (!editingApotik) {
      alert("Tidak ada apotik yang sedang diedit");
      return;
    }

    const newPengajuan = {
      id: Date.now().toString(),
      apotikId: editingApotik.id,
      kodeApotik: editingApotik.kodeApotik,
      namaApotik: editingApotik.namaApotik,
      jenisPengajuan: pengajuanData.jenisPengajuan,
      alasanPengajuan: pengajuanData.alasanPengajuan,
      status: "Menunggu Persetujuan",
      createdAt: new Date().toISOString(),
      disetujuiPada: undefined,
      ditolakPada: undefined,
      alasanTolak: undefined,
      // Simpan data form untuk edit
      formData: formData,
      menuSystem: "Data Master",
      isNew: true, // Flag untuk notifikasi baru
    };

    const updatedPengajuanList = [...pengajuanList, newPengajuan];
    localStorage.setItem("pengajuanApotik", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);

    // Set pengajuan state after submit
    setIsSaved(false);
    setCurrentPengajuan(newPengajuan);
    setPengajuanStatus("Menunggu Persetujuan");
    setShowNotification(false);
    setHasRefreshed(false);

    handleClosePengajuanModal();
    alert("Pengajuan perubahan berhasil dikirim!");
  };

  const handleRefresh = () => {
    // Reload pengajuan list from localStorage
    const savedPengajuan = localStorage.getItem("pengajuanApotik");
    if (savedPengajuan) {
      try {
        const updatedList = JSON.parse(savedPengajuan);
        setPengajuanList(updatedList);
        
        // Find current pengajuan
        if (editingApotik) {
          const activePengajuan = updatedList.find(
            (p: any) => p.apotikId === editingApotik.id && 
            (p.status === "Menunggu Persetujuan" || p.status === "Disetujui" || p.status === "Ditolak")
          );
          
          if (activePengajuan) {
            setCurrentPengajuan(activePengajuan);
            setPengajuanStatus(activePengajuan.status);
            
            if (activePengajuan.status === "Disetujui") {
              setHasRefreshed(true);
              setShowNotification(false);
              
              // If Edit Data, update formData with data from pengajuan
              if (activePengajuan.jenisPengajuan === "Edit Data" && activePengajuan.formData) {
                setFormData(activePengajuan.formData);
              }
            } else if (activePengajuan.status === "Ditolak") {
              // Reset if rejected
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
      // Remove pengajuan from list
      const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
      localStorage.setItem("pengajuanApotik", JSON.stringify(updatedPengajuanList));
      setPengajuanList(updatedPengajuanList);
      
      // Reset pengajuan states
      setCurrentPengajuan(null);
      setPengajuanStatus(null);
      setShowNotification(false);
      setHasRefreshed(false);
      setIsSaved(false);
      
      alert("Pengajuan berhasil dibatalkan!");
    }
  };

  const handleHapusApotik = () => {
    if (!editingApotik) return;
    
    if (confirm(`Apakah Anda yakin ingin menghapus apotik ${editingApotik.namaApotik}?`)) {
      // Remove apotik from list
      const updatedApotiks = apotiks.filter((a) => a.id !== editingApotik.id);
      setApotiks(updatedApotiks);
      localStorage.setItem("apotiks", JSON.stringify(updatedApotiks));
      
      // Remove pengajuan if exists
      if (currentPengajuan) {
        const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
        localStorage.setItem("pengajuanApotik", JSON.stringify(updatedPengajuanList));
        setPengajuanList(updatedPengajuanList);
      }
      
      // Close modal and reset all states
      handleCloseModal();
      alert("Apotik berhasil dihapus!");
    }
  };

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
            + Tambah Apotik
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
          ) : apotiks.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ color: "#64748b", margin: 0 }}>
                Belum ada data apotik. Klik tombol "Tambah Apotik" untuk menambahkan data.
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
                    }}
                  >
                    Nama Apotik
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
                    Alamat
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
                    Kota
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
                    Telepon
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
                    PIC
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
                      width: "150px",
                    }}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {apotiks.map((apotik) => (
                  <tr
                    key={apotik.id}
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
                      {apotik.kodeApotik}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1e293b",
                      }}
                    >
                      {apotik.namaApotik}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {apotik.alamat}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {apotik.kota}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {apotik.telepon}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {apotik.picApotik || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: apotik.statusAktif ? "#10b981" : "#ef4444",
                        fontWeight: "500",
                      }}
                    >
                      {apotik.statusAktif ? "Aktif" : "Non-Aktif"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                      }}
                    >
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleViewApotik(apotik)}
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
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
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
                  {editingApotik ? "Edit Apotik" : "Tambah Apotik"}
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
                      htmlFor="kodeApotik"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Kode Apotik <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="kodeApotik"
                      name="kodeApotik"
                      value={formData.kodeApotik}
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
                      placeholder="Masukkan kode apotik"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="namaApotik"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Nama Apotik <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="namaApotik"
                      name="namaApotik"
                      value={formData.namaApotik}
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
                      placeholder="Masukkan nama apotik"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    htmlFor="alamat"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Alamat Lengkap <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <textarea
                    id="alamat"
                    name="alamat"
                    value={formData.alamat}
                    onChange={handleChange}
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
                    placeholder="Masukkan alamat lengkap"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <label
                      htmlFor="kota"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Kota/Kabupaten <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="kota"
                      name="kota"
                      value={formData.kota}
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
                      placeholder="Masukkan kota/kabupaten"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="provinsi"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Provinsi <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="provinsi"
                      name="provinsi"
                      value={formData.provinsi}
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
                      placeholder="Masukkan provinsi"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                  <div>
                    <label
                      htmlFor="telepon"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Nomor Telepon <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      id="telepon"
                      name="telepon"
                      value={formData.telepon}
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
                      placeholder="Masukkan nomor telepon"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
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
                      placeholder="Masukkan email"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    htmlFor="picApotik"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    PIC Apotik (Sales)
                  </label>
                  <input
                    type="text"
                    id="picApotik"
                    name="picApotik"
                    value={formData.picApotik}
                    onChange={handleChange}
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
                    placeholder="Masukkan nama PIC/Sales"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "24px" }}>
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
                      id="defaultPOAndTerimaBarang"
                      name="defaultPOAndTerimaBarang"
                      checked={formData.defaultPO && formData.defaultTerimaBarang}
                      onChange={handleChange}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                      }}
                    />
                    <span>Default PO & Terima Barang Supplier</span>
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
                  
                  {/* Dynamic buttons based on pengajuan status */}
                  {(() => {
                    // Debug logging
                    console.log("Button render check:", {
                      isSaved,
                      currentPengajuan: currentPengajuan ? {
                        id: currentPengajuan.id,
                        status: currentPengajuan.status,
                        jenisPengajuan: currentPengajuan.jenisPengajuan
                      } : null,
                      pengajuanStatus,
                      hasRefreshed
                    });
                    
                    // Condition 1: No pengajuan, just saved
                    if (isSaved && !currentPengajuan) {
                      return (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            setIsPengajuanModalOpen(true);
                          }}
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
                    
                    // Condition 2: Pengajuan disetujui (prioritas lebih tinggi, tombol langsung berubah)
                    if (pengajuanStatus === "Disetujui" && currentPengajuan) {
                      console.log("Condition 2 matched - Disetujui, jenisPengajuan:", currentPengajuan.jenisPengajuan);
                      // Check for Hapus Data first
                      if (currentPengajuan.jenisPengajuan === "Hapus Data") {
                        console.log("Rendering Hapus button");
                        return (
                          <>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={handleHapusApotik}
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
                      
                      // Check for Edit Data
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
                    
                    // Condition 3: Pengajuan menunggu persetujuan
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
                    
                    // Default: Normal save button
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
              {/* Header */}
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

        {/* View Modal */}
        {isViewModalOpen && viewingApotik && (
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
                  Detail Apotik
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
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Kode Apotik
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                    {viewingApotik.kodeApotik}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Nama Apotik
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                    {viewingApotik.namaApotik}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Alamat Lengkap
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b" }}>
                  {viewingApotik.alamat}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Kota/Kabupaten
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingApotik.kota}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Provinsi
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingApotik.provinsi}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Nomor Telepon
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingApotik.telepon}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Email
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingApotik.email || "-"}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  PIC Apotik (Sales)
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b" }}>
                  {viewingApotik.picApotik || "-"}
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Status
                </label>
                <div style={{ fontSize: "14px", color: viewingApotik.statusAktif ? "#10b981" : "#ef4444", fontWeight: "500" }}>
                  {viewingApotik.statusAktif ? "Aktif" : "Non-Aktif"}
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
      </div>
    </DashboardLayout>
  );
}
