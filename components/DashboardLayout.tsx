"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseClient } from "../lib/supabaseClient";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface Apotik {
  id: string;
  kodeApotik: string;
  namaApotik: string;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userApotikIds, setUserApotikIds] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [selectedApotikId, setSelectedApotikId] = useState<string | null>(null);
  const [showApotikDropdown, setShowApotikDropdown] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Function to get page title based on pathname
  const getPageTitle = (): string => {
    if (!pathname) return "Dashboard Apotik";

    const pathMap: { [key: string]: string } = {
      "/dashboard": "Dashboard",
      "/admin/master-data/unit": "Data Unit",
      "/admin/master-data/apotik": "Data Apotik",
      "/admin/master-data/supplier": "Data Supplier",
      "/admin/master-data/customer": "Data Customer",
      "/admin/master-data/kategori": "Data Kategori",
      "/admin/master-data/obat": "Data Produk",
      "/admin/pembelian/pesanan": "Pesanan Pembelian",
      "/admin/pembelian/faktur": "Faktur Pembelian",
      "/admin/pembelian/penyesuaian-stok": "Penyesuaian stok",
      "/admin/pembelian/perubahan-harga-jual": "Perubahan harga jual",
      "/admin/pembelian/persetujuan-pengajuan": "Persetujuan Pengajuan",
      "/admin/warehouse/terima-pembelian": "Terima Pembelian",
      "/admin/warehouse/transfer-barang": "Transfer Barang",
      "/admin/warehouse/terima-transfer": "Terima Transfer",
      "/admin/warehouse/stok-opname": "Stok Opname",
      "/inventory": "Informasi Inventory",
      "/admin/penjualan": "Penjualan",
      "/admin/penjualan/history": "History Penjualan",
      "/admin/finance/hutang": "Hutang",
      "/admin/laporan": "Laporan",
      "/admin/pengaturan/user": "Pengaturan User",
      "/admin/pengaturan/role": "Role & Permissions",
      "/admin/pengaturan/perusahaan": "Pengaturan Perusahaan",
      "/admin/pengaturan/sistem": "Pengaturan Sistem",
      "/admin/pengaturan/backup": "Backup & Restore",
    };

    // Check exact match first
    if (pathMap[pathname]) {
      return pathMap[pathname];
    }

    // Check for partial matches (for nested routes)
    for (const [path, title] of Object.entries(pathMap)) {
      if (pathname.startsWith(path)) {
        return title;
      }
    }

    // Default fallback
    return "Dashboard Apotik";
  };

  // Load apotiks from localStorage
  useEffect(() => {
    const savedApotiks = localStorage.getItem("apotiks");
    if (savedApotiks) {
      try {
        const parsed = JSON.parse(savedApotiks);
        setApotiks(parsed);
      } catch (err) {
        console.error("Error loading apotiks:", err);
      }
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/");
        return;
      }
      setEmail(session.user?.email ?? null);
      // Get role and apotikIds from app_metadata
      const role = session.user?.app_metadata?.role as string | undefined;
      const apotikIds = session.user?.app_metadata?.apotikIds as string[] | undefined;
      const superAdmin = session.user?.app_metadata?.isSuperAdmin as boolean | undefined;
      
      setUserRole(role || null);
      setUserApotikIds(apotikIds || []);
      setIsSuperAdmin(superAdmin || false);

      // Kasir: redirect from dashboard to POS
      if (role === "Kasir" && pathname === "/dashboard") {
        setLoading(false);
        router.replace("/admin/penjualan");
        return;
      }
      
      // Load or set selected apotik
      if (superAdmin) {
        // Super admin: check if "all" is selected or specific apotik
        const saved = sessionStorage.getItem("selectedApotikId");
        if (saved && saved !== "all") {
          setSelectedApotikId(saved);
        } else {
          setSelectedApotikId("all");
          sessionStorage.setItem("selectedApotikId", "all");
        }
      } else if (apotikIds && apotikIds.length > 0) {
        // Regular user: check saved selection or use first apotik
        const saved = sessionStorage.getItem("selectedApotikId");
        if (saved && apotikIds.includes(saved)) {
          setSelectedApotikId(saved);
        } else {
          setSelectedApotikId(apotikIds[0]);
          sessionStorage.setItem("selectedApotikId", apotikIds[0]);
        }
      }
      
      setLoading(false);
    };
    checkSession();
  }, [router]);

  // Redirect Kasir away from /dashboard to POS when pathname or role updates
  useEffect(() => {
    if (userRole === "Kasir" && pathname === "/dashboard") {
      router.replace("/admin/penjualan");
    }
  }, [userRole, pathname, router]);

  const handleApotikChange = (apotikId: string) => {
    setSelectedApotikId(apotikId);
    sessionStorage.setItem("selectedApotikId", apotikId);
    setShowApotikDropdown(false);
    // Reload page to apply filter
    window.location.reload();
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p>Memuat...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        userRole={userRole}
      />
      <div
        style={{
          marginLeft: isSidebarCollapsed ? "80px" : "260px",
          flex: 1,
          backgroundColor: "#f8fafc",
          minHeight: "100vh",
          transition: "margin-left 0.3s ease",
        }}
      >
        <header
          style={{
            backgroundColor: "#ffffff",
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: "600", margin: 0 }}>
            {getPageTitle()}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Apotik Selector - Only show if user has multiple apotiks or is super admin */}
            {(isSuperAdmin || (userApotikIds.length > 1 && selectedApotikId)) && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowApotikDropdown(!showApotikDropdown)}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    minWidth: "150px",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    {selectedApotikId === "all"
                      ? "Semua Apotik"
                      : apotiks.find((a) => a.id === selectedApotikId)?.namaApotik || "Pilih Apotik"}
                  </span>
                  <span style={{ fontSize: "10px" }}>▼</span>
                </button>
                {showApotikDropdown && (
                  <>
                    <div
                      style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 998,
                      }}
                      onClick={() => setShowApotikDropdown(false)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: "4px",
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        minWidth: "200px",
                        zIndex: 999,
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleApotikChange("all")}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            textAlign: "left",
                            border: "none",
                            backgroundColor: selectedApotikId === "all" ? "#eff6ff" : "transparent",
                            color: selectedApotikId === "all" ? "#3b82f6" : "#374151",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: selectedApotikId === "all" ? "600" : "400",
                          }}
                          onMouseEnter={(e) => {
                            if (selectedApotikId !== "all") {
                              e.currentTarget.style.backgroundColor = "#f1f5f9";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedApotikId !== "all") {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          Semua Apotik
                        </button>
                      )}
                      {(isSuperAdmin ? apotiks : apotiks.filter((a) => userApotikIds.includes(a.id))).map((apotik) => (
                        <button
                          key={apotik.id}
                          onClick={() => handleApotikChange(apotik.id)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            textAlign: "left",
                            border: "none",
                            borderTop: isSuperAdmin && apotik.id === apotiks[0]?.id ? "1px solid #e2e8f0" : "none",
                            backgroundColor: selectedApotikId === apotik.id ? "#eff6ff" : "transparent",
                            color: selectedApotikId === apotik.id ? "#3b82f6" : "#374151",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: selectedApotikId === apotik.id ? "600" : "400",
                          }}
                          onMouseEnter={(e) => {
                            if (selectedApotikId !== apotik.id) {
                              e.currentTarget.style.backgroundColor = "#f1f5f9";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedApotikId !== apotik.id) {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          {apotik.namaApotik}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <span style={{ fontSize: "14px", color: "#64748b" }}>
              {email}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
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
              Keluar
            </button>
          </div>
        </header>
        <main style={{ padding: "24px" }}>{children}</main>
      </div>
    </div>
  );
}

