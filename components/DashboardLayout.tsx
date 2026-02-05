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

const iconSize = 20;

function IconShield() {
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 6.34l1.41-1.41M19.07 19.07l1.41-1.41" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const THEME_STORAGE_KEY = "app-theme";

const THEME_OPTIONS: { id: string; label: string; icon: "sun" | "moon" }[] = [
  { id: "light", label: "Light", icon: "sun" },
  { id: "dark", label: "Dark", icon: "moon" },
];

function IconLogout() {
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  hasArrow?: boolean;
  isDanger?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

function MenuItem({ icon, label, hasArrow, isDanger, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        border: "none",
        background: "none",
        cursor: "pointer",
        fontSize: "14px",
        color: isDanger ? "#dc2626" : "var(--text-primary)",
        fontWeight: isDanger ? 500 : 400,
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--hover-bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <span style={{ flexShrink: 0, display: "flex", color: isDanger ? "#dc2626" : "var(--text-secondary)" }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {hasArrow && (
        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      )}
    </button>
  );
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordNew, setChangePasswordNew] = useState("");
  const [changePasswordConfirm, setChangePasswordConfirm] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordMessage, setChangePasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "light";
    const s = localStorage.getItem(THEME_STORAGE_KEY);
    if (s === "light" || s === "dark") return s;
    if (s && ["dark-modern", "abyss", "monokai-dimmed", "kimbie-dark", "tomorrow-night-blue"].includes(s)) return "dark";
    return "light";
  });

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
      "/admin/pembelian/rencana-transfer-barang": "Rencana Transfer Barang",
      "/admin/pembelian/persetujuan-pengajuan": "Persetujuan Pengajuan",
      "/admin/warehouse/dashboard": "Dashboard Gudang",
      "/admin/warehouse/terima-pembelian": "Terima Pembelian",
      "/admin/warehouse/transfer-barang": "Transfer Barang",
      "/admin/warehouse/terima-transfer": "Terima Transfer",
      "/admin/warehouse/stok-opname": "Stok Opname",
      "/inventory": "Informasi Inventory",
      "/admin/penjualan": "Penjualan",
      "/admin/penjualan/history": "History Penjualan",
      "/admin/finance/hutang": "Hutang",
      "/admin/laporan": "Laporan",
      "/admin/laporan/data-produk": "Laporan Data Produk",
      "/admin/laporan/pembelian": "Laporan Pembelian",
      "/admin/laporan/alokasi-barang": "Laporan Alokasi Barang",
      "/admin/laporan/perubahan-harga-jual": "Laporan Perubahan Harga Jual",
      "/admin/laporan/persediaan": "Laporan Persediaan",
      "/admin/pengaturan/user": "Pengaturan User",
      "/admin/pengaturan/role": "Role & Permissions",
      "/admin/pengaturan/perusahaan": "Pengaturan Perusahaan",
      "/admin/pengaturan/sistem": "Pengaturan Sistem",
      "/admin/pengaturan/backup": "Backup & Restore",
      "/admin/pengaturan/hapus-data": "Hapus Data",
      "/admin/pengaturan/change-password": "Ganti Password",
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

  // Sync theme from localStorage on mount (client) so selected theme is correct
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const theme = saved && THEME_OPTIONS.some((o) => o.id === saved) ? saved : "light";
    setCurrentTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  // Apply theme when currentTheme changes (e.g. user selected new theme)
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", currentTheme);
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    }
  }, [currentTheme]);

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
      const meta = session.user?.user_metadata;
      const name = (meta?.full_name || meta?.nama) as string | undefined;
      const fallbackName = session.user?.email?.split("@")[0] || null;
      setUserName(name || fallbackName);
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

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordMessage(null);
    if (changePasswordNew.length < 6) {
      setChangePasswordMessage({ type: "error", text: "Password minimal 6 karakter." });
      return;
    }
    if (changePasswordNew !== changePasswordConfirm) {
      setChangePasswordMessage({ type: "error", text: "Password dan konfirmasi tidak sama." });
      return;
    }
    setChangePasswordLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: changePasswordNew });
      if (error) throw error;
      setChangePasswordMessage({ type: "success", text: "Password berhasil diubah." });
      setChangePasswordNew("");
      setChangePasswordConfirm("");
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setChangePasswordMessage(null);
      }, 1500);
    } catch (err: unknown) {
      setChangePasswordMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Gagal mengubah password.",
      });
    } finally {
      setChangePasswordLoading(false);
    }
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
          backgroundColor: "var(--page-bg)",
          minHeight: "100vh",
          transition: "margin-left 0.3s ease",
          ["--sidebar-width" as string]: isSidebarCollapsed ? "80px" : "260px",
        }}
      >
        <header
          style={{
            backgroundColor: "var(--surface)",
            padding: "16px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
            {getPageTitle()}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }} />
        </header>
        <main style={{ padding: "24px" }}>{children}</main>

        {/* User menu: fixed bottom-left (z-index above sidebar so it stays clickable) */}
        <div style={{ position: "fixed", bottom: "24px", left: "24px", zIndex: 1100 }}>
          {showUserMenu && (
            <>
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 998,
                  backgroundColor: "transparent",
                }}
                onClick={() => {
                  setShowUserMenu(false);
                }}
                aria-hidden
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: 0,
                  marginBottom: "8px",
                  width: "300px",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                  zIndex: 999,
                  overflow: "visible",
                }}
              >
                <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 600, fontSize: "16px", color: "var(--text-primary)" }}>
                    {userName || "User"}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {email || ""}
                  </div>
                </div>
                {(isSuperAdmin || (userApotikIds.length > 1 && selectedApotikId)) && (
                  <div style={{ borderBottom: "1px solid var(--border)", padding: "8px 0" }}>
                    <div style={{ padding: "8px 16px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                      Akses Apotik
                    </div>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          handleApotikChange("all");
                          setShowUserMenu(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          textAlign: "left",
                          border: "none",
                          backgroundColor: selectedApotikId === "all" ? "var(--selected-bg)" : "transparent",
                          color: selectedApotikId === "all" ? "var(--primary)" : "var(--text-primary)",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: selectedApotikId === "all" ? "600" : "400",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedApotikId !== "all") e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                        }}
                        onMouseLeave={(e) => {
                          if (selectedApotikId !== "all") e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        Semua Apotik
                      </button>
                    )}
                    {(isSuperAdmin ? apotiks : apotiks.filter((a) => userApotikIds.includes(a.id))).map((apotik) => (
                      <button
                        key={apotik.id}
                        type="button"
                        onClick={() => {
                          handleApotikChange(apotik.id);
                          setShowUserMenu(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 16px",
                          textAlign: "left",
                          border: "none",
                          borderTop: isSuperAdmin && apotik.id === apotiks[0]?.id ? "1px solid var(--border)" : "none",
                          backgroundColor: selectedApotikId === apotik.id ? "var(--selected-bg)" : "transparent",
                          color: selectedApotikId === apotik.id ? "var(--primary)" : "var(--text-primary)",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: selectedApotikId === apotik.id ? "600" : "400",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedApotikId !== apotik.id) e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                        }}
                        onMouseLeave={(e) => {
                          if (selectedApotikId !== apotik.id) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {apotik.namaApotik}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ padding: "8px 0", position: "relative" }}>
                  <MenuItem
                    icon={<IconShield />}
                    label="Ganti Password"
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowChangePasswordModal(true);
                      setChangePasswordMessage(null);
                      setChangePasswordNew("");
                      setChangePasswordConfirm("");
                    }}
                  />
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentTheme(opt.id);
                        try {
                          localStorage.setItem(THEME_STORAGE_KEY, opt.id);
                          document.documentElement.setAttribute("data-theme", opt.id);
                        } catch {
                          // ignore
                        }
                        setShowUserMenu(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        border: "none",
                        background: currentTheme === opt.id ? "var(--selected-bg)" : "transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme === opt.id ? "var(--selected-bg)" : "var(--hover-bg)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = currentTheme === opt.id ? "var(--selected-bg)" : "transparent";
                      }}
                    >
                      <span style={{ flexShrink: 0, display: "flex", color: "var(--text-secondary)" }}>
                        {opt.icon === "sun" && <IconSun />}
                        {opt.icon === "moon" && <IconMoon />}
                      </span>
                      <span style={{ flex: 1 }}>{opt.label}</span>
                      {currentTheme === opt.id && (
                        <span style={{ color: "var(--primary)" }}>
                          <IconCheck />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid var(--border)", padding: "8px 0" }}>
                  <MenuItem
                    icon={<IconLogout />}
                    label="Log out"
                    isDanger
                    hasArrow
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                  />
                </div>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
            }}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "2px solid var(--border)",
              backgroundColor: "var(--hover-bg)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            {userName ? userName.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?"}
          </button>
        </div>

        {/* Modal Ganti Password */}
        {showChangePasswordModal && (
          <>
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
                zIndex: 1200,
              }}
              onClick={() => {
                setShowChangePasswordModal(false);
                setChangePasswordMessage(null);
              }}
              aria-hidden
            />
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "100%",
                maxWidth: "400px",
                backgroundColor: "var(--surface)",
                borderRadius: "8px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                zIndex: 1201,
                padding: "24px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                  Ganti Password
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setChangePasswordMessage(null);
                  }}
                  style={{
                    width: "32px",
                    height: "32px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    borderRadius: "6px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                  aria-label="Tutup"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleChangePasswordSubmit}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px", color: "var(--text-primary)" }}>
                    Password baru
                  </label>
                  <input
                    type="password"
                    value={changePasswordNew}
                    onChange={(e) => setChangePasswordNew(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid var(--input-border)",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="Min. 6 karakter"
                    autoComplete="new-password"
                  />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px", color: "var(--text-primary)" }}>
                    Konfirmasi password
                  </label>
                  <input
                    type="password"
                    value={changePasswordConfirm}
                    onChange={(e) => setChangePasswordConfirm(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid var(--input-border)",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="Ulangi password baru"
                    autoComplete="new-password"
                  />
                </div>
                {changePasswordMessage && (
                  <p
                    style={{
                      marginBottom: "12px",
                      fontSize: "13px",
                      color: changePasswordMessage.type === "success" ? "#059669" : "#dc2626",
                    }}
                  >
                    {changePasswordMessage.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "var(--primary)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: changePasswordLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {changePasswordLoading ? "Memproses..." : "Simpan password"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

