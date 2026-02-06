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

interface DetailBarangTransfer {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string;
  namaUnit: string;
  qtyTransfer: number;
}

interface TransferBarang {
  id: string;
  nomorTransfer: string;
  nomorBukti: string;
  tanggalTransfer: string;
  apotikAsalId: string;
  apotikTujuanId: string;
  status: "Draft" | "Dikirim" | "Diterima" | "Dibatalkan";
  detailBarang: DetailBarangTransfer[];
  keterangan: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DetailBarangTerima {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string;
  namaUnit: string;
  qtyTransfer: number;
  qtyTerima: number;
}

interface TerimaTransfer {
  id: string;
  nomorBukti: string;
  transferId: string;
  nomorBuktiTransfer: string; // Nomor bukti dari transfer yang diterima
  tanggalTerima: string;
  apotikAsalId: string;
  apotikTujuanId: string;
  detailBarang: DetailBarangTerima[];
  keterangan: string;
  userId: string; // User ID yang menerima transfer
  createdAt: string;
  operator?: string;
  updatedAt?: string;
}

interface Apotik {
  id: string;
  kodeApotik: string;
  namaApotik: string;
  statusAktif: boolean;
}

interface Product {
  id: string;
  kodeProduk: string;
  namaProduk: string;
  units?: ProductUnit[];
  stokPerApotik?: { [apotikId: string]: number };
}

export default function TerimaTransferPage() {
  const [activeTab, setActiveTab] = useState<"transfer" | "terima">("transfer");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transferList, setTransferList] = useState<TransferBarang[]>([]);
  const [terimaList, setTerimaList] = useState<TerimaTransfer[]>([]);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferBarang | null>(null);
  const [formData, setFormData] = useState({
    nomorBukti: "",
    tanggalTerima: "",
    transferId: "",
    detailBarang: [] as DetailBarangTerima[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTerima, setEditingTerima] = useState<TerimaTransfer | null>(null);
  const [viewingTerima, setViewingTerima] = useState<TerimaTransfer | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPengajuanModalOpen, setIsPengajuanModalOpen] = useState(false);
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [pengajuanData, setPengajuanData] = useState({
    jenisPengajuan: "",
    alasanPengajuan: "",
  });
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

  // Get today's date in yyyy-mm-dd format
  const getTodayDateInput = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Generate nomor bukti
  const generateNomorBukti = () => {
    const savedTerima = localStorage.getItem("terimaTransfer");
    const terimaList = savedTerima ? JSON.parse(savedTerima) : [];
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    
    const prefix = `TTB-${year}${month}-`;
    const numbers = terimaList
      .filter((t: TerimaTransfer) => t.nomorBukti.startsWith(prefix))
      .map((t: TerimaTransfer) => {
        const numStr = t.nomorBukti.replace(prefix, "");
        return parseInt(numStr, 10);
      });
    
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  };

  // Load data from localStorage
  useEffect(() => {
    const savedTransfers = localStorage.getItem("transferBarang");
    if (savedTransfers) {
      try {
        const parsed = JSON.parse(savedTransfers);
        const transfersWithDates = parsed.map((t: any) => ({
          ...t,
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
          updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
        }));
        setTransferList(transfersWithDates);
      } catch (err) {
        console.error("Error loading transfers:", err);
      }
    }

    const savedTerima = localStorage.getItem("terimaTransfer");
    if (savedTerima) {
      try {
        const parsed = JSON.parse(savedTerima);
        // Migrate old data: convert nomorTransfer to nomorBuktiTransfer
        const migrated = parsed.map((t: any) => {
          if (t.nomorTransfer && !t.nomorBuktiTransfer) {
            // Try to get nomorBukti from transfer
            const savedTransfers = localStorage.getItem("transferBarang");
            if (savedTransfers) {
              try {
                const transfers = JSON.parse(savedTransfers);
                const transfer = transfers.find((tr: any) => tr.id === t.transferId);
                if (transfer && transfer.nomorBukti) {
                  t.nomorBuktiTransfer = transfer.nomorBukti;
                } else {
                  t.nomorBuktiTransfer = t.nomorTransfer; // Fallback
                }
              } catch (err) {
                t.nomorBuktiTransfer = t.nomorTransfer; // Fallback
              }
            } else {
              t.nomorBuktiTransfer = t.nomorTransfer; // Fallback
            }
          }
          // Add userId if not exists
          if (!t.userId) {
            t.userId = localStorage.getItem("currentUserId") || "user-001";
          }
          // Add userId if not exists
          if (!t.userId) {
            t.userId = localStorage.getItem("currentUserId") || "user-001";
          }
          return t;
        });
        setTerimaList(migrated);
        // Save migrated data back
        localStorage.setItem("terimaTransfer", JSON.stringify(migrated));
      } catch (err) {
        console.error("Error loading terima transfer:", err);
      }
    }

    const savedApotiks = localStorage.getItem("apotiks");
    if (savedApotiks) {
      try {
        const parsed = JSON.parse(savedApotiks);
        setApotiks(parsed.filter((a: Apotik) => a.statusAktif));
      } catch (err) {
        console.error("Error loading apotiks:", err);
      }
    }

    const savedProducts = localStorage.getItem("products");
    if (savedProducts) {
      try {
        setProducts(JSON.parse(savedProducts));
      } catch (err) {
        console.error("Error loading products:", err);
      }
    }

    // Overwrite with API data when available (sinkron antar perangkat / URL)
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token) { setIsLoadingData(false); return; }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/terimaTransfer", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null),
        fetch("/api/data/transferBarang", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null),
        fetch("/api/data/apotiks", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null),
        fetch("/api/data/products", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null),
        fetch("/api/data/pengajuanTerimaTransfer", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null),
      ]).then(([terimaData, transfersData, apotiksData, productsData, pengajuanData]) => {
        if (Array.isArray(terimaData) && terimaData.length > 0) { setTerimaList(terimaData); localStorage.setItem("terimaTransfer", JSON.stringify(terimaData)); }
        if (Array.isArray(transfersData) && transfersData.length > 0) { setTransferList(transfersData.map((t: any) => ({ ...t, createdAt: t.createdAt ? new Date(t.createdAt) : new Date(), updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date() }))); localStorage.setItem("transferBarang", JSON.stringify(transfersData)); }
        if (Array.isArray(apotiksData) && apotiksData.length > 0) { setApotiks(apotiksData.filter((a: Apotik) => a.statusAktif)); localStorage.setItem("apotiks", JSON.stringify(apotiksData)); }
        if (Array.isArray(productsData) && productsData.length > 0) {
          // Merge dengan localStorage: prioritaskan stokPerApotik dari localStorage jika berbeda (karena data lokal lebih baru setelah update stok)
          let mergedProducts = productsData;
          try {
            const sp = localStorage.getItem("products");
            if (sp) {
              const fromStorage = JSON.parse(sp);
              const arr = Array.isArray(fromStorage) ? fromStorage : [];
              const byId = new Map(arr.map((p: any) => [p.id, p]));
              mergedProducts = productsData.map((p: any) => {
                const local = byId.get(p.id);
                if (local) {
                  // If local has stokPerApotik, prioritize it completely (overwrite API data)
                  if (local.stokPerApotik && Object.keys(local.stokPerApotik).length > 0) {
                    // Use local stokPerApotik completely, but also include any apotik from API that's not in local
                    const mergedStokPerApotik = { ...(p.stokPerApotik || {}) };
                    // Overwrite with local data (prioritize local)
                    Object.keys(local.stokPerApotik).forEach((apotikId) => {
                      mergedStokPerApotik[apotikId] = local.stokPerApotik[apotikId];
                    });
                    return { ...p, stokPerApotik: mergedStokPerApotik };
                  }
                  // If local doesn't have stokPerApotik but API does, use API
                  // But if local has the product, we should still use local as base
                  return { ...local, ...p, stokPerApotik: p.stokPerApotik || local.stokPerApotik };
                }
                return p;
              });
            }
          } catch (_) {}
          setProducts(mergedProducts);
          localStorage.setItem("products", JSON.stringify(mergedProducts));
        }
        if (Array.isArray(pengajuanData) && pengajuanData.length > 0) { setPengajuanList(pengajuanData); localStorage.setItem("pengajuanTerimaTransfer", JSON.stringify(pengajuanData)); }
        setIsLoadingData(false);
      }).catch(() => { setIsLoadingData(false); });
    });
  }, []);

  // Reload transfer list when terimaList changes or when component mounts
  useEffect(() => {
    const savedTransfers = localStorage.getItem("transferBarang");
    if (savedTransfers) {
      try {
        const parsed = JSON.parse(savedTransfers);
        const transfersWithDates = parsed.map((t: any) => ({
          ...t,
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
          updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
        }));
        setTransferList(transfersWithDates);
      } catch (err) {
        console.error("Error loading transfers:", err);
      }
    }
  }, [terimaList]);

  // Sync terimaTransfer and pengajuanTerimaTransfer to API (guard: jangan POST saat initial load)
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/terimaTransfer", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: terimaList }) }).catch(() => {});
      }
    });
  }, [terimaList, isLoadingData]);
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/pengajuanTerimaTransfer", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: pengajuanList }) }).catch(() => {});
      }
    });
  }, [pengajuanList, isLoadingData]);
  // Sync transferBarang to API when status diubah (mis. jadi Diterima) agar halaman Transfer Barang menampilkan status terbaru
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        const payload = transferList.map((t) => ({ ...t, createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt, updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt }));
        fetch("/api/data/transferBarang", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: payload }) }).catch(() => {});
      }
    });
  }, [transferList, isLoadingData]);

  // Get transfers that are sent and not yet received
  // For transfer antar apotik, tidak perlu filter berdasarkan apotik tertentu
  // Semua transfer dengan status "Dikirim" yang belum diterima akan ditampilkan
  const getAvailableTransfers = () => {
    // Filter transfers that:
    // 1. Have status "Dikirim"
    // 2. Are not yet received (not in terimaList)
    const available = transferList.filter(
      (transfer) => {
        const isDikirim = transfer.status === "Dikirim";
        const isNotReceived = !terimaList.some((terima) => terima.transferId === transfer.id);
        
        return isDikirim && isNotReceived;
      }
    );
    
    return available;
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  // Handle open modal
  const handleOpenModal = (transfer: TransferBarang) => {
    setSelectedTransfer(transfer);
    setError(null);

    // Convert detail barang transfer ke detail barang terima
    const detailBarangTerima: DetailBarangTerima[] = transfer.detailBarang.map((item) => ({
      id: Date.now().toString() + Math.random(),
      produkId: item.produkId,
      kodeProduk: item.kodeProduk,
      namaProduk: item.namaProduk,
      unitId: item.unitId,
      namaUnit: item.namaUnit,
      qtyTransfer: item.qtyTransfer,
      qtyTerima: item.qtyTransfer, // Default sama dengan qty transfer
    }));

    setFormData({
      nomorBukti: generateNomorBukti(),
      tanggalTerima: getTodayDateInput(),
      transferId: transfer.id,
      detailBarang: detailBarangTerima,
    });
    setIsModalOpen(true);
  };

  // Handle open pengajuan modal
  const handleOpenPengajuanModal = () => {
    setIsPengajuanModalOpen(true);
    setPengajuanData({
      jenisPengajuan: "",
      alasanPengajuan: "",
    });
  };

  // Handle close pengajuan modal
  const handleClosePengajuanModal = () => {
    setIsPengajuanModalOpen(false);
    setPengajuanData({
      jenisPengajuan: "",
      alasanPengajuan: "",
    });
  };

  // Handle submit pengajuan
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

    if (!editingTerima) {
      alert("Tidak ada terima transfer yang sedang diedit");
      return;
    }

    const newPengajuan = {
      id: Date.now().toString(),
      terimaTransferId: editingTerima.id,
      nomorBukti: editingTerima.nomorBukti,
      jenisPengajuan: pengajuanData.jenisPengajuan,
      alasanPengajuan: pengajuanData.alasanPengajuan,
      status: "Menunggu Persetujuan",
      createdAt: new Date().toISOString(),
      disetujuiPada: undefined,
      ditolakPada: undefined,
      alasanTolak: undefined,
      isNew: true,
    };

    const updatedPengajuanList = [...pengajuanList, newPengajuan];
    localStorage.setItem("pengajuanTerimaTransfer", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);
    setIsPengajuanModalOpen(false);
    setPengajuanData({
      jenisPengajuan: "",
      alasanPengajuan: "",
    });
    alert("Pengajuan perubahan berhasil dikirim");
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransfer(null);
    setEditingTerima(null);
    setError(null);
    setFormData({
      nomorBukti: "",
      tanggalTerima: "",
      transferId: "",
      detailBarang: [],
    });
  };

  // Handle detail change
  const handleDetailChange = (detailId: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      detailBarang: prev.detailBarang.map((detail) =>
        detail.id === detailId ? { ...detail, [field]: value } : detail
      ),
    }));
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!selectedTransfer) {
        throw new Error("Transfer tidak ditemukan");
      }

      // Validate qty terima
      for (const detail of formData.detailBarang) {
        if (detail.qtyTerima <= 0) {
          throw new Error(`Qty Terima untuk ${detail.namaProduk} harus lebih dari 0`);
        }
        if (detail.qtyTerima > detail.qtyTransfer) {
          throw new Error(`Qty Terima untuk ${detail.namaProduk} tidak boleh lebih dari Qty Transfer`);
        }
      }

      if (editingTerima) {
        // Check if there's an approved pengajuan for edit
        const approvedPengajuan = pengajuanList.find(
          (p) => p.terimaTransferId === editingTerima.id && p.status === "Disetujui" && p.jenisPengajuan === "Edit Transaksi"
        );

        // Update existing terima transfer
        const userEmail = currentUserEmail || "System";
        const now = new Date().toISOString();
        
        const updatedTerima: TerimaTransfer = {
          ...editingTerima,
          tanggalTerima: formData.tanggalTerima,
          detailBarang: formData.detailBarang,
          operator: editingTerima.operator || userEmail,
          updatedAt: now,
        };

        // Update stock: revert old qty terima, then apply new qty terima
        // Also ensure stock from apotik asal is reduced (should have been reduced when Transfer was sent)
        const savedProducts = localStorage.getItem("products");
        if (savedProducts) {
          const allProducts = JSON.parse(savedProducts);
          
          // Find the related transfer to verify it was sent
          const relatedTransfer = transferList.find((t) => t.id === editingTerima.transferId);
          
          // Revert old stock (reduce from apotik tujuan)
          for (const oldDetail of editingTerima.detailBarang) {
            const product = allProducts.find((p: Product) => p.id === oldDetail.produkId);
            if (product && editingTerima.apotikTujuanId) {
              let qtyInPieces = oldDetail.qtyTerima;
              if (product.units && product.units.length > 0) {
                const unit = product.units.find((u: ProductUnit) => u.id === oldDetail.unitId);
                if (unit) {
                  qtyInPieces = oldDetail.qtyTerima * unit.konversi;
                }
              }
              
              if (!product.stokPerApotik) {
                product.stokPerApotik = {};
              }
              const currentStok = product.stokPerApotik[editingTerima.apotikTujuanId] || 0;
              product.stokPerApotik[editingTerima.apotikTujuanId] = Math.max(0, currentStok - qtyInPieces);
            }
          }
          
          // Apply new stock (add to apotik tujuan)
          for (const newDetail of formData.detailBarang) {
            const product = allProducts.find((p: Product) => p.id === newDetail.produkId);
            if (product && editingTerima.apotikTujuanId) {
              let qtyInPieces = newDetail.qtyTerima;
              if (product.units && product.units.length > 0) {
                const unit = product.units.find((u: ProductUnit) => u.id === newDetail.unitId);
                if (unit) {
                  qtyInPieces = newDetail.qtyTerima * unit.konversi;
                }
              }
              
              if (!product.stokPerApotik) {
                product.stokPerApotik = {};
              }
              const currentStok = product.stokPerApotik[editingTerima.apotikTujuanId] || 0;
              product.stokPerApotik[editingTerima.apotikTujuanId] = currentStok + qtyInPieces;
            }
          }
          
          // Ensure stock from apotik asal is reduced (should have been reduced when Transfer was sent)
          // If transfer exists and was sent, verify and ensure stock is reduced based on qtyTransfer
          if (relatedTransfer && (relatedTransfer.status === "Dikirim" || relatedTransfer.status === "Diterima") && editingTerima.apotikAsalId) {
            for (const transferDetail of relatedTransfer.detailBarang) {
              const product = allProducts.find((p: Product) => p.id === transferDetail.produkId);
              if (product) {
                let qtyInPieces = transferDetail.qtyTransfer;
                if (product.units && product.units.length > 0) {
                  const unit = product.units.find((u: ProductUnit) => u.id === transferDetail.unitId);
                  if (unit) {
                    qtyInPieces = transferDetail.qtyTransfer * unit.konversi;
                  }
                }
                
                if (!product.stokPerApotik) {
                  product.stokPerApotik = {};
                }
                const currentStokAsal = product.stokPerApotik[editingTerima.apotikAsalId] || 0;
                // Stock from apotik asal should have been reduced when Transfer was sent
                // If for some reason it wasn't reduced (e.g., due to sync issue), we need to reduce it now
                // But we need to be careful not to double-reduce
                // We'll check if the stock seems unreasonably high by comparing with a threshold
                // If current stock is higher than a reasonable threshold, we'll reduce it
                // However, without knowing the original stock, we can't reliably detect this
                // So we'll trust that stock was reduced when Transfer was sent
                // The real fix is to ensure Transfer is sent and stock is synced to API before Terima Transfer is created
              }
            }
          }
          
          localStorage.setItem("products", JSON.stringify(allProducts));
          
          // Sync products to API after stock update
          getSupabaseClient().auth.getSession().then(({ data }) => {
            if (data.session?.access_token) {
              fetch("/api/data/products", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${data.session.access_token}`,
                },
                body: JSON.stringify({ value: allProducts }),
              }).catch(() => {});
            }
          });
        }

        const updatedTerimaList = terimaList.map((t) =>
          t.id === editingTerima.id ? updatedTerima : t
        );
        setTerimaList(updatedTerimaList);
        localStorage.setItem("terimaTransfer", JSON.stringify(updatedTerimaList));

        // Update pengajuan status if approved for edit
        if (approvedPengajuan) {
          const updatedPengajuanList = pengajuanList.map((p) =>
            p.id === approvedPengajuan.id ? { ...p, status: "Selesai" } : p
          );
          setPengajuanList(updatedPengajuanList);
          localStorage.setItem("pengajuanTerimaTransfer", JSON.stringify(updatedPengajuanList));
        }

        // Update editingTerima to reflect changes
        setEditingTerima(updatedTerima);
        setLoading(false);
        alert("Terima transfer berhasil diupdate");
        // Don't close modal - keep it open to show buttons
      } else {
        // Get current user ID (you can get this from your auth system or localStorage)
        const currentUserId = localStorage.getItem("currentUserId") || "user-001"; // Fallback to default user ID
        const userEmail = currentUserEmail || "System";
        const now = new Date().toISOString();
        
        // Create new terima transfer
        const newTerima: TerimaTransfer = {
          id: Date.now().toString(),
          nomorBukti: formData.nomorBukti,
          transferId: selectedTransfer.id,
          nomorBuktiTransfer: selectedTransfer.nomorBukti || "-",
          tanggalTerima: formData.tanggalTerima,
          apotikAsalId: selectedTransfer.apotikAsalId,
          apotikTujuanId: selectedTransfer.apotikTujuanId,
          detailBarang: formData.detailBarang,
          keterangan: selectedTransfer.keterangan,
          userId: currentUserId,
          createdAt: now,
          operator: userEmail,
          updatedAt: now,
        };

        // Update transfer status to "Diterima"
        const updatedTransfers = transferList.map((t) =>
          t.id === selectedTransfer.id
            ? { ...t, status: "Diterima" as const, updatedAt: new Date() }
            : t
        );
        setTransferList(updatedTransfers);
        localStorage.setItem("transferBarang", JSON.stringify(updatedTransfers));

        // Update stock in apotik tujuan
        // Note: Stock from apotik asal should have been reduced when Transfer was sent (status "Dikirim")
        // We only add stock to apotik tujuan here
        const savedProducts = localStorage.getItem("products");
        if (savedProducts) {
          const allProducts = JSON.parse(savedProducts);
          
          // Verify that Transfer was sent (status "Dikirim") before receiving
          if (selectedTransfer.status !== "Dikirim") {
            throw new Error("Transfer harus dikirim terlebih dahulu sebelum dapat diterima");
          }
          
          for (const detail of formData.detailBarang) {
            const product = allProducts.find((p: Product) => p.id === detail.produkId);
            if (product) {
              // Convert qty terima to pieces
              let qtyInPieces = detail.qtyTerima;
              if (product.units && product.units.length > 0) {
                const unit = product.units.find((u: ProductUnit) => u.id === detail.unitId);
                if (unit) {
                  qtyInPieces = detail.qtyTerima * unit.konversi;
                }
              }
              
              // Add stock to apotik tujuan
              if (!product.stokPerApotik) {
                product.stokPerApotik = {};
              }
              const currentStok = product.stokPerApotik[selectedTransfer.apotikTujuanId] || 0;
              product.stokPerApotik[selectedTransfer.apotikTujuanId] = currentStok + qtyInPieces;
            }
          }
          
          localStorage.setItem("products", JSON.stringify(allProducts));
          
          // Sync products to API after stock update
          getSupabaseClient().auth.getSession().then(({ data }) => {
            if (data.session?.access_token) {
              fetch("/api/data/products", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${data.session.access_token}`,
                },
                body: JSON.stringify({ value: allProducts }),
              }).catch(() => {});
            }
          });
        }

        const updatedTerimaList = [...terimaList, newTerima];
        setTerimaList(updatedTerimaList);
        localStorage.setItem("terimaTransfer", JSON.stringify(updatedTerimaList));

        // Set editingTerima to the newly created terima transfer so buttons appear
        setEditingTerima(newTerima);
        setLoading(false);
        alert(`Terima transfer berhasil disimpan\nNomor Bukti: ${newTerima.nomorBukti}`);
        // Don't close modal - keep it open to show buttons
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan terima transfer");
    } finally {
      setLoading(false);
    }
  };

  // Handle edit terima
  const handleEditTerima = (terima: TerimaTransfer) => {
    const transfer = transferList.find((t) => t.id === terima.transferId);
    if (!transfer) {
      alert("Transfer tidak ditemukan");
      return;
    }

    setEditingTerima(terima);
    setSelectedTransfer(transfer);
    setFormData({
      nomorBukti: terima.nomorBukti,
      tanggalTerima: terima.tanggalTerima,
      transferId: terima.transferId,
      detailBarang: terima.detailBarang,
    });
    setIsModalOpen(true);
  };

  // Handle view terima
  const handleViewTerima = (terima: TerimaTransfer) => {
    setViewingTerima(terima);
    setIsViewModalOpen(true);
  };

  // Handle close view modal
  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingTerima(null);
  };

  return (
    <DashboardLayout>
      <div>
        {/* Tabs */}
        <div style={{ marginBottom: "24px", borderBottom: "2px solid #e2e8f0" }}>
          <button
            type="button"
            onClick={() => setActiveTab("transfer")}
            style={{
              padding: "12px 24px",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: activeTab === "transfer" ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === "transfer" ? "#3b82f6" : "#64748b",
              fontWeight: activeTab === "transfer" ? "600" : "400",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Daftar Transfer Belum Diterima
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("terima")}
            style={{
              padding: "12px 24px",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: activeTab === "terima" ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === "terima" ? "#3b82f6" : "#64748b",
              fontWeight: activeTab === "terima" ? "600" : "400",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Daftar Terima Transfer
          </button>
        </div>

        {/* Daftar Transfer Belum Diterima */}
        {activeTab === "transfer" && (
          <>
            {getAvailableTransfers().length > 0 ? (
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                }}
              >
                <div style={{ overflowX: "auto" }}>
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
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Nomor Bukti
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Tanggal Transfer
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Apotik Asal
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Jumlah Item
                        </th>
                        <th
                          style={{
                            textAlign: "center",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAvailableTransfers().map((transfer) => {
                        const apotikAsal = apotiks.find((a) => a.id === transfer.apotikAsalId);
                        return (
                          <tr
                            key={transfer.id}
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
                              {transfer.nomorBukti || "-"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#64748b",
                              }}
                            >
                              {formatDate(transfer.tanggalTransfer)}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#1e293b",
                              }}
                            >
                              {apotikAsal?.namaApotik || transfer.apotikAsalId}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#64748b",
                              }}
                            >
                              {transfer.detailBarang.length} item
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                textAlign: "center",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenModal(transfer)}
                                style={{
                                  padding: "8px 16px",
                                  backgroundColor: "#3b82f6",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  fontWeight: "500",
                                }}
                              >
                                Terima
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  padding: "40px",
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  textAlign: "center",
          }}
        >
          <p style={{ color: "#64748b" }}>
                  Tidak ada transfer yang belum diterima.
          </p>
        </div>
            )}
          </>
        )}

        {/* Daftar Terima Transfer */}
        {activeTab === "terima" && (
          <>
            {terimaList.length > 0 ? (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                }}
              >
                <div style={{ overflowX: "auto" }}>
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
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Nomor Bukti
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Tanggal Terima
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Nomor Bukti Transfer
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Apotik Asal
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Jumlah Item
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          User ID
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Operator
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Last Update
                        </th>
                        <th
                          style={{
                            textAlign: "center",
                            borderBottom: "2px solid #e2e8f0",
                            padding: "12px 16px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {terimaList.map((terima) => {
                        const apotikAsal = apotiks.find((a) => a.id === terima.apotikAsalId);
                        return (
                          <tr
                            key={terima.id}
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
                              {terima.nomorBukti}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#64748b",
                              }}
                            >
                              {formatDate(terima.tanggalTerima)}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#1e293b",
                              }}
                            >
                              {terima.nomorBuktiTransfer || "-"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#1e293b",
                              }}
                            >
                              {apotikAsal?.namaApotik || terima.apotikAsalId}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#64748b",
                              }}
                            >
                              {terima.detailBarang.length} item
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#64748b",
                              }}
                            >
                              {terima.userId || "-"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#64748b",
                              }}
                            >
                              {terima.operator || "-"}
                            </td>
                            <td
                              style={{
                                padding: "12px 16px",
                                fontSize: "14px",
                                color: "#64748b",
                              }}
                            >
                              {terima.updatedAt 
                                ? new Date(terima.updatedAt).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : terima.createdAt
                                ? new Date(terima.createdAt).toLocaleDateString("id-ID", {
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
                                textAlign: "center",
                              }}
                            >
                              <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleViewTerima(terima)}
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
                                <button
                                  type="button"
                                  onClick={() => handleEditTerima(terima)}
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
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
      </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  padding: "40px",
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#64748b" }}>
                  Belum ada terima transfer. Klik tombol "Terima" pada transfer yang belum diterima untuk membuat terima transfer baru.
                </p>
              </div>
            )}
          </>
        )}

        {/* Modal - panel penuh seperti Transfer Barang */}
        {isModalOpen && selectedTransfer && (
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
            <div style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--surface-hover)" }}>
                <h3 style={{ fontSize: "17px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                  {editingTerima ? "Edit Terima Transfer" : "Terima Transfer"}
                </h3>
                <button type="button" onClick={handleCloseModal} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "var(--text-secondary)", padding: 0, lineHeight: 1 }}>×</button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div style={{ padding: "16px 20px", flex: 1, minHeight: 0, overflowY: "auto" }}>
                  {error && (
                    <div style={{ padding: "8px 12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", marginBottom: "12px", color: "#dc2626", fontSize: "13px" }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "12px", alignItems: "stretch" }}>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Nomor Bukti</label>
                          <input type="text" value={formData.nomorBukti} readOnly style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)", boxSizing: "border-box", cursor: "not-allowed" }} />
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Tanggal Terima <span style={{ color: "#ef4444" }}>*</span></label>
                          <input type="date" value={formData.tanggalTerima} onChange={(e) => setFormData((prev) => ({ ...prev, tanggalTerima: e.target.value }))} required style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface)", color: "var(--text-primary)", boxSizing: "border-box" }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Nomor Bukti Transfer</label>
                      <input type="text" value={selectedTransfer.nomorBukti || "-"} readOnly style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)", boxSizing: "border-box", cursor: "not-allowed" }} />
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Apotik Asal</label>
                      <div style={{ padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}>{apotiks.find((a) => a.id === selectedTransfer.apotikAsalId)?.namaApotik || selectedTransfer.apotikAsalId}</div>
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Apotik Tujuan</label>
                      <div style={{ padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}>{apotiks.find((a) => a.id === selectedTransfer.apotikTujuanId)?.namaApotik || selectedTransfer.apotikTujuanId}</div>
                    </div>
                  </div>

                  <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "12px", marginBottom: "12px", backgroundColor: "var(--surface)" }}>
                    <div style={{ marginBottom: "10px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Detail Barang Diterima</span>
                    </div>
                    {formData.detailBarang && formData.detailBarang.length > 0 ? (
                      <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                          <thead>
                            <tr style={{ backgroundColor: "var(--surface-hover)" }}>
                              <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Produk</th>
                              <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Kode</th>
                              <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Unit</th>
                              <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Konversi</th>
                              <th style={{ padding: "8px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Qty Transfer</th>
                              <th style={{ padding: "8px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Qty Terima</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formData.detailBarang.map((detail) => {
                              const getProductUnits = (productId: string): ProductUnit[] => {
                                const prod = products.find((p) => p.id === productId);
                                if (!prod) return [];
                                return prod.units || [];
                              };
                              const productUnits = getProductUnits(detail.produkId);
                              const unit = productUnits.find((u) => u.id === detail.unitId);
                              const konversiText = unit && unit.konversi ? `1 ${unit.namaUnit} = ${unit.konversi} pcs` : "-";
                              const qtyTerimaInPieces = unit && unit.konversi ? detail.qtyTerima * unit.konversi : detail.qtyTerima;
                              
                              return (
                                <tr key={detail.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                  <td style={{ padding: "8px", fontSize: "13px", color: "var(--text-primary)" }}>{detail.namaProduk}</td>
                                  <td style={{ padding: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>{detail.kodeProduk || "-"}</td>
                                  <td style={{ padding: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>{detail.namaUnit || "-"}</td>
                                  <td style={{ padding: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>{konversiText}</td>
                                  <td style={{ padding: "8px", fontSize: "13px", textAlign: "center", color: "var(--text-secondary)" }}>{detail.qtyTransfer}</td>
                                  <td style={{ padding: "8px", textAlign: "center" }}>
                                    <input
                                      type="number"
                                      min="0"
                                      max={detail.qtyTransfer}
                                      value={detail.qtyTerima}
                                      onChange={(e) =>
                                        handleDetailChange(
                                          detail.id,
                                          "qtyTerima",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      required
                                      style={{
                                        width: "80px",
                                        padding: "8px",
                                        border: "1px solid var(--border)",
                                        borderRadius: "4px",
                                        fontSize: "13px",
                                        textAlign: "center",
                                        boxSizing: "border-box",
                                        backgroundColor: "var(--surface)",
                                        color: "var(--text-primary)",
                                      }}
                                    />
                                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", textAlign: "center" }}>
                                      = {qtyTerimaInPieces} pcs
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: "24px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "6px", color: "var(--text-secondary)", fontSize: "13px" }}>
                        Tidak ada barang.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", backgroundColor: "var(--surface-hover)", display: "flex", gap: "10px", justifyContent: "flex-end", flexShrink: 0 }}>
                  {(() => {
                    const approvedPengajuan = editingTerima
                      ? pengajuanList.find(
                          (p) => p.terimaTransferId === editingTerima.id && p.status === "Disetujui"
                        )
                      : null;
                    const hasPengajuan = editingTerima
                      ? pengajuanList.some(
                          (p) =>
                            p.terimaTransferId === editingTerima.id &&
                            p.status !== "Disetujui" &&
                            p.status !== "Selesai" &&
                            p.status !== "Ditolak"
                        )
                      : false;

                    return (
                      <>
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          disabled={loading}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--surface)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                          }}
                        >
                          Batal
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
                                {loading ? "Menyimpan..." : "Simpan"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Apakah Anda yakin ingin menghapus terima transfer ${editingTerima?.nomorBukti}?`)) {
                                    // Revert stock changes
                                    const savedProducts = localStorage.getItem("products");
                                    if (savedProducts && editingTerima) {
                                      const allProducts = JSON.parse(savedProducts);
                                      for (const detail of editingTerima.detailBarang) {
                                        const product = allProducts.find((p: Product) => p.id === detail.produkId);
                                        if (product && editingTerima.apotikTujuanId) {
                                          let qtyInPieces = detail.qtyTerima;
                                          if (product.units && product.units.length > 0) {
                                            const unit = product.units.find((u: ProductUnit) => u.id === detail.unitId);
                                            if (unit) {
                                              qtyInPieces = detail.qtyTerima * unit.konversi;
                                            }
                                          }
                                          if (!product.stokPerApotik) {
                                            product.stokPerApotik = {};
                                          }
                                          const currentStok = product.stokPerApotik[editingTerima.apotikTujuanId] || 0;
                                          product.stokPerApotik[editingTerima.apotikTujuanId] = Math.max(0, currentStok - qtyInPieces);
                                        }
                                      }
                                      localStorage.setItem("products", JSON.stringify(allProducts));
                                      
                                      // Sync products to API after reverting stock
                                      getSupabaseClient().auth.getSession().then(({ data }) => {
                                        if (data.session?.access_token) {
                                          fetch("/api/data/products", {
                                            method: "POST",
                                            headers: {
                                              "Content-Type": "application/json",
                                              Authorization: `Bearer ${data.session.access_token}`,
                                            },
                                            body: JSON.stringify({ value: allProducts }),
                                          }).catch(() => {});
                                        }
                                      });
                                    }
                                    // Remove from terimaList
                                    const updatedTerimaList = terimaList.filter((t) => t.id !== editingTerima?.id);
                                    setTerimaList(updatedTerimaList);
                                    localStorage.setItem("terimaTransfer", JSON.stringify(updatedTerimaList));
                                    // Kembalikan status transfer barang ke "Dikirim" agar muncul lagi di daftar dengan tombol Terima
                                    if (editingTerima?.transferId) {
                                      const savedTransfers = localStorage.getItem("transferBarang");
                                      if (savedTransfers) {
                                        const transfers: TransferBarang[] = JSON.parse(savedTransfers);
                                        const updatedTransfers = transfers.map((t) =>
                                          t.id === editingTerima.transferId
                                            ? { ...t, status: "Dikirim" as const, updatedAt: new Date() }
                                            : t
                                        );
                                        localStorage.setItem("transferBarang", JSON.stringify(updatedTransfers));
                                        setTransferList(updatedTransfers);
                                      }
                                    }
                                    // Update pengajuan status
                                    const updatedPengajuanList = pengajuanList.map((p) =>
                                      p.id === approvedPengajuan.id ? { ...p, status: "Selesai" } : p
                                    );
                                    setPengajuanList(updatedPengajuanList);
                                    localStorage.setItem("pengajuanTerimaTransfer", JSON.stringify(updatedPengajuanList));
                                    alert("Terima transfer berhasil dihapus");
                                    handleCloseModal();
                                  }
                                }}
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
                              onClick={() => {
                                if (confirm("Apakah Anda yakin ingin membatalkan pengajuan ini?")) {
                                  const updatedPengajuanList = pengajuanList.filter((p) => p.id !== approvedPengajuan.id);
                                  localStorage.setItem("pengajuanTerimaTransfer", JSON.stringify(updatedPengajuanList));
                                  setPengajuanList(updatedPengajuanList);
                                  alert("Pengajuan berhasil dibatalkan!");
                                }
                              }}
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
                            onClick={() => {
                              // Reload pengajuan list
                              const savedPengajuan = localStorage.getItem("pengajuanTerimaTransfer");
                              if (savedPengajuan) {
                                try {
                                  setPengajuanList(JSON.parse(savedPengajuan));
                                } catch (err) {
                                  console.error("Error loading pengajuan:", err);
                                }
                              }
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
                        ) : editingTerima ? (
                          <>
                            <button
                              type="button"
                              onClick={handleOpenPengajuanModal}
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
                            <button
                              type="button"
                              onClick={() => {
                                window.print();
                              }}
                              style={{
                                padding: "10px 20px",
                                backgroundColor: "#6b7280",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "500",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#4b5563";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#6b7280";
                              }}
                            >
                              Print
                            </button>
                          </>
                        ) : (
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
                            {loading ? "Menyimpan..." : "Simpan Terima Transfer"}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pengajuan Modal */}
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
            onClick={handleClosePengajuanModal}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                width: "90%",
                maxWidth: "500px",
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
                  Ajukan Perubahan
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

        {/* View Modal */}
        {isViewModalOpen && viewingTerima && (
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
                maxWidth: "1000px",
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
                  Detail Terima Transfer
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
              <div style={{ padding: "24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#64748b" }}>
                      Nomor Bukti
                    </label>
                    <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                      {viewingTerima.nomorBukti}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#64748b" }}>
                      Tanggal Terima
                    </label>
                    <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                      {formatDate(viewingTerima.tanggalTerima)}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#64748b" }}>
                      Nomor Bukti Transfer
                    </label>
                    <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                      {viewingTerima.nomorBuktiTransfer || "-"}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#64748b" }}>
                      Apotik Asal
                    </label>
                    <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                      {apotiks.find((a) => a.id === viewingTerima.apotikAsalId)?.namaApotik || viewingTerima.apotikAsalId}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "20px" }}>
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

                  {viewingTerima.detailBarang && viewingTerima.detailBarang.length > 0 ? (
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8fafc" }}>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>DESCRIPTION</th>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>CODE</th>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>UNIT</th>
                            <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>KONVERSI</th>
                            <th style={{ padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>QTY TRANSFER</th>
                            <th style={{ padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>QTY TERIMA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingTerima.detailBarang.map((detail: DetailBarangTerima, index: number) => {
                            const getProductUnits = (productId: string): ProductUnit[] => {
                              const prod = products.find((p) => p.id === productId);
                              if (!prod) return [];
                              return prod.units || [];
                            };
                            const productUnits = getProductUnits(detail.produkId);
                            const unit = productUnits.find((u) => u.id === detail.unitId);
                            const konversiText = unit && unit.konversi ? `1 ${unit.namaUnit} = ${unit.konversi} pcs` : "-";
                            const qtyTerimaInPieces = unit && unit.konversi ? detail.qtyTerima * unit.konversi : detail.qtyTerima;
                            
                            return (
                              <tr key={detail.id || index} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                <td style={{ padding: "12px", fontSize: "13px", color: "#1e293b" }}>{detail.namaProduk}</td>
                                <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{detail.kodeProduk || "-"}</td>
                                <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{detail.namaUnit || "-"}</td>
                                <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>{konversiText}</td>
                                <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", color: "#64748b" }}>{detail.qtyTransfer}</td>
                                <td style={{ padding: "12px", fontSize: "13px", textAlign: "center", color: "#1e293b", fontWeight: "500" }}>
                                  {detail.qtyTerima}
                                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                                    = {qtyTerimaInPieces} pcs
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
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
                  onClick={handleCloseViewModal}
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
      </div>
    </DashboardLayout>
  );
}
