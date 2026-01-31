"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "../../../../components/DashboardLayout";

interface CartItem {
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string;
  namaUnit: string;
  qty: number;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
}

interface Customer {
  id: string;
  kodeCustomer: string;
  namaCustomer: string;
  alamat: string;
  telepon: string;
  email: string;
}

interface Penjualan {
  id: string;
  nomorTransaksi: string;
  tanggalTransaksi: string;
  customerId: string | null;
  items: CartItem[];
  subtotal: number;
  diskonGlobal: number;
  diskonAmount: number;
  ppn: number;
  ppnAmount: number;
  total: number;
  paymentMethod: string;
  apotikId: string;
  createdAt: string;
}

export default function DashboardPOSPage() {
  const pathname = usePathname();
  const [penjualanList, setPenjualanList] = useState<Penjualan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isPosLoggedIn, setIsPosLoggedIn] = useState(false);
  const [currentApotikId, setCurrentApotikId] = useState("");
  const [currentApotikName, setCurrentApotikName] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const posSession = sessionStorage.getItem("posSession");
    if (posSession) {
      try {
        const session = JSON.parse(posSession);
        if (session.apotikId && session.apotikName) {
          setCurrentApotikId(session.apotikId);
          setCurrentApotikName(session.apotikName);
          setIsPosLoggedIn(true);
        }
      } catch (err) {
        console.error("Error loading POS session:", err);
        sessionStorage.removeItem("posSession");
      }
    }

    const savedPenjualan = localStorage.getItem("penjualan");
    const savedCustomers = localStorage.getItem("customers");

    if (savedPenjualan) {
      try {
        const parsed = JSON.parse(savedPenjualan);
        const sorted = parsed.sort((a: Penjualan, b: Penjualan) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPenjualanList(sorted);
      } catch (err) {
        console.error("Error loading penjualan:", err);
      }
    }

    if (savedCustomers) {
      try {
        setCustomers(JSON.parse(savedCustomers));
      } catch (err) {
        console.error("Error loading customers:", err);
      }
    }

    setIsCheckingSession(false);
  }, []);

  const getCustomerName = (customerId: string | null): string => {
    if (!customerId) return "-";
    const customer = customers.find((c) => c.id === customerId);
    return customer ? customer.namaCustomer : "-";
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number): string => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  const handlePosLogout = () => {
    sessionStorage.removeItem("posSession");
    setIsPosLoggedIn(false);
    setCurrentApotikName("");
    window.location.href = "/admin/penjualan";
  };

  const today = new Date().toISOString().split("T")[0];
  const listByApotik = currentApotikId
    ? penjualanList.filter((p) => p.apotikId === currentApotikId)
    : penjualanList;
  const transaksiHariIni = listByApotik.filter((p) => p.tanggalTransaksi === today);
  const totalPendapatanHariIni = transaksiHariIni.reduce((sum, p) => sum + p.total, 0);
  const transaksiTerbaru = listByApotik.slice(0, 10);

  const dashboardContent = (
    <div>
      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
            Transaksi Hari Ini
          </div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>
            {transaksiHariIni.length}
          </div>
        </div>
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
            Pendapatan Hari Ini
          </div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#3b82f6" }}>
            {formatCurrency(totalPendapatanHariIni)}
          </div>
        </div>
      </div>

      {/* Transaksi terbaru */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>
            Transaksi Terbaru
          </h3>
          <Link
            href="/admin/penjualan/history"
            style={{
              fontSize: "13px",
              color: "#3b82f6",
              textDecoration: "none",
              fontWeight: "500",
            }}
          >
            Lihat Semua →
          </Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "600", color: "#64748b" }}>
                  No. Transaksi
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "600", color: "#64748b" }}>
                  Tanggal
                </th>
                <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: "600", color: "#64748b" }}>
                  Customer
                </th>
                <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600", color: "#64748b" }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {transaksiTerbaru.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
                    Belum ada transaksi
                  </td>
                </tr>
              ) : (
                transaksiTerbaru.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <td style={{ padding: "10px 12px", color: "#1e293b" }}>{p.nomorTransaksi}</td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>
                      {formatDate(p.tanggalTransaksi)}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>
                      {getCustomerName(p.customerId)}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "500", color: "#1e293b" }}>
                      {formatCurrency(p.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (isCheckingSession) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f1f5f9",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "16px", color: "#64748b" }}>Memuat...</div>
        </div>
      </div>
    );
  }

  if (isPosLoggedIn) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex" }}>
        {/* POS Sidebar */}
        <div
          style={{
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
          }}
        >
          <div
            style={{
              padding: isSidebarCollapsed ? "0 10px 20px" : "0 20px 20px",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: isSidebarCollapsed ? "center" : "space-between",
                alignItems: "center",
              }}
            >
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
                  color: "#64748b",
                  fontSize: "18px",
                }}
                title={isSidebarCollapsed ? "Expand" : "Collapse"}
              >
                {isSidebarCollapsed ? "→" : "←"}
              </button>
            </div>
          </div>
          <nav style={{ marginTop: "20px" }}>
            <div>
              <div
                style={{
                  padding: isSidebarCollapsed ? "12px 10px" : "12px 20px",
                  backgroundColor: "#eff6ff",
                  borderLeft: "3px solid #3b82f6",
                  color: "#3b82f6",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <img src="/icons/pos.svg" alt="POS" style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                {!isSidebarCollapsed && <span>POS</span>}
                {!isSidebarCollapsed && <span style={{ marginLeft: "auto" }}>▼</span>}
              </div>
              {!isSidebarCollapsed && (
                <div>
                  <Link
                    href="/admin/penjualan/dashboard"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 20px 10px 48px",
                      color: pathname === "/admin/penjualan/dashboard" ? "#3b82f6" : "#64748b",
                      textDecoration: "none",
                      fontSize: "13px",
                      backgroundColor:
                        pathname === "/admin/penjualan/dashboard" ? "#eff6ff" : "transparent",
                      borderLeft:
                        pathname === "/admin/penjualan/dashboard"
                          ? "3px solid #3b82f6"
                          : "1px solid #e2e8f0",
                    }}
                  >
                    <img
                      src="/icons/dashboard.svg"
                      alt=""
                      style={{ width: "16px", height: "16px", marginRight: "10px" }}
                    />
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/penjualan"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 20px 10px 48px",
                      color: pathname === "/admin/penjualan" ? "#3b82f6" : "#64748b",
                      textDecoration: "none",
                      fontSize: "13px",
                      backgroundColor: pathname === "/admin/penjualan" ? "#eff6ff" : "transparent",
                      borderLeft:
                        pathname === "/admin/penjualan" ? "3px solid #3b82f6" : "1px solid #e2e8f0",
                    }}
                  >
                    <img
                      src="/icons/penjualan.svg"
                      alt=""
                      style={{ width: "16px", height: "16px", marginRight: "10px" }}
                    />
                    Penjualan
                  </Link>
                  <Link
                    href="/admin/penjualan/history"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 20px 10px 48px",
                      color: pathname === "/admin/penjualan/history" ? "#3b82f6" : "#64748b",
                      textDecoration: "none",
                      fontSize: "13px",
                      backgroundColor:
                        pathname === "/admin/penjualan/history" ? "#eff6ff" : "transparent",
                      borderLeft:
                        pathname === "/admin/penjualan/history"
                          ? "3px solid #3b82f6"
                          : "1px solid #e2e8f0",
                    }}
                  >
                    <img
                      src="/icons/laporan.svg"
                      alt=""
                      style={{ width: "16px", height: "16px", marginRight: "10px" }}
                    />
                    History Penjualan
                  </Link>
                  <Link
                    href="/admin/penjualan/inventory"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 20px 10px 48px",
                      color: pathname === "/admin/penjualan/inventory" ? "#3b82f6" : "#64748b",
                      textDecoration: "none",
                      fontSize: "13px",
                      backgroundColor:
                        pathname === "/admin/penjualan/inventory" ? "#eff6ff" : "transparent",
                      borderLeft:
                        pathname === "/admin/penjualan/inventory"
                          ? "3px solid #3b82f6"
                          : "1px solid #e2e8f0",
                    }}
                  >
                    <img
                      src="/icons/inventory.svg"
                      alt=""
                      style={{ width: "16px", height: "16px", marginRight: "10px" }}
                    />
                    Inventory
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        <div
          style={{
            marginLeft: isSidebarCollapsed ? "80px" : "260px",
            flex: 1,
            minHeight: "100vh",
            backgroundColor: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            padding: "24px",
            transition: "margin-left 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              padding: "10px 16px",
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  backgroundColor: "#3b82f6",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                  {currentApotikName}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Dashboard POS</div>
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
              }}
            >
              Keluar
            </button>
          </div>
          {dashboardContent}
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {dashboardContent}
    </DashboardLayout>
  );
}
