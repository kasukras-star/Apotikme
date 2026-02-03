"use client";

import { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface Product {
  id: string;
  kodeProduk: string;
  namaProduk: string;
  kategori: string;
  satuan: string;
  hargaBeli: number;
  hargaJual: number;
  stokAwal: number;
  stokPerApotik?: { [apotikId: string]: number };
}

interface Apotik {
  id: string;
  kodeApotik: string;
  namaApotik: string;
  alamat?: string;
  kota?: string;
  provinsi?: string;
  telepon?: string;
  email?: string;
  picApotik?: string;
  statusAktif?: boolean;
}

interface DetailPenyesuaian {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  satuan: string;
  jumlahPenyesuaian: number;
}

interface RiwayatPenyesuaian {
  id: string;
  noBuktiPenyesuaian?: string;
  tanggal: string;
  updatedAt?: string;
  apotikId: string;
  apotikNama: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  stokSebelum: number;
  jumlahPenyesuaian: number;
  stokSesudah: number;
  keterangan: string;
  operator: string;
}

function getStokProduk(product: Product, apotikId: string): number {
  if (product.stokPerApotik && apotikId && product.stokPerApotik[apotikId] !== undefined) {
    return product.stokPerApotik[apotikId];
  }
  return product.stokAwal ?? 0;
}

function isoToDateInput(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

export default function PenyesuaianStokPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [selectedApotikId, setSelectedApotikId] = useState<string>("");
  const [tanggalPenyesuaian, setTanggalPenyesuaian] = useState<string>("");
  const [detailPenyesuaian, setDetailPenyesuaian] = useState<DetailPenyesuaian[]>([]);
  const [keterangan, setKeterangan] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalDetailId, setProductModalDetailId] = useState<string | null>(null);
  const [productModalPage, setProductModalPage] = useState(1);
  const PRODUCTS_PER_PAGE = 15;

  const getTodayDateInput = (): string => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [riwayatList, setRiwayatList] = useState<RiwayatPenyesuaian[]>([]);
  const [viewingRiwayat, setViewingRiwayat] = useState<RiwayatPenyesuaian | null>(null);
  const [viewingGroup, setViewingGroup] = useState<RiwayatPenyesuaian[] | null>(null);
  const [pengajuanScope, setPengajuanScope] = useState<"single" | "group">("single");
  const [editFormData, setEditFormData] = useState<{ tanggal: string; jumlahPenyesuaian: number; keterangan: string }>({ tanggal: "", jumlahPenyesuaian: 0, keterangan: "" });
  const [pengajuanData, setPengajuanData] = useState<{ jenisPengajuan: string; alasanPengajuan: string }>({ jenisPengajuan: "", alasanPengajuan: "" });
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [isPengajuanModalOpen, setIsPengajuanModalOpen] = useState(false);
  const [pendingGroupJumlah, setPendingGroupJumlah] = useState<Record<string, number>>({});
  const [removedGroupRiwayatIds, setRemovedGroupRiwayatIds] = useState<Set<string>>(new Set());
  const [isLoadingData, setIsLoadingData] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    function loadFromLocalStorage() {
      const sp = localStorage.getItem("products"); if (sp) try { setProducts(JSON.parse(sp)); } catch (_) {}
      const sa = localStorage.getItem("apotiks"); if (sa) try { setApotiks((JSON.parse(sa) as Apotik[]).filter((a: Apotik) => a.statusAktif !== false)); } catch (_) {}
      const sr = localStorage.getItem("penyesuaianStok"); if (sr) try { setRiwayatList(JSON.parse(sr)); } catch (_) {}
      const spg = localStorage.getItem("pengajuanPenyesuaianStok"); if (spg) try { setPengajuanList(JSON.parse(spg)); } catch (_) {}
    }
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token || cancelled) { loadFromLocalStorage(); return; }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/products", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/apotiks", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/penyesuaianStok", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/pengajuanPenyesuaianStok", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      ]).then(([productsData, apotiksData, riwayatData, pengajuanData]) => {
        if (cancelled) return;
        if (Array.isArray(productsData) && productsData.length > 0) { setProducts(productsData); localStorage.setItem("products", JSON.stringify(productsData)); }
        else { const sp = localStorage.getItem("products"); if (sp) try { setProducts(JSON.parse(sp)); } catch (_) {} }
        if (Array.isArray(apotiksData) && apotiksData.length > 0) { setApotiks(apotiksData.filter((a: Apotik) => a.statusAktif !== false)); localStorage.setItem("apotiks", JSON.stringify(apotiksData)); }
        else { const sa = localStorage.getItem("apotiks"); if (sa) try { setApotiks((JSON.parse(sa) as Apotik[]).filter((a: Apotik) => a.statusAktif !== false)); } catch (_) {} }
        if (Array.isArray(riwayatData) && riwayatData.length > 0) { setRiwayatList(riwayatData); localStorage.setItem("penyesuaianStok", JSON.stringify(riwayatData)); }
        else { const sr = localStorage.getItem("penyesuaianStok"); if (sr) try { setRiwayatList(JSON.parse(sr)); } catch (_) {} }
        if (Array.isArray(pengajuanData) && pengajuanData.length > 0) { setPengajuanList(pengajuanData); localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(pengajuanData)); }
        else { const spg = localStorage.getItem("pengajuanPenyesuaianStok"); if (spg) try { setPengajuanList(JSON.parse(spg)); } catch (_) {} }
        if (!cancelled) setIsLoadingData(false);
      }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    }).catch(() => { if (!cancelled) { loadFromLocalStorage(); setIsLoadingData(false); } });
    return () => { cancelled = true; };
  }, []);

  // Sync penyesuaianStok and pengajuanPenyesuaianStok to API (guard: jangan POST saat initial load)
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/penyesuaianStok", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: riwayatList }) }).catch(() => {});
      }
    });
  }, [riwayatList, isLoadingData]);
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/pengajuanPenyesuaianStok", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ value: pengajuanList }) }).catch(() => {});
      }
    });
  }, [pengajuanList, isLoadingData]);

  const handleOpenModal = () => {
    setSelectedApotikId("");
    setTanggalPenyesuaian(getTodayDateInput());
    setDetailPenyesuaian([]);
    setKeterangan("");
    setShowProductModal(false);
    setProductModalDetailId(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAddDetail = () => {
    const newDetail: DetailPenyesuaian = {
      id: Date.now().toString(),
      produkId: "",
      kodeProduk: "",
      namaProduk: "",
      satuan: "",
      jumlahPenyesuaian: 0,
    };
    setDetailPenyesuaian((prev) => [newDetail, ...prev]);
  };

  const handleRemoveDetail = (id: string) => {
    setDetailPenyesuaian((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDetailChange = (
    id: string,
    field: keyof DetailPenyesuaian,
    value: string | number
  ) => {
    setDetailPenyesuaian((prev) =>
      prev.map((detail) => {
        if (detail.id !== id) return detail;
        const updated = { ...detail, [field]: value };
        if (field === "produkId" && typeof value === "string") {
          const product = products.find((p) => p.id === value);
          if (product) {
            updated.kodeProduk = product.kodeProduk;
            updated.namaProduk = product.namaProduk;
            updated.satuan = product.satuan || "";
          }
        }
        return updated;
      })
    );
  };

  const handleSubmit = () => {
    if (!selectedApotikId) {
      alert("Pilih apotik terlebih dahulu.");
      return;
    }
    const validDetails = detailPenyesuaian.filter(
      (d) => d.produkId && d.jumlahPenyesuaian !== 0
    );
    if (validDetails.length === 0) {
      alert("Minimal satu item dengan produk terpilih dan jumlah penyesuaian tidak boleh 0.");
      return;
    }
    const produkIds = validDetails.map((d) => d.produkId);
    const uniqueIds = new Set(produkIds);
    if (uniqueIds.size !== produkIds.length) {
      alert("Satu produk hanya boleh muncul sekali dalam penyesuaian.");
      return;
    }

    const apotik = apotiks.find((a) => a.id === selectedApotikId);
    const apotikNama = apotik?.namaApotik ?? selectedApotikId;
    const entries: { detail: DetailPenyesuaian; product: Product; stokSebelum: number; stokSesudah: number }[] = [];
    for (const detail of validDetails) {
      const product = products.find((p) => p.id === detail.produkId);
      if (!product) continue;
      const stokSebelum = getStokProduk(product, selectedApotikId);
      const stokSesudah = stokSebelum + detail.jumlahPenyesuaian;
      if (stokSesudah < 0) {
        const ok = confirm(
          `Stok "${product.namaProduk}" setelah penyesuaian akan menjadi ${stokSesudah}. Lanjutkan?`
        );
        if (!ok) return;
      }
      entries.push({ detail, product, stokSebelum, stokSesudah });
    }

    setLoading(true);
    try {
      const savedRiwayat = localStorage.getItem("penyesuaianStok");
      const existing: RiwayatPenyesuaian[] = savedRiwayat ? JSON.parse(savedRiwayat) : [];
      const yearMonth = tanggalPenyesuaian.slice(0, 7).replace("-", "");
      const prefix = `ADJ-${yearMonth}-`;
      const existingNumbers = existing
        .filter((r) => r.noBuktiPenyesuaian?.startsWith(prefix))
        .map((r) => parseInt(r.noBuktiPenyesuaian!.replace(prefix, ""), 10) || 0);
      const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const noBuktiPenyesuaian = `${prefix}${String(nextNum).padStart(4, "0")}`;

      const d = new Date();
      const [y, m, day] = tanggalPenyesuaian.split("-").map(Number);
      d.setFullYear(y, m - 1, day);
      const tanggalIso = d.toISOString();

      let productsUpdated = [...products];
      const riwayatArr: RiwayatPenyesuaian[] = [];

      for (const { detail, product, stokSebelum, stokSesudah } of entries) {
        productsUpdated = productsUpdated.map((p) => {
          if (p.id !== product.id) return p;
          const next: Product = { ...p };
          if (next.stokPerApotik && selectedApotikId) {
            next.stokPerApotik = { ...next.stokPerApotik, [selectedApotikId]: stokSesudah };
          } else {
            next.stokAwal = stokSesudah;
            if (!next.stokPerApotik) next.stokPerApotik = {};
            next.stokPerApotik[selectedApotikId] = stokSesudah;
          }
          return next;
        });
        riwayatArr.push({
          id: `${Date.now()}-${detail.id}`,
          noBuktiPenyesuaian,
          tanggal: tanggalIso,
          updatedAt: tanggalIso,
          apotikId: selectedApotikId,
          apotikNama,
          produkId: detail.produkId,
          kodeProduk: detail.kodeProduk,
          namaProduk: detail.namaProduk,
          stokSebelum,
          jumlahPenyesuaian: detail.jumlahPenyesuaian,
          stokSesudah,
          keterangan: keterangan.trim(),
          operator: currentUserEmail || "System",
        });
      }

      localStorage.setItem("products", JSON.stringify(productsUpdated));
      setProducts(productsUpdated);

      const updatedRiwayat = [...riwayatArr, ...existing];
      localStorage.setItem("penyesuaianStok", JSON.stringify(updatedRiwayat));
      setRiwayatList(updatedRiwayat);

      alert(`Penyesuaian stok berhasil disimpan.\nNo Bukti: ${noBuktiPenyesuaian}`);
      handleCloseModal();
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan penyesuaian stok.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTanggal = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // Group riwayat by No Bukti (one row per No Bukti in main table)
  const riwayatByNoBukti = (() => {
    const map = new Map<string, RiwayatPenyesuaian[]>();
    for (const r of riwayatList) {
      const key = r.noBuktiPenyesuaian || r.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([noBukti, items]) => {
      const first = items[0];
      const lastUpdate = items.reduce((acc, it) => {
        const t = it.updatedAt || it.tanggal;
        return !acc || (t && t > acc) ? t : acc;
      }, "");
      return { noBukti, items, first, lastUpdate };
    }).sort((a, b) => (b.lastUpdate || "").localeCompare(a.lastUpdate || ""));
  })();

  const handleClosePengajuanModal = () => {
    setIsPengajuanModalOpen(false);
    setPengajuanData({ jenisPengajuan: "", alasanPengajuan: "" });
    setPengajuanScope("single");
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
    if (pengajuanScope === "group" && viewingGroup && viewingGroup.length > 0) {
      const first = viewingGroup[0];
      const newPengajuan = {
        id: Date.now().toString(),
        isGlobal: true,
        noBuktiPenyesuaian: first.noBuktiPenyesuaian,
        jenisPengajuan: pengajuanData.jenisPengajuan,
        alasanPengajuan: pengajuanData.alasanPengajuan,
        status: "Menunggu Persetujuan",
        createdAt: new Date().toISOString(),
        disetujuiPada: undefined,
        ditolakPada: undefined,
        alasanTolak: undefined,
        formData: {
          tanggal: first.tanggal,
          keterangan: first.keterangan || "",
          details: viewingGroup.map((r) => ({ id: r.id, jumlahPenyesuaian: r.jumlahPenyesuaian })),
        },
        riwayatData: viewingGroup,
        menuSystem: "Merchandise",
        isNew: true,
      };
      const updatedPengajuanList = [...pengajuanList, newPengajuan];
      localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPengajuanList));
      setPengajuanList(updatedPengajuanList);
      handleClosePengajuanModal();
      alert("Pengajuan perubahan (seluruh produk) berhasil dikirim! Tombol akan berubah menjadi Refresh.");
      return;
    }
    if (!viewingRiwayat) return;
    const newPengajuan = {
      id: Date.now().toString(),
      penyesuaianStokId: viewingRiwayat.id,
      noBuktiPenyesuaian: viewingRiwayat.noBuktiPenyesuaian,
      jenisPengajuan: pengajuanData.jenisPengajuan,
      alasanPengajuan: pengajuanData.alasanPengajuan,
      status: "Menunggu Persetujuan",
      createdAt: new Date().toISOString(),
      disetujuiPada: undefined,
      ditolakPada: undefined,
      alasanTolak: undefined,
      formData: editFormData,
      riwayatData: viewingRiwayat,
      menuSystem: "Merchandise",
      isNew: true,
    };
    const updatedPengajuanList = [...pengajuanList, newPengajuan];
    localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);
    handleClosePengajuanModal();
    alert("Pengajuan perubahan berhasil dikirim!");
  };

  const currentPengajuan = viewingRiwayat
    ? pengajuanList.find((p: any) => p.penyesuaianStokId === viewingRiwayat.id)
    : null;
  const pengajuanStatus = currentPengajuan?.status;

  const currentPengajuanGroup = viewingGroup?.length
    ? pengajuanList.find((p: any) => p.isGlobal && p.noBuktiPenyesuaian === viewingGroup[0].noBuktiPenyesuaian)
    : null;
  const pengajuanGroupStatus = currentPengajuanGroup?.status;

  const handleBatalAjukan = () => {
    if (!currentPengajuan || !viewingRiwayat) return;
    if (!confirm("Apakah Anda yakin ingin membatalkan pengajuan ini?")) return;
    const updatedPengajuanList = pengajuanList.filter((p: any) => p.id !== currentPengajuan.id);
    localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);
  };

  const handleRefreshGroup = () => {
    const savedPengajuan = localStorage.getItem("pengajuanPenyesuaianStok");
    if (savedPengajuan) {
      try {
        const updatedList = JSON.parse(savedPengajuan);
        setPengajuanList(updatedList);
      } catch (err) {
        console.error("Error refreshing pengajuan:", err);
      }
    }
  };

  const handleBatalPengajuanGroup = () => {
    if (!currentPengajuanGroup || !viewingGroup?.length) return;
    if (!confirm("Apakah Anda yakin ingin membatalkan pengajuan ini?")) return;
    const updatedPengajuanList = pengajuanList.filter((p: any) => p.id !== currentPengajuanGroup.id);
    localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);
  };

  const handleSimpanSetujuiGroup = () => {
    if (!viewingGroup?.length || !currentPengajuanGroup || currentPengajuanGroup.jenisPengajuan !== "Edit Data" || !currentPengajuanGroup.formData) return;
    const formData = currentPengajuanGroup.formData as { tanggal?: string; keterangan?: string; details?: { id: string; jumlahPenyesuaian: number }[] };
    const newTanggal = formData.tanggal || viewingGroup[0].tanggal;
    const newKeterangan = formData.keterangan ?? "";
    let updatedRiwayatList = [...riwayatList];
    let productsUpdated = [...products];
    const idsToRemove = new Set(removedGroupRiwayatIds);
    for (const r of viewingGroup) {
      if (idsToRemove.has(r.id)) {
        const product = productsUpdated.find((p) => p.id === r.produkId);
        if (product && r.apotikId) {
          const currentStok = getStokProduk(product, r.apotikId);
          const revertStok = currentStok - r.jumlahPenyesuaian;
          productsUpdated = productsUpdated.map((p) => {
            if (p.id !== product.id) return p;
            const next = { ...p };
            next.stokPerApotik = { ...(next.stokPerApotik || {}), [r.apotikId]: revertStok };
            return next;
          });
        }
        updatedRiwayatList = updatedRiwayatList.filter((item) => item.id !== r.id);
        continue;
      }
      const newJumlah = pendingGroupJumlah[r.id] ?? r.jumlahPenyesuaian;
      const stokSesudah = r.stokSebelum + newJumlah;
      const updated = { ...r, tanggal: newTanggal, keterangan: newKeterangan, jumlahPenyesuaian: newJumlah, stokSesudah, updatedAt: new Date().toISOString() };
      updatedRiwayatList = updatedRiwayatList.map((item) => (item.id === r.id ? updated : item));
      const product = productsUpdated.find((p) => p.id === r.produkId);
      if (product && r.apotikId) {
        const currentStok = getStokProduk(product, r.apotikId);
        const delta = newJumlah - r.jumlahPenyesuaian;
        const newStok = currentStok + delta;
        productsUpdated = productsUpdated.map((p) => {
          if (p.id !== product.id) return p;
          const next = { ...p };
          next.stokPerApotik = { ...(next.stokPerApotik || {}), [r.apotikId]: newStok };
          return next;
        });
      }
    }
    localStorage.setItem("penyesuaianStok", JSON.stringify(updatedRiwayatList));
    localStorage.setItem("products", JSON.stringify(productsUpdated));
    setRiwayatList(updatedRiwayatList);
    setProducts(productsUpdated);
    const updatedPengajuanList = pengajuanList.filter((p: any) => p.id !== currentPengajuanGroup.id);
    localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);
    setPendingGroupJumlah({});
    setRemovedGroupRiwayatIds(new Set());
    setViewingGroup(updatedRiwayatList.filter((r) => (r.noBuktiPenyesuaian || "") === (viewingGroup[0].noBuktiPenyesuaian || "")));
    alert("Data penyesuaian stok berhasil disimpan.");
  };

  const handleHapusSetujuiGroup = () => {
    if (!viewingGroup?.length || !currentPengajuanGroup || currentPengajuanGroup.jenisPengajuan !== "Hapus Data") return;
    if (!confirm("Apakah Anda yakin ingin menghapus seluruh data penyesuaian No Bukti ini? Stok produk akan dikembalikan.")) return;
    let productsUpdated = [...products];
    for (const r of viewingGroup) {
      const product = productsUpdated.find((p) => p.id === r.produkId);
      if (product && r.apotikId) {
        const currentStok = getStokProduk(product, r.apotikId);
        const revertStok = currentStok - r.jumlahPenyesuaian;
        productsUpdated = productsUpdated.map((p) => {
          if (p.id !== product.id) return p;
          const next = { ...p };
          next.stokPerApotik = { ...(next.stokPerApotik || {}), [r.apotikId]: revertStok };
          return next;
        });
      }
    }
    const idsToRemove = new Set(viewingGroup.map((r) => r.id));
    const updatedRiwayatList = riwayatList.filter((r) => !idsToRemove.has(r.id));
    localStorage.setItem("penyesuaianStok", JSON.stringify(updatedRiwayatList));
    localStorage.setItem("products", JSON.stringify(productsUpdated));
    setRiwayatList(updatedRiwayatList);
    setProducts(productsUpdated);
    const updatedPengajuanList = pengajuanList.filter((p: any) => p.id !== currentPengajuanGroup.id);
    localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);
    setViewingGroup(null);
    alert("Data penyesuaian stok berhasil dihapus.");
  };

  const handleRefresh = () => {
    const savedPengajuan = localStorage.getItem("pengajuanPenyesuaianStok");
    if (savedPengajuan) {
      try {
        const updatedList = JSON.parse(savedPengajuan);
        setPengajuanList(updatedList);
        const p = updatedList.find((x: any) => x.penyesuaianStokId === viewingRiwayat?.id);
        if (p?.status === "Ditolak") {
          alert("Pengajuan telah ditolak. Anda dapat mengubah data dan mengajukan kembali.");
        }
        if (p?.status === "Disetujui" && p?.formData) {
          setEditFormData(p.formData);
        }
      } catch (err) {
        console.error("Error refreshing pengajuan:", err);
      }
    }
  };

  useEffect(() => {
    if (!viewingRiwayat || currentPengajuan?.status !== "Menunggu Persetujuan") return;
    const interval = setInterval(() => {
      const saved = localStorage.getItem("pengajuanPenyesuaianStok");
      if (!saved) return;
      try {
        const list = JSON.parse(saved);
        const p = list.find((x: any) => x.penyesuaianStokId === viewingRiwayat.id);
        if (p?.status !== "Menunggu Persetujuan") {
          setPengajuanList(list);
          if (p?.status === "Disetujui" && p?.formData) setEditFormData(p.formData);
          if (p?.status === "Ditolak") alert("Pengajuan telah ditolak.");
        }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [viewingRiwayat?.id, currentPengajuan?.status]);

  useEffect(() => {
    if (!viewingGroup?.length) {
      setPendingGroupJumlah({});
      setRemovedGroupRiwayatIds(new Set());
      return;
    }
    if (currentPengajuanGroup?.status === "Disetujui" && currentPengajuanGroup?.jenisPengajuan === "Edit Data" && currentPengajuanGroup?.formData) {
      const formData = currentPengajuanGroup.formData as { details?: { id: string; jumlahPenyesuaian: number }[] };
      const map: Record<string, number> = {};
      if (formData?.details) formData.details.forEach((d: any) => { map[d.id] = d.jumlahPenyesuaian; });
      viewingGroup.forEach((r) => { if (map[r.id] === undefined) map[r.id] = r.jumlahPenyesuaian; });
      setPendingGroupJumlah(map);
      setRemovedGroupRiwayatIds(new Set());
    }
  }, [viewingGroup?.length, currentPengajuanGroup?.status, currentPengajuanGroup?.jenisPengajuan, currentPengajuanGroup?.id]);

  useEffect(() => {
    if (!viewingGroup?.length || currentPengajuanGroup?.status !== "Menunggu Persetujuan") return;
    const noBukti = viewingGroup[0].noBuktiPenyesuaian;
    const interval = setInterval(() => {
      const saved = localStorage.getItem("pengajuanPenyesuaianStok");
      if (!saved) return;
      try {
        const list = JSON.parse(saved);
        const p = list.find((x: any) => x.isGlobal && x.noBuktiPenyesuaian === noBukti);
        if (p?.status !== "Menunggu Persetujuan") {
          setPengajuanList(list);
          if (p?.status === "Ditolak") alert("Pengajuan telah ditolak.");
        }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [viewingGroup?.[0]?.noBuktiPenyesuaian, currentPengajuanGroup?.status]);

  const handleSimpanSetujui = () => {
    if (!viewingRiwayat || !currentPengajuan || currentPengajuan.jenisPengajuan !== "Edit Data" || !currentPengajuan.formData) return;
    const fd = currentPengajuan.formData as { tanggal: string; jumlahPenyesuaian: number; keterangan: string };
    const newTanggalIso = fd.tanggal ? new Date(fd.tanggal).toISOString() : viewingRiwayat.tanggal;
    const deltaQty = fd.jumlahPenyesuaian - viewingRiwayat.jumlahPenyesuaian;
    const product = products.find((p) => p.id === viewingRiwayat.produkId);
    if (product && deltaQty !== 0) {
      const apotikId = viewingRiwayat.apotikId;
      const currentStok = getStokProduk(product, apotikId);
      const newStok = currentStok + deltaQty;
      const productsUpdated = products.map((p) => {
        if (p.id !== product.id) return p;
        const next = { ...p };
        if (next.stokPerApotik && apotikId) {
          next.stokPerApotik = { ...next.stokPerApotik, [apotikId]: newStok };
        } else {
          next.stokAwal = newStok;
          next.stokPerApotik = { ...(next.stokPerApotik || {}), [apotikId]: newStok };
        }
        return next;
      });
      localStorage.setItem("products", JSON.stringify(productsUpdated));
      setProducts(productsUpdated);
    }
    const updatedRiwayat: RiwayatPenyesuaian = {
      ...viewingRiwayat,
      tanggal: newTanggalIso,
      jumlahPenyesuaian: fd.jumlahPenyesuaian,
      stokSesudah: viewingRiwayat.stokSebelum + fd.jumlahPenyesuaian,
      keterangan: fd.keterangan || "",
      updatedAt: new Date().toISOString(),
    };
    const updatedRiwayatList = riwayatList.map((r) => (r.id === viewingRiwayat.id ? updatedRiwayat : r));
    localStorage.setItem("penyesuaianStok", JSON.stringify(updatedRiwayatList));
    setRiwayatList(updatedRiwayatList);
    const updatedPengajuanList = pengajuanList.filter((p: any) => p.id !== currentPengajuan.id);
    localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);
    setViewingRiwayat(updatedRiwayat);
    setEditFormData({ tanggal: fd.tanggal, jumlahPenyesuaian: fd.jumlahPenyesuaian, keterangan: fd.keterangan || "" });
    alert("Data penyesuaian stok berhasil disimpan.");
  };

  const handleHapusSetujui = () => {
    if (!viewingRiwayat || !currentPengajuan || currentPengajuan.jenisPengajuan !== "Hapus Data") return;
    if (!confirm("Apakah Anda yakin ingin menghapus data penyesuaian ini?")) return;
    const product = products.find((p) => p.id === viewingRiwayat.produkId);
    if (product) {
      const apotikId = viewingRiwayat.apotikId;
      const currentStok = getStokProduk(product, apotikId);
      const revertStok = currentStok - viewingRiwayat.jumlahPenyesuaian;
      const productsUpdated = products.map((p) => {
        if (p.id !== product.id) return p;
        const next = { ...p };
        if (next.stokPerApotik && apotikId) {
          next.stokPerApotik = { ...next.stokPerApotik, [apotikId]: revertStok };
        } else {
          next.stokAwal = revertStok;
          next.stokPerApotik = { ...(next.stokPerApotik || {}), [apotikId]: revertStok };
        }
        return next;
      });
      localStorage.setItem("products", JSON.stringify(productsUpdated));
      setProducts(productsUpdated);
    }
    const updatedRiwayatList = riwayatList.filter((r) => r.id !== viewingRiwayat.id);
    localStorage.setItem("penyesuaianStok", JSON.stringify(updatedRiwayatList));
    setRiwayatList(updatedRiwayatList);
    const updatedPengajuanList = pengajuanList.filter((p: any) => p.id !== currentPengajuan.id);
    localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);
    setViewingRiwayat(null);
    alert("Data penyesuaian stok berhasil dihapus.");
  };

  return (
    <DashboardLayout>
      <div style={{ padding: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            onClick={handleOpenModal}
            style={{
              padding: "10px 20px",
              backgroundColor: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Tambah Penyesuaian stok
          </button>
        </div>

        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px", color: "var(--text-primary)" }}>
            Riwayat Penyesuaian stok
          </h2>
          {riwayatByNoBukti.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Belum ada riwayat penyesuaian.</p>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "var(--hover-bg)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>No Bukti</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Tanggal</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Apotik</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Keterangan</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Operator</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, width: "56px" }}>Aksi</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayatByNoBukti.map(({ noBukti, items, first, lastUpdate }) => (
                    <tr key={noBukti} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px" }}>{first.noBuktiPenyesuaian || "-"}</td>
                      <td style={{ padding: "10px 12px" }}>{formatTanggal(first.tanggal)}</td>
                      <td style={{ padding: "10px 12px" }}>{first.apotikNama}</td>
                      <td style={{ padding: "10px 12px" }}>{first.keterangan || "-"}</td>
                      <td style={{ padding: "10px 12px" }}>{first.operator}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", verticalAlign: "middle" }}>
                        <button
                          type="button"
                          onClick={() => setViewingGroup(items)}
                          title="Lihat detail seluruh produk"
                          style={{
                            padding: "6px",
                            backgroundColor: "transparent",
                            color: "var(--primary)",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#eff6ff";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{formatTanggal(lastUpdate || first.tanggal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: View all products for one No Bukti (consolidated view) */}
        {viewingGroup && viewingGroup.length > 0 && (
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
                padding: "24px",
                width: "95%",
                maxWidth: "1200px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>Detail Penyesuaian Stok</h2>
                <button
                  type="button"
                  onClick={() => setViewingGroup(null)}
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
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
                {/* Layout seperti form input: 2 side + outline group */}
                <div style={{ display: "flex", gap: "16px", alignItems: "stretch", flexWrap: "wrap" }}>
                  {/* Side kiri - outline group */}
                  <div
                    style={{
                      flex: "1",
                      minWidth: "280px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "var(--hover-bg)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>No. Penyesuaian</label>
                      <div style={{ flex: 1, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f9fafb", color: "var(--text-primary)", boxSizing: "border-box" }}>
                        {viewingGroup[0].noBuktiPenyesuaian || "-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Tanggal</label>
                      <div style={{ flex: 1, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f9fafb", color: "var(--text-primary)", boxSizing: "border-box" }}>
                        {formatTanggal(viewingGroup[0].tanggal)}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Apotik</label>
                      <div style={{ flex: 1, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f9fafb", color: "var(--text-primary)", boxSizing: "border-box" }}>
                        {viewingGroup[0].apotikNama}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: "1px", backgroundColor: "#e2e8f0", alignSelf: "stretch", flexShrink: 0 }} />
                  {/* Side kanan - outline group */}
                  <div
                    style={{
                      flex: "1",
                      minWidth: "280px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "var(--hover-bg)",
                    }}
                  >
                    <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Keterangan</label>
                    <div style={{ flex: 1, minHeight: "96px", padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f9fafb", color: "var(--text-secondary)", boxSizing: "border-box" }}>
                      {viewingGroup[0].keterangan || "-"}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px 0", color: "var(--text-primary)" }}>Produk yang disesuaikan</h4>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--hover-bg)" }}>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Kode Produk</th>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", minWidth: "180px" }}>Nama Produk</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Stok Sebelum</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Penyesuaian</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Stok Sesudah</th>
                          {pengajuanGroupStatus === "Disetujui" && currentPengajuanGroup?.jenisPengajuan === "Edit Data" && (
                            <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", width: "90px" }}>Aksi</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {viewingGroup
                          .filter((r) => !(pengajuanGroupStatus === "Disetujui" && currentPengajuanGroup?.jenisPengajuan === "Edit Data" && removedGroupRiwayatIds.has(r.id)))
                          .map((r) => {
                            const isEditMode = pengajuanGroupStatus === "Disetujui" && currentPengajuanGroup?.jenisPengajuan === "Edit Data";
                            const jumlahVal = isEditMode ? (pendingGroupJumlah[r.id] ?? r.jumlahPenyesuaian) : r.jumlahPenyesuaian;
                            const stokSesudahDisplay = isEditMode ? r.stokSebelum + (pendingGroupJumlah[r.id] ?? r.jumlahPenyesuaian) : r.stokSesudah;
                            return (
                              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "10px 12px", color: "var(--text-primary)" }}>{r.kodeProduk}</td>
                                <td style={{ padding: "10px 12px", color: "var(--text-secondary)", minWidth: "180px" }}>{r.namaProduk}</td>
                                <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>{r.stokSebelum}</td>
                                <td style={{ padding: "8px 12px", textAlign: "right", verticalAlign: "middle" }}>
                                  {isEditMode ? (
                                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                      <input
                                        type="number"
                                        value={jumlahVal === 0 ? "" : jumlahVal}
                                        onChange={(e) => {
                                          const v = parseInt(e.target.value, 10);
                                          setPendingGroupJumlah((prev) => ({ ...prev, [r.id]: Number.isNaN(v) ? 0 : v }));
                                        }}
                                        placeholder="0"
                                        title="Ubah jumlah penyesuaian"
                                        style={{
                                          width: "64px",
                                          padding: "4px 6px",
                                          border: "1px solid var(--input-border)",
                                          borderRadius: "4px",
                                          fontSize: "13px",
                                          textAlign: "right",
                                          backgroundColor: "#fff",
                                        }}
                                      />
                                      <button
                                        type="button"
                                        title="Edit jumlah"
                                        style={{
                                          padding: "4px",
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                          color: "var(--primary)",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.borderRadius = "4px"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                      >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <span style={{ color: r.jumlahPenyesuaian >= 0 ? "#059669" : "#dc2626" }}>
                                      {r.jumlahPenyesuaian >= 0 ? "+" : ""}{r.jumlahPenyesuaian}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>{stokSesudahDisplay}</td>
                                {isEditMode && (
                                  <td style={{ padding: "8px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                    <button
                                      type="button"
                                      onClick={() => setRemovedGroupRiwayatIds((prev) => new Set(prev).add(r.id))}
                                      title="Hapus baris"
                                      style={{
                                        padding: "6px",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        color: "#ef4444",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fef2f2"; e.currentTarget.style.borderRadius = "4px"; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                    >
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                      </svg>
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
                {pengajuanGroupStatus === "Menunggu Persetujuan" && (
                  <div
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "#fef3c7",
                      border: "1px solid #f59e0b",
                      borderRadius: "6px",
                      fontSize: "13px",
                      color: "#92400e",
                    }}
                  >
                    Pengajuan perubahan menunggu persetujuan. Klik Refresh untuk melihat status terbaru.
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", alignItems: "center" }}>
                {pengajuanGroupStatus === "Menunggu Persetujuan" ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRefreshGroup}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={handleBatalPengajuanGroup}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Batal Pengajuan
                    </button>
                  </>
                ) : pengajuanGroupStatus === "Disetujui" && currentPengajuanGroup ? (
                  <>
                    {currentPengajuanGroup.jenisPengajuan === "Edit Data" ? (
                      <button
                        type="button"
                        onClick={handleSimpanSetujuiGroup}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "var(--primary)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Simpan
                      </button>
                    ) : currentPengajuanGroup.jenisPengajuan === "Hapus Data" ? (
                      <button
                        type="button"
                        onClick={handleHapusSetujuiGroup}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Hapus
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleBatalPengajuanGroup}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#f1f5f9",
                        color: "var(--text-secondary)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      Batal Pengajuan
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPengajuanScope("group");
                      setIsPengajuanModalOpen(true);
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "var(--primary)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Ajukan Perubahan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingGroup(null)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f1f5f9",
                    color: "var(--text-secondary)",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {viewingRiwayat && (
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
                padding: "24px",
                width: "95%",
                maxWidth: "1200px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>Detail Penyesuaian Stok (Edit / Ajukan)</h2>
                <button
                  type="button"
                  onClick={() => setViewingRiwayat(null)}
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
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
                {/* Layout seperti form input: 2 side + outline group */}
                <div style={{ display: "flex", gap: "16px", alignItems: "stretch", flexWrap: "wrap" }}>
                  {/* Side kiri - outline group */}
                  <div
                    style={{
                      flex: "1",
                      minWidth: "280px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "var(--hover-bg)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>No. Penyesuaian</label>
                      <div style={{ flex: 1, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f9fafb", color: "var(--text-primary)", boxSizing: "border-box" }}>
                        {viewingRiwayat.noBuktiPenyesuaian || "-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Tanggal <span style={{ color: "#ef4444" }}>*</span></label>
                      <input
                        type="date"
                        value={editFormData.tanggal}
                        onChange={(e) => setEditFormData((prev) => ({ ...prev, tanggal: e.target.value }))}
                        style={{ flex: 1, padding: "6px 8px", border: "1px solid var(--input-border)", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Apotik</label>
                      <div style={{ flex: 1, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f9fafb", color: "var(--text-primary)", boxSizing: "border-box" }}>
                        {viewingRiwayat.apotikNama}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: "1px", backgroundColor: "#e2e8f0", alignSelf: "stretch", flexShrink: 0 }} />
                  {/* Side kanan - outline group */}
                  <div
                    style={{
                      flex: "1",
                      minWidth: "280px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "var(--hover-bg)",
                    }}
                  >
                    <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Keterangan</label>
                    <input
                      type="text"
                      value={editFormData.keterangan}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, keterangan: e.target.value }))}
                      placeholder="Alasan penyesuaian (opsional)"
                      style={{ width: "100%", flex: 1, minHeight: "36px", padding: "6px 8px", border: "1px solid var(--input-border)", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px 0", color: "var(--text-primary)" }}>Detail Penyesuaian</h4>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "6px", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "780px", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--hover-bg)" }}>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", minWidth: "180px" }}>Produk</th>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Kode</th>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Satuan</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Stok saat ini</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", width: "110px" }}>Jumlah</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 12px", color: "var(--text-primary)" }}>{viewingRiwayat.namaProduk}</td>
                          <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{viewingRiwayat.kodeProduk}</td>
                          <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>-</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>{viewingRiwayat.stokSebelum}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", verticalAlign: "middle" }}>
                            <input
                              type="number"
                              value={editFormData.jumlahPenyesuaian === 0 ? "" : editFormData.jumlahPenyesuaian}
                              onChange={(e) => setEditFormData((prev) => ({ ...prev, jumlahPenyesuaian: parseInt(e.target.value, 10) || 0 }))}
                              placeholder="0"
                              title="Positif = tambah, negatif = kurangi"
                              style={{ width: "72px", padding: "6px 8px", border: "1px solid var(--input-border)", borderRadius: "4px", fontSize: "13px", boxSizing: "border-box", textAlign: "right" }}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {pengajuanStatus === "Menunggu Persetujuan" && (
                  <div
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "#fef3c7",
                      border: "1px solid #f59e0b",
                      borderRadius: "6px",
                      fontSize: "13px",
                      color: "#92400e",
                    }}
                  >
                    Pengajuan perubahan menunggu persetujuan. Silakan refresh untuk melihat status terbaru.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setViewingRiwayat(null)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f1f5f9",
                    color: "var(--text-secondary)",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Tutup
                </button>
                {pengajuanStatus === "Menunggu Persetujuan" ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={handleBatalAjukan}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Batal Ajukan
                    </button>
                  </>
                ) : pengajuanStatus === "Disetujui" && currentPengajuan ? (
                  <>
                    {currentPengajuan.jenisPengajuan === "Edit Data" ? (
                      <button
                        type="button"
                        onClick={handleSimpanSetujui}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "var(--primary)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Simpan
                      </button>
                    ) : currentPengajuan.jenisPengajuan === "Hapus Data" ? (
                      <button
                        type="button"
                        onClick={handleHapusSetujui}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Hapus
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleBatalAjukan}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#f1f5f9",
                        color: "var(--text-secondary)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      Batal Ajukan
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPengajuanScope("single");
                      setIsPengajuanModalOpen(true);
                    }}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "var(--primary)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Ajukan Perubahan
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

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
              zIndex: 1002,
            }}
          >
            <div
              style={{
                backgroundColor: "var(--surface)",
                borderRadius: "8px",
                padding: "24px",
                width: "90%",
                maxWidth: "420px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 20px 0", color: "var(--text-primary)" }}>Ajukan Perubahan</h3>
              <form onSubmit={handleSubmitPengajuan}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                    Jenis Pengajuan <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    value={pengajuanData.jenisPengajuan}
                    onChange={(e) => setPengajuanData((prev) => ({ ...prev, jenisPengajuan: e.target.value }))}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid var(--input-border)",
                      borderRadius: "6px",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="">Pilih Jenis Pengajuan</option>
                    <option value="Edit Data">Edit Data</option>
                    <option value="Hapus Data">Hapus Data</option>
                  </select>
                </div>
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                    Alasan Pengajuan <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <textarea
                    value={pengajuanData.alasanPengajuan}
                    onChange={(e) => setPengajuanData((prev) => ({ ...prev, alasanPengajuan: e.target.value }))}
                    required
                    rows={3}
                    placeholder="Masukkan alasan pengajuan perubahan"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      border: "1px solid var(--input-border)",
                      borderRadius: "6px",
                      fontSize: "13px",
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={handleClosePengajuanModal}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#f1f5f9",
                      color: "var(--text-secondary)",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "var(--primary)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Kirim Pengajuan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                backgroundColor: "var(--surface)",
                borderRadius: "8px",
                padding: "24px",
                width: "95%",
                maxWidth: "1200px",
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
                <h2 style={{ fontSize: "20px", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                  Tambah Penyesuaian stok
                </h2>
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
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
                {/* 2 side: kiri = No. Penyesuaian, Tanggal, Apotik | kanan = Keterangan */}
                <div style={{ display: "flex", gap: "16px", alignItems: "stretch", flexWrap: "wrap" }}>
                  {/* Side kiri - outline group */}
                  <div
                    style={{
                      flex: "1",
                      minWidth: "280px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "var(--hover-bg)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                        No. Penyesuaian
                      </label>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            fontSize: "13px",
                            backgroundColor: "#f9fafb",
                            color: "var(--text-secondary)",
                            boxSizing: "border-box",
                          }}
                        >
                          -
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                        Tanggal <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={tanggalPenyesuaian}
                        onChange={(e) => setTanggalPenyesuaian(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          border: "1px solid var(--input-border)",
                          borderRadius: "6px",
                          fontSize: "13px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                        Apotik <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        value={selectedApotikId}
                        onChange={(e) => setSelectedApotikId(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          border: "1px solid var(--input-border)",
                          borderRadius: "6px",
                          fontSize: "13px",
                          boxSizing: "border-box",
                        }}
                      >
                        <option value="">Pilih Apotik</option>
                        {apotiks.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.namaApotik}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Pembatas vertikal */}
                  <div style={{ width: "1px", backgroundColor: "#e2e8f0", alignSelf: "stretch", flexShrink: 0 }} />
                  {/* Side kanan - outline group */}
                  <div
                    style={{
                      flex: "1",
                      minWidth: "280px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "var(--hover-bg)",
                    }}
                  >
                    <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Keterangan</label>
                    <textarea
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Alasan penyesuaian (opsional)"
                      rows={4}
                      style={{
                        width: "100%",
                        flex: 1,
                        minHeight: "96px",
                        padding: "6px 8px",
                        border: "1px solid var(--input-border)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        boxSizing: "border-box",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>

                {/* Detail Penyesuaian */}
                <div style={{ display: "flex", flexDirection: "column", minHeight: "360px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <h4 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                      Detail Penyesuaian
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddDetail}
                      disabled={!selectedApotikId}
                      title={!selectedApotikId ? "Pilih Apotik terlebih dahulu" : undefined}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: selectedApotikId ? "var(--primary)" : "var(--text-secondary)",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: selectedApotikId ? "pointer" : "not-allowed",
                        fontSize: "13px",
                        fontWeight: 500,
                        opacity: selectedApotikId ? 1 : 0.8,
                      }}
                    >
                      + Tambah Barang
                    </button>
                  </div>
                  {detailPenyesuaian.length > 0 ? (
                    <div
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        overflowX: "auto",
                        flex: 1,
                        minHeight: "360px",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "780px", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "var(--hover-bg)" }}>
                            <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", width: "56px" }}>Aksi</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", minWidth: "180px" }}>Produk</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Kode</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Satuan</th>
                            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Stok saat ini</th>
                            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", width: "110px" }}>Jumlah</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Baris tambah barang - selalu di atas (item pertama) */}
                          {(() => {
                              const detail = detailPenyesuaian[0];
                              const product = detail.produkId ? products.find((p) => p.id === detail.produkId) : null;
                              const stokSaatIni = product && selectedApotikId ? getStokProduk(product, selectedApotikId) : null;
                              return (
                                <tr key={detail.id} style={{ borderBottom: "1px solid var(--border)", backgroundColor: "#fafbff" }}>
                                  <td style={{ padding: "10px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                    <button type="button" onClick={() => handleRemoveDetail(detail.id)} title="Hapus" style={{ padding: "6px", backgroundColor: "transparent", color: "#ef4444", border: "none", borderRadius: "4px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fef2f2"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                    </button>
                                  </td>
                                  <td style={{ padding: "10px 12px", minWidth: "200px" }}>
                                    <input
                                      type="text"
                                      readOnly
                                      value={detail.namaProduk || ""}
                                      placeholder="Klik untuk pilih produk"
                                      onClick={() => { setProductModalDetailId(detail.id); setShowProductModal(true); setProductModalPage(1); }}
                                      onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.outline = "none"; }}
                                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--input-border)"; }}
                                      style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--input-border)", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", cursor: "pointer", backgroundColor: "white" }}
                                    />
                                  </td>
                                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{detail.kodeProduk || "-"}</td>
                                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{detail.satuan || "-"}</td>
                                  <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>{stokSaatIni !== null ? stokSaatIni : "-"}</td>
                                  <td style={{ padding: "8px 12px", width: "110px", verticalAlign: "middle", textAlign: "right" }}>
                                    <input type="number" inputMode="numeric" value={detail.jumlahPenyesuaian === 0 ? "" : detail.jumlahPenyesuaian} onChange={(e) => handleDetailChange(detail.id, "jumlahPenyesuaian", parseInt(e.target.value, 10) || 0)} placeholder="0" title="Positif = tambah, negatif = kurangi" style={{ width: "72px", padding: "6px 8px", border: "1px solid var(--input-border)", borderRadius: "4px", fontSize: "13px", boxSizing: "border-box", textAlign: "right", backgroundColor: "var(--surface)", cursor: "text" }} />
                                  </td>
                                </tr>
                              );
                            })()}
                            {/* Baris item yang sudah ditambahkan */}
                            {detailPenyesuaian.slice(1).map((detail) => {
                            const product = detail.produkId ? products.find((p) => p.id === detail.produkId) : null;
                            const stokSaatIni = product && selectedApotikId ? getStokProduk(product, selectedApotikId) : null;
                            return (
                              <tr key={detail.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "10px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDetail(detail.id)}
                                    title="Hapus"
                                    style={{
                                      padding: "6px",
                                      backgroundColor: "transparent",
                                      color: "#ef4444",
                                      border: "none",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "#fef2f2";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                  >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      <line x1="10" y1="11" x2="10" y2="17" />
                                      <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                  </button>
                                </td>
                                <td style={{ padding: "10px 12px", minWidth: "200px" }}>
                                  <input
                                    type="text"
                                    readOnly
                                    value={detail.namaProduk || ""}
                                    placeholder="Klik untuk pilih produk"
                                    onClick={() => { setProductModalDetailId(detail.id); setShowProductModal(true); setProductModalPage(1); }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.outline = "none"; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--input-border)"; }}
                                    style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--input-border)", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", cursor: "pointer", backgroundColor: "white" }}
                                  />
                                </td>
                                <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{detail.kodeProduk || "-"}</td>
                                <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{detail.satuan || "-"}</td>
                                <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                                  {stokSaatIni !== null ? stokSaatIni : "-"}
                                </td>
                                <td style={{ padding: "8px 12px", width: "110px", verticalAlign: "middle", textAlign: "right" }}>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={detail.jumlahPenyesuaian === 0 ? "" : detail.jumlahPenyesuaian}
                                    onChange={(e) => handleDetailChange(detail.id, "jumlahPenyesuaian", parseInt(e.target.value, 10) || 0)}
                                    placeholder="0"
                                    title="Positif = tambah, negatif = kurangi"
                                    style={{
                                      width: "72px",
                                      padding: "6px 8px",
                                      border: "1px solid var(--input-border)",
                                      borderRadius: "4px",
                                      fontSize: "13px",
                                      boxSizing: "border-box",
                                      textAlign: "right",
                                      backgroundColor: "var(--surface)",
                                      cursor: "text",
                                    }}
                                  />
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
                        padding: "24px",
                        textAlign: "center",
                        border: "1px dashed var(--input-border)",
                        borderRadius: "6px",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        flex: 1,
                        minHeight: "360px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      Belum ada item. Klik Tambah Barang untuk menambah.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f1f5f9",
                    color: "var(--text-secondary)",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: loading ? "#94a3b8" : "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>

            {/* Modal Pilih Produk - tampil di atas form Tambah Penyesuaian */}
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
                  <div style={{ overflow: "auto", flex: 1, border: "1px solid #e2e8f0", borderRadius: "6px" }}>
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
                          const usedProdukIds = detailPenyesuaian.filter((d) => d.id !== productModalDetailId && d.produkId).map((d) => d.produkId);
                          const availableProducts = products.filter((p) => detailPenyesuaian.some((d) => d.id === productModalDetailId && d.produkId === p.id) || !usedProdukIds.includes(p.id));
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
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
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
                    const usedProdukIds = detailPenyesuaian.filter((d) => d.id !== productModalDetailId && d.produkId).map((d) => d.produkId);
                    const availableProducts = products.filter((p) => detailPenyesuaian.some((d) => d.id === productModalDetailId && d.produkId === p.id) || !usedProdukIds.includes(p.id));
                    const totalPages = Math.max(1, Math.ceil(availableProducts.length / PRODUCTS_PER_PAGE));
                    const start = (productModalPage - 1) * PRODUCTS_PER_PAGE;
                    const end = Math.min(start + PRODUCTS_PER_PAGE, availableProducts.length);
                    return (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <span>Menampilkan {availableProducts.length === 0 ? 0 : start + 1} - {end} dari {availableProducts.length} item</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button type="button" onClick={() => setProductModalPage((prev) => Math.max(1, prev - 1))} disabled={productModalPage <= 1} style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", backgroundColor: "white", cursor: productModalPage <= 1 ? "not-allowed" : "pointer", fontSize: "13px", opacity: productModalPage <= 1 ? 0.6 : 1 }}>←</button>
                          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Halaman {productModalPage} dari {totalPages}</span>
                          <button type="button" onClick={() => setProductModalPage((prev) => Math.min(totalPages, prev + 1))} disabled={productModalPage >= totalPages} style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", backgroundColor: "white", cursor: productModalPage >= totalPages ? "not-allowed" : "pointer", fontSize: "13px", opacity: productModalPage >= totalPages ? 0.6 : 1 }}>→</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
