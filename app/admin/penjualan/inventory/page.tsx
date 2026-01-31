"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

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

export default function InventoryPOSPage() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [currentApotikId, setCurrentApotikId] = useState<string>("");
  const [currentApotikName, setCurrentApotikName] = useState<string>("");
  const [isPosLoggedIn, setIsPosLoggedIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewStockModal, setViewStockModal] = useState<{
    isOpen: boolean;
    product: Product | null;
    apotikId: string | null;
  }>({
    isOpen: false,
    product: null,
    apotikId: null,
  });

  // Check POS session and load data
  useEffect(() => {
    // Check for existing POS session
    const posSession = sessionStorage.getItem("posSession");
    if (posSession) {
      try {
        const session = JSON.parse(posSession);
        if (session.apotikId && session.apotikName) {
          setCurrentApotikId(session.apotikId);
          setCurrentApotikName(session.apotikName);
          setIsPosLoggedIn(true);
          // Debug: log apotik ID yang login
          console.log("POS Session - Apotik ID:", session.apotikId, "Apotik Name:", session.apotikName);
        }
      } catch (err) {
        console.error("Error loading POS session:", err);
        sessionStorage.removeItem("posSession");
      }
    }

    // Load products
    const savedProducts = localStorage.getItem("products");
    if (savedProducts) {
      try {
        const parsed = JSON.parse(savedProducts);
        const productsWithDate = parsed.map((p: any) => ({
          ...p,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        }));
        setProducts(productsWithDate);
        // Debug: log sample product untuk melihat stokPerApotik
        if (productsWithDate.length > 0) {
          const sampleProduct = productsWithDate[0];
          console.log("Sample Product - ID:", sampleProduct.id, "Nama:", sampleProduct.namaProduk);
          console.log("Sample Product - stokPerApotik:", sampleProduct.stokPerApotik);
        }
      } catch (err) {
        console.error("Error loading products:", err);
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

    // Load apotiks
    const savedApotiks = localStorage.getItem("apotiks");
    if (savedApotiks) {
      try {
        const parsed = JSON.parse(savedApotiks);
        const activeApotiks = parsed.filter((a: Apotik) => a.statusAktif);
        setApotiks(activeApotiks);
      } catch (err) {
        console.error("Error loading apotiks:", err);
      }
    }

    setIsCheckingSession(false);
    setLoading(false);
  }, []);

  // Filter products based on search and current apotik
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

    // Show all active products (don't filter by apotik stock)
    // Stok akan ditampilkan berdasarkan apotik yang login, jika tidak ada akan tampil 0
    filtered = filtered.filter((p) => p.statusAktif);

    setFilteredProducts(filtered);
  }, [searchTerm, currentApotikId, products]);

  // Format stock dengan multiple units
  const formatStock = (product: Product, apotikId?: string): string => {
    let stockValue = 0;
    
    // Prioritaskan stok dari apotik yang login
    if (apotikId && product.stokPerApotik && product.stokPerApotik[apotikId] !== undefined) {
      stockValue = product.stokPerApotik[apotikId];
    } else if (product.stokPerApotik && Object.keys(product.stokPerApotik).length > 0) {
      // Jika tidak ada di apotik login, cek apakah ada stok di apotik lain
      // Ambil stok pertama yang ditemukan (biasanya apotik default/gudang)
      const firstApotikId = Object.keys(product.stokPerApotik)[0];
      stockValue = product.stokPerApotik[firstApotikId] || 0;
    } else {
      // Fallback ke stokAwal jika tidak ada stokPerApotik
      stockValue = product.stokAwal || 0;
    }
    
    // Jika stockValue masih 0, return "0" langsung
    if (stockValue === 0) {
      return "0";
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
    
    if (apotikId && product.stokPerApotik && product.stokPerApotik[apotikId] !== undefined) {
      stockValue = product.stokPerApotik[apotikId];
    }
    
    if (!product.units || product.units.length === 0) {
      return [{ unit: product.satuan, qty: stockValue, konversi: 1 }];
    }
    
    const sortedUnits = [...product.units].sort((a, b) => b.urutan - a.urutan);
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

  // Get stock per apotik for a product
  const getStockPerApotik = (product: Product): { apotikId: string; apotikName: string; stock: number }[] => {
    if (!product.stokPerApotik) {
      return [];
    }

    return Object.keys(product.stokPerApotik)
      .map((apotikId) => {
        const apotik = apotiks.find((a) => a.id === apotikId);
        return {
          apotikId,
          apotikName: apotik ? apotik.namaApotik : apotikId,
          stock: product.stokPerApotik![apotikId] || 0,
        };
      })
      .filter((item) => item.stock > 0)
      .sort((a, b) => b.stock - a.stock);
  };

  // Fungsi untuk membuka modal view stock
  const handleViewStock = (product: Product, apotikId?: string) => {
    setViewStockModal({
      isOpen: true,
      product,
      apotikId: apotikId || currentApotikId || null,
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

  // Handle POS Logout
  const handlePosLogout = () => {
    sessionStorage.removeItem("posSession");
    setIsPosLoggedIn(false);
    setCurrentApotikId("");
    setCurrentApotikName("");
    window.location.href = "/admin/penjualan";
  };

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        backgroundColor: "#f1f5f9",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "16px", color: "#64748b" }}>Memuat...</div>
        </div>
      </div>
    );
  }

  // Show error if not logged in
  if (!isPosLoggedIn) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f1f5f9",
      }}>
        <div style={{
          backgroundColor: "#ffffff",
          padding: "32px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          textAlign: "center",
        }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", marginBottom: "16px" }}>
            Akses Ditolak
          </h2>
          <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px" }}>
            Silakan login ke POS terlebih dahulu
          </p>
          <button
            onClick={() => window.location.href = "/admin/penjualan"}
            style={{
              padding: "10px 20px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#f8fafc",
      display: "flex",
    }}>
      {/* POS Sidebar */}
      <div style={{
        width: isSidebarCollapsed ? "80px" : "260px",
        height: "100vh",
        backgroundColor: "transparent",
        color: "#1e293b",
        padding: "20px 0",
        overflowY: "auto",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 1000,
        borderRight: "1px solid #e2e8f0",
        transition: "width 0.3s ease",
      }}>
        <div style={{ padding: isSidebarCollapsed ? "0 10px 20px" : "0 20px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: isSidebarCollapsed ? "center" : "space-between", alignItems: "center" }}>
            {!isSidebarCollapsed && (
              <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "#1e293b" }}>
                Sistem Apotik
              </h2>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                fontSize: "18px",
              }}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? "→" : "←"}
            </button>
          </div>
        </div>
        <nav style={{ marginTop: "20px" }}>
          {/* POS Menu */}
          <div>
            <div style={{
              padding: isSidebarCollapsed ? "12px 10px" : "12px 20px",
              backgroundColor: "#eff6ff",
              borderLeft: "3px solid #3b82f6",
              color: "#3b82f6",
              fontSize: "13px",
              fontWeight: "400",
              fontFamily: "Calibri, Arial, Helvetica, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "flex-start",
              gap: "10px",
            }}>
              <span style={{
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <img
                  src="/icons/pos.svg"
                  alt="POS"
                  style={{
                    width: "16px",
                    height: "16px",
                    display: "block",
                    objectFit: "contain",
                  }}
                />
              </span>
              {!isSidebarCollapsed && <span>POS</span>}
              {!isSidebarCollapsed && <span style={{ fontSize: "13px", color: "#1e293b", marginLeft: "auto" }}>▼</span>}
            </div>
            {/* Submenu */}
            {!isSidebarCollapsed && (
            <div style={{ backgroundColor: "transparent" }}>
              {/* Dashboard */}
              <Link
                href="/admin/penjualan/dashboard"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  padding: isSidebarCollapsed ? "10px 10px" : "10px 20px 10px 48px",
                  color: pathname === "/admin/penjualan/dashboard" ? "#3b82f6" : "#64748b",
                  textDecoration: "none",
                  fontSize: "13px",
                  backgroundColor: pathname === "/admin/penjualan/dashboard"
                    ? "#eff6ff"
                    : "transparent",
                  borderLeft: pathname === "/admin/penjualan/dashboard"
                    ? "3px solid #3b82f6"
                    : "1px solid #e2e8f0",
                  transition: "all 0.2s",
                  lineHeight: "1.5",
                }}
                onMouseEnter={(e) => {
                  if (pathname !== "/admin/penjualan/dashboard") {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== "/admin/penjualan/dashboard") {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                title={isSidebarCollapsed ? "Dashboard" : undefined}
              >
                <span style={{ display: "flex", alignItems: "center", gap: isSidebarCollapsed ? "0" : "10px" }}>
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src="/icons/dashboard.svg"
                      alt="Dashboard"
                      style={{
                        width: "16px",
                        height: "16px",
                        display: "block",
                        objectFit: "contain",
                      }}
                    />
                  </span>
                  {!isSidebarCollapsed && <span>Dashboard</span>}
                </span>
              </Link>
              {/* Penjualan */}
              <Link
                href="/admin/penjualan"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  padding: isSidebarCollapsed ? "10px 10px" : "10px 20px 10px 48px",
                  color: pathname === "/admin/penjualan" ? "#3b82f6" : "#64748b",
                  textDecoration: "none",
                  fontSize: "13px",
                  backgroundColor: pathname === "/admin/penjualan"
                    ? "#eff6ff"
                    : "transparent",
                  borderLeft: pathname === "/admin/penjualan"
                    ? "3px solid #3b82f6"
                    : "1px solid #e2e8f0",
                  transition: "all 0.2s",
                  lineHeight: "1.5",
                }}
                onMouseEnter={(e) => {
                  if (pathname !== "/admin/penjualan") {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== "/admin/penjualan") {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                title={isSidebarCollapsed ? "Penjualan" : undefined}
              >
                <span style={{ display: "flex", alignItems: "center", gap: isSidebarCollapsed ? "0" : "10px" }}>
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src="/icons/penjualan.svg"
                      alt="Penjualan"
                      style={{
                        width: "16px",
                        height: "16px",
                        display: "block",
                        objectFit: "contain",
                      }}
                    />
                  </span>
                  {!isSidebarCollapsed && <span>Penjualan</span>}
                </span>
              </Link>
              {/* History Penjualan */}
              <Link
                href="/admin/penjualan/history"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  padding: isSidebarCollapsed ? "10px 10px" : "10px 20px 10px 48px",
                  color: pathname === "/admin/penjualan/history" ? "#3b82f6" : "#64748b",
                  textDecoration: "none",
                  fontSize: "13px",
                  backgroundColor: pathname === "/admin/penjualan/history"
                    ? "#eff6ff"
                    : "transparent",
                  borderLeft: pathname === "/admin/penjualan/history"
                    ? "3px solid #3b82f6"
                    : "1px solid #e2e8f0",
                  transition: "all 0.2s",
                  lineHeight: "1.5",
                }}
                onMouseEnter={(e) => {
                  if (pathname !== "/admin/penjualan/history") {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== "/admin/penjualan/history") {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                title={isSidebarCollapsed ? "History Penjualan" : undefined}
              >
                <span style={{ display: "flex", alignItems: "center", gap: isSidebarCollapsed ? "0" : "10px" }}>
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src="/icons/laporan.svg"
                      alt="History Penjualan"
                      style={{
                        width: "16px",
                        height: "16px",
                        display: "block",
                        objectFit: "contain",
                      }}
                    />
                  </span>
                  {!isSidebarCollapsed && <span>History Penjualan</span>}
                </span>
              </Link>
              {/* Inventory */}
              <Link
                href="/admin/penjualan/inventory"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  padding: isSidebarCollapsed ? "10px 10px" : "10px 20px 10px 48px",
                  color: pathname === "/admin/penjualan/inventory" ? "#3b82f6" : "#64748b",
                  textDecoration: "none",
                  fontSize: "13px",
                  backgroundColor: pathname === "/admin/penjualan/inventory"
                    ? "#eff6ff"
                    : "transparent",
                  borderLeft: pathname === "/admin/penjualan/inventory"
                    ? "3px solid #3b82f6"
                    : "1px solid #e2e8f0",
                  transition: "all 0.2s",
                  lineHeight: "1.5",
                }}
                onMouseEnter={(e) => {
                  if (pathname !== "/admin/penjualan/inventory") {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== "/admin/penjualan/inventory") {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                title={isSidebarCollapsed ? "Inventory" : undefined}
              >
                <span style={{ display: "flex", alignItems: "center", gap: isSidebarCollapsed ? "0" : "10px" }}>
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src="/icons/inventory.svg"
                      alt="Inventory"
                      style={{
                        width: "16px",
                        height: "16px",
                        display: "block",
                        objectFit: "contain",
                      }}
                    />
                  </span>
                  {!isSidebarCollapsed && <span>Inventory</span>}
                </span>
              </Link>
            </div>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ 
        marginLeft: isSidebarCollapsed ? "80px" : "260px",
        flex: 1,
        minHeight: "100vh", 
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        padding: "24px",
        transition: "margin-left 0.3s ease",
      }}>
        {/* POS Header with Apotik Info and Logout */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          padding: "10px 16px",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              backgroundColor: "#3b82f6",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                {currentApotikName}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Inventory POS
              </div>
            </div>
          </div>
          <button
            onClick={handlePosLogout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#f1f5f9",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#e2e8f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f1f5f9";
            }}
          >
            Keluar
          </button>
        </div>

        {/* Search Bar */}
        <div style={{
          backgroundColor: "#ffffff",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "24px",
        }}>
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
                      Stok
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
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
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
                          color: "#1e293b",
                          fontWeight: "500",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => handleViewStock(product, currentApotikId)}
                            title="Lihat Detail Stok"
                            style={{
                              padding: "4px",
                              backgroundColor: "transparent",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "opacity 0.2s",
                              width: "20px",
                              height: "20px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = "0.7";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = "1";
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                          <span>
                            {(() => {
                              // Tampilkan stok dari apotik yang login jika ada
                              if (currentApotikId && product.stokPerApotik && product.stokPerApotik[currentApotikId] !== undefined) {
                                const stock = product.stokPerApotik[currentApotikId];
                                if (stock > 0) {
                                  return formatStock(product, currentApotikId);
                                }
                              }
                              // Jika tidak ada di apotik login, cek apotik lain (termasuk apotik default/gudang)
                              if (product.stokPerApotik && Object.keys(product.stokPerApotik).length > 0) {
                                // Cari stok di apotik manapun
                                const apotikIds = Object.keys(product.stokPerApotik);
                                for (const apotikId of apotikIds) {
                                  const stock = product.stokPerApotik[apotikId];
                                  if (stock > 0) {
                                    // Tampilkan stok dari apotik lain (bukan apotik login)
                                    return formatStock(product, apotikId);
                                  }
                                }
                              }
                              // Jika tidak ada stok sama sekali, tampilkan 0
                              return "0";
                            })()}
                          </span>
                        </div>
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
                  ))}
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
              zIndex: 2000,
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                width: "90%",
                maxWidth: "600px",
                maxHeight: "90vh",
                overflowY: "auto",
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

                {/* Detail Stok per Unit */}
                <div style={{ marginBottom: "20px" }}>
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

                {/* Stok di Semua Apotik */}
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
                    Stok di Semua Apotik
                  </label>
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      borderRadius: "6px",
                      padding: "16px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {getStockPerApotik(viewStockModal.product).length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {getStockPerApotik(viewStockModal.product).map((item, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "10px 12px",
                              backgroundColor: "#ffffff",
                              borderRadius: "4px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <span style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>
                              {item.apotikName}
                            </span>
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "#3b82f6" }}>
                              {formatStock(viewStockModal.product, item.apotikId)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                        Tidak ada stok di apotik manapun
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
    </div>
  );
}
