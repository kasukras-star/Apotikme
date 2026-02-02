"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface TypeFormData {
  kodeType: string;
  namaType: string;
  keterangan: string;
  statusAktif: boolean;
}

interface Type {
  id: string;
  kodeType: string;
  namaType: string;
  keterangan: string;
  statusAktif: boolean;
  createdAt: Date;
  operator?: string;
  updatedAt?: Date;
}

export default function DataTypePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<Type | null>(null);
  const [viewingType, setViewingType] = useState<Type | null>(null);
  const [formData, setFormData] = useState<TypeFormData>({
    kodeType: "",
    namaType: "",
    keterangan: "",
    statusAktif: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<Type[]>([]);
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

  // Load data from API (Supabase) first, fallback to localStorage
  useEffect(() => {
    let cancelled = false;
    function loadFromLocalStorage() {
      const saved = localStorage.getItem("types");
      if (saved) try { setTypes(JSON.parse(saved).map((t: any) => ({ ...t, createdAt: new Date(t.createdAt), updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined }))); } catch (_) {}
      const sp = localStorage.getItem("pengajuanType");
      if (sp) try { setPengajuanList(JSON.parse(sp)); } catch (_) {}
    }
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token || cancelled) { loadFromLocalStorage(); setIsLoadingData(false); return; }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/types", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/pengajuanType", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      ]).then(([arr, pengajuan]) => {
        if (cancelled) return;
        if (Array.isArray(arr) && arr.length > 0) {
          setTypes(arr.map((t: any) => ({ ...t, createdAt: t.createdAt ? new Date(t.createdAt) : new Date(), updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined })));
          localStorage.setItem("types", JSON.stringify(arr));
        } else loadFromLocalStorage();
        if (Array.isArray(pengajuan) && pengajuan.length > 0) { setPengajuanList(pengajuan); localStorage.setItem("pengajuanType", JSON.stringify(pengajuan)); }
        else { const sp = localStorage.getItem("pengajuanType"); if (sp) try { setPengajuanList(JSON.parse(sp)); } catch (_) {} }
      }).catch(() => { if (!cancelled) loadFromLocalStorage(); }).finally(() => { if (!cancelled) setIsLoadingData(false); });
    }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    return () => { cancelled = true; };
  }, []);

  // Check pengajuan status when editingType changes
  useEffect(() => {
    if (editingType) {
      const savedPengajuan = localStorage.getItem("pengajuanType");
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
          (p: any) => p.typeId === editingType.id && 
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
  }, [editingType]);

  // React to pengajuanList changes when editing
  useEffect(() => {
    if (!editingType) return;

    const activePengajuan = pengajuanList.find(
      (p: any) => p.typeId === editingType.id && 
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
  }, [pengajuanList, editingType]);

  // Poll for pengajuan status changes when modal is open
  useEffect(() => {
    if (!isModalOpen || !editingType) return;

    const interval = setInterval(() => {
      const savedPengajuan = localStorage.getItem("pengajuanType");
      if (savedPengajuan) {
        try {
          const currentList = JSON.parse(savedPengajuan);
          setPengajuanList((prevList) => {
            const prevStr = JSON.stringify(prevList);
            const currentStr = JSON.stringify(currentList);
            if (prevStr !== currentStr) {
              const activePengajuan = currentList.find(
                (p: any) => p.typeId === editingType.id && 
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
  }, [isModalOpen, editingType]);

  // Save to localStorage and sync to API whenever types or pengajuan change
  useEffect(() => {
    if (!isLoadingData) {
      localStorage.setItem("types", JSON.stringify(types));
    }
  }, [types, isLoadingData]);
  useEffect(() => {
    if (!isLoadingData) {
      getSupabaseClient().auth.getSession().then(({ data }) => {
        if (data.session?.access_token) {
          const payload = types.map((t) => ({ ...t, createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt, updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt }));
          fetch("/api/data/types", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: payload }) }).catch(() => {});
        }
      });
    }
  }, [types, isLoadingData]);
  useEffect(() => {
    if (!isLoadingData) {
      getSupabaseClient().auth.getSession().then(({ data }) => {
        if (data.session?.access_token) {
          fetch("/api/data/pengajuanType", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: pengajuanList }) }).catch(() => {});
        }
      });
    }
  }, [pengajuanList, isLoadingData]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setEditingType(null);
    setError(null);
    setIsSaved(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
    setFormData({
      kodeType: "",
      namaType: "",
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

  const handleEditType = (type: Type) => {
    setEditingType(type);
    setHasRefreshed(false);
    setShowNotification(false);
    
    let initialFormData = {
      kodeType: type.kodeType,
      namaType: type.namaType,
      keterangan: type.keterangan,
      statusAktif: type.statusAktif,
    };
    
    const savedPengajuan = localStorage.getItem("pengajuanType");
    if (savedPengajuan) {
      try {
        const pengajuanList = JSON.parse(savedPengajuan);
        const approvedPengajuan = pengajuanList.find(
          (p: any) => p.typeId === type.id && p.status === "Disetujui"
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

  const handleViewType = (type: Type) => {
    // Gunakan logic yang sama dengan handleEditType untuk langsung buka modal form
    setEditingType(type);
    setHasRefreshed(false);
    setShowNotification(false);
    
    let initialFormData = {
      kodeType: type.kodeType,
      namaType: type.namaType,
      keterangan: type.keterangan,
      statusAktif: type.statusAktif,
    };
    
    // Check pengajuan status
    const savedPengajuan = localStorage.getItem("pengajuanType");
    if (savedPengajuan) {
      try {
        const pengajuanList = JSON.parse(savedPengajuan);
        const approvedPengajuan = pengajuanList.find(
          (p: any) => p.typeId === type.id && p.status === "Disetujui"
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
    if (!viewingType) return;
    
    setFormData({
      kodeType: viewingType.kodeType,
      namaType: viewingType.namaType,
      keterangan: viewingType.keterangan,
      statusAktif: viewingType.statusAktif,
    });
    setEditingType(viewingType);
    setIsSaved(true);
    
    handleCloseViewModal();
    setIsModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingType(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (isSaved && editingType) {
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
      
      if (editingType) {
        const updatedTypes = types.map((t) =>
          t.id === editingType.id
            ? {
                ...t,
                ...formData,
                operator: t.operator || userEmail,
                updatedAt: now,
              }
            : t
        );
        setTypes(updatedTypes);
        
        if (currentPengajuan && pengajuanStatus === "Disetujui" && currentPengajuan.jenisPengajuan === "Edit Data") {
          const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
          localStorage.setItem("pengajuanType", JSON.stringify(updatedPengajuanList));
          setPengajuanList(updatedPengajuanList);
          setCurrentPengajuan(null);
          setPengajuanStatus(null);
          setHasRefreshed(false);
          setIsSaved(true);
          alert("Data type berhasil diupdate!");
        } else {
          setIsSaved(true);
        }
      } else {
        const newType: Type = {
          id: Date.now().toString(),
          kodeType: formData.kodeType,
          namaType: formData.namaType,
          keterangan: formData.keterangan,
          statusAktif: formData.statusAktif,
          createdAt: now,
          operator: userEmail,
          updatedAt: now,
        };
        
        setTypes((prev) => [newType, ...prev]);
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

    if (!editingType) {
      alert("Tidak ada type yang sedang diedit");
      return;
    }

    const newPengajuan = {
      id: Date.now().toString(),
      typeId: editingType.id,
      kodeType: editingType.kodeType,
      namaType: editingType.namaType,
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
    localStorage.setItem("pengajuanType", JSON.stringify(updatedPengajuanList));
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
    const savedPengajuan = localStorage.getItem("pengajuanType");
    if (savedPengajuan) {
      try {
        const updatedList = JSON.parse(savedPengajuan);
        setPengajuanList(updatedList);
        
        if (editingType) {
          const activePengajuan = updatedList.find(
            (p: any) => p.typeId === editingType.id && 
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
      localStorage.setItem("pengajuanType", JSON.stringify(updatedPengajuanList));
      setPengajuanList(updatedPengajuanList);
      
      setCurrentPengajuan(null);
      setPengajuanStatus(null);
      setShowNotification(false);
      setHasRefreshed(false);
      setIsSaved(false);
      
      alert("Pengajuan berhasil dibatalkan!");
    }
  };

  const handleHapusType = () => {
    if (!editingType) return;
    
    if (confirm(`Apakah Anda yakin ingin menghapus type ${editingType.namaType}?`)) {
      const updatedTypes = types.filter((t) => t.id !== editingType.id);
      setTypes(updatedTypes);
      localStorage.setItem("types", JSON.stringify(updatedTypes));
      
      if (currentPengajuan) {
        const updatedPengajuanList = pengajuanList.filter((p) => p.id !== currentPengajuan.id);
        localStorage.setItem("pengajuanType", JSON.stringify(updatedPengajuanList));
        setPengajuanList(updatedPengajuanList);
      }
      
      handleCloseModal();
      alert("Type berhasil dihapus!");
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
            + Tambah Type
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
          ) : types.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ color: "#64748b", margin: 0 }}>
                Belum ada data type. Klik tombol "Tambah Type" untuk menambahkan data.
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
                    Kode Type
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
                    Nama Type
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
                {types.map((type) => (
                  <tr
                    key={type.id}
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
                      {type.kodeType}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#1e293b",
                      }}
                    >
                      {type.namaType}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {type.keterangan || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: type.statusAktif ? "#10b981" : "#ef4444",
                        fontWeight: "500",
                      }}
                    >
                      {type.statusAktif ? "Aktif" : "Non-Aktif"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {type.operator || "-"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                      {type.updatedAt 
                        ? new Date(type.updatedAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : type.createdAt
                        ? new Date(type.createdAt).toLocaleDateString("id-ID", {
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
                        onClick={() => handleViewType(type)}
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
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "600",
                    margin: 0,
                    color: "#1e293b",
                  }}
                >
                  {editingType ? "Edit Type" : "Tambah Type"}
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
                <div style={{ marginBottom: "20px" }}>
                  <label
                    htmlFor="kodeType"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Kode Type <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="kodeType"
                    name="kodeType"
                    value={formData.kodeType}
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
                    placeholder="Masukkan kode type"
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label
                    htmlFor="namaType"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    Nama Type <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="namaType"
                    name="namaType"
                    value={formData.namaType}
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
                    placeholder="Masukkan nama type (contoh: Obat Patent, Generic)"
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
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
                              onClick={handleHapusType}
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
        {isViewModalOpen && viewingType && (
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
                  Detail Type
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
                  Kode Type
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                  {viewingType.kodeType}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Nama Type
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                  {viewingType.namaType}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Keterangan
                </label>
                <div style={{ fontSize: "14px", color: "#1e293b" }}>
                  {viewingType.keterangan || "-"}
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Status
                </label>
                <div style={{ fontSize: "14px", color: viewingType.statusAktif ? "#10b981" : "#ef4444", fontWeight: "500" }}>
                  {viewingType.statusAktif ? "Aktif" : "Non-Aktif"}
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
                maxWidth: "600px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
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
