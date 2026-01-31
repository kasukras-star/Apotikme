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

interface Product {
  id: string;
  kodeProduk: string;
  namaProduk: string;
  kategori: string;
  satuan: string;
  hargaBeli: number;
  hargaJual: number;
  units?: ProductUnit[];
  stokMinimum: number;
  stokMaksimum: number;
  stokAwal: number;
  supplier: string;
  keterangan: string;
  statusAktif: boolean;
  stokPerApotik?: { [apotikId: string]: number }; // Stok per apotik
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

interface DetailBarangTransfer {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId: string;
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
  operator?: string;
}

export default function TransferBarangPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<TransferBarang | null>(null);
  const [viewingTransfer, setViewingTransfer] = useState<TransferBarang | null>(null);
  const [transferList, setTransferList] = useState<TransferBarang[]>([]);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tanggalTransfer: "",
    apotikAsalId: "",
    apotikTujuanId: "",
    keterangan: "",
  });
  const [detailBarang, setDetailBarang] = useState<DetailBarangTransfer[]>([]);
  const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState<{ [detailId: string]: string }>({});
  const [showProductDropdown, setShowProductDropdown] = useState<{ [detailId: string]: boolean }>({});
  const [isPengajuanModalOpen, setIsPengajuanModalOpen] = useState(false);
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [pengajuanData, setPengajuanData] = useState({
    jenisPengajuan: "",
    alasanPengajuan: "",
  });
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

  // Get today's date in yyyy-mm-dd format
  const getTodayDateInput = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Generate transfer number
  const generateNomorTransfer = () => {
    const savedTransfers = localStorage.getItem("transferBarang");
    let maxNumber = 0;

    if (savedTransfers) {
      try {
        const parsed = JSON.parse(savedTransfers);
        parsed.forEach((transfer: TransferBarang) => {
          const match = transfer.nomorTransfer.match(/TRF-(\d{6})-(\d+)/);
          if (match) {
            const number = parseInt(match[2], 10);
            if (number > maxNumber) {
              maxNumber = number;
            }
          }
        });
      } catch (err) {
        console.error("Error parsing transfers:", err);
      }
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const prefix = `TRF-${year}${month}-`;

    const nextNumber = maxNumber + 1;
    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  };

  // Generate nomor bukti (TFB-YYYY-XXXXX)
  const generateNomorBukti = () => {
    const savedTransfers = localStorage.getItem("transferBarang");
    let maxNumber = 0;

    if (savedTransfers) {
      try {
        const parsed = JSON.parse(savedTransfers);
        parsed.forEach((transfer: TransferBarang) => {
          if (transfer.nomorBukti) {
            const match = transfer.nomorBukti.match(/TFB-(\d{4})-(\d+)/);
            if (match) {
              const year = parseInt(match[1], 10);
              const number = parseInt(match[2], 10);
              const currentYear = new Date().getFullYear();
              // Only count if same year
              if (year === currentYear && number > maxNumber) {
                maxNumber = number;
              }
            }
          }
        });
      } catch (err) {
        console.error("Error parsing transfers:", err);
      }
    }

    const today = new Date();
    const year = today.getFullYear();
    const nextNumber = maxNumber + 1;
    return `TFB-${year}-${String(nextNumber).padStart(5, "0")}`;
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

    // Load pengajuan list
    const savedPengajuan = localStorage.getItem("pengajuanTransferBarang");
    if (savedPengajuan) {
      try {
        setPengajuanList(JSON.parse(savedPengajuan));
      } catch (err) {
        console.error("Error loading pengajuan:", err);
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
        const parsed = JSON.parse(savedProducts);
        setProducts(parsed.filter((p: Product) => p.statusAktif));
      } catch (err) {
        console.error("Error loading products:", err);
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
  }, []);

  // Get stock per apotik
  const getStockPerApotik = (product: Product, apotikId: string): number => {
    if (!product.stokPerApotik) {
      // Initialize stokPerApotik if not exists
      return 0;
    }
    return product.stokPerApotik[apotikId] || 0;
  };

  // Get available units for product
  const getProductUnits = (productId: string): ProductUnit[] => {
    const product = products.find((p) => p.id === productId);
    if (!product) return [];
    return product.units || [];
  };

  // Handle add detail barang (add new row)
  const handleAddDetail = () => {
    if (!formData.apotikAsalId) {
      alert("Pilih apotik asal terlebih dahulu");
      return;
    }

    const newDetail: DetailBarangTransfer = {
      id: Date.now().toString(),
      produkId: "",
      kodeProduk: "",
      namaProduk: "",
      unitId: "",
      namaUnit: "",
      qtyTransfer: 1,
    };

    setDetailBarang([...detailBarang, newDetail]);
    setEditingDetailId(newDetail.id);
  };

  // Handle detail change
  const handleDetailChange = (
    id: string,
    field: keyof DetailBarangTransfer,
    value: string | number
  ) => {
    setDetailBarang(
      detailBarang.map((detail) => {
        if (detail.id === id) {
          const updated = { ...detail, [field]: value };

          // Auto-fill product info when product is selected
          if (field === "produkId" && typeof value === "string") {
            const product = products.find((p) => p.id === value);
            if (product) {
              updated.kodeProduk = product.kodeProduk;
              updated.namaProduk = product.namaProduk;
              updated.unitId = ""; // Reset unit when product changes
              updated.namaUnit = "";
            }
          }

          // Auto-fill unit name when unit is selected
          if (field === "unitId" && typeof value === "string" && updated.produkId) {
            const unit = getProductUnits(updated.produkId).find((u) => u.id === value);
            if (unit) {
              updated.namaUnit = unit.namaUnit;
            }
          }

          return updated;
        }
        return detail;
      })
    );
  };

  // Handle remove detail
  const handleRemoveDetail = (id: string) => {
    setDetailBarang(detailBarang.filter((d) => d.id !== id));
    // Clean up search state
    const newProductSearch = { ...productSearch };
    delete newProductSearch[id];
    setProductSearch(newProductSearch);
    const newShowProductDropdown = { ...showProductDropdown };
    delete newShowProductDropdown[id];
    setShowProductDropdown(newShowProductDropdown);
  };

  // Handle product search change
  const handleProductSearchChange = (detailId: string, value: string) => {
    setProductSearch({ ...productSearch, [detailId]: value });
    setShowProductDropdown({ ...showProductDropdown, [detailId]: true });
    
    // Clear product selection if search changes
    const detail = detailBarang.find((d) => d.id === detailId);
    if (detail && detail.produkId) {
      handleDetailChange(detailId, "produkId", "");
    }
  };

  // Handle product select
  const handleProductSelect = (detailId: string, productId: string) => {
    handleDetailChange(detailId, "produkId", productId);
    setProductSearch({ ...productSearch, [detailId]: "" });
    setShowProductDropdown({ ...showProductDropdown, [detailId]: false });
  };

  // Handle open modal
  const handleOpenModal = () => {
    setIsModalOpen(true);
    setEditingTransfer(null);
    setFormData({
      tanggalTransfer: getTodayDateInput(),
      apotikAsalId: "",
      apotikTujuanId: "",
      keterangan: "",
    });
    setDetailBarang([]);
    setEditingDetailId(null);
    setProductSearch({});
    setShowProductDropdown({});
    setError(null);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransfer(null);
    setFormData({
      tanggalTransfer: getTodayDateInput(),
      apotikAsalId: "",
      apotikTujuanId: "",
      keterangan: "",
    });
    setDetailBarang([]);
    setEditingDetailId(null);
    setProductSearch({});
    setShowProductDropdown({});
    setError(null);
  };

  // Handle edit transfer
  const handleEditTransfer = (transfer: TransferBarang) => {
    setEditingTransfer(transfer);
    setFormData({
      tanggalTransfer: transfer.tanggalTransfer,
      apotikAsalId: transfer.apotikAsalId,
      apotikTujuanId: transfer.apotikTujuanId,
      keterangan: transfer.keterangan,
    });
    setDetailBarang(transfer.detailBarang);
    setIsModalOpen(true);
    setError(null);
  };

  // Handle view transfer
  const handleViewTransfer = (transfer: TransferBarang) => {
    setViewingTransfer(transfer);
    setIsViewModalOpen(true);
  };

  // Handle close view modal
  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingTransfer(null);
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

    if (!editingTransfer) {
      alert("Tidak ada transfer yang sedang diedit");
      return;
    }

    const newPengajuan = {
      id: Date.now().toString(),
      transferId: editingTransfer.id,
      nomorTransfer: editingTransfer.nomorTransfer,
      jenisPengajuan: pengajuanData.jenisPengajuan,
      alasanPengajuan: pengajuanData.alasanPengajuan,
      status: "Menunggu Persetujuan",
      createdAt: new Date().toISOString(),
    };

    const updatedPengajuanList = [...pengajuanList, newPengajuan];
    localStorage.setItem("pengajuanTransferBarang", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);

    handleClosePengajuanModal();
    alert("Pengajuan perubahan berhasil dikirim!");
  };

  // Handle refresh
  const handleRefresh = () => {
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
        
        // Reload editingTransfer if exists
        if (editingTransfer) {
          const updatedTransfer = transfersWithDates.find((t: TransferBarang) => t.id === editingTransfer.id);
          if (updatedTransfer) {
            setEditingTransfer(updatedTransfer);
            setFormData({
              tanggalTransfer: updatedTransfer.tanggalTransfer,
              apotikAsalId: updatedTransfer.apotikAsalId,
              apotikTujuanId: updatedTransfer.apotikTujuanId,
              keterangan: updatedTransfer.keterangan,
            });
            setDetailBarang(updatedTransfer.detailBarang);
          }
        }
      } catch (err) {
        console.error("Error loading transfers:", err);
      }
    }

    const savedPengajuan = localStorage.getItem("pengajuanTransferBarang");
    if (savedPengajuan) {
      try {
        setPengajuanList(JSON.parse(savedPengajuan));
      } catch (err) {
        console.error("Error loading pengajuan:", err);
      }
    }

    alert("Data berhasil di-refresh!");
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Check if there's approved pengajuan for current editing transfer
  const approvedPengajuan = editingTransfer
    ? pengajuanList.find((p) => p.transferId === editingTransfer.id && p.status === "Disetujui")
    : null;

  // Check if pengajuan exists for current editing transfer (but not approved)
  const hasPengajuan = editingTransfer
    ? pengajuanList.some((p) => p.transferId === editingTransfer.id && p.status !== "Disetujui" && p.status !== "Selesai" && p.status !== "Dibatalkan")
    : false;

  // Handle delete transfer
  const handleDeleteTransfer = (transfer: TransferBarang) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus transfer ${transfer.nomorTransfer}?`)) {
      return;
    }
    
    // Revert stock changes if transfer was already sent
    if (transfer.status === "Dikirim") {
      try {
        const savedProducts = localStorage.getItem("products");
        if (savedProducts) {
          const allProducts = JSON.parse(savedProducts);
          
          // Revert stock: add back to apotik asal, remove from apotik tujuan
          for (const detail of transfer.detailBarang) {
            const product = allProducts.find((p: Product) => p.id === detail.produkId);
            if (product) {
              let qtyInPieces = detail.qtyTransfer;
              if (product.units && product.units.length > 0) {
                const unit = product.units.find((u: ProductUnit) => u.id === detail.unitId);
                if (unit) {
                  qtyInPieces = detail.qtyTransfer * unit.konversi;
                }
              }
              
              // Add back to apotik asal
              const currentStokPerApotik = product.stokPerApotik || {};
              const stokAsal = currentStokPerApotik[transfer.apotikAsalId] || 0;
              const stokTujuan = currentStokPerApotik[transfer.apotikTujuanId] || 0;
              
              product.stokPerApotik = {
                ...currentStokPerApotik,
                [transfer.apotikAsalId]: stokAsal + qtyInPieces,
                [transfer.apotikTujuanId]: Math.max(0, stokTujuan - qtyInPieces),
              };
            }
          }
          
          localStorage.setItem("products", JSON.stringify(allProducts));
        }
      } catch (err) {
        console.error("Error reverting stock:", err);
      }
    }
    
    const updatedTransfers = transferList.filter((t) => t.id !== transfer.id);
    setTransferList(updatedTransfers);
    localStorage.setItem("transferBarang", JSON.stringify(updatedTransfers));
    alert("Transfer berhasil dihapus");
  };

  // Handle submit (save as draft)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.apotikAsalId || !formData.apotikTujuanId) {
        throw new Error("Pilih apotik asal dan apotik tujuan");
      }

      if (formData.apotikAsalId === formData.apotikTujuanId) {
        throw new Error("Apotik asal dan apotik tujuan tidak boleh sama");
      }

      // Validate all details are complete
      const incompleteDetails = detailBarang.filter(
        (d) => !d.produkId || !d.unitId || !d.qtyTransfer || d.qtyTransfer <= 0
      );
      if (incompleteDetails.length > 0) {
        throw new Error("Lengkapi semua data barang yang ditambahkan");
      }

      // Validate stock availability (only for new transfers or editing draft transfers)
      // For editing "Dikirim" transfers, we need to account for stock that was already transferred
      if (!editingTransfer || editingTransfer.status === "Draft") {
        for (const detail of detailBarang) {
          const product = products.find((p) => p.id === detail.produkId);
          if (!product) {
            throw new Error(`Produk ${detail.namaProduk} tidak ditemukan`);
          }

          const availableStock = getStockPerApotik(product, formData.apotikAsalId);
          if (detail.qtyTransfer > availableStock) {
            throw new Error(
              `Stok ${detail.namaProduk} di apotik asal tidak mencukupi. Tersedia: ${availableStock}, Dibutuhkan: ${detail.qtyTransfer}`
            );
          }
        }
      } else if (editingTransfer && editingTransfer.status === "Dikirim") {
        // For editing "Dikirim" transfers, check if we have enough stock after reverting old transfer
        const savedProducts = localStorage.getItem("products");
        if (savedProducts) {
          const allProducts = JSON.parse(savedProducts);
          
          for (const detail of detailBarang) {
            const product = allProducts.find((p: Product) => p.id === detail.produkId);
            if (!product) {
              throw new Error(`Produk ${detail.namaProduk} tidak ditemukan`);
            }
            
            // Calculate available stock: current stock + reverted stock from old transfer
            let currentStock = getStockPerApotik(product, formData.apotikAsalId);
            
            // Add back stock from old transfer detail if same product
            const oldDetail = editingTransfer.detailBarang.find((d) => d.produkId === detail.produkId);
            if (oldDetail && formData.apotikAsalId === editingTransfer.apotikAsalId) {
              let qtyInPieces = oldDetail.qtyTransfer;
              if (product.units && product.units.length > 0) {
                const unit = product.units.find((u: ProductUnit) => u.id === oldDetail.unitId);
                if (unit) {
                  qtyInPieces = oldDetail.qtyTransfer * unit.konversi;
                }
              }
              currentStock += qtyInPieces;
            }
            
            // Check if we have enough stock
            let qtyInPieces = detail.qtyTransfer;
            if (product.units && product.units.length > 0) {
              const unit = product.units.find((u: ProductUnit) => u.id === detail.unitId);
              if (unit) {
                qtyInPieces = detail.qtyTransfer * unit.konversi;
              }
            }
            
            if (qtyInPieces > currentStock) {
              throw new Error(
                `Stok ${detail.namaProduk} di apotik asal tidak mencukupi. Tersedia: ${currentStock}, Dibutuhkan: ${qtyInPieces}`
              );
            }
          }
        }
      }

      if (detailBarang.length === 0) {
        throw new Error("Tambahkan minimal 1 item barang");
      }

      if (editingTransfer) {
        // Update existing transfer
        // If transfer was already sent, revert stock changes first
        if (editingTransfer.status === "Dikirim") {
          const savedProducts = localStorage.getItem("products");
          if (savedProducts) {
            const allProducts = JSON.parse(savedProducts);
            
            // Revert old stock: add back to apotik asal, remove from apotik tujuan
            for (const detail of editingTransfer.detailBarang) {
              const product = allProducts.find((p: Product) => p.id === detail.produkId);
              if (product) {
                let qtyInPieces = detail.qtyTransfer;
                if (product.units && product.units.length > 0) {
                  const unit = product.units.find((u: ProductUnit) => u.id === detail.unitId);
                  if (unit) {
                    qtyInPieces = detail.qtyTransfer * unit.konversi;
                  }
                }
                
                const currentStokPerApotik = product.stokPerApotik || {};
                const stokAsal = currentStokPerApotik[editingTransfer.apotikAsalId] || 0;
                const stokTujuan = currentStokPerApotik[editingTransfer.apotikTujuanId] || 0;
                
                product.stokPerApotik = {
                  ...currentStokPerApotik,
                  [editingTransfer.apotikAsalId]: stokAsal + qtyInPieces,
                  [editingTransfer.apotikTujuanId]: Math.max(0, stokTujuan - qtyInPieces),
                };
              }
            }
            
            localStorage.setItem("products", JSON.stringify(allProducts));
          }
        }
        
        const userEmail = currentUserEmail || "System";
        const now = new Date();
        
        const updatedTransfer: TransferBarang = {
          ...editingTransfer,
          tanggalTransfer: formData.tanggalTransfer,
          apotikAsalId: formData.apotikAsalId,
          apotikTujuanId: formData.apotikTujuanId,
          detailBarang: detailBarang,
          keterangan: formData.keterangan,
          updatedAt: now,
          operator: editingTransfer.operator || userEmail,
        };
        
        // If transfer was already sent, apply new stock changes
        if (editingTransfer.status === "Dikirim") {
          const savedProducts = localStorage.getItem("products");
          if (savedProducts) {
            const allProducts = JSON.parse(savedProducts);
            
            // Apply new stock: remove from apotik asal, add to apotik tujuan
            for (const detail of detailBarang) {
              const product = allProducts.find((p: Product) => p.id === detail.produkId);
              if (product) {
                let qtyInPieces = detail.qtyTransfer;
                if (product.units && product.units.length > 0) {
                  const unit = product.units.find((u: ProductUnit) => u.id === detail.unitId);
                  if (unit) {
                    qtyInPieces = detail.qtyTransfer * unit.konversi;
                  }
                }
                
                const currentStokPerApotik = product.stokPerApotik || {};
                const stokAsal = currentStokPerApotik[formData.apotikAsalId] || 0;
                const stokTujuan = currentStokPerApotik[formData.apotikTujuanId] || 0;
                
                product.stokPerApotik = {
                  ...currentStokPerApotik,
                  [formData.apotikAsalId]: Math.max(0, stokAsal - qtyInPieces),
                  [formData.apotikTujuanId]: stokTujuan + qtyInPieces,
                };
              }
            }
            
            localStorage.setItem("products", JSON.stringify(allProducts));
          }
        }
        
        const updatedTransfers = transferList.map((t) =>
          t.id === editingTransfer.id ? updatedTransfer : t
        );
        setTransferList(updatedTransfers);
        localStorage.setItem("transferBarang", JSON.stringify(updatedTransfers));
        
        // Update editingTransfer to reflect changes
        setEditingTransfer(updatedTransfer);
        setLoading(false);
        alert("Transfer barang berhasil diupdate");
        // Don't close modal - keep it open to show buttons
      } else {
        // Create new transfer
        const userEmail = currentUserEmail || "System";
        const now = new Date();
        
        const newTransfer: TransferBarang = {
          id: Date.now().toString(),
          nomorTransfer: generateNomorTransfer(),
          nomorBukti: generateNomorBukti(),
          tanggalTransfer: formData.tanggalTransfer,
          apotikAsalId: formData.apotikAsalId,
          apotikTujuanId: formData.apotikTujuanId,
          status: "Draft",
          detailBarang: detailBarang,
          keterangan: formData.keterangan,
          createdAt: now,
          updatedAt: now,
          operator: userEmail,
        };

        const updatedTransfers = [...transferList, newTransfer];
        setTransferList(updatedTransfers);
        localStorage.setItem("transferBarang", JSON.stringify(updatedTransfers));

        // Set editingTransfer to the newly created transfer so buttons appear
        setEditingTransfer(newTransfer);
        setLoading(false);
        alert(`Transfer barang berhasil disimpan sebagai Draft\nNomor Bukti: ${newTransfer.nomorBukti}`);
        // Don't close modal - keep it open to show buttons
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan transfer");
      setLoading(false);
    }
  };

  // Handle kirim transfer (change status to "Dikirim" and update stock)
  const handleKirimTransfer = (transfer: TransferBarang) => {
    if (!confirm(`Apakah Anda yakin ingin mengirim transfer ${transfer.nomorTransfer}?`)) {
      return;
    }

    try {
      // Validate stock availability
      const savedProducts = localStorage.getItem("products");
      if (!savedProducts) {
        throw new Error("Data produk tidak ditemukan");
      }

      const allProducts = JSON.parse(savedProducts);

      // Check stock for each item
      for (const detail of transfer.detailBarang) {
        const product = allProducts.find((p: Product) => p.id === detail.produkId);
        if (!product) {
          throw new Error(`Produk ${detail.namaProduk} tidak ditemukan`);
        }

        // Convert qtyTransfer to pieces based on unit conversion
        let qtyInPieces = detail.qtyTransfer;
        if (product.units && product.units.length > 0) {
          const unit = product.units.find((u: ProductUnit) => u.id === detail.unitId);
          if (unit) {
            qtyInPieces = detail.qtyTransfer * unit.konversi;
          }
        }

        const availableStock = getStockPerApotik(product, transfer.apotikAsalId);
        if (qtyInPieces > availableStock) {
          throw new Error(
            `Stok ${detail.namaProduk} di apotik asal tidak mencukupi. Tersedia: ${availableStock} pcs, Dibutuhkan: ${qtyInPieces} pcs (${detail.qtyTransfer} ${detail.namaUnit})`
          );
        }
      }

      // Update stock per apotik (reduce from apotik asal)
      for (const detail of transfer.detailBarang) {
        const productIndex = allProducts.findIndex((p: Product) => p.id === detail.produkId);
        if (productIndex >= 0) {
          const product = allProducts[productIndex];
          
          // Convert qtyTransfer to pieces based on unit conversion
          let qtyInPieces = detail.qtyTransfer;
          if (product.units && product.units.length > 0) {
            const unit = product.units.find((u: ProductUnit) => u.id === detail.unitId);
            if (unit) {
              qtyInPieces = detail.qtyTransfer * unit.konversi;
            }
          }
          
          // Initialize stokPerApotik if not exists
          if (!product.stokPerApotik) {
            product.stokPerApotik = {};
          }
          if (product.stokPerApotik[transfer.apotikAsalId] === undefined) {
            product.stokPerApotik[transfer.apotikAsalId] = 0;
          }
          
          // Deduct stock and ensure it doesn't go negative
          const currentStock = product.stokPerApotik[transfer.apotikAsalId] || 0;
          allProducts[productIndex] = {
            ...product,
            stokPerApotik: {
              ...product.stokPerApotik,
              [transfer.apotikAsalId]: Math.max(0, currentStock - qtyInPieces),
            },
          };
        }
      }

      // Update products in localStorage and state
      localStorage.setItem("products", JSON.stringify(allProducts));
      setProducts(allProducts.filter((p: Product) => p.statusAktif));

      // Update transfer status
      const updatedTransfer = { ...transfer, status: "Dikirim" as const, updatedAt: new Date() };
      const updatedTransfers = transferList.map((t) =>
        t.id === transfer.id ? updatedTransfer : t
      );
      setTransferList(updatedTransfers);
      localStorage.setItem("transferBarang", JSON.stringify(updatedTransfers));

      // Update editingTransfer if this is the transfer being edited
      if (editingTransfer && editingTransfer.id === transfer.id) {
        setEditingTransfer(updatedTransfer);
      }

      alert(`Transfer ${transfer.nomorTransfer} berhasil dikirim`);
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat mengirim transfer");
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return { color: "#64748b", bgColor: "#f1f5f9" };
      case "Dikirim":
        return { color: "#d97706", bgColor: "#fef3c7" };
      case "Diterima":
        return { color: "#065f46", bgColor: "#d1fae5" };
      case "Dibatalkan":
        return { color: "#991b1b", bgColor: "#fee2e2" };
      default:
        return { color: "#64748b", bgColor: "#f1f5f9" };
    }
  };

  return (
    <DashboardLayout>
      <div style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "24px" }}>
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
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Buat Transfer Barang
          </button>
        </div>

        {/* Table */}
        {transferList.length > 0 ? (
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
                      Apotik Tujuan
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
                      Status
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
                  {transferList.map((transfer) => {
                    const statusStyle = getStatusColor(transfer.status);
                    const apotikAsal = apotiks.find((a) => a.id === transfer.apotikAsalId);
                    const apotikTujuan = apotiks.find((a) => a.id === transfer.apotikTujuanId);
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
                            color: "#1e293b",
                          }}
                        >
                          {apotikTujuan?.namaApotik || transfer.apotikTujuanId}
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
                            fontSize: "14px",
                          }}
                        >
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "500",
                              backgroundColor: statusStyle.bgColor,
                              color: statusStyle.color,
                            }}
                          >
                            {transfer.status}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "14px",
                            color: "#64748b",
                          }}
                        >
                          {transfer.operator || "-"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "14px",
                            color: "#64748b",
                          }}
                        >
                          {transfer.updatedAt 
                            ? new Date(transfer.updatedAt).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : transfer.createdAt
                            ? new Date(transfer.createdAt).toLocaleDateString("id-ID", {
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
                            textAlign: "center",
                          }}
                        >
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleViewTransfer(transfer)}
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
                              onClick={() => handleEditTransfer(transfer)}
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
                            <button
                              type="button"
                              onClick={() => handleDeleteTransfer(transfer)}
                              title="Hapus"
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
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
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
            <p style={{ color: "#64748b" }}>Belum ada transfer barang. Klik tombol "Buat Transfer Barang" untuk membuat transfer baru.</p>
          </div>
        )}

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
                <h3 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: "#1e293b" }}>
                  {editingTransfer ? "Edit Transfer Barang" : "Buat Transfer Barang"}
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
                >
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div style={{ padding: "24px", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
                  {/* Error */}
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

                  {/* Transfer Info */}
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
                      Informasi Transfer
                    </h4>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
      <div>
                        <label
                          htmlFor="nomorBukti"
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Nomor Bukti
                        </label>
                        <input
                          type="text"
                          id="nomorBukti"
                          name="nomorBukti"
                          value={generateNomorBukti()}
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
                            cursor: "not-allowed",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="tanggalTransfer"
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Tanggal Transfer <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          type="date"
                          id="tanggalTransfer"
                          name="tanggalTransfer"
                          value={formData.tanggalTransfer}
                          onChange={(e) => setFormData({ ...formData, tanggalTransfer: e.target.value })}
                          required
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginTop: "16px" }}>
                      <div>
                        <label
                          htmlFor="apotikAsalId"
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Apotik Asal <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <select
                          id="apotikAsalId"
                          name="apotikAsalId"
                          value={formData.apotikAsalId}
                          onChange={(e) => {
                            setFormData({ ...formData, apotikAsalId: e.target.value });
                            setDetailBarang([]); // Reset detail when apotik changes
                          }}
                          required
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            boxSizing: "border-box",
                            backgroundColor: "white",
                          }}
                        >
                          <option value="">Pilih Apotik Asal</option>
                          {apotiks.map((apotik) => (
                            <option key={apotik.id} value={apotik.id}>
                              {apotik.namaApotik}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="apotikTujuanId"
                          style={{
                            display: "block",
                            marginBottom: "6px",
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#374151",
                          }}
                        >
                          Apotik Tujuan <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <select
                          id="apotikTujuanId"
                          name="apotikTujuanId"
                          value={formData.apotikTujuanId}
                          onChange={(e) => setFormData({ ...formData, apotikTujuanId: e.target.value })}
                          required
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "14px",
                            boxSizing: "border-box",
                            backgroundColor: "white",
                          }}
                        >
                          <option value="">Pilih Apotik Tujuan</option>
                          {apotiks
                            .filter((a) => a.id !== formData.apotikAsalId)
                            .map((apotik) => (
                              <option key={apotik.id} value={apotik.id}>
                                {apotik.namaApotik}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <label
                        htmlFor="keterangan"
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          fontSize: "13px",
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
                        onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                        rows={3}
                        placeholder="Masukkan keterangan (opsional)"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          resize: "vertical",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Detail Barang */}
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
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
                        borderBottom: "2px solid #3b82f6",
                        paddingBottom: "8px",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          margin: 0,
                          color: "#1e293b",
                        }}
                      >
                        Detail Barang
                      </h4>
                      <button
                        type="button"
                        onClick={handleAddDetail}
                        disabled={!formData.apotikAsalId}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: formData.apotikAsalId ? "#3b82f6" : "#9ca3af",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: formData.apotikAsalId ? "pointer" : "not-allowed",
                          fontSize: "13px",
                          fontWeight: "500",
                          transition: "background-color 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        onMouseEnter={(e) => {
                          if (formData.apotikAsalId) {
                            e.currentTarget.style.backgroundColor = "#2563eb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.apotikAsalId) {
                            e.currentTarget.style.backgroundColor = "#3b82f6";
                          }
                        }}
                      >
                        + Add
                      </button>
                    </div>

                    {detailBarang.length > 0 ? (
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
                            minWidth: "800px",
                          }}
                        >
                          <thead>
                            <tr style={{ backgroundColor: "#f8fafc" }}>
                              <th
                                style={{
                                  textAlign: "center",
                                  borderBottom: "1px solid #e2e8f0",
                                  padding: "12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                }}
                              >
                                ACTION
                              </th>
                              <th
                                style={{
                                  textAlign: "left",
                                  borderBottom: "1px solid #e2e8f0",
                                  padding: "12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                }}
                              >
                                DESCRIPTION
                              </th>
                              <th
                                style={{
                                  textAlign: "left",
                                  borderBottom: "1px solid #e2e8f0",
                                  padding: "12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                }}
                              >
                                CODE
                              </th>
                              <th
                                style={{
                                  textAlign: "left",
                                  borderBottom: "1px solid #e2e8f0",
                                  padding: "12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                }}
                              >
                                UNIT
                              </th>
                              <th
                                style={{
                                  textAlign: "left",
                                  borderBottom: "1px solid #e2e8f0",
                                  padding: "12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                }}
                              >
                                KONVERSI
                              </th>
                              <th
                                style={{
                                  textAlign: "right",
                                  borderBottom: "1px solid #e2e8f0",
                                  padding: "12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#475569",
                                }}
                              >
                                QTY TRANSFER
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailBarang.map((detail) => {
                              const product = products.find((p) => p.id === detail.produkId);
                              const availableStock = product && formData.apotikAsalId
                                ? getStockPerApotik(product, formData.apotikAsalId)
                                : 0;

                              return (
                                <tr key={detail.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                  <td style={{ padding: "12px", textAlign: "center" }}>
                                    <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}>
                                      <button
                                        type="button"
                                        onClick={() => setEditingDetailId(detail.id === editingDetailId ? null : detail.id)}
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
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveDetail(detail.id)}
                                        title="Hapus"
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
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                          <line x1="10" y1="11" x2="10" y2="17" />
                                          <line x1="14" y1="11" x2="14" y2="17" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                  <td style={{ padding: "12px" }}>
                                    <div style={{ position: "relative" }}>
                                      <input
                                        type="text"
                                        value={
                                          detail.produkId && !showProductDropdown[detail.id]
                                            ? products.find((p) => p.id === detail.produkId)?.namaProduk || ""
                                            : productSearch[detail.id] || ""
                                        }
                                        onChange={(e) => handleProductSearchChange(detail.id, e.target.value)}
                                        onFocus={() => {
                                          setShowProductDropdown({ ...showProductDropdown, [detail.id]: true });
                                          if (detail.produkId) {
                                            const product = products.find((p) => p.id === detail.produkId);
                                            setProductSearch({ ...productSearch, [detail.id]: product?.namaProduk || "" });
                                          }
                                        }}
                                        placeholder="Search Product..."
                                        required
                                        style={{
                                          width: "100%",
                                          padding: "8px",
                                          border: "1px solid #d1d5db",
                                          borderRadius: "4px",
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
                                          setTimeout(() => {
                                            setShowProductDropdown({ ...showProductDropdown, [detail.id]: false });
                                          }, 200);
                                        }}
                                      />
                                      {showProductDropdown[detail.id] && (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          style={{
                                            position: "absolute",
                                            top: "100%",
                                            left: 0,
                                            right: 0,
                                            marginTop: "4px",
                                            zIndex: 20,
                                            backgroundColor: "white",
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                            maxHeight: "200px",
                                            overflowY: "auto",
                                          }}
                                        >
                                          {products
                                            .filter((product) => {
                                              const searchTerm = (productSearch[detail.id] || "").toLowerCase();
                                              return (
                                                product.namaProduk.toLowerCase().includes(searchTerm) ||
                                                product.kodeProduk.toLowerCase().includes(searchTerm)
                                              );
                                            })
                                            .map((product) => {
                                              const stock = getStockPerApotik(product, formData.apotikAsalId);
                                              return (
                                                <div
                                                  key={product.id}
                                                  onClick={() => handleProductSelect(detail.id, product.id)}
                                                  style={{
                                                    padding: "10px 12px",
                                                    cursor: "pointer",
                                                    fontSize: "14px",
                                                    transition: "background-color 0.2s",
                                                    borderBottom: "1px solid #f1f5f9",
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = "#f8fafc";
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = "white";
                                                  }}
                                                >
                                                  <div style={{ fontWeight: "500", color: "#1e293b" }}>
                                                    {product.namaProduk}
                                                  </div>
                                                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                                                    {product.kodeProduk} (Stok: {stock})
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          {products.filter((product) => {
                                            const searchTerm = (productSearch[detail.id] || "").toLowerCase();
                                            return (
                                              product.namaProduk.toLowerCase().includes(searchTerm) ||
                                              product.kodeProduk.toLowerCase().includes(searchTerm)
                                            );
                                          }).length === 0 && (
                                            <div
                                              style={{
                                                padding: "10px 12px",
                                                fontSize: "14px",
                                                color: "#64748b",
                                                textAlign: "center",
                                              }}
                                            >
                                              No product found
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>
                                    {detail.kodeProduk || "-"}
                                  </td>
                                  <td style={{ padding: "12px" }}>
                                    {(() => {
                                      if (!detail.produkId) {
                                        return <span style={{ fontSize: "13px", color: "#64748b" }}>-</span>;
                                      }

                                      const productUnits = getProductUnits(detail.produkId);
                                      if (productUnits.length > 0) {
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
                                              border: "1px solid #d1d5db",
                                              borderRadius: "4px",
                                              fontSize: "13px",
                                              boxSizing: "border-box",
                                            }}
                                          >
                                            <option value="">Select Unit</option>
                                            {productUnits
                                              .sort((a, b) => a.urutan - b.urutan)
                                              .map((unit) => (
                                                <option key={unit.id} value={unit.id}>
                                                  {unit.namaUnit}
                                                </option>
                                              ))}
                                          </select>
                                        );
                                      }
                                      return <span style={{ fontSize: "13px", color: "#64748b" }}>{detail.namaUnit || "-"}</span>;
                                    })()}
                                  </td>
                                  <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>
                                    {(() => {
                                      if (!detail.produkId || !detail.unitId) {
                                        return "-";
                                      }
                                      const productUnits = getProductUnits(detail.produkId);
                                      const unit = productUnits.find((u) => u.id === detail.unitId);
                                      if (unit && unit.konversi) {
                                        return `1 ${unit.namaUnit} = ${unit.konversi} pcs`;
                                      }
                                      return "-";
                                    })()}
                                  </td>
                                  <td style={{ padding: "12px" }}>
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={detail.qtyTransfer}
                                      onChange={(e) =>
                                        handleDetailChange(
                                          detail.id,
                                          "qtyTransfer",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      required
                                      style={{
                                        width: "100px",
                                        padding: "8px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "4px",
                                        fontSize: "13px",
                                        textAlign: "right",
                                        boxSizing: "border-box",
                                      }}
                                    />
                                    {detail.produkId && formData.apotikAsalId && (
                                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                                        Stok: {availableStock}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
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
                        No items. Click Add to add items.
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
                    Cancel
                  </button>
                  {!editingTransfer ? (
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
                      }}
                    >
                      {loading ? "Menyimpan..." : "Simpan Draft"}
                    </button>
                  ) : (
                    <>
                      {!hasPengajuan && !approvedPengajuan && (
                        <>
                          <button
                            type="button"
                            onClick={handleOpenPengajuanModal}
                            disabled={loading}
                            style={{
                              padding: "10px 20px",
                              backgroundColor: "#f59e0b",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: loading ? "not-allowed" : "pointer",
                              fontSize: "14px",
                              fontWeight: "500",
                            }}
                          >
                            Ajukan Perubahan
                          </button>
                          {editingTransfer.status === "Draft" ? (
                            <button
                              type="button"
                              onClick={() => handleKirimTransfer(editingTransfer)}
                              disabled={loading}
                              style={{
                                padding: "10px 20px",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: loading ? "not-allowed" : "pointer",
                                fontSize: "14px",
                                fontWeight: "500",
                              }}
                            >
          Transfer Barang
                            </button>
                          ) : editingTransfer.status === "Dikirim" ? (
                            <button
                              type="button"
                              disabled
                              style={{
                                padding: "10px 20px",
                                backgroundColor: "#64748b",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "not-allowed",
                                fontSize: "14px",
                                fontWeight: "500",
                                opacity: 0.7,
                              }}
                            >
                              Terkirim
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={handlePrint}
                            disabled={loading}
                            style={{
                              padding: "10px 20px",
                              backgroundColor: "#64748b",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: loading ? "not-allowed" : "pointer",
                              fontSize: "14px",
                              fontWeight: "500",
                            }}
                          >
                            Print
                          </button>
                        </>
                      )}
                      {hasPengajuan && !approvedPengajuan && (
                        <button
                          type="button"
                          onClick={handleRefresh}
                          disabled={loading}
                          style={{
                            padding: "10px 20px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontSize: "14px",
                            fontWeight: "500",
                          }}
                        >
                          Refresh
                        </button>
                      )}
                      {approvedPengajuan && approvedPengajuan.jenisPengajuan === "Edit Transaksi" && (
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
                          }}
                        >
                          {loading ? "Menyimpan..." : "Simpan"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </form>
        </div>
        </div>
        )}

        {/* View Modal */}
        {isViewModalOpen && viewingTransfer && (
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
                maxWidth: "800px",
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
                  Detail Transfer Barang
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
                    Nomor Bukti
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                    {viewingTransfer.nomorBukti || "-"}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Nomor Transfer
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                    {viewingTransfer.nomorTransfer}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Tanggal Transfer
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {formatDate(viewingTransfer.tanggalTransfer)}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Status
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                    {viewingTransfer.status}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Apotik Asal
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {apotiks.find((a) => a.id === viewingTransfer.apotikAsalId)?.namaApotik || viewingTransfer.apotikAsalId}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Apotik Tujuan
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {apotiks.find((a) => a.id === viewingTransfer.apotikTujuanId)?.namaApotik || viewingTransfer.apotikTujuanId}
                  </div>
                </div>
              </div>

              {viewingTransfer.keterangan && (
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Keterangan
                  </label>
                  <div style={{ fontSize: "14px", color: "#1e293b" }}>
                    {viewingTransfer.keterangan}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "12px", fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                  Detail Barang
                </label>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                          Nama Produk
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                          Kode Produk
                        </th>
                        <th style={{ padding: "12px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                          Unit
                        </th>
                        <th style={{ padding: "12px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                          Qty Transfer
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingTransfer.detailBarang.map((detail) => (
                        <tr key={detail.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1e293b" }}>
                            {detail.namaProduk}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#64748b" }}>
                            {detail.kodeProduk}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#64748b" }}>
                            {detail.namaUnit}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#1e293b", textAlign: "right", fontWeight: "500" }}>
                            {detail.qtyTransfer}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                <h3 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: "#1e293b" }}>
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
                  }}
                >
                  ×
                </button>
        </div>

              <form onSubmit={handleSubmitPengajuan}>
                <div style={{ padding: "24px" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                      Jenis Pengajuan <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={pengajuanData.jenisPengajuan}
                      onChange={(e) => setPengajuanData((prev) => ({ ...prev, jenisPengajuan: e.target.value }))}
                      required
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">Pilih Jenis Pengajuan</option>
                      <option value="Edit Transaksi">Edit Transaksi</option>
                      <option value="Hapus Transaksi">Hapus Transaksi</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#374151" }}>
                      Alasan Pengajuan <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <textarea
                      value={pengajuanData.alasanPengajuan}
                      onChange={(e) => setPengajuanData((prev) => ({ ...prev, alasanPengajuan: e.target.value }))}
                      required
                      rows={4}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "14px",
                        resize: "vertical",
                      }}
                      placeholder="Masukkan alasan pengajuan perubahan..."
                    />
                  </div>
                </div>

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
