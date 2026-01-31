"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  userRole?: string | null;
}

interface MenuItem {
  label: string;
  href?: string;
  icon?: string;
  children?: MenuItem[];
  badgeCount?: number;
}

// Role permissions interface
interface MenuPermission {
  menu: string;
  path: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface RolePermission {
  id: string;
  name: string;
  permissions: MenuPermission[];
}

// Get role permissions from localStorage
function getRolePermissions(roleName: string | null): MenuPermission[] {
  if (!roleName) return [];
  
  try {
    const savedRoles = localStorage.getItem("rolePermissions");
    if (savedRoles) {
      const roles: RolePermission[] = JSON.parse(savedRoles);
      const role = roles.find((r) => r.name === roleName);
      return role?.permissions || [];
    }
  } catch (err) {
    console.error("Error loading role permissions:", err);
  }
  
  return [];
}

// Check if a menu path is allowed for the current role (has view permission)
function isMenuAllowed(href?: string, role: string | null = null): boolean {
  if (!href) return true; // Parent menus without href are allowed if they have allowed children
  if (!role) return false;
  
  const permissions = getRolePermissions(role);
  if (permissions.length === 0) {
    // Fallback: if no permissions configured, allow Admin and Manager
    return role === "Admin" || role === "Manager";
  }
  
  const permission = permissions.find((p) => p.path === href);
  // If no permission defined for this path (e.g. new menu), allow Admin and Manager
  if (!permission) {
    return role === "Admin" || role === "Manager";
  }
  return permission.view === true;
}

// Menu labels allowed for Kasir (shortcut to POS only)
const KASIR_ALLOWED_LABELS = ["Dashboard", "POS"];

// Filter menu items based on role permissions
function filterMenuItems(items: MenuItem[], role: string | null): MenuItem[] {
  // If no role, hide admin-only menus
  if (!role) {
    return items.filter((item: MenuItem) => {
      // Hide IT Manajemen menu if no role
      if (item.label === "IT Manajemen") {
        return false;
      }
      // Allow other menus
      return true;
    });
  }

  // Kasir: only Dashboard and POS (Penjualan + History Penjualan)
  if (role === "Kasir") {
    return items.filter((item: MenuItem) =>
      KASIR_ALLOWED_LABELS.includes(item.label)
    );
  }
  
  const permissions = getRolePermissions(role);
  // If no permissions configured, check if role is Admin/Manager (fallback)
  if (permissions.length === 0) {
    if (role === "Admin" || role === "Manager") {
      return items;
    }
    // For other roles (e.g. Gudang) without permissions, hide admin menus
    return items.filter((item: MenuItem) => {
      if (item.label === "IT Manajemen") {
        return false;
      }
      return true;
    });
  }

  return items
    .map((item: MenuItem) => {
      if (item.children) {
        // Filter children based on view permission
        const allowedChildren = item.children.filter((child: MenuItem) =>
          isMenuAllowed(child.href, role)
        );
        // Only include parent if it has at least one allowed child
        if (allowedChildren.length > 0) {
          return { ...item, children: allowedChildren };
        }
        return null;
      } else {
        // Check if item itself has view permission
        if (isMenuAllowed(item.href, role)) {
          return item;
        }
        return null;
      }
    })
    .filter((item): item is MenuItem => item !== null);
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
  },
  {
    label: "Data Master",
    icon: "data-master",
    children: [
      { label: "Unit", href: "/admin/master-data/unit", icon: "unit" },
      { label: "Apotik", href: "/admin/master-data/apotik", icon: "apotik" },
      { label: "Supplier", href: "/admin/master-data/supplier", icon: "supplier" },
      { label: "Customer", href: "/admin/master-data/customer", icon: "customer" },
      { label: "Kategori", href: "/admin/master-data/kategori", icon: "kategori" },
      { label: "Type", href: "/admin/master-data/type", icon: "kategori" },
      { label: "Jenis", href: "/admin/master-data/jenis", icon: "kategori" },
      { label: "Margin", href: "/admin/master-data/margin", icon: "kategori" },
      { label: "Racikan", href: "/admin/master-data/racikan", icon: "kategori" },
      { label: "Produk", href: "/admin/master-data/obat", icon: "produk" },
    ],
  },
  {
    label: "Merchandise",
    icon: "merchandise",
    children: [
      { label: "Pesanan Pembelian", href: "/admin/pembelian/pesanan", icon: "pesanan-pembelian" },
      { label: "Faktur Pembelian", href: "/admin/pembelian/faktur", icon: "faktur-pembelian" },
      { label: "Penyesuaian stok", href: "/admin/pembelian/penyesuaian-stok", icon: "inventory" },
      { label: "Perubahan harga jual", href: "/admin/pembelian/perubahan-harga-jual", icon: "laporan" },
    ],
  },
  {
    label: "Persetujuan Pengajuan",
    href: "/admin/pembelian/persetujuan-pengajuan",
    icon: "notary",
  },
  {
    label: "Warehouse",
    icon: "warehouse",
    children: [
      { label: "Terima Pembelian", href: "/admin/warehouse/terima-pembelian", icon: "terima-pembelian" },
      { label: "Transfer Barang", href: "/admin/warehouse/transfer-barang", icon: "transfer-barang" },
      { label: "Terima Transfer", href: "/admin/warehouse/terima-transfer", icon: "terima-transfer" },
      { label: "Stok Opname", href: "/admin/warehouse/stok-opname", icon: "inventory" },
    ],
  },
  {
    label: "Informasi",
    icon: "informasi",
    children: [
      { label: "Inventory", href: "/inventory", icon: "inventory" },
    ],
  },
  {
    label: "POS",
    icon: "pos",
    children: [
      { label: "Penjualan", href: "/admin/penjualan", icon: "penjualan" },
      { label: "History Penjualan", href: "/admin/penjualan/history", icon: "laporan" },
    ],
  },
  {
    label: "Finance",
    icon: "laporan",
    children: [
      { label: "Hutang", href: "/admin/finance/hutang", icon: "laporan" },
    ],
  },
  {
    label: "Laporan",
    href: "/admin/laporan",
    icon: "laporan",
  },
  {
    label: "IT Manajemen",
    icon: "pengaturan",
    children: [
      { label: "Pengaturan User", href: "/admin/pengaturan/user", icon: "pengaturan-user" },
      { label: "Role", href: "/admin/pengaturan/role", icon: "pengaturan-user" },
      { label: "Pengaturan Perusahaan", href: "/admin/pengaturan/perusahaan", icon: "pengaturan-perusahaan" },
      { label: "Pengaturan Sistem", href: "/admin/pengaturan/sistem", icon: "pengaturan-sistem" },
      { label: "Backup & Restore", href: "/admin/pengaturan/backup", icon: "backup-restore" },
    ],
  },
];

export default function Sidebar({ isCollapsed = false, onToggle, userRole = null }: SidebarProps) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [pendingPengajuanCount, setPendingPengajuanCount] = useState<number>(0);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [clickedMenu, setClickedMenu] = useState<string | null>(null);
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Function to count pending pengajuan
  const countPendingPengajuan = () => {
    let count = 0;
    const pengajuanKeys = [
      "pengajuanApotik",
      "pengajuanUnit",
      "pengajuanSupplier",
      "pengajuanCustomer",
      "pengajuanKategori",
      "pengajuanType",
      "pengajuanJenis",
      "pengajuanMargin",
      "pengajuanRacikan",
      "pengajuanProduk",
      "pengajuanPembelian",
      "pengajuanPenerimaanPembelian",
      "pengajuanPenyesuaianStok",
    ];

    pengajuanKeys.forEach((key) => {
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const pengajuanList = JSON.parse(saved);
          const pending = pengajuanList.filter(
            (p: any) => p.status === "Menunggu Persetujuan"
          );
          count += pending.length;
        }
      } catch (err) {
        console.error(`Error counting pengajuan from ${key}:`, err);
      }
    });

    return count;
  };

  // Update pending pengajuan count
  useEffect(() => {
    const updateCount = () => {
      setPendingPengajuanCount(countPendingPengajuan());
    };

    // Initial count
    updateCount();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("pengajuan")) {
        updateCount();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Poll for changes (since storage event doesn't fire in same tab)
    const interval = setInterval(updateCount, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isCollapsed) {
      setExpandedMenus([]);
      return;
    }
    const filteredItems = filterMenuItems(menuItems, userRole);
    const activeMenus: string[] = [];
    filteredItems.forEach((item: MenuItem) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child: MenuItem) =>
          child.href && (pathname === child.href || pathname?.startsWith(child.href + "/"))
        );
        if (hasActiveChild) {
          activeMenus.push(item.label);
        }
      }
    });
    if (activeMenus.length > 0) {
      setExpandedMenus(activeMenus);
    }
  }, [pathname, isCollapsed, userRole]);

  // Close popout menu when clicking outside (only for clicked menus, not hover)
  useEffect(() => {
    if (!isCollapsed) {
      setHoveredMenu(null);
      setClickedMenu(null);
      return;
    }

    if (clickedMenu) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-sidebar-menu]')) {
          setClickedMenu(null);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isCollapsed, clickedMenu]);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const isParentActive = (item: MenuItem): boolean => {
    if (item.href && isActive(item.href)) return true;
    if (item.children) {
      return item.children.some((child) => isParentActive(child));
    }
    return false;
  };

  const clearHoverCloseTimeout = () => {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
  };

  const scheduleHoverClose = (label: string) => {
    clearHoverCloseTimeout();
    hoverCloseTimeoutRef.current = setTimeout(() => {
      setHoveredMenu((prev) => (prev === label ? null : prev));
      hoverCloseTimeoutRef.current = null;
    }, 200);
  };

  const filteredMenuItems = filterMenuItems(menuItems, userRole);

  return (
    <div
      style={{
        width: isCollapsed ? "80px" : "260px",
        height: "100vh",
        backgroundColor: "transparent",
        color: "#1e293b",
        padding: "20px 0",
        overflow: isCollapsed ? "visible" : "auto",
        position: "fixed",
        left: 0,
        top: 0,
        transition: "width 0.3s ease",
        zIndex: 1000,
        boxSizing: "border-box",
      }}
    >
      <div style={{ padding: isCollapsed ? "0 10px 20px" : "0 20px 20px", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: isCollapsed ? "center" : "space-between", alignItems: "center" }}>
          {!isCollapsed && (
            <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "#1e293b" }}>
              Sistem Apotik
            </h2>
          )}
          <button
            onClick={onToggle}
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
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? "→" : "←"}
          </button>
        </div>
      </div>
      <nav style={{ marginTop: "20px", display: "flex", flexDirection: "column", alignItems: isCollapsed ? "center" : "stretch", overflow: "visible" }}>
        {filteredMenuItems.map((item: MenuItem, index: number) => (
          <div 
            key={index} 
            style={{ position: "relative", width: isCollapsed ? "100%" : "100%", display: "flex", justifyContent: isCollapsed ? "center" : "flex-start" }} 
            data-sidebar-menu
          >
            {item.children ? (
              <div
                style={{ position: "relative", width: "100%" }}
                onMouseEnter={() => {
                  if (isCollapsed) {
                    clearHoverCloseTimeout();
                    setHoveredMenu(item.label);
                  }
                }}
                onMouseLeave={() => {
                  if (isCollapsed) {
                    scheduleHoverClose(item.label);
                  }
                }}
              >
                <button
                  onClick={() => {
                    if (!isCollapsed) {
                      toggleMenu(item.label);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: isCollapsed ? "12px" : "12px 20px",
                    textAlign: isCollapsed ? "center" : "left",
                    backgroundColor: isParentActive(item) ? "#eff6ff" : "transparent",
                    border: "none",
                    borderLeft: isCollapsed ? "none" : (isParentActive(item) ? "3px solid #3b82f6" : "1px solid #e2e8f0"),
                    color: isParentActive(item) ? "#3b82f6" : "#1e293b",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: isCollapsed ? "center" : "space-between",
                    alignItems: "center",
                    fontSize: "13px",
                    fontWeight: "400",
                    fontFamily: "Calibri, Arial, Helvetica, sans-serif",
                    transition: "all 0.2s",
                    lineHeight: "1.5",
                    boxSizing: "border-box",
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span style={{ display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "10px", width: isCollapsed ? "100%" : "auto" }}>
                    <span
                      style={{
                        width: isCollapsed ? "24px" : "20px",
                        height: isCollapsed ? "24px" : "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon && (
                        <img
                          src={`/icons/${item.icon}.svg`}
                          alt={item.label}
                          style={{
                            width: "16px",
                            height: "16px",
                            display: "block",
                            objectFit: "contain",
                          }}
                        />
                      )}
                    </span>
                    {!isCollapsed && <span>{item.label}</span>}
                  </span>
                  {!isCollapsed && (
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#1e293b",
                      }}
                    >
                      {expandedMenus.includes(item.label) ? "▼" : ">"}
                    </span>
                  )}
                </button>
                {/* Popout menu for collapsed sidebar */}
                {isCollapsed && hoveredMenu === item.label && (
                  <div
                    style={{
                      position: "absolute",
                      left: "100%",
                      top: "0",
                      marginLeft: "8px",
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      minWidth: "200px",
                      maxWidth: "250px",
                      zIndex: 1100,
                      padding: "8px 0",
                    }}
                    onMouseEnter={() => {
                      clearHoverCloseTimeout();
                      setHoveredMenu(item.label);
                    }}
                    onMouseLeave={() => {
                      scheduleHoverClose(item.label);
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 16px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#64748b",
                        borderBottom: "1px solid #e2e8f0",
                        marginBottom: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {item.icon && (
                        <img
                          src={`/icons/${item.icon}.svg`}
                          alt=""
                          style={{ width: "18px", height: "18px", objectFit: "contain" }}
                        />
                      )}
                      <span>{item.label}</span>
                    </div>
                    {item.children.map((child: MenuItem, childIndex: number) => {
                      if (child.href === "/admin/penjualan" && child.label === "Penjualan") {
                        return (
                          <button
                            key={childIndex}
                            onClick={() => {
                              window.open(child.href, "_blank");
                              setClickedMenu(null);
                              setHoveredMenu(null);
                            }}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              padding: "10px 16px",
                              color: isActive(child.href) ? "#3b82f6" : "#64748b",
                              textDecoration: "none",
                              fontSize: "13px",
                              backgroundColor: isActive(child.href) ? "#eff6ff" : "transparent",
                              border: "none",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive(child.href)) {
                                e.currentTarget.style.backgroundColor = "#f8fafc";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive(child.href)) {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                                {child.icon && (
                                  <img
                                    src={`/icons/${child.icon}.svg`}
                                    alt={child.label}
                                    style={{
                                      width: "16px",
                                      height: "16px",
                                      display: "block",
                                      objectFit: "contain",
                                    }}
                                  />
                                )}
                              </span>
                              <span>{child.label}</span>
                            </span>
                          </button>
                        );
                      }
                      return (
                        <Link
                          key={childIndex}
                          href={child.href || "#"}
                          onClick={() => {
                            setClickedMenu(null);
                            setHoveredMenu(null);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "10px 16px",
                            color: isActive(child.href) ? "#3b82f6" : "#64748b",
                            textDecoration: "none",
                            fontSize: "13px",
                            backgroundColor: isActive(child.href) ? "#eff6ff" : "transparent",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive(child.href)) {
                              e.currentTarget.style.backgroundColor = "#f8fafc";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive(child.href)) {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                              {child.icon && (
                                <img
                                  src={`/icons/${child.icon}.svg`}
                                  alt={child.label}
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                    display: "block",
                                    objectFit: "contain",
                                  }}
                                />
                              )}
                            </span>
                            <span>{child.label}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
                {!isCollapsed && expandedMenus.includes(item.label) && (
                  <div style={{ backgroundColor: "transparent" }}>
                    {item.children.map((child: MenuItem, childIndex: number) => {
                      // Special handling for Penjualan submenu - open in new tab
                      if (child.href === "/admin/penjualan" && child.label === "Penjualan") {
                        return (
                          <button
                            key={childIndex}
                            onClick={() => {
                              window.open(child.href, "_blank");
                            }}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              padding: "10px 20px 10px 48px",
                              color: isActive(child.href) ? "#3b82f6" : "#64748b",
                              textDecoration: "none",
                              fontSize: "13px",
                              backgroundColor: isActive(child.href)
                                ? "#eff6ff"
                                : "transparent",
                              borderLeft: isActive(child.href)
                                ? "3px solid #3b82f6"
                                : "1px solid #e2e8f0",
                              borderRight: "none",
                              borderTop: "none",
                              borderBottom: "none",
                              cursor: "pointer",
                              transition: "all 0.2s",
                              lineHeight: "1.5",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive(child.href)) {
                                e.currentTarget.style.backgroundColor = "#f8fafc";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive(child.href)) {
                                e.currentTarget.style.backgroundColor = "transparent";
                              }
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                                {child.icon && (
                                  <img
                                    src={`/icons/${child.icon}.svg`}
                                    alt={child.label}
                                    style={{
                                      width: "16px",
                                      height: "16px",
                                      display: "block",
                                      objectFit: "contain",
                                    }}
                                  />
                                )}
                              </span>
                              <span>{child.label}</span>
                            </span>
                          </button>
                        );
                      }
                      
                      // Default Link for other submenu items
                      return (
                        <Link
                          key={childIndex}
                          href={child.href || "#"}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "10px 20px 10px 48px",
                            color: isActive(child.href) ? "#3b82f6" : "#64748b",
                            textDecoration: "none",
                            fontSize: "13px",
                            backgroundColor: isActive(child.href)
                              ? "#eff6ff"
                              : "transparent",
                            borderLeft: isActive(child.href)
                              ? "3px solid #3b82f6"
                              : "1px solid #e2e8f0",
                            transition: "all 0.2s",
                            lineHeight: "1.5",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive(child.href)) {
                              e.currentTarget.style.backgroundColor = "#f8fafc";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive(child.href)) {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                              {child.icon && (
                                <img
                                  src={`/icons/${child.icon}.svg`}
                                  alt={child.label}
                                  style={{
                                    width: "16px",
                                    height: "16px",
                                    display: "block",
                                    objectFit: "contain",
                                  }}
                                />
                              )}
                            </span>
                            <span>{child.label}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={item.href || "#"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  padding: isCollapsed ? "12px" : "12px 20px",
                  color: isActive(item.href) ? "#3b82f6" : "#1e293b",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: "400",
                  fontFamily: "Calibri, Arial, Helvetica, sans-serif",
                  backgroundColor: isActive(item.href)
                    ? "#eff6ff"
                    : "transparent",
                  borderLeft: isCollapsed ? "none" : (isActive(item.href)
                    ? "3px solid #3b82f6"
                    : "1px solid #e2e8f0"),
                  transition: "all 0.2s",
                  lineHeight: "1.5",
                  position: "relative",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <span style={{ display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "10px", flex: 1, width: isCollapsed ? "100%" : "auto" }}>
                  <span
                    style={{
                      width: isCollapsed ? "24px" : "20px",
                      height: isCollapsed ? "24px" : "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon && (
                      <img
                        src={`/icons/${item.icon}.svg`}
                        alt={item.label}
                        style={{
                          width: "16px",
                          height: "16px",
                          display: "block",
                          objectFit: "contain",
                        }}
                      />
                    )}
                  </span>
                  {!isCollapsed && <span>{item.label}</span>}
                </span>
                {!isCollapsed && item.label === "Persetujuan Pengajuan" && pendingPengajuanCount > 0 && (
                  <span
                    style={{
                      backgroundColor: "#ef4444",
                      color: "white",
                      borderRadius: "10px",
                      padding: "2px 8px",
                      fontSize: "11px",
                      fontWeight: "600",
                      minWidth: "20px",
                      textAlign: "center",
                      marginLeft: "8px",
                    }}
                  >
                    {pendingPengajuanCount > 99 ? "99+" : pendingPengajuanCount}
                  </span>
                )}
                {isCollapsed && item.label === "Persetujuan Pengajuan" && pendingPengajuanCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      backgroundColor: "#ef4444",
                      color: "white",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: "600",
                    }}
                    title={`${pendingPengajuanCount} pengajuan menunggu persetujuan`}
                  >
                    {pendingPengajuanCount > 9 ? "9+" : pendingPengajuanCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}