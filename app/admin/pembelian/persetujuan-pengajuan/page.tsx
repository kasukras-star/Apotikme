"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import Link from "next/link";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface Pengajuan {
  id: string;
  pesananId?: string;
  penerimaanId?: string;
  penyesuaianStokId?: string;
  noBuktiPenyesuaian?: string;
  riwayatData?: any;
  apotikId?: string;
  unitId?: string;
  supplierId?: string;
  customerId?: string;
  kategoriId?: string;
  typeId?: string;
  jenisId?: string;
  marginId?: string;
  racikanId?: string;
  produkId?: string;
  nomorPesanan?: string;
  nomorPenerimaan?: string;
  kodeApotik?: string;
  namaApotik?: string;
  kodeUnit?: string;
  namaUnit?: string;
  kodeSupplier?: string;
  namaSupplier?: string;
  kodeCustomer?: string;
  namaCustomer?: string;
  kodeKategori?: string;
  namaKategori?: string;
  kodeType?: string;
  namaType?: string;
  kodeJenis?: string;
  namaJenis?: string;
  kodeMargin?: string;
  namaMargin?: string;
  kodeRacikan?: string;
  namaRacikan?: string;
  kodeProduk?: string;
  namaProduk?: string;
  jenisPengajuan: string;
  alasanPengajuan: string;
  status: string;
  createdAt: string;
  disetujuiPada?: string;
  ditolakPada?: string;
  alasanTolak?: string;
  formData?: any; // Untuk menyimpan data form
  productUnits?: any[]; // Untuk menyimpan productUnits saat edit Produk
  menuSystem?: string; // Menu system: "Data Master", "Merchandise", "Warehouse", dll
  isNew?: boolean; // Flag untuk notifikasi baru
  isGlobal?: boolean; // Pengajuan penyesuaian stok untuk seluruh produk dalam satu No Bukti
}

interface Pesanan {
  id: string;
  nomorPesanan: string;
  tanggalPesanan: string;
  supplierId: string;
  total: number;
}

export default function PersetujuanPengajuanPage() {
  const [pengajuanList, setPengajuanList] = useState<Pengajuan[]>([]);
  const [pengajuanPenerimaanList, setPengajuanPenerimaanList] = useState<Pengajuan[]>([]);
  const [pengajuanApotikList, setPengajuanApotikList] = useState<Pengajuan[]>([]);
  const [pengajuanUnitList, setPengajuanUnitList] = useState<Pengajuan[]>([]);
  const [pengajuanSupplierList, setPengajuanSupplierList] = useState<Pengajuan[]>([]);
  const [pengajuanCustomerList, setPengajuanCustomerList] = useState<Pengajuan[]>([]);
  const [pengajuanKategoriList, setPengajuanKategoriList] = useState<Pengajuan[]>([]);
  const [pengajuanTypeList, setPengajuanTypeList] = useState<Pengajuan[]>([]);
  const [pengajuanJenisList, setPengajuanJenisList] = useState<Pengajuan[]>([]);
  const [pengajuanMarginList, setPengajuanMarginList] = useState<Pengajuan[]>([]);
  const [pengajuanRacikanList, setPengajuanRacikanList] = useState<Pengajuan[]>([]);
  const [pengajuanProdukList, setPengajuanProdukList] = useState<Pengajuan[]>([]);
  const [pengajuanPenyesuaianStokList, setPengajuanPenyesuaianStokList] = useState<Pengajuan[]>([]);
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [penerimaanList, setPenerimaanList] = useState<any[]>([]);
  const [apotiks, setApotiks] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [kategoris, setKategoris] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("Menunggu Persetujuan");
  const [filterType, setFilterType] = useState<string>("Pesanan Pembelian"); // "Pesanan Pembelian" | "Penerimaan Pembelian" | "Data Apotik"
  const [activeTab, setActiveTab] = useState<string>("Semua"); // "Semua" | "Data Master" | "Merchandise" | "Warehouse" | dll
  const [newPengajuanCount, setNewPengajuanCount] = useState<number>(0);

  useEffect(() => {
    // Load pengajuan pesanan list
    const savedPengajuan = localStorage.getItem("pengajuanPembelian");
    if (savedPengajuan) {
      try {
        setPengajuanList(JSON.parse(savedPengajuan));
      } catch (err) {
        console.error("Error loading pengajuan:", err);
      }
    }

    // Load pengajuan penerimaan list
    const savedPengajuanPenerimaan = localStorage.getItem("pengajuanPenerimaanPembelian");
    if (savedPengajuanPenerimaan) {
      try {
        setPengajuanPenerimaanList(JSON.parse(savedPengajuanPenerimaan));
      } catch (err) {
        console.error("Error loading pengajuan penerimaan:", err);
      }
    }

    // Load penerimaan list
    const savedPenerimaan = localStorage.getItem("penerimaanPembelian");
    if (savedPenerimaan) {
      try {
        setPenerimaanList(JSON.parse(savedPenerimaan));
      } catch (err) {
        console.error("Error loading penerimaan:", err);
      }
    }

    // Load pesanan list
    const savedPesanan = localStorage.getItem("pesananPembelian");
    if (savedPesanan) {
      try {
        setPesananList(JSON.parse(savedPesanan));
      } catch (err) {
        console.error("Error loading pesanan:", err);
      }
    }

    // Load suppliers
    const savedSuppliers = localStorage.getItem("suppliers");
    if (savedSuppliers) {
      try {
        setSuppliers(JSON.parse(savedSuppliers));
      } catch (err) {
        console.error("Error loading suppliers:", err);
      }
    }

    // Load pengajuan apotik list
    const savedPengajuanApotik = localStorage.getItem("pengajuanApotik");
    if (savedPengajuanApotik) {
      try {
        const apotikPengajuan = JSON.parse(savedPengajuanApotik);
        // Add menuSystem to existing pengajuan if not exists
        const apotikPengajuanWithMenu = apotikPengajuan.map((p: any) => ({
          ...p,
          menuSystem: p.menuSystem || "Data Master",
        }));
        setPengajuanApotikList(apotikPengajuanWithMenu);
      } catch (err) {
        console.error("Error loading pengajuan apotik:", err);
      }
    }

    // Load pengajuan unit list
    const savedPengajuanUnit = localStorage.getItem("pengajuanUnit");
    if (savedPengajuanUnit) {
      try {
        const unitPengajuan = JSON.parse(savedPengajuanUnit);
        const unitPengajuanWithMenu = unitPengajuan.map((p: any) => ({
          ...p,
          menuSystem: p.menuSystem || "Data Master",
        }));
        setPengajuanUnitList(unitPengajuanWithMenu);
      } catch (err) {
        console.error("Error loading pengajuan unit:", err);
      }
    }

    // Load pengajuan supplier list
    const savedPengajuanSupplier = localStorage.getItem("pengajuanSupplier");
    if (savedPengajuanSupplier) {
      try {
        const supplierPengajuan = JSON.parse(savedPengajuanSupplier);
        const supplierPengajuanWithMenu = supplierPengajuan.map((p: any) => ({
          ...p,
          menuSystem: p.menuSystem || "Data Master",
        }));
        setPengajuanSupplierList(supplierPengajuanWithMenu);
      } catch (err) {
        console.error("Error loading pengajuan supplier:", err);
      }
    }

    // Load apotiks
    const savedApotiks = localStorage.getItem("apotiks");
    if (savedApotiks) {
      try {
        setApotiks(JSON.parse(savedApotiks));
      } catch (err) {
        console.error("Error loading apotiks:", err);
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

    // Load pengajuan customer list
    const savedPengajuanCustomer = localStorage.getItem("pengajuanCustomer");
    if (savedPengajuanCustomer) {
      try {
        const customerPengajuan = JSON.parse(savedPengajuanCustomer);
        const customerPengajuanWithMenu = customerPengajuan.map((p: any) => ({
          ...p,
          menuSystem: p.menuSystem || "Data Master",
        }));
        setPengajuanCustomerList(customerPengajuanWithMenu);
      } catch (err) {
        console.error("Error loading pengajuan customer:", err);
      }
    }

    // Load pengajuan kategori list
    const savedPengajuanKategori = localStorage.getItem("pengajuanKategori");
    if (savedPengajuanKategori) {
      try {
        const kategoriPengajuan = JSON.parse(savedPengajuanKategori);
        const kategoriPengajuanWithMenu = kategoriPengajuan.map((p: any) => ({
          ...p,
          menuSystem: p.menuSystem || "Data Master",
        }));
        setPengajuanKategoriList(kategoriPengajuanWithMenu);
      } catch (err) {
        console.error("Error loading pengajuan kategori:", err);
      }
    }

    // Load pengajuan produk list
    const savedPengajuanProduk = localStorage.getItem("pengajuanProduk");
    if (savedPengajuanProduk) {
      try {
        const produkPengajuan = JSON.parse(savedPengajuanProduk);
        const produkPengajuanWithMenu = produkPengajuan.map((p: any) => ({
          ...p,
          menuSystem: p.menuSystem || "Data Master",
        }));
        setPengajuanProdukList(produkPengajuanWithMenu);
      } catch (err) {
        console.error("Error loading pengajuan produk:", err);
      }
    }

    // Load pengajuan type list
    const savedPengajuanType = localStorage.getItem("pengajuanType");
    if (savedPengajuanType) {
      try {
        const typePengajuan = JSON.parse(savedPengajuanType);
        const typePengajuanWithMenu = typePengajuan.map((p: any) => ({
          ...p,
          menuSystem: p.menuSystem || "Data Master",
        }));
        setPengajuanTypeList(typePengajuanWithMenu);
      } catch (err) {
        console.error("Error loading pengajuan type:", err);
      }
    }

    // Load pengajuan jenis list
    const savedPengajuanJenis = localStorage.getItem("pengajuanJenis");
    if (savedPengajuanJenis) {
      try {
        const jenisPengajuan = JSON.parse(savedPengajuanJenis);
        const jenisPengajuanWithMenu = jenisPengajuan.map((p: any) => ({
          ...p,
          menuSystem: p.menuSystem || "Data Master",
        }));
        setPengajuanJenisList(jenisPengajuanWithMenu);
      } catch (err) {
        console.error("Error loading pengajuan jenis:", err);
      }
    }

    // Load pengajuan margin list
    const savedPengajuanMargin = localStorage.getItem("pengajuanMargin");
    if (savedPengajuanMargin) {
      try {
        const marginPengajuan = JSON.parse(savedPengajuanMargin);
        const marginPengajuanWithMenu = marginPengajuan.map((p: any) => ({
          ...p,
          menuSystem: p.menuSystem || "Data Master",
        }));
        setPengajuanMarginList(marginPengajuanWithMenu);
      } catch (err) {
        console.error("Error loading pengajuan margin:", err);
      }
    }

    // Load pengajuan racikan list
    const savedPengajuanRacikan = localStorage.getItem("pengajuanRacikan");
    if (savedPengajuanRacikan) {
      try {
        const racikanPengajuan = JSON.parse(savedPengajuanRacikan);
        const racikanPengajuanWithMenu = racikanPengajuan.map((p: any) => ({
          ...p,
          menuSystem: p.menuSystem || "Data Master",
        }));
        setPengajuanRacikanList(racikanPengajuanWithMenu);
      } catch (err) {
        console.error("Error loading pengajuan racikan:", err);
      }
    }

    // Load pengajuan penyesuaian stok list (support array or single object)
    const savedPengajuanPenyesuaianStok = localStorage.getItem("pengajuanPenyesuaianStok");
    if (savedPengajuanPenyesuaianStok) {
      try {
        const parsed = JSON.parse(savedPengajuanPenyesuaianStok);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const penyesuaianStokPengajuanWithMenu = arr.map((p: any) => ({
          ...p,
          menuSystem: p.menuSystem || "Merchandise",
        }));
        setPengajuanPenyesuaianStokList(penyesuaianStokPengajuanWithMenu);
      } catch (err) {
        console.error("Error loading pengajuan penyesuaian stok:", err);
      }
    }

    // Load customers
    const savedCustomers = localStorage.getItem("customers");
    if (savedCustomers) {
      try {
        setCustomers(JSON.parse(savedCustomers));
      } catch (err) {
        console.error("Error loading customers:", err);
      }
    }

    // Load kategoris
    const savedKategoris = localStorage.getItem("kategoris");
    if (savedKategoris) {
      try {
        setKategoris(JSON.parse(savedKategoris));
      } catch (err) {
        console.error("Error loading kategoris:", err);
      }
    }

    // Load products
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
      if (!data.session?.access_token) return;
      const token = data.session.access_token;
      const keys = ["pengajuanPembelian", "pengajuanPenerimaanPembelian", "penerimaanPembelian", "pesananPembelian", "suppliers", "pengajuanApotik", "pengajuanUnit", "pengajuanSupplier", "apotiks", "units", "pengajuanCustomer", "pengajuanKategori", "pengajuanProduk", "pengajuanType", "pengajuanJenis", "pengajuanMargin", "pengajuanRacikan", "pengajuanPenyesuaianStok", "customers", "kategoris", "products"];
      Promise.all(keys.map((k) => fetch("/api/data/" + k, { headers: { Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null)).then((v) => ({ key: k, value: v })))).then((results) => {
        results.forEach(({ key, value }) => {
          if (!Array.isArray(value) || value.length === 0) return;
          localStorage.setItem(key, JSON.stringify(value));
          const withMenu = (arr: any[], menu: string) => arr.map((p: any) => ({ ...p, menuSystem: p.menuSystem || menu }));
          switch (key) {
            case "pengajuanPembelian": setPengajuanList(value); break;
            case "pengajuanPenerimaanPembelian": setPengajuanPenerimaanList(value); break;
            case "penerimaanPembelian": setPenerimaanList(value); break;
            case "pesananPembelian": setPesananList(value); break;
            case "suppliers": setSuppliers(value); break;
            case "pengajuanApotik": setPengajuanApotikList(withMenu(value, "Data Master")); break;
            case "pengajuanUnit": setPengajuanUnitList(withMenu(value, "Data Master")); break;
            case "pengajuanSupplier": setPengajuanSupplierList(withMenu(value, "Data Master")); break;
            case "apotiks": setApotiks(value); break;
            case "units": setUnits(value); break;
            case "pengajuanCustomer": setPengajuanCustomerList(withMenu(value, "Data Master")); break;
            case "pengajuanKategori": setPengajuanKategoriList(withMenu(value, "Data Master")); break;
            case "pengajuanProduk": setPengajuanProdukList(withMenu(value, "Data Master")); break;
            case "pengajuanType": setPengajuanTypeList(withMenu(value, "Data Master")); break;
            case "pengajuanJenis": setPengajuanJenisList(withMenu(value, "Data Master")); break;
            case "pengajuanMargin": setPengajuanMarginList(withMenu(value, "Data Master")); break;
            case "pengajuanRacikan": setPengajuanRacikanList(withMenu(value, "Data Master")); break;
            case "pengajuanPenyesuaianStok": setPengajuanPenyesuaianStokList(withMenu(Array.isArray(value) ? value : [value], "Merchandise")); break;
            case "customers": setCustomers(value); break;
            case "kategoris": setKategoris(value); break;
            case "products": setProducts(value); break;
          }
        });
      }).catch(() => {});
    });
  }, []);

  // Re-load all pengajuan from localStorage when window gains focus (e.g. user returns to tab)
  useEffect(() => {
    const onFocus = () => {
      const saved = localStorage.getItem("pengajuanPenyesuaianStok");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          setPengajuanPenyesuaianStokList(
            arr.map((p: any) => ({ ...p, menuSystem: p.menuSystem || "Merchandise" }))
          );
        } catch (err) {
          console.error("Error loading pengajuan penyesuaian stok on focus:", err);
        }
      }
      const savedPembelian = localStorage.getItem("pengajuanPembelian");
      if (savedPembelian) {
        try {
          setPengajuanList(JSON.parse(savedPembelian));
        } catch (err) {
          console.error("Error loading pengajuan pembelian on focus:", err);
        }
      }
      const savedPenerimaan = localStorage.getItem("pengajuanPenerimaanPembelian");
      if (savedPenerimaan) {
        try {
          setPengajuanPenerimaanList(JSON.parse(savedPenerimaan));
        } catch (err) {
          console.error("Error loading pengajuan penerimaan on focus:", err);
        }
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Poll for new pengajuan data from localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      // Reload pengajuan pesanan list
      const savedPengajuan = localStorage.getItem("pengajuanPembelian");
      if (savedPengajuan) {
        try {
          const parsed = JSON.parse(savedPengajuan);
          setPengajuanList((prevList) => {
            if (JSON.stringify(parsed) !== JSON.stringify(prevList)) {
              return parsed;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan:", err);
        }
      }

      // Reload pengajuan penerimaan list
      const savedPengajuanPenerimaan = localStorage.getItem("pengajuanPenerimaanPembelian");
      if (savedPengajuanPenerimaan) {
        try {
          const parsed = JSON.parse(savedPengajuanPenerimaan);
          setPengajuanPenerimaanList((prevList) => {
            if (JSON.stringify(parsed) !== JSON.stringify(prevList)) {
              return parsed;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan penerimaan:", err);
        }
      }

      // Reload pengajuan apotik list
      const savedPengajuanApotik = localStorage.getItem("pengajuanApotik");
      if (savedPengajuanApotik) {
        try {
          const apotikPengajuan = JSON.parse(savedPengajuanApotik);
          const apotikPengajuanWithMenu = apotikPengajuan.map((p: any) => ({
            ...p,
            menuSystem: p.menuSystem || "Data Master",
          }));
          setPengajuanApotikList((prevList) => {
            if (JSON.stringify(apotikPengajuanWithMenu) !== JSON.stringify(prevList)) {
              return apotikPengajuanWithMenu;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan apotik:", err);
        }
      }

      // Reload pengajuan unit list
      const savedPengajuanUnit = localStorage.getItem("pengajuanUnit");
      if (savedPengajuanUnit) {
        try {
          const unitPengajuan = JSON.parse(savedPengajuanUnit);
          const unitPengajuanWithMenu = unitPengajuan.map((p: any) => ({
            ...p,
            menuSystem: p.menuSystem || "Data Master",
          }));
          setPengajuanUnitList((prevList) => {
            if (JSON.stringify(unitPengajuanWithMenu) !== JSON.stringify(prevList)) {
              return unitPengajuanWithMenu;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan unit:", err);
        }
      }

      // Reload pengajuan supplier list
      const savedPengajuanSupplier = localStorage.getItem("pengajuanSupplier");
      if (savedPengajuanSupplier) {
        try {
          const supplierPengajuan = JSON.parse(savedPengajuanSupplier);
          const supplierPengajuanWithMenu = supplierPengajuan.map((p: any) => ({
            ...p,
            menuSystem: p.menuSystem || "Data Master",
          }));
          setPengajuanSupplierList((prevList) => {
            if (JSON.stringify(supplierPengajuanWithMenu) !== JSON.stringify(prevList)) {
              return supplierPengajuanWithMenu;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan supplier:", err);
        }
      }

      // Reload pengajuan customer list
      const savedPengajuanCustomer = localStorage.getItem("pengajuanCustomer");
      if (savedPengajuanCustomer) {
        try {
          const customerPengajuan = JSON.parse(savedPengajuanCustomer);
          const customerPengajuanWithMenu = customerPengajuan.map((p: any) => ({
            ...p,
            menuSystem: p.menuSystem || "Data Master",
          }));
          setPengajuanCustomerList((prevList) => {
            if (JSON.stringify(customerPengajuanWithMenu) !== JSON.stringify(prevList)) {
              return customerPengajuanWithMenu;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan customer:", err);
        }
      }

      // Reload pengajuan kategori list
      const savedPengajuanKategori = localStorage.getItem("pengajuanKategori");
      if (savedPengajuanKategori) {
        try {
          const kategoriPengajuan = JSON.parse(savedPengajuanKategori);
          const kategoriPengajuanWithMenu = kategoriPengajuan.map((p: any) => ({
            ...p,
            menuSystem: p.menuSystem || "Data Master",
          }));
          setPengajuanKategoriList((prevList) => {
            if (JSON.stringify(kategoriPengajuanWithMenu) !== JSON.stringify(prevList)) {
              return kategoriPengajuanWithMenu;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan kategori:", err);
        }
      }

      // Reload pengajuan produk list
      const savedPengajuanProduk = localStorage.getItem("pengajuanProduk");
      if (savedPengajuanProduk) {
        try {
          const produkPengajuan = JSON.parse(savedPengajuanProduk);
          const produkPengajuanWithMenu = produkPengajuan.map((p: any) => ({
            ...p,
            menuSystem: p.menuSystem || "Data Master",
          }));
          setPengajuanProdukList((prevList) => {
            if (JSON.stringify(produkPengajuanWithMenu) !== JSON.stringify(prevList)) {
              return produkPengajuanWithMenu;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan produk:", err);
        }
      }

      // Reload pengajuan type list
      const savedPengajuanType = localStorage.getItem("pengajuanType");
      if (savedPengajuanType) {
        try {
          const typePengajuan = JSON.parse(savedPengajuanType);
          const typePengajuanWithMenu = typePengajuan.map((p: any) => ({
            ...p,
            menuSystem: p.menuSystem || "Data Master",
          }));
          setPengajuanTypeList((prevList) => {
            if (JSON.stringify(typePengajuanWithMenu) !== JSON.stringify(prevList)) {
              return typePengajuanWithMenu;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan type:", err);
        }
      }

      // Reload pengajuan jenis list
      const savedPengajuanJenis = localStorage.getItem("pengajuanJenis");
      if (savedPengajuanJenis) {
        try {
          const jenisPengajuan = JSON.parse(savedPengajuanJenis);
          const jenisPengajuanWithMenu = jenisPengajuan.map((p: any) => ({
            ...p,
            menuSystem: p.menuSystem || "Data Master",
          }));
          setPengajuanJenisList((prevList) => {
            if (JSON.stringify(jenisPengajuanWithMenu) !== JSON.stringify(prevList)) {
              return jenisPengajuanWithMenu;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan jenis:", err);
        }
      }

      // Reload pengajuan margin list
      const savedPengajuanMargin = localStorage.getItem("pengajuanMargin");
      if (savedPengajuanMargin) {
        try {
          const marginPengajuan = JSON.parse(savedPengajuanMargin);
          const marginPengajuanWithMenu = marginPengajuan.map((p: any) => ({
            ...p,
            menuSystem: p.menuSystem || "Data Master",
          }));
          setPengajuanMarginList((prevList) => {
            if (JSON.stringify(marginPengajuanWithMenu) !== JSON.stringify(prevList)) {
              return marginPengajuanWithMenu;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan margin:", err);
        }
      }

      // Reload pengajuan racikan list
      const savedPengajuanRacikan = localStorage.getItem("pengajuanRacikan");
      if (savedPengajuanRacikan) {
        try {
          const racikanPengajuan = JSON.parse(savedPengajuanRacikan);
          const racikanPengajuanWithMenu = racikanPengajuan.map((p: any) => ({
            ...p,
            menuSystem: p.menuSystem || "Data Master",
          }));
          setPengajuanRacikanList((prevList) => {
            if (JSON.stringify(racikanPengajuanWithMenu) !== JSON.stringify(prevList)) {
              return racikanPengajuanWithMenu;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan racikan:", err);
        }
      }

      // Reload pengajuan penyesuaian stok list (support array or single object)
      const savedPengajuanPenyesuaianStok = localStorage.getItem("pengajuanPenyesuaianStok");
      if (savedPengajuanPenyesuaianStok) {
        try {
          const parsed = JSON.parse(savedPengajuanPenyesuaianStok);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          const penyesuaianStokPengajuanWithMenu = arr.map((p: any) => ({
            ...p,
            menuSystem: p.menuSystem || "Merchandise",
          }));
          setPengajuanPenyesuaianStokList((prevList) => {
            if (JSON.stringify(penyesuaianStokPengajuanWithMenu) !== JSON.stringify(prevList)) {
              return penyesuaianStokPengajuanWithMenu;
            }
            return prevList;
          });
        } catch (err) {
          console.error("Error loading pengajuan penyesuaian stok:", err);
        }
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  // Check for new pengajuan when lists change
  useEffect(() => {
    // Count new pengajuan (status Menunggu Persetujuan with isNew flag or recent)
    let count = 0;
    
    const isRecentPengajuan = (createdAt: string): boolean => {
      const created = new Date(createdAt);
      const now = new Date();
      const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
      return diffMinutes < 5; // Consider new if created within last 5 minutes
    };
    
    // Check pesanan pembelian
    pengajuanList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    // Check penerimaan pembelian
    pengajuanPenerimaanList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    // Check apotik
    pengajuanApotikList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    // Check unit
    pengajuanUnitList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    // Check supplier
    pengajuanSupplierList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    // Check customer
    pengajuanCustomerList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    // Check kategori
    pengajuanKategoriList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    // Check produk
    pengajuanProdukList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    // Check type
    pengajuanTypeList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    // Check jenis
    pengajuanJenisList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    // Check margin
    pengajuanMarginList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    // Check racikan
    pengajuanRacikanList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });

    // Check penyesuaian stok
    pengajuanPenyesuaianStokList.forEach((p) => {
      if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
        count++;
      }
    });
    
    setNewPengajuanCount(count);
  }, [pengajuanList, pengajuanPenerimaanList, pengajuanApotikList, pengajuanUnitList, pengajuanSupplierList, pengajuanCustomerList, pengajuanKategoriList, pengajuanProdukList, pengajuanTypeList, pengajuanJenisList, pengajuanMarginList, pengajuanRacikanList, pengajuanPenyesuaianStokList]);

  // Check for new pengajuan periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Count new pengajuan (status Menunggu Persetujuan with isNew flag or recent)
      let count = 0;
      
      const isRecentPengajuan = (createdAt: string): boolean => {
        const created = new Date(createdAt);
        const now = new Date();
        const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
        return diffMinutes < 5; // Consider new if created within last 5 minutes
      };
      
      // Check pesanan pembelian
      pengajuanList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      // Check penerimaan pembelian
      pengajuanPenerimaanList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      // Check apotik
      pengajuanApotikList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      // Check unit
      pengajuanUnitList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      // Check supplier
      pengajuanSupplierList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      // Check customer
      pengajuanCustomerList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      // Check kategori
      pengajuanKategoriList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      // Check produk
      pengajuanProdukList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      // Check type
      pengajuanTypeList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      // Check jenis
      pengajuanJenisList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      // Check margin
      pengajuanMarginList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      // Check racikan
      pengajuanRacikanList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });

      // Check penyesuaian stok
      pengajuanPenyesuaianStokList.forEach((p) => {
        if (p.status === "Menunggu Persetujuan" && (p.isNew || isRecentPengajuan(p.createdAt))) {
          count++;
        }
      });
      
      setNewPengajuanCount(count);
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [pengajuanList, pengajuanPenerimaanList, pengajuanApotikList, pengajuanUnitList, pengajuanSupplierList, pengajuanCustomerList, pengajuanKategoriList, pengajuanProdukList, pengajuanTypeList, pengajuanJenisList, pengajuanMarginList, pengajuanRacikanList, pengajuanPenyesuaianStokList]);

  const handleSetujui = (pengajuan: Pengajuan) => {
    const isApotik = pengajuan.menuSystem === "Data Master" && pengajuan.apotikId;
    const isUnit = pengajuan.menuSystem === "Data Master" && pengajuan.unitId;
    const isSupplier = pengajuan.menuSystem === "Data Master" && pengajuan.supplierId;
    const isCustomer = pengajuan.menuSystem === "Data Master" && pengajuan.customerId;
    const isKategori = pengajuan.menuSystem === "Data Master" && pengajuan.kategoriId;
    const isType = pengajuan.menuSystem === "Data Master" && pengajuan.typeId;
    const isJenis = pengajuan.menuSystem === "Data Master" && pengajuan.jenisId;
    const isMargin = pengajuan.menuSystem === "Data Master" && pengajuan.marginId;
    const isRacikan = pengajuan.menuSystem === "Data Master" && pengajuan.racikanId;
    const isProduk = pengajuan.menuSystem === "Data Master" && pengajuan.produkId;
    const isPenerimaan = pengajuan.menuSystem === "Warehouse";
    const isPenyesuaianStokGlobal = pengajuan.menuSystem === "Merchandise" && pengajuan.isGlobal && Array.isArray(pengajuan.riwayatData);
    const isPenyesuaianStok = pengajuan.menuSystem === "Merchandise" && pengajuan.penyesuaianStokId;
    
    let confirmMessage = "";
    if (isApotik) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Apotik ${pengajuan.namaApotik || pengajuan.kodeApotik}?`;
    } else if (isUnit) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Unit ${pengajuan.namaUnit || pengajuan.kodeUnit}?`;
    } else if (isSupplier) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Supplier ${pengajuan.namaSupplier || pengajuan.kodeSupplier}?`;
    } else if (isCustomer) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Customer ${pengajuan.namaCustomer || pengajuan.kodeCustomer}?`;
    } else if (isKategori) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Kategori ${pengajuan.namaKategori || pengajuan.kodeKategori}?`;
    } else if (isType) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Type ${pengajuan.namaType || pengajuan.kodeType}?`;
    } else if (isJenis) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Jenis ${pengajuan.namaJenis || pengajuan.kodeJenis}?`;
    } else if (isMargin) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Margin ${pengajuan.namaMargin || pengajuan.kodeMargin}?`;
    } else if (isRacikan) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Racikan ${pengajuan.namaRacikan || pengajuan.kodeRacikan}?`;
    } else if (isProduk) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Produk ${pengajuan.namaProduk || pengajuan.kodeProduk}?`;
    } else if (isPenerimaan) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Penerimaan ${pengajuan.nomorPenerimaan}?`;
    } else if (isPenyesuaianStokGlobal) {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Penyesuaian Stok (seluruh produk No Bukti ${pengajuan.noBuktiPenyesuaian || ""})? Data pada tabel akan diterapkan untuk semua produk.`;
    } else if (isPenyesuaianStok) {
      const namaProduk = (pengajuan as any).riwayatData?.namaProduk;
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk Penyesuaian Stok${namaProduk ? ` (${namaProduk})` : ""}?`;
    } else {
      confirmMessage = `Apakah Anda yakin ingin menyetujui pengajuan ${pengajuan.jenisPengajuan} untuk PO ${pengajuan.nomorPesanan}?`;
    }

    if (!confirm(confirmMessage)) {
      return; // User cancelled, exit early
    }

    // Process approval in one go
    if (isApotik) {
      // Handle pengajuan apotik
      const updatedPengajuanList = pengajuanApotikList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanApotik", JSON.stringify(updatedPengajuanList));
      setPengajuanApotikList(updatedPengajuanList);

      // Jika jenis pengajuan adalah "Hapus Data", hapus apotik
      if (pengajuan.jenisPengajuan === "Hapus Data") {
        const updatedApotiks = apotiks.filter((a) => a.id !== pengajuan.apotikId);
        localStorage.setItem("apotiks", JSON.stringify(updatedApotiks));
        setApotiks(updatedApotiks);
      } else if (pengajuan.jenisPengajuan === "Edit Data" && pengajuan.formData) {
        // Jika "Edit Data", update apotik dengan data dari formData
        const updatedApotiks = apotiks.map((a) =>
          a.id === pengajuan.apotikId
            ? {
                ...a,
                ...pengajuan.formData,
              }
            : a
        );
        localStorage.setItem("apotiks", JSON.stringify(updatedApotiks));
        setApotiks(updatedApotiks);
      }
    } else if (isUnit) {
      // Handle pengajuan unit
      const updatedPengajuanList = pengajuanUnitList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanUnit", JSON.stringify(updatedPengajuanList));
      setPengajuanUnitList(updatedPengajuanList);

      if (pengajuan.jenisPengajuan === "Hapus Data") {
        const updatedUnits = units.filter((u) => u.id !== pengajuan.unitId);
        localStorage.setItem("units", JSON.stringify(updatedUnits));
        setUnits(updatedUnits);
      } else if (pengajuan.jenisPengajuan === "Edit Data" && pengajuan.formData) {
        const updatedUnits = units.map((u) =>
          u.id === pengajuan.unitId
            ? {
                ...u,
                ...pengajuan.formData,
              }
            : u
        );
        localStorage.setItem("units", JSON.stringify(updatedUnits));
        setUnits(updatedUnits);
      }
    } else if (isSupplier) {
      // Handle pengajuan supplier
      const updatedPengajuanList = pengajuanSupplierList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanSupplier", JSON.stringify(updatedPengajuanList));
      setPengajuanSupplierList(updatedPengajuanList);

      if (pengajuan.jenisPengajuan === "Hapus Data") {
        const updatedSuppliers = suppliers.filter((s) => s.id !== pengajuan.supplierId);
        localStorage.setItem("suppliers", JSON.stringify(updatedSuppliers));
        setSuppliers(updatedSuppliers);
      } else if (pengajuan.jenisPengajuan === "Edit Data" && pengajuan.formData) {
        const updatedSuppliers = suppliers.map((s) =>
          s.id === pengajuan.supplierId
            ? {
                ...s,
                ...pengajuan.formData,
              }
            : s
        );
        localStorage.setItem("suppliers", JSON.stringify(updatedSuppliers));
        setSuppliers(updatedSuppliers);
      }
    } else if (isCustomer) {
      // Handle pengajuan customer
      const updatedPengajuanList = pengajuanCustomerList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanCustomer", JSON.stringify(updatedPengajuanList));
      setPengajuanCustomerList(updatedPengajuanList);

      if (pengajuan.jenisPengajuan === "Hapus Data") {
        const updatedCustomers = customers.filter((c) => c.id !== pengajuan.customerId);
        localStorage.setItem("customers", JSON.stringify(updatedCustomers));
        setCustomers(updatedCustomers);
      } else if (pengajuan.jenisPengajuan === "Edit Data" && pengajuan.formData) {
        const updatedCustomers = customers.map((c) =>
          c.id === pengajuan.customerId
            ? {
                ...c,
                ...pengajuan.formData,
              }
            : c
        );
        localStorage.setItem("customers", JSON.stringify(updatedCustomers));
        setCustomers(updatedCustomers);
      }
    } else if (isKategori) {
      // Handle pengajuan kategori
      const updatedPengajuanList = pengajuanKategoriList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanKategori", JSON.stringify(updatedPengajuanList));
      setPengajuanKategoriList(updatedPengajuanList);

      if (pengajuan.jenisPengajuan === "Hapus Data") {
        const updatedKategoris = kategoris.filter((k) => k.id !== pengajuan.kategoriId);
        localStorage.setItem("kategoris", JSON.stringify(updatedKategoris));
        setKategoris(updatedKategoris);
      } else if (pengajuan.jenisPengajuan === "Edit Data" && pengajuan.formData) {
        const updatedKategoris = kategoris.map((k) =>
          k.id === pengajuan.kategoriId
            ? {
                ...k,
                ...pengajuan.formData,
              }
            : k
        );
        localStorage.setItem("kategoris", JSON.stringify(updatedKategoris));
        setKategoris(updatedKategoris);
      }
    } else if (isType) {
      // Handle pengajuan type
      const updatedPengajuanList = pengajuanTypeList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanType", JSON.stringify(updatedPengajuanList));
      setPengajuanTypeList(updatedPengajuanList);

      // Load types from localStorage
      const savedTypes = localStorage.getItem("types");
      if (savedTypes) {
        try {
          const types = JSON.parse(savedTypes);
          if (pengajuan.jenisPengajuan === "Hapus Data") {
            const updatedTypes = types.filter((t: any) => t.id !== pengajuan.typeId);
            localStorage.setItem("types", JSON.stringify(updatedTypes));
          } else if (pengajuan.jenisPengajuan === "Edit Data" && pengajuan.formData) {
            const updatedTypes = types.map((t: any) =>
              t.id === pengajuan.typeId
                ? { ...t, ...pengajuan.formData }
                : t
            );
            localStorage.setItem("types", JSON.stringify(updatedTypes));
          }
        } catch (err) {
          console.error("Error updating types:", err);
        }
      }
    } else if (isJenis) {
      // Handle pengajuan jenis
      const updatedPengajuanList = pengajuanJenisList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanJenis", JSON.stringify(updatedPengajuanList));
      setPengajuanJenisList(updatedPengajuanList);

      // Load jenis from localStorage
      const savedJenis = localStorage.getItem("jenis");
      if (savedJenis) {
        try {
          const jenisList = JSON.parse(savedJenis);
          if (pengajuan.jenisPengajuan === "Hapus Data") {
            const updatedJenis = jenisList.filter((j: any) => j.id !== pengajuan.jenisId);
            localStorage.setItem("jenis", JSON.stringify(updatedJenis));
          } else if (pengajuan.jenisPengajuan === "Edit Data" && pengajuan.formData) {
            const updatedJenis = jenisList.map((j: any) =>
              j.id === pengajuan.jenisId
                ? { ...j, ...pengajuan.formData }
                : j
            );
            localStorage.setItem("jenis", JSON.stringify(updatedJenis));
          }
        } catch (err) {
          console.error("Error updating jenis:", err);
        }
      }
    } else if (isMargin) {
      // Handle pengajuan margin
      const updatedPengajuanList = pengajuanMarginList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanMargin", JSON.stringify(updatedPengajuanList));
      setPengajuanMarginList(updatedPengajuanList);

      // Load margins from localStorage
      const savedMargins = localStorage.getItem("margins");
      if (savedMargins) {
        try {
          const margins = JSON.parse(savedMargins);
          if (pengajuan.jenisPengajuan === "Hapus Data") {
            const updatedMargins = margins.filter((m: any) => m.id !== pengajuan.marginId);
            localStorage.setItem("margins", JSON.stringify(updatedMargins));
          } else if (pengajuan.jenisPengajuan === "Edit Data" && pengajuan.formData) {
            const updatedMargins = margins.map((m: any) =>
              m.id === pengajuan.marginId
                ? { ...m, ...pengajuan.formData }
                : m
            );
            localStorage.setItem("margins", JSON.stringify(updatedMargins));
          }
        } catch (err) {
          console.error("Error updating margins:", err);
        }
      }
    } else if (isRacikan) {
      // Handle pengajuan racikan
      const updatedPengajuanList = pengajuanRacikanList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanRacikan", JSON.stringify(updatedPengajuanList));
      setPengajuanRacikanList(updatedPengajuanList);

      // Load racikans from localStorage
      const savedRacikans = localStorage.getItem("racikans");
      if (savedRacikans) {
        try {
          const racikans = JSON.parse(savedRacikans);
          if (pengajuan.jenisPengajuan === "Hapus Data") {
            const updatedRacikans = racikans.filter((r: any) => r.id !== pengajuan.racikanId);
            localStorage.setItem("racikans", JSON.stringify(updatedRacikans));
          } else if (pengajuan.jenisPengajuan === "Edit Data" && pengajuan.formData) {
            const updatedRacikans = racikans.map((r: any) =>
              r.id === pengajuan.racikanId
                ? {
                    ...r,
                    kodeRacikan: pengajuan.formData.kodeRacikan,
                    namaRacikan: pengajuan.formData.namaRacikan,
                    satuan: pengajuan.formData.satuan,
                    jasaRacik: Number(pengajuan.formData.jasaRacik || 0),
                    jasaBungkus: Number(pengajuan.formData.jasaBungkus || 0),
                    hargaDasarJasaRacik: Number(pengajuan.formData.hargaDasarJasaRacik || 0),
                    batasRacik: Number(pengajuan.formData.batasRacik || 10),
                    pengaliRacik: Number(pengajuan.formData.pengaliRacik || 2),
                    hargaDasarJasaBungkus: Number(pengajuan.formData.hargaDasarJasaBungkus || 0),
                    batasBungkus: Number(pengajuan.formData.batasBungkus || 10),
                    pengaliBungkus: Number(pengajuan.formData.pengaliBungkus || 2),
                    keterangan: pengajuan.formData.keterangan,
                    updatedAt: new Date(),
                  }
                : r
            );
            localStorage.setItem("racikans", JSON.stringify(updatedRacikans));
          }
        } catch (err) {
          console.error("Error updating racikans:", err);
        }
      }
    } else if (isProduk) {
      // Handle pengajuan produk
      const updatedPengajuanList = pengajuanProdukList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanProduk", JSON.stringify(updatedPengajuanList));
      setPengajuanProdukList(updatedPengajuanList);

      if (pengajuan.jenisPengajuan === "Hapus Data") {
        const updatedProducts = products.filter((pr) => pr.id !== pengajuan.produkId);
        localStorage.setItem("products", JSON.stringify(updatedProducts));
        setProducts(updatedProducts);
      } else if (pengajuan.jenisPengajuan === "Edit Data" && pengajuan.formData) {
        const updatedProducts = products.map((pr) =>
          pr.id === pengajuan.produkId
            ? {
                ...pr,
                ...pengajuan.formData,
                units: pengajuan.productUnits || pr.units,
                operator: pr.operator || "System", // Preserve original operator (who created)
                updatedAt: new Date(), // Update last update time
              }
            : pr
        );
        localStorage.setItem("products", JSON.stringify(updatedProducts));
        setProducts(updatedProducts);
      }
    } else if (isPenerimaan) {
      // Handle pengajuan penerimaan
      const updatedPengajuanList = pengajuanPenerimaanList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanPenerimaanPembelian", JSON.stringify(updatedPengajuanList));
      setPengajuanPenerimaanList(updatedPengajuanList);

      if (pengajuan.jenisPengajuan === "Hapus Transaksi") {
        const updatedPenerimaanList = penerimaanList.filter((p) => p.id !== pengajuan.penerimaanId);
        localStorage.setItem("penerimaanPembelian", JSON.stringify(updatedPenerimaanList));
        setPenerimaanList(updatedPenerimaanList);
      }
    } else if (isPenyesuaianStokGlobal) {
      // Handle pengajuan penyesuaian stok global: terapkan ke semua produk dalam No Bukti
      const updatedPengajuanList = pengajuanPenyesuaianStokList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPengajuanList));
      setPengajuanPenyesuaianStokList(updatedPengajuanList);

      const riwayatArr = pengajuan.riwayatData as any[];
      const formData = pengajuan.formData as { tanggal?: string; keterangan?: string; details?: { id: string; jumlahPenyesuaian: number }[] } | undefined;
      const detailsMap = new Map<string, number>();
      if (formData?.details) {
        formData.details.forEach((d: any) => detailsMap.set(d.id, d.jumlahPenyesuaian));
      }

      const savedRiwayat = localStorage.getItem("penyesuaianStok");
      const riwayatList: any[] = savedRiwayat ? JSON.parse(savedRiwayat) : [];
      const savedProducts = localStorage.getItem("products");
      let productsList: any[] = savedProducts ? JSON.parse(savedProducts) : [];

      const getStok = (p: any, apotikId: string) => (p.stokPerApotik && apotikId && p.stokPerApotik[apotikId] !== undefined ? p.stokPerApotik[apotikId] : (p.stokAwal ?? 0));

      if (pengajuan.jenisPengajuan === "Edit Data" && formData) {
        const newTanggal = formData.tanggal || riwayatArr[0]?.tanggal;
        const newKeterangan = formData.keterangan ?? "";
        let updatedRiwayatList = [...riwayatList];
        for (const r of riwayatArr) {
          const newJumlah = detailsMap.get(r.id) ?? r.jumlahPenyesuaian;
          const stokSesudah = r.stokSebelum + newJumlah;
          const updated = {
            ...r,
            tanggal: newTanggal,
            keterangan: newKeterangan,
            jumlahPenyesuaian: newJumlah,
            stokSesudah,
            updatedAt: new Date().toISOString(),
          };
          updatedRiwayatList = updatedRiwayatList.map((item) => (item.id === r.id ? updated : item));
          const product = productsList.find((p: any) => p.id === r.produkId);
          if (product && r.apotikId) {
            const currentStok = getStok(product, r.apotikId);
            const delta = newJumlah - r.jumlahPenyesuaian;
            const newStok = currentStok + delta;
            productsList = productsList.map((p: any) => {
              if (p.id !== product.id) return p;
              const next = { ...p };
              next.stokPerApotik = { ...(next.stokPerApotik || {}), [r.apotikId]: newStok };
              return next;
            });
          }
        }
        localStorage.setItem("penyesuaianStok", JSON.stringify(updatedRiwayatList));
        localStorage.setItem("products", JSON.stringify(productsList));
        setProducts(productsList);
      } else if (pengajuan.jenisPengajuan === "Hapus Data") {
        const idsToRemove = new Set(riwayatArr.map((r: any) => r.id));
        for (const r of riwayatArr) {
          const product = productsList.find((p: any) => p.id === r.produkId);
          if (product && r.apotikId) {
            const currentStok = getStok(product, r.apotikId);
            const revertStok = currentStok - r.jumlahPenyesuaian;
            productsList = productsList.map((p: any) => {
              if (p.id !== product.id) return p;
              const next = { ...p };
              next.stokPerApotik = { ...(next.stokPerApotik || {}), [r.apotikId]: revertStok };
              return next;
            });
          }
        }
        const updatedRiwayatList = riwayatList.filter((item: any) => !idsToRemove.has(item.id));
        localStorage.setItem("penyesuaianStok", JSON.stringify(updatedRiwayatList));
        localStorage.setItem("products", JSON.stringify(productsList));
        setProducts(productsList);
      }
    } else if (isPenyesuaianStok) {
      // Handle pengajuan penyesuaian stok (hanya update status; apply data di halaman penyesuaian stok)
      const updatedPengajuanList = pengajuanPenyesuaianStokList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPengajuanList));
      setPengajuanPenyesuaianStokList(updatedPengajuanList);
    } else {
      // Handle pengajuan pesanan
      const updatedPengajuanList = pengajuanList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Disetujui", disetujuiPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanPembelian", JSON.stringify(updatedPengajuanList));
      setPengajuanList(updatedPengajuanList);

      // Jika jenis pengajuan adalah "Hapus Transaksi", hapus PO
      if (pengajuan.jenisPengajuan === "Hapus Transaksi") {
        const updatedPesananList = pesananList.filter((p) => p.id !== pengajuan.pesananId);
        localStorage.setItem("pesananPembelian", JSON.stringify(updatedPesananList));
        setPesananList(updatedPesananList);
      }
    }
  };

  const handleTolak = (pengajuan: Pengajuan) => {
    const alasanTolak = prompt("Masukkan alasan penolakan:");
    if (!alasanTolak) {
      return; // User cancelled, exit early
    }

    const isApotik = pengajuan.menuSystem === "Data Master" && pengajuan.apotikId;
    const isUnit = pengajuan.menuSystem === "Data Master" && pengajuan.unitId;
    const isSupplier = pengajuan.menuSystem === "Data Master" && pengajuan.supplierId;
    const isCustomer = pengajuan.menuSystem === "Data Master" && pengajuan.customerId;
    const isKategori = pengajuan.menuSystem === "Data Master" && pengajuan.kategoriId;
    const isType = pengajuan.menuSystem === "Data Master" && pengajuan.typeId;
    const isJenis = pengajuan.menuSystem === "Data Master" && pengajuan.jenisId;
    const isMargin = pengajuan.menuSystem === "Data Master" && pengajuan.marginId;
    const isRacikan = pengajuan.menuSystem === "Data Master" && pengajuan.racikanId;
    const isProduk = pengajuan.menuSystem === "Data Master" && pengajuan.produkId;
    const isPenerimaan = pengajuan.menuSystem === "Warehouse";
    const isPenyesuaianStokGlobal = pengajuan.menuSystem === "Merchandise" && pengajuan.isGlobal && Array.isArray(pengajuan.riwayatData);
    const isPenyesuaianStok = pengajuan.menuSystem === "Merchandise" && pengajuan.penyesuaianStokId;
    
    if (isApotik) {
      const updatedPengajuanList = pengajuanApotikList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanApotik", JSON.stringify(updatedPengajuanList));
      setPengajuanApotikList(updatedPengajuanList);
    } else if (isUnit) {
      const updatedPengajuanList = pengajuanUnitList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanUnit", JSON.stringify(updatedPengajuanList));
      setPengajuanUnitList(updatedPengajuanList);
    } else if (isSupplier) {
      const updatedPengajuanList = pengajuanSupplierList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanSupplier", JSON.stringify(updatedPengajuanList));
      setPengajuanSupplierList(updatedPengajuanList);
    } else if (isCustomer) {
      const updatedPengajuanList = pengajuanCustomerList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanCustomer", JSON.stringify(updatedPengajuanList));
      setPengajuanCustomerList(updatedPengajuanList);
    } else if (isKategori) {
      const updatedPengajuanList = pengajuanKategoriList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanKategori", JSON.stringify(updatedPengajuanList));
      setPengajuanKategoriList(updatedPengajuanList);
    } else if (isType) {
      const updatedPengajuanList = pengajuanTypeList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanType", JSON.stringify(updatedPengajuanList));
      setPengajuanTypeList(updatedPengajuanList);
    } else if (isJenis) {
      const updatedPengajuanList = pengajuanJenisList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanJenis", JSON.stringify(updatedPengajuanList));
      setPengajuanJenisList(updatedPengajuanList);
    } else if (isMargin) {
      const updatedPengajuanList = pengajuanMarginList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanMargin", JSON.stringify(updatedPengajuanList));
      setPengajuanMarginList(updatedPengajuanList);
    } else if (isRacikan) {
      const updatedPengajuanList = pengajuanRacikanList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanRacikan", JSON.stringify(updatedPengajuanList));
      setPengajuanRacikanList(updatedPengajuanList);
    } else if (isProduk) {
      const updatedPengajuanList = pengajuanProdukList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanProduk", JSON.stringify(updatedPengajuanList));
      setPengajuanProdukList(updatedPengajuanList);
    } else if (isPenerimaan) {
      const updatedPengajuanList = pengajuanPenerimaanList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanPenerimaanPembelian", JSON.stringify(updatedPengajuanList));
      setPengajuanPenerimaanList(updatedPengajuanList);
    } else if (isPenyesuaianStokGlobal || isPenyesuaianStok) {
      const updatedPengajuanList = pengajuanPenyesuaianStokList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPengajuanList));
      setPengajuanPenyesuaianStokList(updatedPengajuanList);
    } else {
      const updatedPengajuanList = pengajuanList.map((p) =>
        p.id === pengajuan.id
          ? { ...p, status: "Ditolak", alasanTolak, ditolakPada: new Date().toISOString(), isNew: false }
          : p
      );
      localStorage.setItem("pengajuanPembelian", JSON.stringify(updatedPengajuanList));
      setPengajuanList(updatedPengajuanList);
    }
  };

  // Combine all pengajuan and filter by menu system and status
  const getAllPengajuan = (): Pengajuan[] => {
    const all: Pengajuan[] = [];
    
    // Add pesanan pembelian with menuSystem
    pengajuanList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Merchandise",
      });
    });
    
    // Add penerimaan pembelian with menuSystem
    pengajuanPenerimaanList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Warehouse",
      });
    });
    
    // Add apotik with menuSystem
    pengajuanApotikList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Data Master",
      });
    });
    
    // Add unit with menuSystem
    pengajuanUnitList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Data Master",
      });
    });
    
    // Add supplier with menuSystem
    pengajuanSupplierList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Data Master",
      });
    });
    
    // Add customer with menuSystem
    pengajuanCustomerList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Data Master",
      });
    });
    
    // Add kategori with menuSystem
    pengajuanKategoriList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Data Master",
      });
    });
    
    // Add produk with menuSystem
    pengajuanProdukList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Data Master",
      });
    });
    
    // Add type with menuSystem
    pengajuanTypeList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Data Master",
      });
    });
    
    // Add jenis with menuSystem
    pengajuanJenisList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Data Master",
      });
    });
    
    // Add margin with menuSystem
    pengajuanMarginList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Data Master",
      });
    });
    
    // Add racikan with menuSystem
    pengajuanRacikanList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Data Master",
      });
    });

    // Add penyesuaian stok with menuSystem
    pengajuanPenyesuaianStokList.forEach((p) => {
      all.push({
        ...p,
        menuSystem: p.menuSystem || "Merchandise",
      });
    });
    
    return all;
  };

  const allPengajuan = getAllPengajuan();
  
  // Filter by tab and status
  const filteredPengajuan = allPengajuan.filter((p) => {
    const statusMatch = p.status === filterStatus;
    const tabMatch = activeTab === "Semua" || p.menuSystem === activeTab;
    return statusMatch && tabMatch;
  });

  // Count pengajuan per menu system
  const getPengajuanCountByMenu = (menu: string): number => {
    if (menu === "Semua") {
      return allPengajuan.filter((p) => p.status === filterStatus).length;
    }
    return allPengajuan.filter((p) => p.menuSystem === menu && p.status === filterStatus).length;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Menunggu Persetujuan":
        return { backgroundColor: "#fef3c7", color: "#92400e" };
      case "Disetujui":
        return { backgroundColor: "#d1fae5", color: "#065f46" };
      case "Ditolak":
        return { backgroundColor: "#fee2e2", color: "#991b1b" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#374151" };
    }
  };

  return (
    <DashboardLayout>
      <div>
        {/* Notification Banner */}
        {newPengajuanCount > 0 && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#dbeafe",
              border: "1px solid #3b82f6",
              borderRadius: "8px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: "var(--primary)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                {newPengajuanCount}
              </div>
              <span style={{ color: "#1e40af", fontSize: "14px", fontWeight: "500" }}>
                Ada {newPengajuanCount} pengajuan baru yang menunggu persetujuan
              </span>
            </div>
            <button
              onClick={() => {
                // Mark all as read
                const updatedPesanan = pengajuanList.map((p) => ({ ...p, isNew: false }));
                const updatedPenerimaan = pengajuanPenerimaanList.map((p) => ({ ...p, isNew: false }));
                const updatedApotik = pengajuanApotikList.map((p) => ({ ...p, isNew: false }));
                const updatedUnit = pengajuanUnitList.map((p) => ({ ...p, isNew: false }));
                const updatedSupplier = pengajuanSupplierList.map((p) => ({ ...p, isNew: false }));
                const updatedCustomer = pengajuanCustomerList.map((p) => ({ ...p, isNew: false }));
                const updatedKategori = pengajuanKategoriList.map((p) => ({ ...p, isNew: false }));
                const updatedType = pengajuanTypeList.map((p) => ({ ...p, isNew: false }));
                const updatedJenis = pengajuanJenisList.map((p) => ({ ...p, isNew: false }));
                const updatedMargin = pengajuanMarginList.map((p) => ({ ...p, isNew: false }));
                const updatedRacikan = pengajuanRacikanList.map((p) => ({ ...p, isNew: false }));
                const updatedProduk = pengajuanProdukList.map((p) => ({ ...p, isNew: false }));
                const updatedPenyesuaianStok = pengajuanPenyesuaianStokList.map((p) => ({ ...p, isNew: false }));
                
                localStorage.setItem("pengajuanPembelian", JSON.stringify(updatedPesanan));
                localStorage.setItem("pengajuanPenerimaanPembelian", JSON.stringify(updatedPenerimaan));
                localStorage.setItem("pengajuanApotik", JSON.stringify(updatedApotik));
                localStorage.setItem("pengajuanUnit", JSON.stringify(updatedUnit));
                localStorage.setItem("pengajuanSupplier", JSON.stringify(updatedSupplier));
                localStorage.setItem("pengajuanCustomer", JSON.stringify(updatedCustomer));
                localStorage.setItem("pengajuanKategori", JSON.stringify(updatedKategori));
                localStorage.setItem("pengajuanType", JSON.stringify(updatedType));
                localStorage.setItem("pengajuanJenis", JSON.stringify(updatedJenis));
                localStorage.setItem("pengajuanMargin", JSON.stringify(updatedMargin));
                localStorage.setItem("pengajuanRacikan", JSON.stringify(updatedRacikan));
                localStorage.setItem("pengajuanProduk", JSON.stringify(updatedProduk));
                localStorage.setItem("pengajuanPenyesuaianStok", JSON.stringify(updatedPenyesuaianStok));
                
                setPengajuanList(updatedPesanan);
                setPengajuanPenerimaanList(updatedPenerimaan);
                setPengajuanApotikList(updatedApotik);
                setPengajuanUnitList(updatedUnit);
                setPengajuanSupplierList(updatedSupplier);
                setPengajuanCustomerList(updatedCustomer);
                setPengajuanKategoriList(updatedKategori);
                setPengajuanTypeList(updatedType);
                setPengajuanJenisList(updatedJenis);
                setPengajuanMarginList(updatedMargin);
                setPengajuanRacikanList(updatedRacikan);
                setPengajuanProdukList(updatedProduk);
                setPengajuanPenyesuaianStokList(updatedPenyesuaianStok);
                setNewPengajuanCount(0);
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "500",
              }}
            >
              Tandai sudah dibaca
            </button>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
        </div>

        {/* Tabs by Menu System */}
        <div style={{ marginBottom: "20px", display: "flex", gap: "8px", borderBottom: "2px solid #e2e8f0" }}>
          {["Semua", "Data Master", "Merchandise", "Warehouse"].map((menu) => {
            const count = getPengajuanCountByMenu(menu);
            return (
              <button
                key={menu}
                onClick={() => setActiveTab(menu)}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "transparent",
                  color: activeTab === menu ? "#3b82f6" : "#64748b",
                  border: "none",
                  borderBottom: activeTab === menu ? "3px solid #10b981" : "3px solid transparent",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: activeTab === menu ? "600" : "500",
                  transition: "all 0.2s",
                  position: "relative",
                  bottom: "-2px",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== menu) {
                    e.currentTarget.style.color = "#3b82f6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== menu) {
                    e.currentTarget.style.color = "#64748b";
                  }
                }}
              >
                {menu} ({count})
              </button>
            );
          })}
        </div>

        {/* Filter Type - REMOVED, replaced by tabs */}
        {/* <div style={{ marginBottom: "20px", display: "flex", gap: "12px" }}>
          <button
            onClick={() => setFilterType("Pesanan Pembelian")}
            style={{
              padding: "8px 16px",
              backgroundColor: filterType === "Pesanan Pembelian" ? "#3b82f6" : "#f3f4f6",
              color: filterType === "Pesanan Pembelian" ? "white" : "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (filterType !== "Pesanan Pembelian") {
                e.currentTarget.style.backgroundColor = "#e5e7eb";
              }
            }}
            onMouseLeave={(e) => {
              if (filterType !== "Pesanan Pembelian") {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }
            }}
          >
            Pesanan Pembelian
          </button>
          <button
            onClick={() => setFilterType("Penerimaan Pembelian")}
            style={{
              padding: "8px 16px",
              backgroundColor: filterType === "Penerimaan Pembelian" ? "#3b82f6" : "#f3f4f6",
              color: filterType === "Penerimaan Pembelian" ? "white" : "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (filterType !== "Penerimaan Pembelian") {
                e.currentTarget.style.backgroundColor = "#e5e7eb";
              }
            }}
            onMouseLeave={(e) => {
              if (filterType !== "Penerimaan Pembelian") {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }
            }}
          >
            Penerimaan Pembelian
          </button>
          <button
            onClick={() => setFilterType("Data Apotik")}
            style={{
              padding: "8px 16px",
              backgroundColor: filterType === "Data Apotik" ? "#3b82f6" : "#f3f4f6",
              color: filterType === "Data Apotik" ? "white" : "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (filterType !== "Data Apotik") {
                e.currentTarget.style.backgroundColor = "#e5e7eb";
              }
            }}
            onMouseLeave={(e) => {
              if (filterType !== "Data Apotik") {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }
            }}
          >
            Data Apotik
          </button>
        </div>

        {/* Filter Status */}
        <div style={{ marginBottom: "20px", display: "flex", gap: "12px" }}>
          <button
            onClick={() => setFilterStatus("Menunggu Persetujuan")}
            style={{
              padding: "8px 16px",
              backgroundColor: filterStatus === "Menunggu Persetujuan" ? "#3b82f6" : "#f3f4f6",
              color: filterStatus === "Menunggu Persetujuan" ? "white" : "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (filterStatus !== "Menunggu Persetujuan") {
                e.currentTarget.style.backgroundColor = "#e5e7eb";
              }
            }}
            onMouseLeave={(e) => {
              if (filterStatus !== "Menunggu Persetujuan") {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }
            }}
          >
            Menunggu Persetujuan
          </button>
          <button
            onClick={() => setFilterStatus("Disetujui")}
            style={{
              padding: "8px 16px",
              backgroundColor: filterStatus === "Disetujui" ? "#3b82f6" : "#f3f4f6",
              color: filterStatus === "Disetujui" ? "white" : "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (filterStatus !== "Disetujui") {
                e.currentTarget.style.backgroundColor = "#e5e7eb";
              }
            }}
            onMouseLeave={(e) => {
              if (filterStatus !== "Disetujui") {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }
            }}
          >
            Disetujui
          </button>
          <button
            onClick={() => setFilterStatus("Ditolak")}
            style={{
              padding: "8px 16px",
              backgroundColor: filterStatus === "Ditolak" ? "#3b82f6" : "#f3f4f6",
              color: filterStatus === "Ditolak" ? "white" : "#374151",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (filterStatus !== "Ditolak") {
                e.currentTarget.style.backgroundColor = "#e5e7eb";
              }
            }}
            onMouseLeave={(e) => {
              if (filterStatus !== "Ditolak") {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }
            }}
          >
            Ditolak
          </button>
        </div>

        {/* Table */}
        {filteredPengajuan.length > 0 ? (
          <div
            style={{
              backgroundColor: "var(--surface)",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>NO</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>JENIS</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>NO. BUKTI</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>NAMA</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>TIPE PERUBAHAN</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>ALASAN</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>TANGGAL</th>
                  <th style={{ padding: "12px", textAlign: "left", fontSize: "13px", fontWeight: "600", color: "#475569" }}>STATUS</th>
                  <th style={{ padding: "12px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#475569", width: "200px" }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredPengajuan.map((pengajuan, index) => {
                  const isPenerimaan = pengajuan.menuSystem === "Warehouse" && pengajuan.penerimaanId;
                  const isPenyesuaianStokGlobal = pengajuan.menuSystem === "Merchandise" && pengajuan.isGlobal && Array.isArray(pengajuan.riwayatData);
                  const isPenyesuaianStok = pengajuan.menuSystem === "Merchandise" && (pengajuan.penyesuaianStokId || isPenyesuaianStokGlobal);
                  const isApotik = pengajuan.menuSystem === "Data Master" && pengajuan.apotikId;
                  const isUnit = pengajuan.menuSystem === "Data Master" && pengajuan.unitId;
                  const isSupplier = pengajuan.menuSystem === "Data Master" && pengajuan.supplierId;
                  const isCustomer = pengajuan.menuSystem === "Data Master" && pengajuan.customerId;
                  const isKategori = pengajuan.menuSystem === "Data Master" && pengajuan.kategoriId;
                  const isType = pengajuan.menuSystem === "Data Master" && pengajuan.typeId;
                  const isJenis = pengajuan.menuSystem === "Data Master" && pengajuan.jenisId;
                  const isMargin = pengajuan.menuSystem === "Data Master" && pengajuan.marginId;
                  const isRacikan = pengajuan.menuSystem === "Data Master" && pengajuan.racikanId;
                  const isProduk = pengajuan.menuSystem === "Data Master" && pengajuan.produkId;
                  const isPesanan = pengajuan.menuSystem === "Merchandise" && !pengajuan.penyesuaianStokId;
                  
                  const nomorBukti = isPenyesuaianStok
                    ? (pengajuan.noBuktiPenyesuaian || (Array.isArray((pengajuan as any).riwayatData) ? (pengajuan as any).riwayatData[0]?.noBuktiPenyesuaian : (pengajuan as any).riwayatData?.noBuktiPenyesuaian) || "-")
                    : isApotik 
                    ? pengajuan.kodeApotik || "-"
                    : isUnit
                    ? pengajuan.kodeUnit || "-"
                    : isSupplier
                    ? pengajuan.kodeSupplier || "-"
                    : isCustomer
                    ? pengajuan.kodeCustomer || "-"
                    : isKategori
                    ? pengajuan.kodeKategori || "-"
                    : isType
                    ? pengajuan.kodeType || "-"
                    : isJenis
                    ? pengajuan.kodeJenis || "-"
                    : isMargin
                    ? pengajuan.kodeMargin || "-"
                    : isRacikan
                    ? pengajuan.kodeRacikan || "-"
                    : isProduk
                    ? pengajuan.kodeProduk || "-"
                    : isPenerimaan 
                    ? pengajuan.nomorPenerimaan || "-"
                    : pengajuan.nomorPesanan || "-";
                  
                  const nama = isPenyesuaianStokGlobal
                    ? "Penyesuaian Stok (seluruh produk)"
                    : isPenyesuaianStok
                    ? ((pengajuan as any).riwayatData?.namaProduk || pengajuan.noBuktiPenyesuaian || "Penyesuaian Stok")
                    : isApotik
                    ? pengajuan.namaApotik || "-"
                    : isUnit
                    ? pengajuan.namaUnit || "-"
                    : isSupplier
                    ? pengajuan.namaSupplier || "-"
                    : isCustomer
                    ? pengajuan.namaCustomer || "-"
                    : isKategori
                    ? pengajuan.namaKategori || "-"
                    : isType
                    ? pengajuan.namaType || "-"
                    : isJenis
                    ? pengajuan.namaJenis || "-"
                    : isMargin
                    ? pengajuan.namaMargin || "-"
                    : isRacikan
                    ? pengajuan.namaRacikan || "-"
                    : isProduk
                    ? pengajuan.namaProduk || "-"
                    : isPesanan || isPenerimaan
                    ? "-" // Could be supplier name or other
                    : "-";
                  
                  const isEditType = pengajuan.jenisPengajuan === "Edit Transaksi" || pengajuan.jenisPengajuan === "Edit Data";
                  return (
                    <tr
                      key={pengajuan.id}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        transition: "background-color 0.2s",
                        backgroundColor: pengajuan.isNew ? "#fef3c7" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = pengajuan.isNew ? "#fef3c7" : "transparent";
                      }}
                    >
                      <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-primary)" }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-primary)" }}>
                        {pengajuan.menuSystem || "-"}
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-primary)" }}>
                        {nomorBukti}
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-primary)" }}>
                        {nama}
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-primary)" }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "500",
                            backgroundColor: isEditType ? "#dbeafe" : "#fee2e2",
                            color: isEditType ? "#1e40af" : "#991b1b",
                          }}
                        >
                          {pengajuan.jenisPengajuan}
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)", maxWidth: "200px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={pengajuan.alasanPengajuan}>
                          {pengajuan.alasanPengajuan}
                        </div>
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {formatDate(pengajuan.createdAt)}
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px" }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "500",
                            ...getStatusBadgeStyle(pengajuan.status),
                          }}
                        >
                          {pengajuan.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px" }}>
                        {pengajuan.status === "Menunggu Persetujuan" ? (
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => {
                                handleSetujui(pengajuan);
                              }}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#059669";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#10b981";
                              }}
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => handleTolak(pengajuan)}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
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
                              Tolak
                            </button>
                          </div>
                        ) : pengajuan.status === "Disetujui" && (pengajuan.jenisPengajuan === "Edit Transaksi" || pengajuan.jenisPengajuan === "Edit Data" || ((isPenyesuaianStok || isPenyesuaianStokGlobal) && (pengajuan.jenisPengajuan === "Edit Data" || pengajuan.jenisPengajuan === "Hapus Data"))) ? (
                          isPenyesuaianStok ? (
                            <Link
                              href="/admin/pembelian/penyesuaian-stok"
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                textDecoration: "none",
                                display: "inline-block",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#2563eb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#3b82f6";
                              }}
                            >
                              Lihat Penyesuaian Stok
                            </Link>
                          ) : pengajuan.menuSystem === "Data Master" && pengajuan.apotikId ? (
                            <Link
                              href={`/admin/master-data/apotik?edit=${pengajuan.apotikId}`}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                textDecoration: "none",
                                display: "inline-block",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#2563eb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#3b82f6";
                              }}
                            >
                              Edit Apotik
                            </Link>
                          ) : pengajuan.menuSystem === "Data Master" && pengajuan.unitId ? (
                            <Link
                              href={`/admin/master-data/unit?edit=${pengajuan.unitId}`}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                textDecoration: "none",
                                display: "inline-block",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#2563eb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#3b82f6";
                              }}
                            >
                              Edit Unit
                            </Link>
                          ) : pengajuan.menuSystem === "Data Master" && pengajuan.supplierId ? (
                            <Link
                              href={`/admin/master-data/supplier?edit=${pengajuan.supplierId}`}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                textDecoration: "none",
                                display: "inline-block",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#2563eb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#3b82f6";
                              }}
                            >
                              Edit Supplier
                            </Link>
                          ) : pengajuan.menuSystem === "Data Master" && pengajuan.customerId ? (
                            <Link
                              href={`/admin/master-data/customer?edit=${pengajuan.customerId}`}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                textDecoration: "none",
                                display: "inline-block",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#2563eb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#3b82f6";
                              }}
                            >
                              Edit Customer
                            </Link>
                          ) : pengajuan.menuSystem === "Data Master" && pengajuan.kategoriId ? (
                            <Link
                              href={`/admin/master-data/kategori?edit=${pengajuan.kategoriId}`}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                textDecoration: "none",
                                display: "inline-block",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#2563eb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#3b82f6";
                              }}
                            >
                              Edit Kategori
                            </Link>
                          ) : pengajuan.menuSystem === "Data Master" && pengajuan.produkId ? (
                            <Link
                              href={`/admin/master-data/obat?edit=${pengajuan.produkId}`}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                textDecoration: "none",
                                display: "inline-block",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#2563eb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#3b82f6";
                              }}
                            >
                              Edit Produk
                            </Link>
                          ) : pengajuan.menuSystem === "Warehouse" ? (
                            <Link
                              href={`/admin/warehouse/terima-pembelian?edit=${pengajuan.penerimaanId}`}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                textDecoration: "none",
                                display: "inline-block",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#2563eb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#3b82f6";
                              }}
                            >
                              Edit Penerimaan
                            </Link>
                          ) : (
                            <Link
                              href={`/admin/pembelian/pesanan?edit=${pengajuan.pesananId}`}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                textDecoration: "none",
                                display: "inline-block",
                                transition: "background-color 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#2563eb";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#3b82f6";
                              }}
                            >
                              Edit PO
                            </Link>
                          )
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>-</span>
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
              backgroundColor: "var(--surface)",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--text-secondary)" }}>
              Tidak ada pengajuan dengan status "{filterStatus}".
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

