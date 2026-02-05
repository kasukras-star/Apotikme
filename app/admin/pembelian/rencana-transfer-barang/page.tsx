"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, Trash2 } from "lucide-react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface ProductUnit {
  id: string;
  namaUnit: string;
  konversi: number;
  urutan: number;
}

interface Product {
  id: string;
  kodeProduk: string;
  namaProduk: string;
  units?: ProductUnit[];
  statusAktif: boolean;
  stokAwal?: number;
  stokPerApotik?: { [apotikId: string]: number };
}

interface Apotik {
  id: string;
  kodeApotik: string;
  namaApotik: string;
  alamat?: string;
  kota?: string;
  provinsi?: string;
  statusAktif: boolean;
}

export type StatusRencana =
  | "Menunggu Disiapkan"
  | "Sedang Disiapkan"
  | "Siap Dikirim"
  | "Sudah Jadi Transfer"
  | "Dibatalkan";

interface DetailBarangRencana {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId: string;
  namaUnit: string;
  qtyRencana: number;
}

export interface RencanaTransferBarang {
  id: string;
  nomorRencana: string;
  tanggal: string;
  tanggalRencanaKirim: string;
  apotikAsalId: string;
  apotikTujuanId: string;
  detailBarang: DetailBarangRencana[];
  keterangan: string;
  status: StatusRencana;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  transferId?: string;
  dikirimKeGudangAt?: string;
  pengajuanSubmittedAt?: string;
  pengajuanType?: string;
  pengajuanKeterangan?: string;
  pengajuanDisetujuiAt?: string;
}

const STATUS_OPTIONS: StatusRencana[] = [
  "Menunggu Disiapkan",
  "Sedang Disiapkan",
  "Siap Dikirim",
  "Sudah Jadi Transfer",
  "Dibatalkan",
];

export default function RencanaTransferBarangPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAjukanModalOpen, setIsAjukanModalOpen] = useState(false);
  const [ajukanFormData, setAjukanFormData] = useState({ typePengajuan: "", keterangan: "" });
  const [viewingRencana, setViewingRencana] = useState<RencanaTransferBarang | null>(null);
  const [list, setList] = useState<RencanaTransferBarang[]>([]);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });
  const [filterDateTo, setFilterDateTo] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });

  const [formData, setFormData] = useState({
    tanggal: "",
    tanggalRencanaKirim: "",
    apotikAsalId: "",
    apotikTujuanId: "",
    keterangan: "",
  });
  const [detailBarang, setDetailBarang] = useState<DetailBarangRencana[]>([]);
  const [productSearch, setProductSearch] = useState<{ [key: string]: string }>({});
  const [showProductDropdown, setShowProductDropdown] = useState<{ [key: string]: boolean }>({});
  const [productModalDetailId, setProductModalDetailId] = useState<string | null>(null);
  const [productModalSearch, setProductModalSearch] = useState("");
  const [savedRencanaId, setSavedRencanaId] = useState<string | null>(null);
  const [viewEditFormData, setViewEditFormData] = useState({
    tanggal: "",
    tanggalRencanaKirim: "",
    apotikAsalId: "",
    apotikTujuanId: "",
    keterangan: "",
  });
  const [viewEditDetailBarang, setViewEditDetailBarang] = useState<DetailBarangRencana[]>([]);
  const [viewProductModalDetailId, setViewProductModalDetailId] = useState<string | null>(null);
  const [viewProductModalSearch, setViewProductModalSearch] = useState("");

  const router = useRouter();

  useEffect(() => {
    getSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session?.user?.email) setCurrentUserEmail(data.session.user.email);
      })
      .catch(() => {});
  }, []);

  const getTodayDateInput = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  };

  const generateNomorRencana = (): string => {
    const saved = localStorage.getItem("rencanaTransferBarang");
    let maxNum = 0;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = new Date();
        const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        parsed.forEach((r: RencanaTransferBarang) => {
          const m = r.nomorRencana.match(/RTR-(\d{6})-(\d+)/);
          if (m && m[1] === yyyymm) {
            const n = parseInt(m[2], 10);
            if (n > maxNum) maxNum = n;
          }
        });
      } catch (_) {}
    }
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    return `RTR-${yyyymm}-${String(maxNum + 1).padStart(3, "0")}`;
  };

  const getProductUnits = (productId: string): ProductUnit[] => {
    const p = products.find((x) => x.id === productId);
    return p?.units || [];
  };

  const getStokProduk = (product: Product | undefined, apotikId: string): number | null => {
    if (!product || !apotikId) return null;
    if (product.stokPerApotik && product.stokPerApotik[apotikId] !== undefined) {
      return product.stokPerApotik[apotikId];
    }
    return product.stokAwal ?? 0;
  };

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      const sa = localStorage.getItem("apotiks");
      const sp = localStorage.getItem("products");
      if (sa) try { setApotiks(JSON.parse(sa).filter((a: Apotik) => a.statusAktif)); } catch (_) {}
      if (sp) try { setProducts(JSON.parse(sp).filter((p: Product) => p.statusAktif)); } catch (_) {}
      try {
        const sr = localStorage.getItem("rencanaTransferBarang");
        if (sr) {
          const parsed = JSON.parse(sr);
          if (Array.isArray(parsed)) setList(parsed);
        }
      } catch (_) {}
      if (!cancelled) setIsLoadingData(false);
    };
    getSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!data.session?.access_token || cancelled) {
          load();
          return;
        }
        const token = data.session.access_token;
        Promise.all([
          fetch("/api/data/rencanaTransferBarang", { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch("/api/data/apotiks", { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch("/api/data/products", { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
            r.ok ? r.json() : []
          ),
        ]).then(([rencanaData, apotiksData, productsData]) => {
          if (cancelled) return;
          const fromApi = Array.isArray(rencanaData) && rencanaData.length > 0;
          const fromStorage = (() => {
            try {
              const sr = localStorage.getItem("rencanaTransferBarang");
              if (!sr) return [];
              const parsed = JSON.parse(sr);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })();
          if (fromApi) {
            setList(rencanaData);
            localStorage.setItem("rencanaTransferBarang", JSON.stringify(rencanaData));
          } else if (fromStorage.length > 0) {
            setList(fromStorage);
          }
          if (!fromApi && fromStorage.length > 0) {
            getSupabaseClient().auth.getSession().then(({ data: sessionData }) => {
              if (sessionData.session?.access_token) {
                fetch("/api/data/rencanaTransferBarang", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData.session.access_token}` },
                  body: JSON.stringify({ value: fromStorage }),
                }).catch(() => {});
              }
            });
          }
          if (Array.isArray(apotiksData) && apotiksData.length > 0) {
            setApotiks(apotiksData.filter((a: Apotik) => a.statusAktif));
            localStorage.setItem("apotiks", JSON.stringify(apotiksData));
          } else {
            const sa = localStorage.getItem("apotiks");
            if (sa) try { setApotiks(JSON.parse(sa).filter((a: Apotik) => a.statusAktif)); } catch (_) {}
          }
          if (Array.isArray(productsData) && productsData.length > 0) {
            setProducts(productsData.filter((p: Product) => p.statusAktif));
            localStorage.setItem("products", JSON.stringify(productsData));
          } else {
            const sp = localStorage.getItem("products");
            if (sp) try { setProducts(JSON.parse(sp).filter((p: Product) => p.statusAktif)); } catch (_) {}
          }
          if (!cancelled) setIsLoadingData(false);
        })
        .catch(() => {
          if (!cancelled) load();
        });
    }).catch(() => {
      if (!cancelled) load();
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session?.access_token) {
          fetch("/api/data/rencanaTransferBarang", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ value: list }),
          }).catch(() => {});
        }
      });
  }, [list, isLoadingData]);

  const handleDetailChange = (
    id: string,
    field: keyof DetailBarangRencana,
    value: string | number
  ) => {
    setDetailBarang((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updated = { ...d, [field]: value };
        if (field === "produkId" && typeof value === "string") {
          const p = products.find((x) => x.id === value);
          if (p) {
            updated.kodeProduk = p.kodeProduk;
            updated.namaProduk = p.namaProduk;
            updated.unitId = "";
            updated.namaUnit = "";
          }
        }
        if (field === "unitId" && typeof value === "string" && updated.produkId) {
          const units = getProductUnits(updated.produkId);
          const u = units.find((x) => x.id === value);
          if (u) updated.namaUnit = u.namaUnit;
        }
        return updated;
      })
    );
  };

  const handleAddDetail = () => {
    if (!formData.apotikAsalId) {
      alert("Pilih apotik asal terlebih dahulu");
      return;
    }
    setDetailBarang((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        produkId: "",
        kodeProduk: "",
        namaProduk: "",
        unitId: "",
        namaUnit: "",
        qtyRencana: 1,
      },
    ]);
  };

  const handleRemoveDetail = (id: string) => {
    setDetailBarang((prev) => prev.filter((d) => d.id !== id));
    setProductSearch((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
    setShowProductDropdown((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  };

  const handleProductSearchChange = (detailId: string, value: string) => {
    setProductSearch((s) => ({ ...s, [detailId]: value }));
    setShowProductDropdown((s) => ({ ...s, [detailId]: true }));
    const d = detailBarang.find((x) => x.id === detailId);
    if (d?.produkId) handleDetailChange(detailId, "produkId", "");
  };

  const handleProductSelect = (detailId: string, productId: string) => {
    handleDetailChange(detailId, "produkId", productId);
    setProductSearch((s) => ({ ...s, [detailId]: "" }));
    setShowProductDropdown((s) => ({ ...s, [detailId]: false }));
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSavedRencanaId(null);
    setProductModalDetailId(null);
    setFormData({
      tanggal: getTodayDateInput(),
      tanggalRencanaKirim: getTodayDateInput(),
      apotikAsalId: "",
      apotikTujuanId: "",
      keterangan: "",
    });
    setDetailBarang([]);
    setProductSearch({});
    setShowProductDropdown({});
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSavedRencanaId(null);
    setProductModalDetailId(null);
    setFormData({
      tanggal: getTodayDateInput(),
      tanggalRencanaKirim: getTodayDateInput(),
      apotikAsalId: "",
      apotikTujuanId: "",
      keterangan: "",
    });
    setDetailBarang([]);
    setProductSearch({});
    setShowProductDropdown({});
    setError(null);
  };

  const handleViewRencana = (r: RencanaTransferBarang) => {
    setViewingRencana(r);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setIsAjukanModalOpen(false);
    setViewingRencana(null);
    setAjukanFormData({ typePengajuan: "", keterangan: "" });
    setViewProductModalDetailId(null);
    setViewProductModalSearch("");
    setViewEditFormData({ tanggal: "", tanggalRencanaKirim: "", apotikAsalId: "", apotikTujuanId: "", keterangan: "" });
    setViewEditDetailBarang([]);
  };

  const isViewEditMode = viewingRencana?.pengajuanDisetujuiAt && viewingRencana?.pengajuanType === "Edit transaksi";

  useEffect(() => {
    if (!viewingRencana) return;
    if (viewingRencana.pengajuanDisetujuiAt && viewingRencana.pengajuanType === "Edit transaksi") {
      const tanggal = (viewingRencana as any).tanggal || (viewingRencana.createdAt ? viewingRencana.createdAt.slice(0, 10) : "");
      setViewEditFormData({
        tanggal,
        tanggalRencanaKirim: viewingRencana.tanggalRencanaKirim,
        apotikAsalId: viewingRencana.apotikAsalId,
        apotikTujuanId: viewingRencana.apotikTujuanId,
        keterangan: viewingRencana.keterangan,
      });
      setViewEditDetailBarang(viewingRencana.detailBarang.map((d) => ({ ...d })));
    }
  }, [viewingRencana?.id, viewingRencana?.pengajuanDisetujuiAt, viewingRencana?.pengajuanType]);

  const handleOpenAjukanModal = () => {
    setAjukanFormData({ typePengajuan: "", keterangan: "" });
    setIsAjukanModalOpen(true);
  };

  const handleSubmitAjukan = () => {
    if (!viewingRencana) return;
    if (!ajukanFormData.typePengajuan.trim()) {
      alert("Pilih type pengajuan.");
      return;
    }
    const updated: RencanaTransferBarang = {
      ...viewingRencana,
      pengajuanSubmittedAt: new Date().toISOString(),
      pengajuanType: ajukanFormData.typePengajuan,
      pengajuanKeterangan: ajukanFormData.keterangan,
    };
    const nextList = list.map((r) => (r.id === viewingRencana.id ? updated : r));
    setList(nextList);
    setViewingRencana(updated);
    localStorage.setItem("rencanaTransferBarang", JSON.stringify(nextList));
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/rencanaTransferBarang", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ value: nextList }),
        }).catch(() => {});
      }
    });
    setIsAjukanModalOpen(false);
    setAjukanFormData({ typePengajuan: "", keterangan: "" });
  };

  const handleRefreshViewRencana = () => {
    if (!viewingRencana) return;
    const latest = list.find((r) => r.id === viewingRencana.id);
    if (latest) setViewingRencana(latest);
  };

  const handleBatalAjukan = () => {
    if (!viewingRencana) return;
    if (!confirm("Batalkan pengajuan untuk rencana ini?")) return;
    const updated: RencanaTransferBarang = {
      ...viewingRencana,
      pengajuanSubmittedAt: undefined,
      pengajuanType: undefined,
      pengajuanKeterangan: undefined,
      pengajuanDisetujuiAt: undefined,
    };
    const nextList = list.map((r) => (r.id === viewingRencana.id ? updated : r));
    setList(nextList);
    setViewingRencana(updated);
    localStorage.setItem("rencanaTransferBarang", JSON.stringify(nextList));
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/rencanaTransferBarang", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ value: nextList }),
        }).catch(() => {});
      }
    });
  };

  const handleViewDetailChange = (id: string, field: keyof DetailBarangRencana, value: string | number) => {
    setViewEditDetailBarang((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d, [field]: value };
        if (field === "produkId" && typeof value === "string") {
          const p = products.find((x) => x.id === value);
          if (p) {
            next.kodeProduk = p.kodeProduk;
            next.namaProduk = p.namaProduk;
            next.unitId = "";
            next.namaUnit = "";
          }
        }
        if (field === "unitId" && typeof value === "string" && next.produkId) {
          const units = getProductUnits(next.produkId);
          const u = units.find((x) => x.id === value);
          if (u) next.namaUnit = u.namaUnit;
        }
        return next;
      })
    );
  };

  const handleViewAddDetail = () => {
    setViewEditDetailBarang((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        produkId: "",
        kodeProduk: "",
        namaProduk: "",
        unitId: "",
        namaUnit: "",
        qtyRencana: 1,
      },
    ]);
  };

  const handleViewRemoveDetail = (id: string) => {
    setViewEditDetailBarang((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSimpanSetujui = () => {
    if (!viewingRencana) return;
    const isEdit = viewingRencana.pengajuanType === "Edit transaksi";
    const updated: RencanaTransferBarang = {
      ...viewingRencana,
      updatedAt: new Date().toISOString(),
      pengajuanSubmittedAt: undefined,
      pengajuanType: undefined,
      pengajuanKeterangan: undefined,
      pengajuanDisetujuiAt: undefined,
      ...(isEdit
        ? {
            tanggal: viewEditFormData.tanggal,
            tanggalRencanaKirim: viewEditFormData.tanggalRencanaKirim,
            apotikAsalId: viewEditFormData.apotikAsalId,
            apotikTujuanId: viewEditFormData.apotikTujuanId,
            keterangan: viewEditFormData.keterangan,
            detailBarang: viewEditDetailBarang,
          }
        : {}),
    };
    const nextList = list.map((r) => (r.id === viewingRencana.id ? updated : r));
    setList(nextList);
    setViewingRencana(updated);
    localStorage.setItem("rencanaTransferBarang", JSON.stringify(nextList));
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/rencanaTransferBarang", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ value: nextList }),
        }).catch(() => {});
      }
    });
    alert("Rencana berhasil disimpan. Tombol Ajukan dan Kirim akan tampil kembali.");
  };

  const handleHapusSetujui = () => {
    if (!viewingRencana) return;
    if (!confirm(`Hapus rencana ${viewingRencana.nomorRencana}?`)) return;
    const nextList = list.filter((r) => r.id !== viewingRencana.id);
    setList(nextList);
    localStorage.setItem("rencanaTransferBarang", JSON.stringify(nextList));
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/rencanaTransferBarang", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ value: nextList }),
        }).catch(() => {});
      }
    });
    handleCloseViewModal();
    alert("Rencana telah dihapus.");
  };

  const handleBatalRencana = (r: RencanaTransferBarang) => {
    if (r.status !== "Menunggu Disiapkan") {
      alert("Hanya rencana dengan status Menunggu Disiapkan yang dapat dibatalkan.");
      return;
    }
    if (!confirm(`Batalkan rencana ${r.nomorRencana}?`)) return;
    const updated = list.map((x) =>
      x.id === r.id ? { ...x, status: "Dibatalkan" as StatusRencana, updatedAt: new Date().toISOString() } : x
    );
    setList(updated);
    localStorage.setItem("rencanaTransferBarang", JSON.stringify(updated));
    alert("Rencana telah dibatalkan.");
  };

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
      const incomplete = detailBarang.filter(
        (d) => !d.produkId || !d.unitId || !d.qtyRencana || d.qtyRencana <= 0
      );
      if (incomplete.length > 0) {
        throw new Error("Lengkapi detail barang: produk, unit, dan qty harus diisi");
      }
      const now = new Date().toISOString();
      const userEmail = currentUserEmail || "System";

      const newRencana: RencanaTransferBarang = {
          id: Date.now().toString(),
          nomorRencana: generateNomorRencana(),
          tanggal: formData.tanggal,
          tanggalRencanaKirim: formData.tanggalRencanaKirim,
          apotikAsalId: formData.apotikAsalId,
          apotikTujuanId: formData.apotikTujuanId,
          detailBarang,
          keterangan: formData.keterangan,
          status: "Menunggu Disiapkan",
          createdAt: now,
          updatedAt: now,
          createdBy: userEmail,
        };
        const nextList = [...list, newRencana];
        setList(nextList);
        localStorage.setItem("rencanaTransferBarang", JSON.stringify(nextList));
        getSupabaseClient().auth.getSession().then(({ data }) => {
          if (data.session?.access_token) {
            fetch("/api/data/rencanaTransferBarang", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
              body: JSON.stringify({ value: nextList }),
            }).catch(() => {});
          }
        });
        alert(`Rencana ${newRencana.nomorRencana} berhasil disimpan.`);
        setSavedRencanaId(newRencana.id);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const getTanggalTransaksi = (r: RencanaTransferBarang) => (r as any).tanggal || (r.createdAt ? r.createdAt.slice(0, 10) : "");

  const filteredList = list.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false;
    const tglTransaksi = getTanggalTransaksi(r);
    if (filterDateFrom && tglTransaksi < filterDateFrom) return false;
    if (filterDateTo && tglTransaksi > filterDateTo) return false;
    return true;
  });

  const getApotikName = (id: string) => apotiks.find((a) => a.id === id)?.namaApotik || id;

  const handleRefreshList = () => {
    getSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session?.access_token) {
          fetch("/api/data/rencanaTransferBarang", { headers: { Authorization: `Bearer ${data.session.access_token}` } })
            .then((r) => (r.ok ? r.json() : []))
            .then((apiData) => {
              const fromApi = Array.isArray(apiData) && apiData.length > 0;
              if (fromApi) {
                setList(apiData);
                localStorage.setItem("rencanaTransferBarang", JSON.stringify(apiData));
              } else {
                try {
                  const sr = localStorage.getItem("rencanaTransferBarang");
                  if (sr) {
                    const parsed = JSON.parse(sr);
                    if (Array.isArray(parsed)) setList(parsed);
                  }
                } catch (_) {}
              }
            })
            .catch(() => {
              try {
                const sr = localStorage.getItem("rencanaTransferBarang");
                if (sr) {
                  const parsed = JSON.parse(sr);
                  if (Array.isArray(parsed)) setList(parsed);
                }
              } catch (_) {}
            });
        } else {
          try {
            const sr = localStorage.getItem("rencanaTransferBarang");
            if (sr) {
              const parsed = JSON.parse(sr);
              if (Array.isArray(parsed)) setList(parsed);
            }
          } catch (_) {}
        }
      });
  };

  return (
    <DashboardLayout>
      <div style={{ padding: "4px 24px 24px 24px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "4px" }}>
          <button
            type="button"
            onClick={handleOpenModal}
            style={{
              padding: "10px 20px",
              backgroundColor: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Buat Rencana
          </button>
        </div>
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "12px 20px 20px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end", marginBottom: "8px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.35", minHeight: "18px" }}>
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                  minWidth: "180px",
                }}
              >
                <option value="">Semua</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.35", minHeight: "18px" }}>
                Tanggal transaksi dari
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.35", minHeight: "18px" }}>
                Tanggal transaksi sampai
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleRefreshList}
              title="Muat ulang daftar"
              style={{
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontSize: "14px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>

          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", minWidth: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", backgroundColor: "var(--surface-hover)" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>No. Rencana</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Tanggal</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Rencana Kirim</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Apotik Asal</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Apotik Tujuan</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Dibuat oleh</th>
                  <th style={{ textAlign: "center", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", width: "72px" }}>Aksi</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", width: "115px" }}>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                      {isLoadingData ? "Memuat..." : "Tidak ada data rencana transfer."}
                    </td>
                  </tr>
                ) : (
                  filteredList.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-primary)", whiteSpace: "nowrap" }}>{r.nomorRencana}</td>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-primary)", whiteSpace: "nowrap" }}>{getTanggalTransaksi(r) || "-"}</td>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-primary)", whiteSpace: "nowrap" }}>{r.tanggalRencanaKirim}</td>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-primary)" }}>{getApotikName(r.apotikAsalId)}</td>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-primary)" }}>{getApotikName(r.apotikTujuanId)}</td>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-primary)", whiteSpace: "nowrap" }}>{r.status}</td>
                      <td style={{ padding: "6px 8px", fontSize: "13px", color: "var(--text-secondary)" }}>{r.createdBy}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => handleViewRencana(r)}
                            title="Lihat"
                            style={{
                              padding: "4px",
                              border: "1px solid var(--border)",
                              borderRadius: "4px",
                              background: "var(--surface)",
                              color: "var(--text-primary)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Eye size={14} />
                          </button>
                          {r.status === "Menunggu Disiapkan" && (
                            <button
                              type="button"
                              onClick={() => handleBatalRencana(r)}
                              title="Batal"
                              style={{
                                padding: "4px",
                                border: "1px solid var(--border)",
                                borderRadius: "4px",
                                background: "var(--surface)",
                                color: "#dc2626",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {r.updatedAt ? new Date(r.updatedAt).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Form */}
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
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "var(--surface-hover)",
              }}
            >
              <h3 style={{ fontSize: "17px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                Buat Rencana Transfer Barang
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div style={{ padding: "16px 20px", flex: 1, minHeight: 0, overflowY: "auto" }}>
                {error && (
                  <div
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      marginBottom: "12px",
                      color: "#dc2626",
                      fontSize: "13px",
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* 4 side layout - compact, outline group tanpa judul */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "10px", alignItems: "stretch" }}>
                  {/* Side 1 */}
                  <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", flex: "0 0 auto" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>
                          No Rencana
                        </label>
                        <input
                          type="text"
                          value={generateNomorRencana()}
                          readOnly
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            fontSize: "13px",
                            backgroundColor: "var(--surface-hover)",
                            color: "var(--text-secondary)",
                            boxSizing: "border-box",
                            cursor: "not-allowed",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>
                          Tanggal transaksi <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.tanggal}
                          onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                          required
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            fontSize: "13px",
                            backgroundColor: "var(--surface)",
                            color: "var(--text-primary)",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>
                        Tanggal Rencana Kirim <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.tanggalRencanaKirim}
                        onChange={(e) => setFormData({ ...formData, tanggalRencanaKirim: e.target.value })}
                        required
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          fontSize: "13px",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Side 2 */}
                  <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>
                        Apotik Pengirim <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={formData.apotikAsalId}
                        onChange={(e) => {
                          setFormData({ ...formData, apotikAsalId: e.target.value });
                          setDetailBarang([]);
                        }}
                        required
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          fontSize: "13px",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="">Pilih Apotik Pengirim</option>
                        {apotiks.map((a) => (
                          <option key={a.id} value={a.id}>{a.namaApotik}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                      <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>
                        Alamat
                      </label>
                      <div
                        style={{
                          width: "100%",
                          flex: 1,
                          padding: "5px 8px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          fontSize: "13px",
                          backgroundColor: "var(--surface-hover)",
                          color: "var(--text-secondary)",
                          minHeight: "28px",
                          boxSizing: "border-box",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {formData.apotikAsalId
                          ? (() => {
                              const a = apotiks.find((x) => x.id === formData.apotikAsalId);
                              return a ? [a.alamat, a.kota, a.provinsi].filter(Boolean).join(", ") || "-" : "-";
                            })()
                          : "-"}
                      </div>
                    </div>
                  </div>

                  {/* Side 3 */}
                  <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>
                        Apotik Tujuan <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={formData.apotikTujuanId}
                        onChange={(e) => setFormData({ ...formData, apotikTujuanId: e.target.value })}
                        required
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          fontSize: "13px",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="">Pilih Apotik Tujuan</option>
                        {apotiks
                          .filter((a) => a.id !== formData.apotikAsalId)
                          .map((a) => (
                            <option key={a.id} value={a.id}>{a.namaApotik}</option>
                          ))}
                      </select>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                      <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>
                        Alamat
                      </label>
                      <div
                        style={{
                          width: "100%",
                          flex: 1,
                          padding: "5px 8px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          fontSize: "13px",
                          backgroundColor: "var(--surface-hover)",
                          color: "var(--text-secondary)",
                          minHeight: "28px",
                          boxSizing: "border-box",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {formData.apotikTujuanId
                          ? (() => {
                              const a = apotiks.find((x) => x.id === formData.apotikTujuanId);
                              return a ? [a.alamat, a.kota, a.provinsi].filter(Boolean).join(", ") || "-" : "-";
                            })()
                          : "-"}
                      </div>
                    </div>
                  </div>

                  {/* Side 4 */}
                  <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                      <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>
                        Keterangan
                      </label>
                      <textarea
                        value={formData.keterangan}
                        onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                        rows={2}
                        placeholder="Opsional"
                        style={{
                          width: "100%",
                          flex: 1,
                          padding: "6px 8px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontFamily: "inherit",
                          resize: "vertical",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          boxSizing: "border-box",
                          minHeight: "48px",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "8px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Detail Barang</span>
                    <button
                      type="button"
                      onClick={handleAddDetail}
                      disabled={!formData.apotikAsalId}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: formData.apotikAsalId ? "var(--primary)" : "var(--border)",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: formData.apotikAsalId ? "pointer" : "not-allowed",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}
                    >
                      + Tambah Baris
                    </button>
                  </div>
                  {detailBarang.length > 0 ? (
                    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "6px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "var(--surface-hover)" }}>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Produk</th>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Kode</th>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Unit</th>
                            <th style={{ padding: "8px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Stok Pengirim</th>
                            <th style={{ padding: "8px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Stok Tujuan</th>
                            <th style={{ padding: "8px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Qty</th>
                            <th style={{ padding: "8px", width: "44px" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailBarang.map((detail) => (
                            <tr key={detail.id} style={{ borderTop: "1px solid var(--border)" }}>
                              <td style={{ padding: "8px" }}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    setProductModalDetailId(detail.id);
                                    setProductModalSearch("");
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setProductModalDetailId(detail.id);
                                      setProductModalSearch("");
                                    }
                                  }}
                                  style={{ cursor: "pointer" }}
                                >
                                  <input
                                    type="text"
                                    readOnly
                                    value={
                                      detail.produkId
                                        ? products.find((p) => p.id === detail.produkId)?.namaProduk || ""
                                        : ""
                                    }
                                    placeholder="Klik untuk pilih produk..."
                                    required
                                    style={{
                                      width: "100%",
                                      padding: "8px",
                                      border: "1px solid var(--border)",
                                      borderRadius: "4px",
                                      fontSize: "13px",
                                      backgroundColor: "var(--surface)",
                                      color: "var(--text-primary)",
                                      boxSizing: "border-box",
                                      cursor: "pointer",
                                    }}
                                  />
                                </div>
                              </td>
                              <td style={{ padding: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                {detail.produkId ? (detail.kodeProduk || "-") : "-"}
                              </td>
                              <td style={{ padding: "8px" }}>
                                {detail.produkId ? (
                                  (() => {
                                    const units = getProductUnits(detail.produkId);
                                    if (units.length > 0) {
                                      return (
                                        <select
                                          value={detail.unitId}
                                          onChange={(e) => handleDetailChange(detail.id, "unitId", e.target.value)}
                                          required
                                          style={{
                                            width: "100%",
                                            padding: "8px",
                                            border: "1px solid var(--border)",
                                            borderRadius: "4px",
                                            fontSize: "13px",
                                            backgroundColor: "var(--surface)",
                                            color: "var(--text-primary)",
                                            boxSizing: "border-box",
                                          }}
                                        >
                                          <option value="">Pilih unit</option>
                                          {units.sort((a, b) => a.urutan - b.urutan).map((u) => (
                                            <option key={u.id} value={u.id}>{u.namaUnit}</option>
                                          ))}
                                        </select>
                                      );
                                    }
                                    return <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>-</span>;
                                  })()
                                ) : (
                                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>-</span>
                                )}
                              </td>
                              <td style={{ padding: "8px", textAlign: "right", fontSize: "13px", color: "var(--text-secondary)" }}>
                                {detail.produkId && formData.apotikAsalId
                                  ? (() => {
                                      const p = products.find((x) => x.id === detail.produkId);
                                      const stok = getStokProduk(p, formData.apotikAsalId);
                                      return stok !== null ? `${stok} pcs` : "-";
                                    })()
                                  : "-"}
                              </td>
                              <td style={{ padding: "8px", textAlign: "right", fontSize: "13px", color: "var(--text-secondary)" }}>
                                {detail.produkId && formData.apotikTujuanId
                                  ? (() => {
                                      const p = products.find((x) => x.id === detail.produkId);
                                      const stok = getStokProduk(p, formData.apotikTujuanId);
                                      return stok !== null ? `${stok} pcs` : "-";
                                    })()
                                  : "-"}
                              </td>
                              <td style={{ padding: "8px", textAlign: "right" }}>
                                <input
                                  type="number"
                                  min={0.01}
                                  step={0.01}
                                  value={detail.qtyRencana}
                                  onChange={(e) =>
                                    handleDetailChange(detail.id, "qtyRencana", parseFloat(e.target.value) || 0)
                                  }
                                  required
                                  style={{
                                    width: "80px",
                                    padding: "8px",
                                    border: "1px solid var(--border)",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                    textAlign: "right",
                                    backgroundColor: "var(--surface)",
                                    color: "var(--text-primary)",
                                    boxSizing: "border-box",
                                  }}
                                />
                              </td>
                              <td style={{ padding: "8px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDetail(detail.id)}
                                  style={{
                                    padding: "4px",
                                    border: "none",
                                    background: "none",
                                    cursor: "pointer",
                                    color: "#dc2626",
                                  }}
                                  title="Hapus baris"
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        border: "1px dashed var(--border)",
                        borderRadius: "6px",
                        color: "var(--text-secondary)",
                        fontSize: "13px",
                      }}
                    >
                      Pilih apotik pengirim lalu klik Tambah Baris.
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  padding: "12px 20px",
                  borderTop: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  backgroundColor: "var(--surface-hover)",
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    backgroundColor: "var(--surface)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Batal
                </button>
                {savedRencanaId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        alert("Fitur ajukan perubahan dapat dihubungkan ke alur persetujuan nanti.");
                        handleCloseModal();
                      }}
                      style={{
                        padding: "8px 16px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        backgroundColor: "var(--surface)",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "500",
                      }}
                    >
                      Ajukan Perubahan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (savedRencanaId) {
                          const rencana = list.find((r) => r.id === savedRencanaId);
                          if (rencana) {
                            const updated = { ...rencana, dikirimKeGudangAt: new Date().toISOString() };
                            const nextList = list.map((r) => (r.id === savedRencanaId ? updated : r));
                            setList(nextList);
                            localStorage.setItem("rencanaTransferBarang", JSON.stringify(nextList));
                            getSupabaseClient().auth.getSession().then(({ data }) => {
                              if (data.session?.access_token) {
                                fetch("/api/data/rencanaTransferBarang", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
                                  body: JSON.stringify({ value: nextList }),
                                }).catch(() => {});
                              }
                            });
                          }
                        }
                        handleCloseModal();
                        router.push("/admin/warehouse/dashboard");
                      }}
                      style={{
                        padding: "8px 16px",
                        border: "none",
                        borderRadius: "6px",
                        backgroundColor: "var(--primary)",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      Kirim
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: "8px 16px",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: "var(--primary)",
                      color: "white",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    {loading ? "Menyimpan..." : "Simpan"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pilih Produk (Detail Barang) */}
      {productModalDetailId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1002,
            padding: "20px",
          }}
          onClick={() => setProductModalDetailId(null)}
        >
          <div
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>Pilih Produk</h3>
              <button
                type="button"
                onClick={() => setProductModalDetailId(null)}
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "var(--text-secondary)", padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
              <input
                type="text"
                value={productModalSearch}
                onChange={(e) => setProductModalSearch(e.target.value)}
                placeholder="Cari produk..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "13px",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: "200px" }}>
              {products
                .filter((p) => {
                  const q = productModalSearch.trim().toLowerCase();
                  if (!q) return true;
                  return p.namaProduk.toLowerCase().includes(q) || p.kodeProduk.toLowerCase().includes(q);
                })
                .map((p) => {
                  const stokPengirim = formData.apotikAsalId ? getStokProduk(p, formData.apotikAsalId) : null;
                  const stokTujuan = formData.apotikTujuanId ? getStokProduk(p, formData.apotikTujuanId) : null;
                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        handleProductSelect(productModalDetailId, p.id);
                        setProductModalDetailId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleProductSelect(productModalDetailId, p.id);
                          setProductModalDetailId(null);
                        }
                      }}
                      style={{
                        padding: "12px 20px",
                        cursor: "pointer",
                        fontSize: "13px",
                        borderBottom: "1px solid var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: "500" }}>{p.namaProduk}</span>
                        <span style={{ color: "var(--text-secondary)", marginLeft: "8px" }}>({p.kodeProduk})</span>
                      </div>
                      {(stokPengirim !== null || stokTujuan !== null) && (
                        <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                          {formData.apotikAsalId && stokPengirim !== null && (
                            <span>Stok Pengirim: {stokPengirim} pcs</span>
                          )}
                          {formData.apotikAsalId && formData.apotikTujuanId && stokPengirim !== null && stokTujuan !== null && " · "}
                          {formData.apotikTujuanId && stokTujuan !== null && (
                            <span>Stok Tujuan: {stokTujuan} pcs</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              {products.filter((p) => {
                const q = productModalSearch.trim().toLowerCase();
                if (!q) return true;
                return p.namaProduk.toLowerCase().includes(q) || p.kodeProduk.toLowerCase().includes(q);
              }).length === 0 && (
                <div style={{ padding: "24px 20px", fontSize: "13px", color: "var(--text-secondary)", textAlign: "center" }}>
                  Tidak ada produk
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Pilih Produk (dari View modal - mode edit) */}
      {viewProductModalDetailId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1002,
            padding: "20px",
          }}
          onClick={() => setViewProductModalDetailId(null)}
        >
          <div
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "8px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>Pilih Produk</h3>
              <button type="button" onClick={() => setViewProductModalDetailId(null)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "var(--text-secondary)", padding: 0, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
              <input
                type="text"
                value={viewProductModalSearch}
                onChange={(e) => setViewProductModalSearch(e.target.value)}
                placeholder="Cari produk..."
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface)", color: "var(--text-primary)", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto", minHeight: "200px" }}>
              {products
                .filter((p) => {
                  const q = viewProductModalSearch.trim().toLowerCase();
                  if (!q) return true;
                  return p.namaProduk.toLowerCase().includes(q) || p.kodeProduk.toLowerCase().includes(q);
                })
                .map((p) => {
                  const stokPengirim = viewEditFormData.apotikAsalId ? getStokProduk(p, viewEditFormData.apotikAsalId) : null;
                  const stokTujuan = viewEditFormData.apotikTujuanId ? getStokProduk(p, viewEditFormData.apotikTujuanId) : null;
                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        handleViewDetailChange(viewProductModalDetailId, "produkId", p.id);
                        setViewProductModalDetailId(null);
                        setViewProductModalSearch("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleViewDetailChange(viewProductModalDetailId, "produkId", p.id);
                          setViewProductModalDetailId(null);
                          setViewProductModalSearch("");
                        }
                      }}
                      style={{ padding: "12px 20px", cursor: "pointer", fontSize: "13px", borderBottom: "1px solid var(--border)", color: "var(--text-primary)" }}
                    >
                      <div>
                        <span style={{ fontWeight: "500" }}>{p.namaProduk}</span>
                        <span style={{ color: "var(--text-secondary)", marginLeft: "8px" }}>({p.kodeProduk})</span>
                      </div>
                      {(stokPengirim !== null || stokTujuan !== null) && (
                        <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                          {viewEditFormData.apotikAsalId && stokPengirim !== null && <span>Stok Pengirim: {stokPengirim} pcs</span>}
                          {viewEditFormData.apotikAsalId && viewEditFormData.apotikTujuanId && stokPengirim !== null && stokTujuan !== null && " · "}
                          {viewEditFormData.apotikTujuanId && stokTujuan !== null && <span>Stok Tujuan: {stokTujuan} pcs</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              {products.filter((p) => {
                const q = viewProductModalSearch.trim().toLowerCase();
                if (!q) return true;
                return p.namaProduk.toLowerCase().includes(q) || p.kodeProduk.toLowerCase().includes(q);
              }).length === 0 && (
                <div style={{ padding: "24px 20px", fontSize: "13px", color: "var(--text-secondary)", textAlign: "center" }}>Tidak ada produk</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Modal - layout sama seperti form, read-only + tombol Ajukan/Kirim */}
      {isViewModalOpen && viewingRencana && (
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
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "var(--surface-hover)",
              }}
            >
              <h3 style={{ fontSize: "17px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                Lihat Rencana Transfer Barang
              </h3>
              <button
                type="button"
                onClick={handleCloseViewModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "16px 20px", flex: 1, minHeight: 0, overflowY: "auto" }}>
              {isViewEditMode ? (
                <>
                  {/* Mode edit: form aktif */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "10px", alignItems: "stretch" }}>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", flex: "0 0 auto" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>No Rencana</label>
                          <div style={{ padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}>
                            {viewingRencana.nomorRencana}
                          </div>
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Tanggal transaksi</label>
                          <input
                            type="date"
                            value={viewEditFormData.tanggal}
                            onChange={(e) => setViewEditFormData((p) => ({ ...p, tanggal: e.target.value }))}
                            style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface)", color: "var(--text-primary)", boxSizing: "border-box" }}
                          />
                        </div>
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Tanggal Rencana Kirim</label>
                        <input
                          type="date"
                          value={viewEditFormData.tanggalRencanaKirim}
                          onChange={(e) => setViewEditFormData((p) => ({ ...p, tanggalRencanaKirim: e.target.value }))}
                          style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface)", color: "var(--text-primary)", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Apotik Pengirim</label>
                        <select
                          value={viewEditFormData.apotikAsalId}
                          onChange={(e) => setViewEditFormData((p) => ({ ...p, apotikAsalId: e.target.value }))}
                          style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface)", color: "var(--text-primary)", boxSizing: "border-box" }}
                        >
                          <option value="">Pilih Apotik Pengirim</option>
                          {apotiks.map((a) => (
                            <option key={a.id} value={a.id}>{a.namaApotik}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Alamat</label>
                        <div style={{ padding: "5px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)", minHeight: "28px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {viewEditFormData.apotikAsalId ? (() => { const a = apotiks.find((x) => x.id === viewEditFormData.apotikAsalId); return a ? [a.alamat, a.kota, a.provinsi].filter(Boolean).join(", ") || "-" : "-"; })() : "-"}
                        </div>
                      </div>
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Apotik Tujuan</label>
                        <select
                          value={viewEditFormData.apotikTujuanId}
                          onChange={(e) => setViewEditFormData((p) => ({ ...p, apotikTujuanId: e.target.value }))}
                          style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface)", color: "var(--text-primary)", boxSizing: "border-box" }}
                        >
                          <option value="">Pilih Apotik Tujuan</option>
                          {apotiks.filter((a) => a.id !== viewEditFormData.apotikAsalId).map((a) => (
                            <option key={a.id} value={a.id}>{a.namaApotik}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Alamat</label>
                        <div style={{ padding: "5px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)", minHeight: "28px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {viewEditFormData.apotikTujuanId ? (() => { const a = apotiks.find((x) => x.id === viewEditFormData.apotikTujuanId); return a ? [a.alamat, a.kota, a.provinsi].filter(Boolean).join(", ") || "-" : "-"; })() : "-"}
                        </div>
                      </div>
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Keterangan</label>
                        <textarea
                          value={viewEditFormData.keterangan}
                          onChange={(e) => setViewEditFormData((p) => ({ ...p, keterangan: e.target.value }))}
                          rows={2}
                          style={{ width: "100%", padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", resize: "vertical", backgroundColor: "var(--surface)", color: "var(--text-primary)", boxSizing: "border-box", minHeight: "48px" }}
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: "8px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Detail Barang</span>
                      <button type="button" onClick={handleViewAddDetail} style={{ padding: "6px 12px", backgroundColor: "var(--primary)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>
                        + Tambah Baris
                      </button>
                    </div>
                    {viewEditDetailBarang.length > 0 ? (
                      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "6px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                          <thead>
                            <tr style={{ backgroundColor: "var(--surface-hover)" }}>
                              <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Produk</th>
                              <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Kode</th>
                              <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Unit</th>
                              <th style={{ padding: "8px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Qty</th>
                              <th style={{ padding: "8px", width: "44px" }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewEditDetailBarang.map((detail) => (
                              <tr key={detail.id} style={{ borderTop: "1px solid var(--border)" }}>
                                <td style={{ padding: "8px" }}>
                                  <div role="button" tabIndex={0} onClick={() => { setViewProductModalSearch(""); setViewProductModalDetailId(detail.id); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setViewProductModalSearch(""); setViewProductModalDetailId(detail.id); } }} style={{ cursor: "pointer" }}>
                                    <input type="text" readOnly value={detail.produkId ? (products.find((p) => p.id === detail.produkId)?.namaProduk || "") : ""} placeholder="Klik untuk pilih produk..." style={{ width: "100%", padding: "8px", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "13px", backgroundColor: "var(--surface)", color: "var(--text-primary)", boxSizing: "border-box", cursor: "pointer" }} />
                                  </div>
                                </td>
                                <td style={{ padding: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>{detail.kodeProduk || "-"}</td>
                                <td style={{ padding: "8px" }}>
                                  {detail.produkId ? (
                                    (() => {
                                      const units = getProductUnits(detail.produkId);
                                      if (units.length > 0)
                                        return (
                                          <select value={detail.unitId} onChange={(e) => handleViewDetailChange(detail.id, "unitId", e.target.value)} style={{ width: "100%", padding: "8px", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "13px", backgroundColor: "var(--surface)", color: "var(--text-primary)", boxSizing: "border-box" }}>
                                            <option value="">Pilih unit</option>
                                            {units.sort((a, b) => a.urutan - b.urutan).map((u) => (
                                              <option key={u.id} value={u.id}>{u.namaUnit}</option>
                                            ))}
                                          </select>
                                        );
                                      return <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>-</span>;
                                    })()
                                  ) : (
                                    <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>-</span>
                                  )}
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <input type="number" min={0.01} step={0.01} value={detail.qtyRencana} onChange={(e) => handleViewDetailChange(detail.id, "qtyRencana", parseFloat(e.target.value) || 0)} style={{ width: "80px", padding: "8px", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "13px", textAlign: "right", backgroundColor: "var(--surface)", color: "var(--text-primary)", boxSizing: "border-box" }} />
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <button type="button" onClick={() => handleViewRemoveDetail(detail.id)} style={{ padding: "4px", border: "none", background: "none", cursor: "pointer", color: "#dc2626" }} title="Hapus baris">
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: "12px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "6px", color: "var(--text-secondary)", fontSize: "13px" }}>Klik Tambah Baris untuk menambah detail.</div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Read-only */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "10px", alignItems: "stretch" }}>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", flex: "0 0 auto" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>No Rencana</label>
                          <div style={{ padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}>{viewingRencana.nomorRencana}</div>
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Tanggal transaksi</label>
                          <div style={{ padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}>{(viewingRencana as any).tanggal || (viewingRencana.createdAt ? viewingRencana.createdAt.slice(0, 10) : "-")}</div>
                        </div>
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Tanggal Rencana Kirim</label>
                        <div style={{ padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}>{viewingRencana.tanggalRencanaKirim}</div>
                      </div>
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Apotik Pengirim</label>
                        <div style={{ padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}>{getApotikName(viewingRencana.apotikAsalId)}</div>
                      </div>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Alamat</label>
                        <div style={{ padding: "5px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)", minHeight: "28px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{(() => { const a = apotiks.find((x) => x.id === viewingRencana.apotikAsalId); return a ? [a.alamat, a.kota, a.provinsi].filter(Boolean).join(", ") || "-" : "-"; })()}</div>
                      </div>
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Apotik Tujuan</label>
                        <div style={{ padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}>{getApotikName(viewingRencana.apotikTujuanId)}</div>
                      </div>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Alamat</label>
                        <div style={{ padding: "5px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)", minHeight: "28px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{(() => { const a = apotiks.find((x) => x.id === viewingRencana.apotikTujuanId); return a ? [a.alamat, a.kota, a.provinsi].filter(Boolean).join(", ") || "-" : "-"; })()}</div>
                      </div>
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", backgroundColor: "var(--surface)", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <label style={{ display: "block", marginBottom: "2px", fontSize: "12px", fontWeight: "500", color: "var(--text-secondary)" }}>Keterangan</label>
                        <div style={{ padding: "6px 8px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "13px", backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)", minHeight: "48px", whiteSpace: "pre-wrap" }}>{viewingRencana.keterangan || "-"}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: "8px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Detail Barang</span>
                  </div>
                  {viewingRencana.detailBarang.length > 0 ? (
                    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "6px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "var(--surface-hover)" }}>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Produk</th>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Kode</th>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Unit</th>
                            <th style={{ padding: "8px", textAlign: "right", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingRencana.detailBarang.map((d) => (
                            <tr key={d.id} style={{ borderTop: "1px solid var(--border)" }}>
                              <td style={{ padding: "8px", fontSize: "13px", color: "var(--text-primary)" }}>{d.namaProduk}</td>
                              <td style={{ padding: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>{d.kodeProduk || "-"}</td>
                              <td style={{ padding: "8px", fontSize: "13px", color: "var(--text-primary)" }}>{d.namaUnit}</td>
                              <td style={{ padding: "8px", fontSize: "13px", textAlign: "right", color: "var(--text-primary)" }}>{d.qtyRencana}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: "12px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "6px", color: "var(--text-secondary)", fontSize: "13px" }}>Tidak ada detail barang.</div>
                  )}
                </>
              )}
              <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--text-secondary)" }}>
                Status: {viewingRencana.status} · Dibuat oleh {viewingRencana.createdBy} · {new Date(viewingRencana.createdAt).toLocaleString("id-ID")}
              </div>
            </div>

            {/* Footer: Ajukan (jika Menunggu Disiapkan) dan Kirim (jika belum dikirim) */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                backgroundColor: "var(--surface-hover)",
              }}
            >
              <button
                type="button"
                onClick={handleCloseViewModal}
                style={{
                  padding: "8px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Tutup
              </button>
              {viewingRencana.status === "Menunggu Disiapkan" && (
                (() => {
                  const hasPengajuan = !!viewingRencana.pengajuanSubmittedAt;
                  const disetujui = !!viewingRencana.pengajuanDisetujuiAt;
                  const typeEdit = viewingRencana.pengajuanType === "Edit transaksi";
                  const typeHapus = viewingRencana.pengajuanType === "Hapus transaksi";
                  if (!hasPengajuan) {
                    return (
                      <button
                        type="button"
                        onClick={handleOpenAjukanModal}
                        style={{
                          padding: "8px 16px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "500",
                        }}
                      >
                        Ajukan
                      </button>
                    );
                  }
                  if (hasPengajuan && !disetujui) {
                    return (
                      <button
                        type="button"
                        onClick={handleRefreshViewRencana}
                        style={{
                          padding: "8px 16px",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "500",
                        }}
                      >
                        Refresh
                      </button>
                    );
                  }
                  if (disetujui && typeEdit) {
                    return (
                      <>
                        <button
                          type="button"
                          onClick={handleBatalAjukan}
                          style={{
                            padding: "8px 16px",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            backgroundColor: "var(--surface)",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                          }}
                        >
                          Batal ajukan
                        </button>
                        <button
                          type="button"
                          onClick={handleSimpanSetujui}
                          style={{
                            padding: "8px 16px",
                            border: "none",
                            borderRadius: "6px",
                            backgroundColor: "var(--primary)",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          Simpan
                        </button>
                      </>
                    );
                  }
                  if (disetujui && typeHapus) {
                    return (
                      <>
                        <button
                          type="button"
                          onClick={handleBatalAjukan}
                          style={{
                            padding: "8px 16px",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            backgroundColor: "var(--surface)",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                          }}
                        >
                          Batal ajukan
                        </button>
                        <button
                          type="button"
                          onClick={handleHapusSetujui}
                          style={{
                            padding: "8px 16px",
                            border: "none",
                            borderRadius: "6px",
                            backgroundColor: "#dc2626",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          Hapus
                        </button>
                      </>
                    );
                  }
                  return (
                    <button
                      type="button"
                      onClick={handleRefreshViewRencana}
                      style={{
                        padding: "8px 16px",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        backgroundColor: "var(--surface)",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "500",
                      }}
                    >
                      Refresh
                    </button>
                  );
                })()
              )}
              {!viewingRencana.dikirimKeGudangAt &&
                !(viewingRencana.pengajuanSubmittedAt && !viewingRencana.pengajuanDisetujuiAt) && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...viewingRencana, dikirimKeGudangAt: new Date().toISOString() };
                    const nextList = list.map((r) => (r.id === viewingRencana.id ? updated : r));
                    setList(nextList);
                    localStorage.setItem("rencanaTransferBarang", JSON.stringify(nextList));
                    getSupabaseClient().auth.getSession().then(({ data }) => {
                      if (data.session?.access_token) {
                        fetch("/api/data/rencanaTransferBarang", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
                          body: JSON.stringify({ value: nextList }),
                        }).catch(() => {});
                      }
                    });
                    handleCloseViewModal();
                    router.push("/admin/warehouse/dashboard");
                  }}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "var(--primary)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Kirim
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Ajukan - type pengajuan + keterangan */}
      {isAjukanModalOpen && viewingRencana && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1001,
            padding: "20px",
          }}
          onClick={(e) => e.target === e.currentTarget && setIsAjukanModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "8px",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface-hover)" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>Form Pengajuan</h3>
            </div>
            <div style={{ padding: "20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>
                  Type pengajuan <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={ajukanFormData.typePengajuan}
                  onChange={(e) => setAjukanFormData((p) => ({ ...p, typePengajuan: e.target.value }))}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "14px",
                    backgroundColor: "var(--surface)",
                    color: "var(--text-primary)",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Pilih type pengajuan</option>
                  <option value="Edit transaksi">Edit transaksi</option>
                  <option value="Hapus transaksi">Hapus transaksi</option>
                </select>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>
                  Keterangan
                </label>
                <textarea
                  value={ajukanFormData.keterangan}
                  onChange={(e) => setAjukanFormData((p) => ({ ...p, keterangan: e.target.value }))}
                  rows={3}
                  placeholder="Opsional"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    resize: "vertical",
                    backgroundColor: "var(--surface)",
                    color: "var(--text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "10px", backgroundColor: "var(--surface-hover)" }}>
              <button
                type="button"
                onClick={() => setIsAjukanModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitAjukan}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: "var(--primary)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
