"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DashboardLayout from "../../components/DashboardLayout";
import { getSupabaseClient } from "../../lib/supabaseClient";

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
  stokPerApotik?: { [apotikId: string]: number };
  supplier: string;
  keterangan: string;
  statusAktif: boolean;
  createdAt: Date;
}

interface Apotik {
  id: string;
  namaApotik: string;
  kodeApotik: string;
  statusAktif: boolean;
}

export default function InventoryPage() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "low" | "out">("all");
  const [filterApotik, setFilterApotik] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [viewStockModal, setViewStockModal] = useState<{
    isOpen: boolean;
    product: Product | null;
    apotikId: string | null;
  }>({
    isOpen: false,
    product: null,
    apotikId: null,
  });

  // Format stock dengan multiple units
  const formatStock = (product: Product, apotikId?: string): string => {
    let stockValue = product.stokAwal;
    
    // If apotik filter is selected, use stokPerApotik
    if (apotikId && product.stokPerApotik && product.stokPerApotik[apotikId] !== undefined) {
      stockValue = product.stokPerApotik[apotikId];
    }
    
    if (!product.units || product.units.length === 0) {
      return `${stockValue} ${product.satuan}`;
    }
    
    const sortedUnits = [...product.units].sort((a, b) => a.urutan - b.urutan);
    let remainingStock = stockValue;
    const parts: string[] = [];
    
    for (const unit of sortedUnits) {
      if (remainingStock >= unit.konversi && unit.konversi > 0) {
        const count = Math.floor(remainingStock / unit.konversi);
        if (count > 0) {
          parts.push(`${count} ${unit.namaUnit}`);
          remainingStock = remainingStock % unit.konversi;
        }
      }
    }
    
    if (remainingStock > 0) {
      const baseUnit = sortedUnits.find(u => u.isBaseUnit);
      if (baseUnit) {
        parts.push(`${remainingStock} ${baseUnit.namaUnit}`);
      }
    }
    
    return parts.join(" + ") || "0";
  };

  // Fungsi untuk mendapatkan detail stok per unit
  const getStockDetail = (product: Product, apotikId?: string): { unit: string; qty: number; konversi: number }[] => {
    let stockValue = product.stokAwal;
    
    // If apotik filter is selected, use stokPerApotik
    if (apotikId && product.stokPerApotik && product.stokPerApotik[apotikId] !== undefined) {
      stockValue = product.stokPerApotik[apotikId];
    }
    
    if (!product.units || product.units.length === 0) {
      return [{ unit: product.satuan, qty: stockValue, konversi: 1 }];
    }
    
    const sortedUnits = [...product.units].sort((a, b) => b.urutan - a.urutan); // Sort descending untuk mulai dari unit terbesar
    let remainingStock = stockValue;
    const details: { unit: string; qty: number; konversi: number }[] = [];
    
    for (const unit of sortedUnits) {
      if (remainingStock >= unit.konversi && unit.konversi > 0) {
        const count = Math.floor(remainingStock / unit.konversi);
        if (count > 0) {
          details.push({
            unit: unit.namaUnit,
            qty: count,
            konversi: unit.konversi,
          });
          remainingStock = remainingStock % unit.konversi;
        }
      }
    }
    
    // Add remaining stock in base unit
    if (remainingStock > 0) {
      const baseUnit = sortedUnits.find(u => u.isBaseUnit) || sortedUnits[sortedUnits.length - 1];
      if (baseUnit) {
        details.push({
          unit: baseUnit.namaUnit,
          qty: remainingStock,
          konversi: 1,
        });
      }
    }
    
    return details;
  };

  // Fungsi untuk membuka modal view stock
  const handleViewStock = (product: Product, apotikId?: string) => {
    setViewStockModal({
      isOpen: true,
      product,
      apotikId: apotikId || null,
    });
  };

  // Fungsi untuk menutup modal
  const handleCloseStockModal = () => {
    setViewStockModal({
      isOpen: false,
      product: null,
      apotikId: null,
    });
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Check stock status
  const getStockStatus = (product: Product, apotikId?: string): { status: "normal" | "low" | "out"; color: string; bgColor: string; text: string } => {
    let stockValue = product.stokAwal;
    
    // If apotik filter is selected, use stokPerApotik
    if (apotikId && product.stokPerApotik && product.stokPerApotik[apotikId] !== undefined) {
      stockValue = product.stokPerApotik[apotikId];
    }
    
    if (stockValue <= 0) {
      return {
        status: "out",
        color: "#991b1b",
        bgColor: "#fee2e2",
        text: "Habis"
      };
    } else if (stockValue <= (product.stokMinimum ?? 0)) {
      return {
        status: "low",
        color: "#d97706",
        bgColor: "#fef3c7",
        text: "Rendah"
      };
    }
    return {
      status: "normal",
      color: "#065f46",
      bgColor: "#d1fae5",
      text: "Normal"
    };
  };

  // Load data dari localStorage dan API (sumber sama dengan master & transaksi) — muat ulang setiap kali halaman ini dibuka
  useEffect(() => {
    if (pathname !== "/inventory") return;
    setLoading(true);

    // Load from localStorage first (for immediate display)
    const loadFromLocalStorage = () => {
      const savedProducts = localStorage.getItem("products");
      if (savedProducts) {
        try {
          const parsed = JSON.parse(savedProducts);
          const productsWithDate = parsed.map((p: any) => ({
            ...p,
            stokMinimum: p.stokMinimum ?? 0,
            stokMaksimum: p.stokMaksimum ?? 0,
            stokAwal: p.stokAwal ?? 0,
            supplier: p.supplier ?? "",
            keterangan: p.keterangan ?? "",
            statusAktif: p.statusAktif !== false,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          }));
          setProducts(productsWithDate);
          setFilteredProducts(productsWithDate);

          const uniqueCategories = Array.from(new Set(productsWithDate.map((p: Product) => p.kategori).filter(Boolean)));
          setCategories(uniqueCategories as string[]);
        } catch (err) {
          console.error("Error loading products:", err);
        }
      } else {
        setProducts([]);
        setFilteredProducts([]);
        setCategories([]);
      }

      const savedSuppliers = localStorage.getItem("suppliers");
      if (savedSuppliers) {
        try {
          setSuppliers(JSON.parse(savedSuppliers));
        } catch (err) {
          console.error("Error loading suppliers:", err);
        }
      } else {
        setSuppliers([]);
      }

      const savedApotiks = localStorage.getItem("apotiks");
      if (savedApotiks) {
        try {
          const parsed = JSON.parse(savedApotiks);
          const activeApotiks = parsed.filter((a: Apotik) => a.statusAktif !== false);
          setApotiks(activeApotiks);
        } catch (err) {
          console.error("Error loading apotiks:", err);
        }
      } else {
        setApotiks([]);
      }
    };

    loadFromLocalStorage();

    // Load from API and merge with localStorage (prioritize stokPerApotik from localStorage)
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token) {
        setLoading(false);
        return;
      }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/products", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/suppliers", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/apotiks", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      ]).then(([productsData, suppliersData, apotiksData]) => {
        // Merge products: prioritize stokPerApotik from localStorage if different
        if (Array.isArray(productsData) && productsData.length > 0) {
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
                  // Merge stokPerApotik: prioritaskan data lokal karena lebih baru setelah update stok
                  // Jika data API memiliki apotik yang tidak ada di lokal, tambahkan juga
                  const mergedStokPerApotik = local.stokPerApotik 
                    ? { ...(p.stokPerApotik || {}), ...local.stokPerApotik }
                    : (p.stokPerApotik || {});
                  // Merge semua field dari local untuk memastikan data terbaru
                  return { ...p, ...local, stokPerApotik: mergedStokPerApotik };
                }
                return p;
              });
              
              // Tambahkan produk yang ada di localStorage tapi tidak ada di API (produk baru)
              const apiProductIds = new Set(productsData.map((p: any) => p.id));
              const localOnlyProducts = arr.filter((p: any) => !apiProductIds.has(p.id));
              if (localOnlyProducts.length > 0) {
                mergedProducts = [...mergedProducts, ...localOnlyProducts];
              }
            }
          } catch (_) {}
          
          const productsWithDate = mergedProducts.map((p: any) => ({
            ...p,
            stokMinimum: p.stokMinimum ?? 0,
            stokMaksimum: p.stokMaksimum ?? 0,
            stokAwal: p.stokAwal ?? 0,
            supplier: p.supplier ?? "",
            keterangan: p.keterangan ?? "",
            statusAktif: p.statusAktif !== false,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          }));
          setProducts(productsWithDate);
          setFilteredProducts(productsWithDate);
          const uniqueCategories = Array.from(new Set(productsWithDate.map((p: Product) => p.kategori).filter(Boolean)));
          setCategories(uniqueCategories as string[]);
          localStorage.setItem("products", JSON.stringify(mergedProducts));
        } else {
          loadFromLocalStorage();
        }

        if (Array.isArray(suppliersData) && suppliersData.length > 0) {
          setSuppliers(suppliersData);
          localStorage.setItem("suppliers", JSON.stringify(suppliersData));
        }

        if (Array.isArray(apotiksData) && apotiksData.length > 0) {
          const activeApotiks = apotiksData.filter((a: Apotik) => a.statusAktif !== false);
          setApotiks(activeApotiks);
          localStorage.setItem("apotiks", JSON.stringify(apotiksData));
        }

        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }).catch(() => {
      setLoading(false);
    });
  }, [pathname]);

  // Filter products
  useEffect(() => {
    let filtered = [...products];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.kodeProduk.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.namaProduk.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (filterKategori) {
      filtered = filtered.filter((p) => p.kategori === filterKategori);
    }

    // Filter by apotik
    if (filterApotik) {
      filtered = filtered.filter((p) => {
        if (p.stokPerApotik && p.stokPerApotik[filterApotik] !== undefined) {
          return true;
        }
        return false;
      });
    }

    // Filter by stock status (consider apotik filter)
    if (filterStatus === "low") {
      filtered = filtered.filter((p) => {
        let stockValue = p.stokAwal;
        if (filterApotik && p.stokPerApotik && p.stokPerApotik[filterApotik] !== undefined) {
          stockValue = p.stokPerApotik[filterApotik];
        }
        return stockValue > 0 && stockValue <= (p.stokMinimum ?? 0);
      });
    } else if (filterStatus === "out") {
      filtered = filtered.filter((p) => {
        let stockValue = p.stokAwal;
        if (filterApotik && p.stokPerApotik && p.stokPerApotik[filterApotik] !== undefined) {
          stockValue = p.stokPerApotik[filterApotik];
        }
        return stockValue <= 0;
      });
    }

    // Tampilkan produk yang aktif (termasuk yang statusAktif belum diset)
    filtered = filtered.filter((p) => p.statusAktif !== false);

    setFilteredProducts(filtered);
  }, [searchTerm, filterKategori, filterStatus, filterApotik, products]);

  // Get supplier name
  const getSupplierName = (supplierId: string): string => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier?.namaSupplier || supplierId;
  };

  // Get apotik name
  const getApotikName = (apotikId: string): string => {
    const apotik = apotiks.find((a) => a.id === apotikId);
    return apotik?.namaApotik || apotikId;
  };

  // Count statistics (sama seperti filter: anggap statusAktif !== false)
  const stats = {
    total: products.filter((p) => p.statusAktif !== false).length,
    lowStock: products.filter((p) => p.statusAktif !== false && p.stokAwal > 0 && p.stokAwal <= (p.stokMinimum ?? 0)).length,
    outOfStock: products.filter((p) => p.statusAktif !== false && p.stokAwal <= 0).length,
    normalStock: products.filter((p) => p.statusAktif !== false && p.stokAwal > (p.stokMinimum ?? 0)).length,
  };

  const handleRefreshData = () => {
    setLoading(true);
    
    // Load from API and merge with localStorage
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session?.access_token) {
        // Fallback to localStorage if no auth
        const savedProducts = localStorage.getItem("products");
        if (savedProducts) {
          try {
            const parsed = JSON.parse(savedProducts);
            const productsWithDate = parsed.map((p: any) => ({
              ...p,
              stokMinimum: p.stokMinimum ?? 0,
              stokMaksimum: p.stokMaksimum ?? 0,
              stokAwal: p.stokAwal ?? 0,
              supplier: p.supplier ?? "",
              keterangan: p.keterangan ?? "",
              statusAktif: p.statusAktif !== false,
              createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            }));
            setProducts(productsWithDate);
            setFilteredProducts(productsWithDate);
            const uniqueCategories = Array.from(new Set(productsWithDate.map((p: Product) => p.kategori).filter(Boolean)));
            setCategories(uniqueCategories as string[]);
          } catch (err) {
            console.error("Error loading products:", err);
          }
        }
        const savedSuppliers = localStorage.getItem("suppliers");
        if (savedSuppliers) try { setSuppliers(JSON.parse(savedSuppliers)); } catch (_) {}
        const savedApotiks = localStorage.getItem("apotiks");
        if (savedApotiks) {
          try {
            const parsed = JSON.parse(savedApotiks);
            setApotiks(parsed.filter((a: Apotik) => a.statusAktif !== false));
          } catch (_) {}
        }
        setLoading(false);
        return;
      }
      const token = data.session.access_token;
      Promise.all([
        fetch("/api/data/products", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/suppliers", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
        fetch("/api/data/apotiks", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : []),
      ]).then(([productsData, suppliersData, apotiksData]) => {
        // Merge products: prioritize stokPerApotik from localStorage if different
        if (Array.isArray(productsData) && productsData.length > 0) {
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
                  // Merge stokPerApotik: prioritaskan data lokal karena lebih baru setelah update stok
                  // Jika data API memiliki apotik yang tidak ada di lokal, tambahkan juga
                  const mergedStokPerApotik = local.stokPerApotik 
                    ? { ...(p.stokPerApotik || {}), ...local.stokPerApotik }
                    : (p.stokPerApotik || {});
                  // Merge semua field dari local untuk memastikan data terbaru
                  return { ...p, ...local, stokPerApotik: mergedStokPerApotik };
                }
                return p;
              });
              
              // Tambahkan produk yang ada di localStorage tapi tidak ada di API (produk baru)
              const apiProductIds = new Set(productsData.map((p: any) => p.id));
              const localOnlyProducts = arr.filter((p: any) => !apiProductIds.has(p.id));
              if (localOnlyProducts.length > 0) {
                mergedProducts = [...mergedProducts, ...localOnlyProducts];
              }
            }
          } catch (_) {}
          
          const productsWithDate = mergedProducts.map((p: any) => ({
            ...p,
            stokMinimum: p.stokMinimum ?? 0,
            stokMaksimum: p.stokMaksimum ?? 0,
            stokAwal: p.stokAwal ?? 0,
            supplier: p.supplier ?? "",
            keterangan: p.keterangan ?? "",
            statusAktif: p.statusAktif !== false,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          }));
          setProducts(productsWithDate);
          setFilteredProducts(productsWithDate);
          const uniqueCategories = Array.from(new Set(productsWithDate.map((p: Product) => p.kategori).filter(Boolean)));
          setCategories(uniqueCategories as string[]);
          localStorage.setItem("products", JSON.stringify(mergedProducts));
        } else {
          // Fallback to localStorage
          const savedProducts = localStorage.getItem("products");
          if (savedProducts) {
            try {
              const parsed = JSON.parse(savedProducts);
              const productsWithDate = parsed.map((p: any) => ({
                ...p,
                stokMinimum: p.stokMinimum ?? 0,
                stokMaksimum: p.stokMaksimum ?? 0,
                stokAwal: p.stokAwal ?? 0,
                supplier: p.supplier ?? "",
                keterangan: p.keterangan ?? "",
                statusAktif: p.statusAktif !== false,
                createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
              }));
              setProducts(productsWithDate);
              setFilteredProducts(productsWithDate);
              const uniqueCategories = Array.from(new Set(productsWithDate.map((p: Product) => p.kategori).filter(Boolean)));
              setCategories(uniqueCategories as string[]);
            } catch (err) {
              console.error("Error loading products:", err);
            }
          }
        }

        if (Array.isArray(suppliersData) && suppliersData.length > 0) {
          setSuppliers(suppliersData);
          localStorage.setItem("suppliers", JSON.stringify(suppliersData));
        } else {
          const savedSuppliers = localStorage.getItem("suppliers");
          if (savedSuppliers) try { setSuppliers(JSON.parse(savedSuppliers)); } catch (_) {}
        }

        if (Array.isArray(apotiksData) && apotiksData.length > 0) {
          const activeApotiks = apotiksData.filter((a: Apotik) => a.statusAktif !== false);
          setApotiks(activeApotiks);
          localStorage.setItem("apotiks", JSON.stringify(apotiksData));
        } else {
          const savedApotiks = localStorage.getItem("apotiks");
          if (savedApotiks) {
            try {
              const parsed = JSON.parse(savedApotiks);
              setApotiks(parsed.filter((a: Apotik) => a.statusAktif !== false));
            } catch (_) {}
          }
        }

        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }).catch(() => {
      setLoading(false);
    });
  };

  return (
    <DashboardLayout>
      <div style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#1e293b" }}>
            Informasi Inventory
          </h2>
          <button
            type="button"
            onClick={handleRefreshData}
            disabled={loading}
            style={{
              padding: "8px 16px",
              backgroundColor: loading ? "#94a3b8" : "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Memuat..." : "Refresh data"}
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Cari Produk
              </label>
              <input
                type="text"
                placeholder="Cari berdasarkan kode atau nama produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Kategori
              </label>
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
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
                <option value="">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Apotik
              </label>
              <select
                value={filterApotik}
                onChange={(e) => setFilterApotik(e.target.value)}
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
                <option value="">Semua Apotik</option>
                {apotiks.map((apotik) => (
                  <option key={apotik.id} value={apotik.id}>
                    {apotik.namaApotik}
                  </option>
                ))}
              </select>
            </div>
      <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Status Stok
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as "all" | "low" | "out")}
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
                <option value="all">Semua Status</option>
                <option value="low">Stok Rendah</option>
                <option value="out">Stok Habis</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Memuat data...</div>
        ) : filteredProducts.length === 0 ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "40px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#64748b" }}>Tidak ada data produk yang ditemukan.</p>
          </div>
        ) : (
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
                      Kode Produk
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
                      Nama Produk
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
                      Kategori
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
                      Apotik
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
                      Qty Stok
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
                      Supplier
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        borderBottom: "2px solid #e2e8f0",
                        padding: "12px 16px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#475569",
                      }}
                    >
                      Harga Jual
                  </th>
          </tr>
        </thead>
        <tbody>
                  {filteredProducts.map((product) => {
                    // Get list of apotiks to display
                    let apotikIdsToShow: string[] = [];
                    
                    if (filterApotik) {
                      // If filter is selected, only show that apotik
                      if (product.stokPerApotik && product.stokPerApotik[filterApotik] !== undefined) {
                        apotikIdsToShow = [filterApotik];
                      } else {
                        // If product doesn't have stock in filtered apotik, skip it
                        return null;
                      }
                    } else {
                      // If no filter, show all apotiks that have stock OR show at least one row for the product
                      if (product.stokPerApotik && Object.keys(product.stokPerApotik).length > 0) {
                        apotikIdsToShow = Object.keys(product.stokPerApotik).filter(
                          (id) => (product.stokPerApotik![id] ?? 0) > 0
                        );
                        // If all stocks are 0 but product exists, show at least one apotik (prefer the one with stokPerApotik entry)
                        if (apotikIdsToShow.length === 0 && Object.keys(product.stokPerApotik).length > 0) {
                          apotikIdsToShow = [Object.keys(product.stokPerApotik)[0]];
                        }
                      }
                      // If no stokPerApotik at all, show all apotiks (product should still be visible)
                      if (apotikIdsToShow.length === 0) {
                        apotikIdsToShow = apotiks.length > 0 ? [apotiks[0].id] : [];
                      }
                    }
                    
                    // If no apotiks to show, show one row with first apotik or "-"
                    if (apotikIdsToShow.length === 0) {
                      const stockStatus = getStockStatus(product);
                      return (
                        <tr
                          key={product.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                            backgroundColor: stockStatus.status === "out" ? "#fef2f2" : stockStatus.status === "low" ? "#fffbeb" : "white",
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
                            {product.kodeProduk}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontSize: "14px",
                              color: "#1e293b",
                            }}
                          >
                            {product.namaProduk}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            {product.kategori}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            {apotiks.length > 0 ? getApotikName(apotiks[0].id) : "-"}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontSize: "14px",
                              textAlign: "center",
                              color: "#1e293b",
                              fontWeight: "500",
                            }}
                          >
                            {formatStock(product, apotiks.length > 0 ? apotiks[0].id : undefined)}
                          </td>
                          <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "#64748b",
                      }}
                    >
                            {getSupplierName(product.supplier)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        textAlign: "right",
                        color: "#1e293b",
                        fontWeight: "500",
                      }}
                    >
                            {formatCurrency(product.hargaJual)}
              </td>
            </tr>
                      );
                    }
                    
                    // Show one row per apotik
                    return apotikIdsToShow.map((apotikId, index) => {
                      const stockStatus = getStockStatus(product, apotikId);
                      const apotikName = getApotikName(apotikId);
                      
                      return (
                        <tr
                          key={`${product.id}-${apotikId}`}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            backgroundColor: stockStatus.status === "out" ? "#fef2f2" : stockStatus.status === "low" ? "#fffbeb" : "white",
                          }}
                        >
                          {index === 0 && (
                            <>
                              <td
                                rowSpan={apotikIdsToShow.length}
                                style={{
                                  padding: "12px 16px",
                                  fontSize: "14px",
                                  color: "#1e293b",
                                  fontWeight: "500",
                                }}
                              >
                                {product.kodeProduk}
                              </td>
                              <td
                                rowSpan={apotikIdsToShow.length}
                                style={{
                                  padding: "12px 16px",
                                  fontSize: "14px",
                                  color: "#1e293b",
                                }}
                              >
                                {product.namaProduk}
                              </td>
                              <td
                                rowSpan={apotikIdsToShow.length}
                                style={{
                                  padding: "12px 16px",
                                  fontSize: "14px",
                                  color: "#64748b",
                                }}
                              >
                                {product.kategori}
                              </td>
                            </>
                          )}
                          <td
                            style={{
                              padding: "12px 16px",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            {apotikName}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              fontSize: "14px",
                              textAlign: "center",
                              color: "#1e293b",
                              fontWeight: "500",
                            }}
                          >
                            {formatStock(product, apotikId)}
                          </td>
                          {index === 0 && (
                            <>
                              <td
                                rowSpan={apotikIdsToShow.length}
                                style={{
                                  padding: "12px 16px",
                                  fontSize: "14px",
                                  color: "#64748b",
                                }}
                              >
                                {getSupplierName(product.supplier)}
                              </td>
                              <td
                                rowSpan={apotikIdsToShow.length}
                                style={{
                                  padding: "12px 16px",
                                  fontSize: "14px",
                                  textAlign: "right",
                                  color: "#1e293b",
                                  fontWeight: "500",
                                }}
                              >
                                {formatCurrency(product.hargaJual)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    });
                  }).filter(Boolean)}
        </tbody>
      </table>
            </div>
    </div>
        )}

        {/* Modal View Detail Stok */}
        {viewStockModal.isOpen && viewStockModal.product && (
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
                width: "90%",
                maxWidth: "500px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                padding: "24px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  borderBottom: "2px solid #e2e8f0",
                  paddingBottom: "16px",
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
                  Detail Stok
                </h3>
                <button
                  onClick={handleCloseStockModal}
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
              <div style={{ marginBottom: "20px" }}>
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#64748b",
                      marginBottom: "4px",
                    }}
                  >
                    Produk
                  </label>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
                    {viewStockModal.product.namaProduk} ({viewStockModal.product.kodeProduk})
                  </div>
                </div>

                {viewStockModal.apotikId && (
                  <div style={{ marginBottom: "12px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: "500",
                        color: "#64748b",
                        marginBottom: "4px",
                      }}
                    >
                      Apotik
                    </label>
                    <div style={{ fontSize: "16px", fontWeight: "500", color: "#1e293b" }}>
                      {getApotikName(viewStockModal.apotikId)}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: "#64748b",
                      marginBottom: "8px",
                    }}
                  >
                    Detail Stok per Unit
                  </label>
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      borderRadius: "6px",
                      padding: "16px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {getStockDetail(viewStockModal.product, viewStockModal.apotikId || undefined).length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {getStockDetail(viewStockModal.product, viewStockModal.apotikId || undefined).map((detail, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 12px",
                              backgroundColor: "#ffffff",
                              borderRadius: "4px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                                {detail.qty}
                              </span>
                              <span style={{ fontSize: "14px", color: "#64748b" }}>{detail.unit}</span>
                            </div>
                            {detail.konversi > 1 && (
                              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                                = {detail.qty * detail.konversi} pcs
                              </span>
                            )}
                          </div>
                        ))}
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "8px 12px",
                            backgroundColor: "#eff6ff",
                            borderRadius: "4px",
                            border: "1px solid #bfdbfe",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "#1e40af" }}>
                              Total Stok
                            </span>
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "#1e40af" }}>
                              {(() => {
                                const stockValue = viewStockModal.apotikId && viewStockModal.product.stokPerApotik
                                  ? viewStockModal.product.stokPerApotik[viewStockModal.apotikId] || 0
                                  : viewStockModal.product.stokAwal;
                                return `${stockValue} pcs`;
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                        Tidak ada stok
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={handleCloseStockModal}
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
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
