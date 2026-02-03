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
  urutan?: number;
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
  stokAwal?: number;
  stokPerApotik?: { [apotikId: string]: number };
}

interface RiwayatPerubahanHarga {
  id: string;
  noTransaksi?: string;
  tanggalBerlaku: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  hargaLama: number;
  hargaBaru: number;
  operator: string;
  createdAt: string;
}

interface DetailPerubahanHarga {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  hargaSaatIni: number;
  hargaBaru: string;
}

export default function PerubahanHargaJualPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split("T")[0]);
  const [tanggalBerlaku, setTanggalBerlaku] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [keterangan, setKeterangan] = useState<string>("");
  const [detailHarga, setDetailHarga] = useState<DetailPerubahanHarga[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalDetailId, setProductModalDetailId] = useState<string | null>(null);
  const [productModalPage, setProductModalPage] = useState(1);
  const PRODUCTS_PER_PAGE = 15;
  const [loading, setLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [riwayatList, setRiwayatList] = useState<RiwayatPerubahanHarga[]>([]);
  const [riwayatLoading, setRiwayatLoading] = useState(true);
  const [riwayatError, setRiwayatError] = useState<string | null>(null);
  const [viewingBatch, setViewingBatch] = useState<RiwayatPerubahanHarga[] | null>(null);
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [isPengajuanModalOpen, setIsPengajuanModalOpen] = useState(false);
  const [pengajuanData, setPengajuanData] = useState<{ jenisPengajuan: string; alasanPengajuan: string }>({
    jenisPengajuan: "",
    alasanPengajuan: "",
  });
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

  // Load products and pengajuan from API (Supabase), fallback ke localStorage
  useEffect(() => {
    const savedProducts = localStorage.getItem("products");
    const savedPengajuan = localStorage.getItem("pengajuanPerubahanHargaJual");
    if (savedProducts) try { setProducts(JSON.parse(savedProducts)); } catch (_) {}
    if (savedPengajuan) try { setPengajuanList(JSON.parse(savedPengajuan)); } catch (_) {}
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token) { setIsLoadingData(false); return; }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/products", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null),
        fetch("/api/data/pengajuanPerubahanHargaJual", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : null),
      ]).then(([productsData, pengajuanData]) => {
        if (Array.isArray(productsData) && productsData.length > 0) {
          setProducts(productsData);
          try { localStorage.setItem("products", JSON.stringify(productsData)); } catch (_) {}
        }
        if (Array.isArray(pengajuanData) && pengajuanData.length > 0) {
          setPengajuanList(pengajuanData);
          try { localStorage.setItem("pengajuanPerubahanHargaJual", JSON.stringify(pengajuanData)); } catch (_) {}
        }
        setIsLoadingData(false);
      }).catch(() => { setIsLoadingData(false); });
    }).catch(() => { setIsLoadingData(false); });
  }, []);

  // Sync pengajuanPerubahanHargaJual ke API saat berubah (guard: jangan POST saat initial load)
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/pengajuanPerubahanHargaJual", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ value: pengajuanList }),
        }).catch(() => {});
      }
    });
  }, [pengajuanList, isLoadingData]);

  // Sync products ke API saat berubah (setelah simpan batch / setujui / hapus setujui)
  useEffect(() => {
    if (isLoadingData) return;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        fetch("/api/data/products", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ value: products }),
        }).catch(() => {});
      }
    });
  }, [products, isLoadingData]);

  // Map Supabase row ke RiwayatPerubahanHarga
  const mapRowToRiwayat = (r: Record<string, unknown>): RiwayatPerubahanHarga => ({
    id: String(r.id),
    noTransaksi: String(r.no_transaksi ?? ""),
    tanggalBerlaku: String(r.tanggal_berlaku ?? ""),
    produkId: String(r.produk_id ?? ""),
    kodeProduk: String(r.kode_produk ?? ""),
    namaProduk: String(r.nama_produk ?? ""),
    hargaLama: Number(r.harga_lama ?? 0),
    hargaBaru: Number(r.harga_baru ?? 0),
    operator: String(r.operator ?? ""),
    createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : "",
  });

  // Load riwayat from Supabase (sinkron antar perangkat). Jika Supabase kosong dan localStorage ada data, unggah sekali ke Supabase.
  const loadRiwayat = async () => {
    setRiwayatLoading(true);
    setRiwayatError(null);
    try {
      const supabase = getSupabaseClient();
      const { data: rows, error } = await supabase
        .from("riwayat_perubahan_harga_jual")
        .select("id, no_transaksi, tanggal_berlaku, produk_id, kode_produk, nama_produk, harga_lama, harga_baru, operator, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list: RiwayatPerubahanHarga[] = (rows ?? []).map(mapRowToRiwayat);
      if (list.length > 0) {
        setRiwayatList(list);
        localStorage.setItem("perubahanHargaJual", JSON.stringify(list));
        return;
      }
      // Supabase kosong: coba migrasi sekali dari localStorage ke Supabase (agar data di perangkat ini tampil via URL)
      const savedRiwayat = localStorage.getItem("perubahanHargaJual");
      if (savedRiwayat) {
        let localList: RiwayatPerubahanHarga[] = [];
        try {
          localList = JSON.parse(savedRiwayat);
        } catch {
          setRiwayatList([]);
          return;
        }
        if (localList.length > 0) {
          const rowsToInsert = localList.map((r) => ({
            no_transaksi: r.noTransaksi ?? "",
            tanggal_berlaku: r.tanggalBerlaku ?? "",
            produk_id: r.produkId ?? "",
            kode_produk: r.kodeProduk ?? "",
            nama_produk: r.namaProduk ?? "",
            harga_lama: r.hargaLama ?? 0,
            harga_baru: r.hargaBaru ?? 0,
            operator: r.operator ?? "",
          }));
          const { error: insertErr } = await supabase
            .from("riwayat_perubahan_harga_jual")
            .insert(rowsToInsert as never[]);
          if (!insertErr) {
            const { data: newRows, error: fetchErr } = await supabase
              .from("riwayat_perubahan_harga_jual")
              .select("id, no_transaksi, tanggal_berlaku, produk_id, kode_produk, nama_produk, harga_lama, harga_baru, operator, created_at")
              .order("created_at", { ascending: false });
            if (!fetchErr && newRows?.length) {
              const newList = newRows.map(mapRowToRiwayat);
              setRiwayatList(newList);
              localStorage.setItem("perubahanHargaJual", JSON.stringify(newList));
              return;
            }
          }
        }
      }
      setRiwayatList([]);
    } catch (err) {
      console.error("Error loading riwayat from Supabase:", err);
      setRiwayatError(err instanceof Error ? err.message : "Gagal memuat dari server. Pastikan SQL di Supabase sudah dijalankan dan env Vercel di-set.");
      const savedRiwayat = localStorage.getItem("perubahanHargaJual");
      if (savedRiwayat) {
        try {
          setRiwayatList(JSON.parse(savedRiwayat));
        } catch {
          setRiwayatList([]);
        }
      } else {
        setRiwayatList([]);
      }
    } finally {
      setRiwayatLoading(false);
    }
  };

  useEffect(() => {
    loadRiwayat();
  }, []);

  const handleOpenModal = () => {
    const today = new Date().toISOString().split("T")[0];
    setTanggal(today);
    setTanggalBerlaku(today);
    setKeterangan("");
    setDetailHarga([]);
    setShowProductModal(false);
    setProductModalDetailId(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleOpenPengajuanModal = () => {
    setPengajuanData({ jenisPengajuan: "", alasanPengajuan: "" });
    setIsPengajuanModalOpen(true);
  };

  const handleClosePengajuanModal = () => {
    setIsPengajuanModalOpen(false);
    setPengajuanData({ jenisPengajuan: "", alasanPengajuan: "" });
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
    if (!viewingBatch || viewingBatch.length === 0) return;
    const first = viewingBatch[0];
    const noTransaksiKey = first.noTransaksi ?? first.createdAt + "|" + first.tanggalBerlaku;
    const newPengajuan = {
      id: Date.now().toString(),
      noTransaksi: noTransaksiKey,
      jenisPengajuan: pengajuanData.jenisPengajuan,
      alasanPengajuan: pengajuanData.alasanPengajuan,
      status: "Menunggu Persetujuan",
      createdAt: new Date().toISOString(),
      riwayatData: viewingBatch,
      menuSystem: "Merchandise",
    };
    const updatedPengajuanList = [...pengajuanList, newPengajuan];
    localStorage.setItem("pengajuanPerubahanHargaJual", JSON.stringify(updatedPengajuanList));
    setPengajuanList(updatedPengajuanList);
    handleClosePengajuanModal();
    alert("Pengajuan perubahan berhasil dikirim! Tombol akan berubah menjadi Refresh.");
  };

  const getCurrentPengajuanForBatch = () => {
    if (!viewingBatch || viewingBatch.length === 0) return null;
    const first = viewingBatch[0];
    const noTransaksiKey = first.noTransaksi ?? first.createdAt + "|" + first.tanggalBerlaku;
    return pengajuanList.find((p: any) => p.noTransaksi === noTransaksiKey) ?? null;
  };

  const currentPengajuan = getCurrentPengajuanForBatch();
  const pengajuanStatus = currentPengajuan?.status;

  const handleRefreshPengajuan = () => {
    const saved = localStorage.getItem("pengajuanPerubahanHargaJual");
    if (saved) {
      try {
        setPengajuanList(JSON.parse(saved));
      } catch (err) {
        console.error("Error refreshing pengajuan:", err);
      }
    }
  };

  const handleBatalPengajuan = () => {
    if (!currentPengajuan) return;
    if (!confirm("Apakah Anda yakin ingin membatalkan pengajuan ini?")) return;
    const updated = pengajuanList.filter((p: any) => p.id !== currentPengajuan.id);
    localStorage.setItem("pengajuanPerubahanHargaJual", JSON.stringify(updated));
    setPengajuanList(updated);
  };

  const handleSimpanSetujui = () => {
    if (!currentPengajuan || currentPengajuan.jenisPengajuan !== "Edit Data") return;
    const updated = pengajuanList.filter((p: any) => p.id !== currentPengajuan.id);
    localStorage.setItem("pengajuanPerubahanHargaJual", JSON.stringify(updated));
    setPengajuanList(updated);
    alert("Pengajuan telah diterapkan. Tombol Ajukan perubahan akan tampil kembali.");
  };

  const handleHapusSetujui = async () => {
    if (!viewingBatch || viewingBatch.length === 0 || !currentPengajuan || currentPengajuan.jenisPengajuan !== "Hapus Data") return;
    if (!confirm("Apakah Anda yakin ingin menghapus data perubahan harga ini? Harga produk akan dikembalikan ke harga lama.")) return;
    const idsToRemove = new Set(viewingBatch.map((r) => r.id));
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const idsSupabase = viewingBatch.map((r) => r.id).filter((id) => uuidRegex.test(id));
    try {
      if (idsSupabase.length > 0) {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("riwayat_perubahan_harga_jual")
          .delete()
          .in("id", idsSupabase);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Error deleting from Supabase:", err);
      alert("Gagal menghapus dari server. Data lokal akan dihapus.");
    }
    let productsUpdated = [...products];
    for (const r of viewingBatch) {
      const product = productsUpdated.find((p) => p.id === r.produkId);
      if (product) {
        productsUpdated = productsUpdated.map((p) => {
          if (p.id !== r.produkId) return p;
          const next = { ...p, hargaJual: r.hargaLama };
          if (next.units && next.units.length > 0) {
            next.units = next.units.map((u) => ({ ...u, hargaJual: r.hargaLama }));
          }
          return next;
        });
      }
    }
    const updatedRiwayatList = riwayatList.filter((r) => !idsToRemove.has(r.id));
    localStorage.setItem("products", JSON.stringify(productsUpdated));
    localStorage.setItem("perubahanHargaJual", JSON.stringify(updatedRiwayatList));
    setProducts(productsUpdated);
    setRiwayatList(updatedRiwayatList);
    const updatedPengajuan = pengajuanList.filter((p: any) => p.id !== currentPengajuan.id);
    localStorage.setItem("pengajuanPerubahanHargaJual", JSON.stringify(updatedPengajuan));
    setPengajuanList(updatedPengajuan);
    setViewingBatch(null);
    alert("Data perubahan harga berhasil dihapus. Harga produk dikembalikan ke harga lama.");
  };

  const handleAddDetail = () => {
    const newDetail: DetailPerubahanHarga = {
      id: Date.now().toString(),
      produkId: "",
      kodeProduk: "",
      namaProduk: "",
      hargaSaatIni: 0,
      hargaBaru: "",
    };
    setDetailHarga((prev) => [newDetail, ...prev]);
  };

  const handleRemoveDetail = (id: string) => {
    setDetailHarga((prev) => prev.filter((d) => d.id !== id));
    if (productModalDetailId === id) {
      setShowProductModal(false);
      setProductModalDetailId(null);
    }
  };

  const handleDetailChange = (id: string, field: keyof DetailPerubahanHarga, value: string | number) => {
    setDetailHarga((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleSelectProductFromModal = (p: Product) => {
    if (!productModalDetailId) return;
    setDetailHarga((prev) =>
      prev.map((d) =>
        d.id === productModalDetailId
          ? {
              ...d,
              produkId: p.id,
              kodeProduk: p.kodeProduk,
              namaProduk: p.namaProduk,
              hargaSaatIni: p.hargaJual ?? 0,
              hargaBaru: p.hargaJual > 0 ? p.hargaJual.toString() : "",
            }
          : d
      )
    );
    setShowProductModal(false);
    setProductModalDetailId(null);
  };

  const handleSubmit = async () => {
    if (!tanggalBerlaku) {
      alert("Tanggal berlaku wajib diisi.");
      return;
    }
    const validDetails = detailHarga.filter(
      (d) => d.produkId && d.kodeProduk && d.namaProduk
    );
    if (validDetails.length === 0) {
      alert("Tambahkan minimal satu produk. Klik Tambah Barang lalu pilih produk dan isi harga baru.");
      return;
    }
    const invalid = validDetails.find((d) => {
      const num = parseInt(String(d.hargaBaru).replace(/\D/g, ""), 10) || 0;
      return num <= 0;
    });
    if (invalid) {
      alert("Harga jual baru harus lebih dari 0 untuk semua item.");
      return;
    }

    setLoading(true);
    try {
      let productsUpdated = [...products];
      const createdAtIso = new Date().toISOString();
      const noTransaksi = "PH-" + new Date().getTime();
      const operator = currentUserEmail || "System";
      const rowsToInsert: { no_transaksi: string; tanggal_berlaku: string; produk_id: string; kode_produk: string; nama_produk: string; harga_lama: number; harga_baru: number; operator: string }[] = [];

      for (const d of validDetails) {
        const numHarga = parseInt(String(d.hargaBaru).replace(/\D/g, ""), 10) || 0;
        if (numHarga <= 0) continue;
        const product = productsUpdated.find((p) => p.id === d.produkId);
        if (!product) continue;
        const hargaLama = product.hargaJual ?? 0;

        productsUpdated = productsUpdated.map((p) => {
          if (p.id !== d.produkId) return p;
          const next: Product = { ...p, hargaJual: numHarga };
          if (next.units && next.units.length > 0) {
            next.units = next.units.map((u) => ({ ...u, hargaJual: numHarga }));
          }
          return next;
        });

        rowsToInsert.push({
          no_transaksi: noTransaksi,
          tanggal_berlaku: tanggalBerlaku,
          produk_id: d.produkId,
          kode_produk: d.kodeProduk,
          nama_produk: d.namaProduk,
          harga_lama: hargaLama,
          harga_baru: numHarga,
          operator,
        });
      }

      const supabase = getSupabaseClient();
      const { error: insertError } = await supabase
        .from("riwayat_perubahan_harga_jual")
        .insert(rowsToInsert as never[]);
      if (insertError) throw insertError;

      const { data: rows, error: fetchError } = await supabase
        .from("riwayat_perubahan_harga_jual")
        .select("id, no_transaksi, tanggal_berlaku, produk_id, kode_produk, nama_produk, harga_lama, harga_baru, operator, created_at")
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;

      const list: RiwayatPerubahanHarga[] = (rows ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        noTransaksi: String(r.no_transaksi ?? ""),
        tanggalBerlaku: String(r.tanggal_berlaku ?? ""),
        produkId: String(r.produk_id ?? ""),
        kodeProduk: String(r.kode_produk ?? ""),
        namaProduk: String(r.nama_produk ?? ""),
        hargaLama: Number(r.harga_lama ?? 0),
        hargaBaru: Number(r.harga_baru ?? 0),
        operator: String(r.operator ?? ""),
        createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : "",
      }));
      setRiwayatList(list);
      localStorage.setItem("perubahanHargaJual", JSON.stringify(list));

      localStorage.setItem("products", JSON.stringify(productsUpdated));
      setProducts(productsUpdated);

      alert("Perubahan harga jual berhasil disimpan. Berlaku untuk seluruh apotik.");
      handleCloseModal();
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan perubahan harga jual.");
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

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  // Group riwayat by transaksi: noTransaksi jika ada, else createdAt + tanggalBerlaku
  const riwayatByTransaksi = (() => {
    const map = new Map<string, RiwayatPerubahanHarga[]>();
    for (const r of riwayatList) {
      const key = r.noTransaksi ?? r.createdAt + "|" + r.tanggalBerlaku;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([key, items]) => {
      const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      return {
        key,
        noTransaksi: first.noTransaksi ?? "-",
        tanggalTransaksi: first.createdAt,
        tanggalBerlaku: first.tanggalBerlaku,
        operator: first.operator,
        lastUpdate: last.createdAt,
        items: sorted,
      };
    });
  })();

  return (
    <DashboardLayout>
      <div style={{ padding: "24px" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
          Perubahan harga jual berlaku untuk seluruh apotik.
        </p>

        <div style={{ marginBottom: "24px" }}>
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
            Tambah perubahan harga
          </button>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              Riwayat Perubahan harga jual
            </h2>
            <button
              type="button"
              onClick={() => loadRiwayat()}
              disabled={riwayatLoading}
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "#fff",
                cursor: riwayatLoading ? "not-allowed" : "pointer",
                color: "var(--text-secondary)",
              }}
            >
              {riwayatLoading ? "Memuat..." : "Muat ulang"}
            </button>
          </div>
          {riwayatError && (
            <p style={{ color: "#dc2626", fontSize: "14px", marginBottom: "12px" }}>
              {riwayatError}
            </p>
          )}
          {riwayatByTransaksi.length === 0 && !riwayatLoading ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              Belum ada riwayat perubahan harga jual. Agar data tampil di semua perangkat dan via URL: jalankan SQL di Supabase Dashboard (file supabase-riwayat_perubahan_harga_jual.sql), set env di Vercel, lalu di perangkat yang sudah punya data klik &quot;Muat ulang&quot; sekali untuk mengunggah ke server.
            </p>
          ) : riwayatByTransaksi.length > 0 ? (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "var(--hover-bg)",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>No. Transaksi</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Tanggal transaksi</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Tanggal berlaku</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Operator</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Last update</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, width: "72px" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayatByTransaksi.map((batch) => (
                    <tr key={batch.key} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px 12px" }}>{batch.noTransaksi}</td>
                      <td style={{ padding: "10px 12px" }}>{formatTanggal(batch.tanggalTransaksi)}</td>
                      <td style={{ padding: "10px 12px" }}>{batch.tanggalBerlaku}</td>
                      <td style={{ padding: "10px 12px" }}>{batch.operator}</td>
                      <td style={{ padding: "10px 12px" }}>{formatTanggal(batch.lastUpdate)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", verticalAlign: "middle" }}>
                        <button
                          type="button"
                          onClick={() => setViewingBatch(batch.items)}
                          title="Lihat detail"
                          style={{
                            padding: "6px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#3b82f6",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#eff6ff";
                            e.currentTarget.style.borderRadius = "4px";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

        {/* Modal View Detail - layout seperti form input (Tambah perubahan harga) */}
        {viewingBatch && viewingBatch.length > 0 && (
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
            onClick={() => setViewingBatch(null)}
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
                <h2 style={{ fontSize: "20px", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                  Detail Perubahan harga jual
                </h2>
                <button
                  type="button"
                  onClick={() => setViewingBatch(null)}
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

              {/* Layout seperti modal form input: 2 side + outline group */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "stretch", flexWrap: "wrap" }}>
                  {/* Side kiri - outline group */}
                  <div
                    style={{
                      flex: "1",
                      minWidth: "280px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "var(--hover-bg)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>No. Transaksi</label>
                      <div style={{ flex: 1, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f9fafb", color: "var(--text-primary)", boxSizing: "border-box" }}>
                        {viewingBatch[0].noTransaksi ?? "-"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Tanggal transaksi</label>
                      <div style={{ flex: 1, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f9fafb", color: "var(--text-primary)", boxSizing: "border-box" }}>
                        {formatTanggal(viewingBatch[0].createdAt)}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Tanggal Berlaku</label>
                      <div style={{ flex: 1, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f9fafb", color: "var(--text-primary)", boxSizing: "border-box" }}>
                        {viewingBatch[0].tanggalBerlaku}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Operator</label>
                      <div style={{ flex: 1, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f9fafb", color: "var(--text-primary)", boxSizing: "border-box" }}>
                        {viewingBatch[0].operator}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: "1px", backgroundColor: "#e2e8f0", alignSelf: "stretch", flexShrink: 0 }} />
                  {/* Side kanan - Keterangan */}
                  <div
                    style={{
                      flex: "1",
                      minWidth: "280px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "var(--hover-bg)",
                    }}
                  >
                    <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Keterangan</label>
                    <div style={{ flex: 1, minHeight: "96px", padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f9fafb", color: "var(--text-secondary)", boxSizing: "border-box" }}>
                      -
                    </div>
                  </div>
                </div>

                {/* Detail Perubahan Harga */}
                <div style={{ display: "flex", flexDirection: "column", minHeight: "200px" }}>
                  <h4 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px 0", color: "var(--text-primary)" }}>Detail Perubahan Harga</h4>
                  <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--hover-bg)" }}>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", minWidth: "160px" }}>Produk</th>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Kode</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Harga saat ini</th>
                          <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Harga baru</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingBatch.map((r) => (
                          <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "10px 12px" }}>{r.namaProduk}</td>
                            <td style={{ padding: "10px 12px" }}>{r.kodeProduk}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>{formatRupiah(r.hargaLama)}</td>
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>{formatRupiah(r.hargaBaru)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                    marginBottom: "16px",
                  }}
                >
                  Pengajuan perubahan menunggu persetujuan. Klik Refresh untuk melihat status terbaru.
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                {pengajuanStatus === "Menunggu Persetujuan" ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRefreshPengajuan}
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
                      onClick={handleBatalPengajuan}
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
                      Batal ajukan
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
                      onClick={handleBatalPengajuan}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Batal ajukan
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenPengajuanModal}
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
                    Ajukan perubahan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingBatch(null)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ajukan Perubahan - seperti Penyesuaian stok */}
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
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 20px 0", color: "var(--text-primary)" }}>
                Ajukan Perubahan
              </h3>
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
                    Alasan <span style={{ color: "#ef4444" }}>*</span>
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
                      color: "#475569",
                      border: "1px solid var(--border)",
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
        </div>

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
                  Tambah perubahan harga jual
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

              {/* Layout: 2 side - No. Bukti, Tanggal, Tanggal Berlaku | Keterangan */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "stretch", flexWrap: "wrap" }}>
                  {/* Side kiri - outline group */}
                  <div
                    style={{
                      flex: "1",
                      minWidth: "280px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "var(--hover-bg)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                        No. Bukti
                      </label>
                      <div
                        style={{
                          flex: 1,
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
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <label style={{ width: "10%", minWidth: "110px", flexShrink: 0, fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                        Tanggal
                      </label>
                      <input
                        type="date"
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
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
                        Tanggal Berlaku <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={tanggalBerlaku}
                        onChange={(e) => setTanggalBerlaku(e.target.value)}
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
                  </div>
                  <div style={{ width: "1px", backgroundColor: "#e2e8f0", alignSelf: "stretch", flexShrink: 0 }} />
                  {/* Side kanan - Keterangan */}
                  <div
                    style={{
                      flex: "1",
                      minWidth: "280px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "12px",
                      backgroundColor: "var(--hover-bg)",
                    }}
                  >
                    <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>Keterangan</label>
                    <textarea
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Keterangan (opsional)"
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

                {/* Detail Perubahan Harga - seperti Detail Penyesuaian */}
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
                      Detail Perubahan Harga
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
                        fontWeight: 500,
                      }}
                    >
                      + Tambah Barang
                    </button>
                  </div>
                  {detailHarga.length > 0 ? (
                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        overflowX: "auto",
                        flex: 1,
                        minHeight: "360px",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "var(--hover-bg)" }}>
                            <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", width: "56px" }}>Aksi</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", minWidth: "180px" }}>Produk</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Kode</th>
                            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Harga saat ini</th>
                            <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", width: "120px" }}>Harga baru</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailHarga.map((d) => (
                            <tr key={d.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "10px 12px", textAlign: "center", verticalAlign: "middle" }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDetail(d.id)}
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
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fef2f2"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                                  value={d.namaProduk || ""}
                                  placeholder="Klik untuk pilih produk"
                                  onClick={() => {
                                    setProductModalDetailId(d.id);
                                    setShowProductModal(true);
                                    setProductModalPage(1);
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "8px 10px",
                                    border: "1px solid var(--input-border)",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    boxSizing: "border-box",
                                    cursor: "pointer",
                                    backgroundColor: "white",
                                  }}
                                />
                              </td>
                              <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{d.kodeProduk || "-"}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                                {d.produkId ? formatRupiah(d.hargaSaatIni) : "-"}
                              </td>
                              <td style={{ padding: "8px 12px", verticalAlign: "middle", textAlign: "right" }}>
                                <input
                                  type="text"
                                  value={d.hargaBaru}
                                  onChange={(e) => handleDetailChange(d.id, "hargaBaru", e.target.value.replace(/\D/g, ""))}
                                  placeholder="0"
                                  style={{
                                    width: "100px",
                                    padding: "6px 8px",
                                    border: "1px solid var(--input-border)",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                    boxSizing: "border-box",
                                    textAlign: "right",
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
                      onClick={handleAddDetail}
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        border: "1px dashed #d1d5db",
                        borderRadius: "6px",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        flex: 1,
                        minHeight: "360px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
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
                    color: "#475569",
                    border: "1px solid var(--border)",
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
                    fontWeight: 500,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>

            {/* Modal Pilih Produk - seperti Penyesuaian stok */}
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
                onClick={() => {
                  setShowProductModal(false);
                  setProductModalDetailId(null);
                }}
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
                      onClick={() => {
                        setShowProductModal(false);
                        setProductModalDetailId(null);
                      }}
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
                  <div style={{ overflow: "auto", flex: 1, border: "1px solid var(--border)", borderRadius: "6px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--hover-bg)", position: "sticky", top: 0 }}>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Kode</th>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0", minWidth: "200px" }}>Nama</th>
                          <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Satuan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const usedProdukIds = detailHarga
                            .filter((d) => d.id !== productModalDetailId && d.produkId)
                            .map((d) => d.produkId);
                          const availableProducts = products.filter(
                            (p) =>
                              detailHarga.some((d) => d.id === productModalDetailId && d.produkId === p.id) ||
                              !usedProdukIds.includes(p.id)
                          );
                          const start = (productModalPage - 1) * PRODUCTS_PER_PAGE;
                          const paginatedProducts = availableProducts.slice(start, start + PRODUCTS_PER_PAGE);
                          return (
                            <>
                              {paginatedProducts.length === 0 ? (
                                <tr>
                                  <td colSpan={3} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                                    Tidak ada produk
                                  </td>
                                </tr>
                              ) : (
                                paginatedProducts.map((p) => (
                                  <tr
                                    key={p.id}
                                    onClick={() => handleSelectProductFromModal(p)}
                                    style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer" }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = "#f8fafc";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = "white";
                                    }}
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
                    const usedProdukIds = detailHarga
                      .filter((d) => d.id !== productModalDetailId && d.produkId)
                      .map((d) => d.produkId);
                    const availableProducts = products.filter(
                      (p) =>
                        detailHarga.some((d) => d.id === productModalDetailId && d.produkId === p.id) ||
                        !usedProdukIds.includes(p.id)
                    );
                    const totalPages = Math.max(1, Math.ceil(availableProducts.length / PRODUCTS_PER_PAGE));
                    const start = (productModalPage - 1) * PRODUCTS_PER_PAGE;
                    const end = Math.min(start + PRODUCTS_PER_PAGE, availableProducts.length);
                    return (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "12px",
                          paddingTop: "12px",
                          borderTop: "1px solid #e2e8f0",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span>
                          Menampilkan {availableProducts.length === 0 ? 0 : start + 1} - {end} dari {availableProducts.length} item
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => setProductModalPage((prev) => Math.max(1, prev - 1))}
                            disabled={productModalPage <= 1}
                            style={{
                              padding: "6px 12px",
                              border: "1px solid var(--border)",
                              borderRadius: "6px",
                              backgroundColor: "white",
                              cursor: productModalPage <= 1 ? "not-allowed" : "pointer",
                              fontSize: "13px",
                              opacity: productModalPage <= 1 ? 0.6 : 1,
                            }}
                          >
                            ←
                          </button>
                          <span style={{ fontSize: "13px", color: "#475569" }}>
                            Halaman {productModalPage} dari {totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setProductModalPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={productModalPage >= totalPages}
                            style={{
                              padding: "6px 12px",
                              border: "1px solid var(--border)",
                              borderRadius: "6px",
                              backgroundColor: "white",
                              cursor: productModalPage >= totalPages ? "not-allowed" : "pointer",
                              fontSize: "13px",
                              opacity: productModalPage >= totalPages ? 0.6 : 1,
                            }}
                          >
                            →
                          </button>
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
