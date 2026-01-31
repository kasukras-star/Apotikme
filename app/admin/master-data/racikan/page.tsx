"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface RacikanFormData {
  kodeRacikan: string;
  namaRacikan: string;
  satuan: string;
  jasaRacik: string;
  jasaBungkus: string;
  hargaDasarJasaRacik: string;
  batasRacik: string;
  pengaliRacik: string;
  hargaDasarJasaBungkus: string;
  batasBungkus: string;
  pengaliBungkus: string;
  keterangan: string;
}

interface Racikan {
  id: string;
  kodeRacikan: string;
  namaRacikan: string;
  satuan?: string;
  jasaRacik: number;
  jasaBungkus: number;
  hargaDasarJasaRacik?: number;
  batasRacik?: number;
  pengaliRacik?: number;
  hargaDasarJasaBungkus?: number;
  batasBungkus?: number;
  pengaliBungkus?: number;
  keterangan: string;
  createdAt: Date;
  operator?: string;
  updatedAt?: Date;
}

export default function DataRacikanPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingRacikan, setEditingRacikan] = useState<Racikan | null>(null);
  const [viewingRacikan, setViewingRacikan] = useState<Racikan | null>(null);
  const [formData, setFormData] = useState<RacikanFormData>({
    kodeRacikan: "",
    namaRacikan: "",
    satuan: "",
    jasaRacik: "0",
    jasaBungkus: "0",
    hargaDasarJasaRacik: "0",
    batasRacik: "10",
    pengaliRacik: "2",
    hargaDasarJasaBungkus: "0",
    batasBungkus: "10",
    pengaliBungkus: "2",
    keterangan: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [racikans, setRacikans] = useState<Racikan[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [units, setUnits] = useState<any[]>([]);
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

  // Load data from localStorage on mount
  useEffect(() => {
    const savedRacikans = localStorage.getItem("racikans");
    if (savedRacikans) {
      try {
        const parsed = JSON.parse(savedRacikans);
        // Convert createdAt string back to Date
        const racikansWithDates = parsed.map((racikan: any) => ({
          ...racikan,
          jasaRacik: typeof racikan.jasaRacik === "number" ? racikan.jasaRacik : Number(racikan.jasaRacik || 0),
          jasaBungkus: typeof racikan.jasaBungkus === "number" ? racikan.jasaBungkus : Number(racikan.jasaBungkus || 0),
          hargaDasarJasaRacik: racikan.hargaDasarJasaRacik ?? racikan.jasaRacik ?? 0,
          batasRacik: racikan.batasRacik ?? racikan.kelipatanJasaRacik ?? 10,
          pengaliRacik: racikan.pengaliRacik ?? 2,
          hargaDasarJasaBungkus: racikan.hargaDasarJasaBungkus ?? racikan.jasaBungkus ?? 0,
          batasBungkus: racikan.batasBungkus ?? 10,
          pengaliBungkus: racikan.pengaliBungkus ?? 2,
          createdAt: new Date(racikan.createdAt),
          updatedAt: racikan.updatedAt ? new Date(racikan.updatedAt) : undefined,
        }));
        setRacikans(racikansWithDates);
      } catch (err) {
        console.error("Error loading racikans from localStorage:", err);
      }
    }

    // Load units
    const savedUnits = localStorage.getItem("units");
    if (savedUnits) {
      try {
        setUnits(JSON.parse(savedUnits));
      } catch (err) {
        console.error("Error loading units:", err);
      }
    }

    // Load pengajuan list
    const savedPengajuan = localStorage.getItem("pengajuanRacikan");
    if (savedPengajuan) {
      try {
        setPengajuanList(JSON.parse(savedPengajuan));
      } catch (err) {
        console.error("Error loading pengajuan racikan:", err);
      }
    }

    setIsLoadingData(false);
  }, []);

  // Check pengajuan status when editingRacikan changes
  useEffect(() => {
    if (editingRacikan) {
      const savedPengajuan = localStorage.getItem("pengajuanRacikan");
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
          (p: any) => p.racikanId === editingRacikan.id && 
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
  }, [editingRacikan]);

  // React to pengajuanList changes when editing
  useEffect(() => {
    if (!editingRacikan) return;

    const activePengajuan = pengajuanList.find(
      (p: any) => p.racikanId === editingRacikan.id && 
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
  }, [pengajuanList, editingRacikan]);

  // Poll for pengajuan status changes when modal is open
  useEffect(() => {
    if (!isModalOpen || !editingRacikan) return;

    const interval = setInterval(() => {
      const savedPengajuan = localStorage.getItem("pengajuanRacikan");
      if (savedPengajuan) {
        try {
          const currentList = JSON.parse(savedPengajuan);
          setPengajuanList((prevList) => {
            const prevStr = JSON.stringify(prevList);
            const currentStr = JSON.stringify(currentList);
            if (prevStr !== currentStr) {
              const activePengajuan = currentList.find(
                (p: any) => p.racikanId === editingRacikan.id && 
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
  }, [isModalOpen, editingRacikan]);

  // Save to localStorage whenever racikans change
  useEffect(() => {
    if (!isLoadingData) {
      localStorage.setItem("racikans", JSON.stringify(racikans));
    }
  }, [racikans, isLoadingData]);

  // Sync racikans ke server agar POS bisa load saat localStorage kosong (Incognito / perangkat lain)
  useEffect(() => {
    if (!isLoadingData && racikans.length >= 0) {
      getSupabaseClient()
        .auth.getSession()
        .then(({ data }) => {
          if (data.session?.access_token) {
            const payload = racikans.map((r) => ({
              ...r,
              createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
            }));
            fetch("/api/data/racikans", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.session.access_token}`,
              },
              body: JSON.stringify({ racikans: payload }),
            }).catch(() => {});
          }
        });
    }
  }, [racikans, isLoadingData]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setEditingRacikan(null);
    setError(null);
    setIsSaved(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRacikan(null);
    setFormData({
      kodeRacikan: "",
      namaRacikan: "",
      satuan: "",
      jasaRacik: "0",
      jasaBungkus: "0",
      hargaDasarJasaRacik: "0",
      batasRacik: "10",
      pengaliRacik: "2",
      hargaDasarJasaBungkus: "0",
      batasBungkus: "10",
      pengaliBungkus: "2",
      keterangan: "",
    });
    setError(null);
    setIsSaved(false);
    setCurrentPengajuan(null);
    setPengajuanStatus(null);
    setShowNotification(false);
    setHasRefreshed(false);
  };

  const handleEditRacikan = (racikan: Racikan) => {
    setEditingRacikan(racikan);
    setHasRefreshed(false);
    setShowNotification(false);
    
    let initialFormData = {
      kodeRacikan: racikan.kodeRacikan,
      namaRacikan: racikan.namaRacikan,
      satuan: racikan.satuan ?? "",
      jasaRacik: String(racikan.jasaRacik ?? 0),
      jasaBungkus: String(racikan.jasaBungkus ?? 0),
      hargaDasarJasaRacik: String(racikan.hargaDasarJasaRacik ?? racikan.jasaRacik ?? 0),
      batasRacik: String(racikan.batasRacik ?? racikan.kelipatanJasaRacik ?? 10),
      pengaliRacik: String(racikan.pengaliRacik ?? 2),
      hargaDasarJasaBungkus: String(racikan.hargaDasarJasaBungkus ?? racikan.jasaBungkus ?? 0),
      batasBungkus: String(racikan.batasBungkus ?? 10),
      pengaliBungkus: String(racikan.pengaliBungkus ?? 2),
      keterangan: racikan.keterangan,
    };
    
    const savedPengajuan = localStorage.getItem("pengajuanRacikan");
    if (savedPengajuan) {
      try {
        const pengajuanList = JSON.parse(savedPengajuan);
        const approvedPengajuan = pengajuanList.find(
          (p: any) => p.racikanId === racikan.id && p.status === "Disetujui"
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

  const handleViewRacikan = (racikan: Racikan) => {
    // Gunakan logic yang sama dengan handleEditRacikan untuk langsung buka modal form
    setEditingRacikan(racikan);
    setHasRefreshed(false);
    setShowNotification(false);
    
    let initialFormData = {
      kodeRacikan: racikan.kodeRacikan,
      namaRacikan: racikan.namaRacikan,
      satuan: racikan.satuan ?? "",
      jasaRacik: String(racikan.jasaRacik ?? 0),
      jasaBungkus: String(racikan.jasaBungkus ?? 0),
      hargaDasarJasaRacik: String(racikan.hargaDasarJasaRacik ?? racikan.jasaRacik ?? 0),
      batasRacik: String(racikan.batasRacik ?? racikan.kelipatanJasaRacik ?? 10),
      pengaliRacik: String(racikan.pengaliRacik ?? 2),
      hargaDasarJasaBungkus: String(racikan.hargaDasarJasaBungkus ?? racikan.jasaBungkus ?? 0),
      batasBungkus: String(racikan.batasBungkus ?? 10),
      pengaliBungkus: String(racikan.pengaliBungkus ?? 2),
      keterangan: racikan.keterangan,
    };
    
    // Check pengajuan status
    const savedPengajuan = localStorage.getItem("pengajuanRacikan");
    if (savedPengajuan) {
      try {
        const pengajuanList = JSON.parse(savedPengajuan);
        const approvedPengajuan = pengajuanList.find(
          (p: any) => p.racikanId === racikan.id && p.status === "Disetujui"
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
    if (!viewingRacikan) return;
    
    setFormData({
      kodeRacikan: viewingRacikan.kodeRacikan,
      namaRacikan: viewingRacikan.namaRacikan,
      satuan: viewingRacikan.satuan ?? "",
      jasaRacik: String(viewingRacikan.jasaRacik ?? 0),
      jasaBungkus: String(viewingRacikan.jasaBungkus ?? 0),
      hargaDasarJasaRacik: String(viewingRacikan.hargaDasarJasaRacik ?? viewingRacikan.jasaRacik ?? 0),
      batasRacik: String(viewingRacikan.batasRacik ?? viewingRacikan.kelipatanJasaRacik ?? 10),
      pengaliRacik: String(viewingRacikan.pengaliRacik ?? 2),
      hargaDasarJasaBungkus: String(viewingRacikan.hargaDasarJasaBungkus ?? viewingRacikan.jasaBungkus ?? 0),
      batasBungkus: String(viewingRacikan.batasBungkus ?? 10),
      pengaliBungkus: String(viewingRacikan.pengaliBungkus ?? 2),
      keterangan: viewingRacikan.keterangan,
    });
    setEditingRacikan(viewingRacikan);
    setIsSaved(true);
    
    handleCloseViewModal();
    setIsModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingRacikan(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (isSaved && editingRacikan) {
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
      const userEmail = currentUserEmail || "System";
      const now = new Date();
      const jasaRacikValue = Number(formData.jasaRacik || 0);
      const jasaBungkusValue = Number(formData.jasaBungkus || 0);
      const hargaDasarJasaRacikValue = Number(formData.hargaDasarJasaRacik || 0);
      const batasRacikValue = Number(formData.batasRacik || 10);
      const pengaliRacikValue = Number(formData.pengaliRacik || 2);
      const hargaDasarJasaBungkusValue = Number(formData.hargaDasarJasaBungkus || 0);
      const batasBungkusValue = Number(formData.batasBungkus || 10);
      const pengaliBungkusValue = Number(formData.pengaliBungkus || 2);
      
      if (editingRacikan) {
        const updatedRacikans = racikans.map((r) =>
          r.id === editingRacikan.id
            ? {
                ...r,
                kodeRacikan: formData.kodeRacikan,
                namaRacikan: formData.namaRacikan,
                satuan: formData.satuan,
                jasaRacik: jasaRacikValue,
                jasaBungkus: jasaBungkusValue,
                hargaDasarJasaRacik: hargaDasarJasaRacikValue,
                batasRacik: batasRacikValue,
                pengaliRacik: pengaliRacikValue,
                hargaDasarJasaBungkus: hargaDasarJasaBungkusValue,
                batasBungkus: batasBungkusValue,
                pengaliBungkus: pengaliBungkusValue,
                keterangan: formData.keterangan,
                operator: r.operator || userEmail,
                updatedAt: now,
              }
            : r
        );
        setRacikans(updatedRacikans);
        
        if (currentPengajuan && pengajuanStatus === "Disetujui" && currentPengajuan.jenisPengajuan === "Edit Data") {
          const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
          localStorage.setItem("pengajuanRacikan", JSON.stringify(updatedPengajuanList));
          setPengajuanList(updatedPengajuanList);
          setCurrentPengajuan(null);
          setPengajuanStatus(null);
          setHasRefreshed(false);
          setIsSaved(true);
          alert("Data racikan berhasil diupdate!");
        } else {
          setIsSaved(true);
        }
      } else {
        const newRacikan: Racikan = {
          id: Date.now().toString(),
          kodeRacikan: formData.kodeRacikan,
          namaRacikan: formData.namaRacikan,
          satuan: formData.satuan,
          jasaRacik: jasaRacikValue,
          jasaBungkus: jasaBungkusValue,
          hargaDasarJasaRacik: hargaDasarJasaRacikValue,
          batasRacik: batasRacikValue,
          pengaliRacik: pengaliRacikValue,
          hargaDasarJasaBungkus: hargaDasarJasaBungkusValue,
          batasBungkus: batasBungkusValue,
          pengaliBungkus: pengaliBungkusValue,
          keterangan: formData.keterangan,
          createdAt: now,
          operator: userEmail,
          updatedAt: now,
        };
        
        setRacikans((prev) => [newRacikan, ...prev]);
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

    if (!editingRacikan) {
      alert("Tidak ada racikan yang sedang diedit");
      return;
    }

    const newPengajuan = {
      id: Date.now().toString(),
      racikanId: editingRacikan.id,
      kodeRacikan: editingRacikan.kodeRacikan,
      namaRacikan: editingRacikan.namaRacikan,
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
    localStorage.setItem("pengajuanRacikan", JSON.stringify(updatedPengajuanList));
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
    const savedPengajuan = localStorage.getItem("pengajuanRacikan");
    if (savedPengajuan) {
      try {
        const updatedList = JSON.parse(savedPengajuan);
        setPengajuanList(updatedList);
        
        if (editingRacikan) {
          const activePengajuan = updatedList.find(
            (p: any) => p.racikanId === editingRacikan.id && 
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
      localStorage.setItem("pengajuanRacikan", JSON.stringify(updatedPengajuanList));
      setPengajuanList(updatedPengajuanList);
      
      setCurrentPengajuan(null);
      setPengajuanStatus(null);
      setShowNotification(false);
      setHasRefreshed(false);
      setIsSaved(false);
      
      alert("Pengajuan berhasil dibatalkan!");
    }
  };

  const handleHapusRacikan = () => {
    if (!editingRacikan) return;
    
    if (confirm(`Apakah Anda yakin ingin menghapus racikan ${editingRacikan.namaRacikan}?`)) {
      const updatedRacikans = racikans.filter((r) => r.id !== editingRacikan.id);
      setRacikans(updatedRacikans);
      localStorage.setItem("racikans", JSON.stringify(updatedRacikans));
      
      if (currentPengajuan) {
        const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
        localStorage.setItem("pengajuanRacikan", JSON.stringify(updatedPengajuanList));
        setPengajuanList(updatedPengajuanList);
      }
      
      handleCloseModal();
      alert("Racikan berhasil dihapus!");
    }
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
            + Tambah Racikan
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
          ) : racikans.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ color: "#64748b", margin: 0 }}>
                Belum ada data racikan. Klik tombol "Tambah Racikan" untuk menambahkan data.
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
                    Kode Racikan
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
                    Nama Racikan
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
                    Keterangan
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
                {racikans.map((racikan) => (
                  <tr
                    key={racikan.id}
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
                      {racikan.kodeRacikan}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1e293b",
                      }}
                    >
                      {racikan.namaRacikan}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {racikan.keterangan || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {racikan.operator || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {racikan.updatedAt 
                        ? new Date(racikan.updatedAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : racikan.createdAt
                        ? new Date(racikan.createdAt).toLocaleDateString("id-ID", {
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
                        onClick={() => handleViewRacikan(racikan)}
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
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "24px",
                width: "90%",
                maxWidth: "600px",
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
                  {editingRacikan ? "Edit Racikan" : "Tambah Racikan"}
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div>
                    <label
                      htmlFor="kodeRacikan"
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Kode Racikan <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="kodeRacikan"
                      name="kodeRacikan"
                      value={formData.kodeRacikan}
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
                      placeholder="Masukkan kode racikan"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="namaRacikan"
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Nama Racikan <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="namaRacikan"
                      name="namaRacikan"
                      value={formData.namaRacikan}
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
                      placeholder="Masukkan nama racikan"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="satuan"
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Satuan
                    </label>
                    <select
                      id="satuan"
                      name="satuan"
                      value={formData.satuan}
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
                      <option value="">Pilih Satuan</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.namaUnit}>
                          {unit.namaUnit}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "12px",
                    marginBottom: "14px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", marginBottom: "10px" }}>
                    Pengaturan Jasa
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                      Jasa Racik
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                      <div>
                        <label
                          htmlFor="hargaDasarJasaRacik"
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Harga Dasar
                        </label>
                        <input
                          type="number"
                          id="hargaDasarJasaRacik"
                          name="hargaDasarJasaRacik"
                          value={formData.hargaDasarJasaRacik}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "13px",
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
                          htmlFor="batasRacik"
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Batas Racik
                        </label>
                        <input
                          type="number"
                          id="batasRacik"
                          name="batasRacik"
                          value={formData.batasRacik}
                          onChange={handleChange}
                          min="1"
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "13px",
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
                          placeholder="10"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="pengaliRacik"
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Pengali (jika &gt; batas)
                        </label>
                        <input
                          type="number"
                          id="pengaliRacik"
                          name="pengaliRacik"
                          value={formData.pengaliRacik}
                          onChange={handleChange}
                          min="1"
                          step="0.1"
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "13px",
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
                          placeholder="2"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px", marginTop: "10px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                      Jasa Bungkus
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                      <div>
                        <label
                          htmlFor="hargaDasarJasaBungkus"
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Harga Dasar
                        </label>
                        <input
                          type="number"
                          id="hargaDasarJasaBungkus"
                          name="hargaDasarJasaBungkus"
                          value={formData.hargaDasarJasaBungkus}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "13px",
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
                          htmlFor="batasBungkus"
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Batas Bungkus
                        </label>
                        <input
                          type="number"
                          id="batasBungkus"
                          name="batasBungkus"
                          value={formData.batasBungkus}
                          onChange={handleChange}
                          min="1"
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "13px",
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
                          placeholder="10"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="pengaliBungkus"
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Pengali (jika &gt; batas)
                        </label>
                        <input
                          type="number"
                          id="pengaliBungkus"
                          name="pengaliBungkus"
                          value={formData.pengaliBungkus}
                          onChange={handleChange}
                          min="1"
                          step="0.1"
                          style={{
                            width: "100%",
                            padding: "7px 10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "13px",
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
                          placeholder="2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label
                    htmlFor="keterangan"
                    style={{
                      display: "block",
                      marginBottom: "6px",
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
                              onClick={handleHapusRacikan}
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
        {isViewModalOpen && viewingRacikan && (
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
                  Detail Racikan
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
                  Kode Racikan
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                  {viewingRacikan.kodeRacikan}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Nama Racikan
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                  {viewingRacikan.namaRacikan}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Satuan
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b" }}>
                  {viewingRacikan.satuan || "-"}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                  Jasa Racik
                </div>
                <div style={{ paddingLeft: "12px" }}>
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Harga Dasar: </span>
                    <span style={{ fontSize: "14px", color: "#1e293b" }}>
                      {Number(viewingRacikan.hargaDasarJasaRacik ?? viewingRacikan.jasaRacik ?? 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Batas Racik: </span>
                    <span style={{ fontSize: "14px", color: "#1e293b" }}>
                      {Number(viewingRacikan.batasRacik ?? viewingRacikan.kelipatanJasaRacik ?? 10).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Pengali (jika &gt; batas): </span>
                    <span style={{ fontSize: "14px", color: "#1e293b" }}>
                      {Number(viewingRacikan.pengaliRacik ?? 2).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                  Jasa Bungkus
                </div>
                <div style={{ paddingLeft: "12px" }}>
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Harga Dasar: </span>
                    <span style={{ fontSize: "14px", color: "#1e293b" }}>
                      {Number(viewingRacikan.hargaDasarJasaBungkus ?? viewingRacikan.jasaBungkus ?? 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Batas Bungkus: </span>
                    <span style={{ fontSize: "14px", color: "#1e293b" }}>
                      {Number(viewingRacikan.batasBungkus ?? 10).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Pengali (jika &gt; batas): </span>
                    <span style={{ fontSize: "14px", color: "#1e293b" }}>
                      {Number(viewingRacikan.pengaliBungkus ?? 2).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Keterangan
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b" }}>
                  {viewingRacikan.keterangan || "-"}
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
