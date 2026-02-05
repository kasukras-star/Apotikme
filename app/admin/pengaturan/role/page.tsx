"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";

interface MenuPermission {
  menu: string;
  path: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  active: boolean;
  permissions: MenuPermission[];
}

const defaultRoles: Role[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access to all features",
    active: true,
    permissions: [],
  },
  {
    id: "manager",
    name: "Manager",
    description: "Management access to most features",
    active: true,
    permissions: [],
  },
  {
    id: "kasir",
    name: "Kasir",
    description: "Access to POS and sales features",
    active: true,
    permissions: [],
  },
  {
    id: "gudang",
    name: "Gudang",
    description: "Access to warehouse and purchase features",
    active: true,
    permissions: [],
  },
];

const allMenus = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Data Master - Unit", path: "/admin/master-data/unit" },
  { label: "Data Master - Apotik", path: "/admin/master-data/apotik" },
  { label: "Data Master - Supplier", path: "/admin/master-data/supplier" },
  { label: "Data Master - Customer", path: "/admin/master-data/customer" },
  { label: "Data Master - Kategori", path: "/admin/master-data/kategori" },
  { label: "Data Master - Type", path: "/admin/master-data/type" },
  { label: "Data Master - Jenis", path: "/admin/master-data/jenis" },
  { label: "Data Master - Margin", path: "/admin/master-data/margin" },
  { label: "Data Master - Racikan", path: "/admin/master-data/racikan" },
  { label: "Data Master - Produk", path: "/admin/master-data/obat" },
  { label: "Merchandise - Pesanan Pembelian", path: "/admin/pembelian/pesanan" },
  { label: "Merchandise - Faktur Pembelian", path: "/admin/pembelian/faktur" },
  { label: "Merchandise - Penyesuaian stok", path: "/admin/pembelian/penyesuaian-stok" },
  { label: "Merchandise - Perubahan harga jual", path: "/admin/pembelian/perubahan-harga-jual" },
  { label: "Merchandise - Rencana Transfer Barang", path: "/admin/pembelian/rencana-transfer-barang" },
  { label: "Persetujuan Pengajuan", path: "/admin/pembelian/persetujuan-pengajuan" },
  { label: "Warehouse - Dashboard", path: "/admin/warehouse/dashboard" },
  { label: "Warehouse - Terima Pembelian", path: "/admin/warehouse/terima-pembelian" },
  { label: "Warehouse - Transfer Barang", path: "/admin/warehouse/transfer-barang" },
  { label: "Warehouse - Terima Transfer", path: "/admin/warehouse/terima-transfer" },
  { label: "Warehouse - Stok Opname", path: "/admin/warehouse/stok-opname" },
  { label: "Informasi - Inventory", path: "/inventory" },
  { label: "POS - Penjualan", path: "/admin/penjualan" },
  { label: "POS - History Penjualan", path: "/admin/penjualan/history" },
  { label: "POS - Dashboard", path: "/admin/penjualan/dashboard" },
  { label: "POS - Inventory", path: "/admin/penjualan/inventory" },
  { label: "Finance - Hutang", path: "/admin/finance/hutang" },
  { label: "Laporan - Data Produk", path: "/admin/laporan/data-produk" },
  { label: "Laporan - Pembelian", path: "/admin/laporan/pembelian" },
  { label: "Laporan - Alokasi Barang", path: "/admin/laporan/alokasi-barang" },
  { label: "Laporan - Perubahan Harga Jual", path: "/admin/laporan/perubahan-harga-jual" },
  { label: "Laporan - Persediaan", path: "/admin/laporan/persediaan" },
  { label: "Pengaturan - User", path: "/admin/pengaturan/user" },
  { label: "Pengaturan - Role", path: "/admin/pengaturan/role" },
  { label: "Pengaturan - Perusahaan", path: "/admin/pengaturan/perusahaan" },
  { label: "Pengaturan - Sistem", path: "/admin/pengaturan/sistem" },
  { label: "Pengaturan - Backup & Restore", path: "/admin/pengaturan/backup" },
  { label: "Pengaturan - Hapus Data", path: "/admin/pengaturan/hapus-data" },
];

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    active: boolean;
    permissions: MenuPermission[];
  }>({
    name: "",
    description: "",
    active: true,
    permissions: [],
  });

  useEffect(() => {
    const savedRoles = localStorage.getItem("rolePermissions");
    if (savedRoles) {
      try {
        const parsed = JSON.parse(savedRoles);
        setRoles(parsed);
      } catch (err) {
        console.error("Error loading role permissions:", err);
      }
    } else {
      // Initialize with default permissions
      const initializedRoles = defaultRoles.map((role) => ({
        ...role,
        permissions: allMenus.map((menu) => ({
          menu: menu.label,
          path: menu.path,
          view: role.id === "admin" || role.id === "manager",
          create: role.id === "admin" || role.id === "manager",
          edit: role.id === "admin" || role.id === "manager",
          delete: role.id === "admin",
        })),
      }));
      setRoles(initializedRoles);
      localStorage.setItem("rolePermissions", JSON.stringify(initializedRoles));
    }
  }, []);

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      active: role.active,
      permissions: role.permissions.length > 0 
        ? role.permissions 
        : allMenus.map((menu) => ({
            menu: menu.label,
            path: menu.path,
            view: false,
            create: false,
            edit: false,
            delete: false,
          })),
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      active: true,
      permissions: [],
    });
  };

  const handlePermissionChange = (
    menuPath: string,
    permissionType: "view" | "create" | "edit" | "delete",
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.map((perm) =>
        perm.path === menuPath
          ? { ...perm, [permissionType]: checked }
          : perm
      ),
    }));
  };

  const handleSaveRole = () => {
    if (!editingRole) return;

    const updatedRoles = roles.map((role) =>
      role.id === editingRole.id
        ? {
            ...role,
            name: formData.name,
            description: formData.description,
            active: formData.active,
            permissions: formData.permissions,
          }
        : role
    );

    setRoles(updatedRoles);
    localStorage.setItem("rolePermissions", JSON.stringify(updatedRoles));
    handleCloseModal();
    alert("Role berhasil diupdate!");
  };

  const getPermissionForMenu = (role: Role, menuPath: string): MenuPermission | undefined => {
    return role.permissions.find((p) => p.path === menuPath);
  };

  return (
    <DashboardLayout>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "600", margin: 0 }}>
              Roles & Permissions
            </h2>
            <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}>
              Manage user roles and menu permissions
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "24px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {roles.length === 0 ? (
            <p style={{ color: "#64748b", textAlign: "center" }}>Belum ada role.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Name
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Description
                    </th>
                    <th style={{ padding: "12px", textAlign: "center", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Status
                    </th>
                    <th style={{ padding: "12px", textAlign: "right", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#1e293b", fontWeight: "500" }}>
                        {role.name}
                      </td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#64748b" }}>
                        {role.description}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "500",
                            backgroundColor: role.active ? "#d1fae5" : "#fee2e2",
                            color: role.active ? "#065f46" : "#991b1b",
                          }}
                        >
                          {role.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <button
                          onClick={() => handleEditRole(role)}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit Role Modal */}
        {isModalOpen && editingRole && (
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
              padding: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "18px 20px",
                width: "100%",
                maxWidth: "900px",
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
                  marginBottom: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    margin: 0,
                    color: "#1e293b",
                  }}
                >
                  Edit Role
                </h3>
                <button
                  onClick={handleCloseModal}
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
                  }}
                >
                  ×
                </button>
              </div>

              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "14px" }}>
                Update the role information and permissions below.
              </p>

              {/* Role Information - Nama & Deskripsi 2 side */}
              <div style={{ marginBottom: "18px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px", color: "#1e293b" }}>
                  Role Information
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: "10px" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "4px",
                        fontSize: "13px",
                        fontWeight: "500",
                        color: "#374151",
                      }}
                    >
                      Description
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <span>Active</span>
                </label>
              </div>

              {/* Menu Permissions */}
              <div>
                <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "10px", color: "#1e293b" }}>
                  Menu Permissions
                </h4>
                <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#374151", minWidth: "250px" }}>
                          Menu
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: "600", fontSize: "12px", color: "#374151", width: "80px" }}>
                          View
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: "600", fontSize: "12px", color: "#374151", width: "80px" }}>
                          Create
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: "600", fontSize: "12px", color: "#374151", width: "80px" }}>
                          Edit
                        </th>
                        <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: "600", fontSize: "12px", color: "#374151", width: "80px" }}>
                          Delete
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMenus.map((menu, index) => {
                        const permission = formData.permissions.find((p) => p.path === menu.path) || {
                          menu: menu.label,
                          path: menu.path,
                          view: false,
                          create: false,
                          edit: false,
                          delete: false,
                        };
                        return (
                          <tr
                            key={menu.path}
                            style={{
                              borderBottom: index < allMenus.length - 1 ? "1px solid #e2e8f0" : "none",
                              backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                            }}
                          >
                            <td style={{ padding: "8px 10px", color: "#1e293b", fontSize: "13px" }}>
                              <div style={{ fontWeight: "500" }}>{menu.label}</div>
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                {menu.path}
                              </div>
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={permission.view}
                                onChange={(e) =>
                                  handlePermissionChange(menu.path, "view", e.target.checked)
                                }
                                style={{ width: "16px", height: "16px", cursor: "pointer" }}
                              />
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={permission.create}
                                onChange={(e) =>
                                  handlePermissionChange(menu.path, "create", e.target.checked)
                                }
                                style={{ width: "16px", height: "16px", cursor: "pointer" }}
                              />
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={permission.edit}
                                onChange={(e) =>
                                  handlePermissionChange(menu.path, "edit", e.target.checked)
                                }
                                style={{ width: "16px", height: "16px", cursor: "pointer" }}
                              />
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={permission.delete}
                                onChange={(e) =>
                                  handlePermissionChange(menu.path, "delete", e.target.checked)
                                }
                                style={{ width: "16px", height: "16px", cursor: "pointer" }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end",
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRole}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
