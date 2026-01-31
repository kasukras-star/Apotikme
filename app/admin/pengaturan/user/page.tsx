"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface Apotik {
  id: string;
  kodeApotik: string;
  namaApotik: string;
}

interface UserFormData {
  nama: string;
  email: string;
  password: string;
  role: string;
  apotikIds: string[];
  isSuperAdmin: boolean;
  statusAktif: boolean;
}

interface User {
  id: string;
  email: string;
  nama?: string;
  role: string | null;
  apotikIds: string[];
  isSuperAdmin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

export default function PengaturanUserPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formData, setFormData] = useState<UserFormData>({
    nama: "",
    email: "",
    password: "",
    role: "",
    apotikIds: [],
    isSuperAdmin: false,
    statusAktif: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Load users from API
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`);
        }
        
        if (!sessionData.session) {
          setError("Session tidak ditemukan. Silakan login kembali.");
          setLoadingUsers(false);
          return;
        }

        // Use session token for authentication
        const sessionToken = sessionData.session.access_token;
        
        if (!sessionToken) {
          setError("Token tidak ditemukan. Silakan login kembali.");
          setLoadingUsers(false);
          return;
        }
        const response = await fetch("/api/admin/list-users", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${sessionToken}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          let errorMessage = errorData.error || "Failed to load users";
          
          // If unauthorized, provide more helpful message
          if (response.status === 401 || response.status === 403) {
            console.error("Authorization error:", errorMessage);
            // Check if user has no role
            const userRole = sessionData.session?.user?.app_metadata?.role;
            if (!userRole) {
              errorMessage = "Anda tidak memiliki role yang valid. Silakan hubungi administrator untuk mengassign role (Admin atau Manager) ke akun Anda melalui halaman Pengaturan User. Jika Anda adalah administrator pertama, gunakan ADMIN_API_TOKEN untuk membuat user dengan role Admin.";
            }
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json();
        setUsers(result.users || []);
      } catch (err) {
        console.error("Error loading users:", err);
        const errorMessage = err instanceof Error ? err.message : "Gagal memuat daftar user";
        setError(errorMessage);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, []);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUserId(user.id);
      setFormData({
        nama: user.nama || "",
        email: user.email,
        password: "",
        role: user.role || "",
        apotikIds: user.apotikIds || [],
        isSuperAdmin: user.isSuperAdmin || false,
        statusAktif: true,
      });
    } else {
      setEditingUserId(null);
      setFormData({
        nama: "",
        email: "",
        password: "",
        role: "",
        apotikIds: [],
        isSuperAdmin: false,
        statusAktif: true,
      });
    }
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
    setFormData({
      nama: "",
      email: "",
      password: "",
      role: "",
      apotikIds: [],
      isSuperAdmin: false,
      statusAktif: true,
    });
    setError(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleApotikChange = (apotikId: string) => {
    setFormData((prev) => {
      const currentIds = prev.apotikIds || [];
      const newIds = currentIds.includes(apotikId)
        ? currentIds.filter((id) => id !== apotikId)
        : [...currentIds, apotikId];
      return {
        ...prev,
        apotikIds: newIds,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate apotik selection
    if (!formData.isSuperAdmin && (!formData.apotikIds || formData.apotikIds.length === 0)) {
      setError("Pilih minimal satu apotik atau aktifkan Super Admin");
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Session tidak ditemukan");
      }

      // Use session token for authentication
      const sessionToken = sessionData.session.access_token;

      if (editingUserId) {
        // Update existing user
        const updateData: any = {
          userId: editingUserId,
          email: formData.email,
          nama: formData.nama,
          role: formData.role,
          apotikIds: formData.apotikIds,
          isSuperAdmin: formData.isSuperAdmin,
          statusAktif: formData.statusAktif,
        };
        
        if (formData.password) {
          updateData.password = formData.password;
        }

        const response = await fetch("/api/admin/update-user", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionToken}`,
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Gagal mengupdate user");
        }
      } else {
        // Create new user
        if (!formData.password) {
          throw new Error("Password harus diisi untuk user baru");
        }

        const response = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            nama: formData.nama,
            role: formData.role,
            apotikIds: formData.apotikIds,
            isSuperAdmin: formData.isSuperAdmin,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || "Gagal membuat user");
        }
      }

      // Reload users list
      const listResponse = await fetch("/api/admin/list-users", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${sessionToken}`,
        },
      });

      if (listResponse.ok) {
        const result = await listResponse.json();
        setUsers(result.users || []);
      }

      handleCloseModal();
      alert(editingUserId ? "User berhasil diupdate!" : "User berhasil dibuat!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menonaktifkan user ini?")) {
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Session tidak ditemukan");
      }

      // Use session token for authentication
      const sessionToken = sessionData.session.access_token;

      const response = await fetch("/api/admin/update-user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          userId,
          statusAktif: false,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Gagal menonaktifkan user");
      }

      // Reload users list
      const listResponse = await fetch("/api/admin/list-users", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${sessionToken}`,
        },
      });

      if (listResponse.ok) {
        const result = await listResponse.json();
        setUsers(result.users || []);
      }

      alert("User berhasil dinonaktifkan!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      alert(msg);
    }
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
          <h2 style={{ fontSize: "24px", fontWeight: "600", margin: 0 }}>
            Pengaturan User
          </h2>
          <button
            onClick={() => handleOpenModal()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#3b82f6";
            }}
          >
            + {editingUserId ? "Edit User" : "Tambah User"}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              marginBottom: "20px",
              color: "#dc2626",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "24px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          {loadingUsers ? (
            <p style={{ color: "#64748b", textAlign: "center" }}>Memuat daftar user...</p>
          ) : users.length === 0 ? (
            <p style={{ color: "#64748b", textAlign: "center" }}>
              Belum ada user. Klik tombol "Tambah User" untuk menambahkan user baru.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Email
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Role
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Apotik
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Dibuat
                    </th>
                    <th style={{ padding: "12px", textAlign: "left", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Last Login
                    </th>
                    <th style={{ padding: "12px", textAlign: "right", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#1e293b" }}>
                        {user.email}
                      </td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#64748b" }}>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: "500",
                              backgroundColor: "#dbeafe",
                              color: "#1e40af",
                            }}
                          >
                            {user.role || "Tidak ada"}
                          </span>
                          {user.isSuperAdmin && (
                            <span
                              style={{
                                padding: "4px 12px",
                                borderRadius: "12px",
                                fontSize: "12px",
                                fontWeight: "500",
                                backgroundColor: "#fef3c7",
                                color: "#92400e",
                              }}
                            >
                              Super Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#64748b" }}>
                        {user.isSuperAdmin ? (
                          <span style={{ color: "#92400e", fontWeight: "500" }}>Semua Apotik</span>
                        ) : user.apotikIds && user.apotikIds.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {user.apotikIds.map((apotikId) => {
                              const apotik = apotiks.find((a) => a.id === apotikId);
                              return (
                                <span
                                  key={apotikId}
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    backgroundColor: "#f1f5f9",
                                    color: "#475569",
                                    display: "inline-block",
                                  }}
                                >
                                  {apotik ? apotik.namaApotik : apotikId}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#64748b" }}>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString("id-ID", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "-"}
                      </td>
                      <td style={{ padding: "12px", fontSize: "14px", color: "#64748b" }}>
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString("id-ID", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Belum pernah login"}
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleOpenModal(user)}
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
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                            }}
                          >
                            Nonaktifkan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal - tidak tertutup saat klik di luar, hanya lewat Batal / X */}
        {isModalOpen && (
          <div
            role="presentation"
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
              cursor: "default",
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "16px 20px",
                width: "90%",
                maxWidth: "500px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                cursor: "default",
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
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
                  {editingUserId ? "Edit User" : "Tambah User"}
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
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px", marginBottom: "12px" }}>
                  <div>
                    <label htmlFor="nama" style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Nama <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="nama"
                      name="nama"
                      value={formData.nama}
                      onChange={handleChange}
                      required
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.outline = "none"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; }}
                      placeholder="Masukkan nama user"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Email <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.outline = "none"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; }}
                      placeholder="Masukkan email"
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px", marginBottom: "12px" }}>
                  <div>
                    <label htmlFor="password" style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Password <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required={!editingUserId}
                      placeholder={editingUserId ? "Kosongkan jika tidak ubah" : "Masukkan password"}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.outline = "none"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; }}
                    />
                  </div>
                  <div>
                    <label htmlFor="role" style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Role <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", backgroundColor: "white" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.outline = "none"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; }}
                    >
                      <option value="">Pilih Role</option>
                      <option value="Admin">Admin</option>
                      <option value="Kasir">Kasir</option>
                      <option value="Gudang">Gudang</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                </div>

                {formData.role === "Admin" && (
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#374151", cursor: "pointer" }}>
                      <input type="checkbox" id="isSuperAdmin" name="isSuperAdmin" checked={formData.isSuperAdmin} onChange={handleChange} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                      <span>Super Admin (Akses Semua Apotik)</span>
                    </label>
                  </div>
                )}

                {!formData.isSuperAdmin && (
                  <div style={{ marginBottom: "10px" }}>
                    <label htmlFor="apotikIds" style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Apotik <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <div style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "6px", maxHeight: "140px", overflowY: "auto", backgroundColor: "white" }}>
                      {apotiks.length === 0 ? (
                        <p style={{ color: "#94a3b8", fontSize: "12px", padding: "6px", margin: 0 }}>Belum ada apotik. Tambahkan apotik terlebih dahulu.</p>
                      ) : (
                        apotiks.map((apotik) => (
                          <label
                            key={apotik.id}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 6px", cursor: "pointer", borderRadius: "4px", transition: "background-color 0.2s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                          >
                            <input type="checkbox" checked={formData.apotikIds.includes(apotik.id)} onChange={() => handleApotikChange(apotik.id)} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                            <span style={{ fontSize: "13px", color: "#374151" }}>{apotik.namaApotik} ({apotik.kodeApotik})</span>
                          </label>
                        ))
                      )}
                    </div>
                    {formData.apotikIds.length === 0 && !formData.isSuperAdmin && (
                      <p style={{ color: "#ef4444", fontSize: "11px", marginTop: "2px", marginBottom: 0 }}>Pilih minimal satu apotik</p>
                    )}
                  </div>
                )}

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "500", color: "#374151", cursor: "pointer" }}>
                    <input type="checkbox" id="statusAktif" name="statusAktif" checked={formData.statusAktif} onChange={handleChange} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                    <span>Status Aktif</span>
                  </label>
                </div>

                {error && (
                  <div style={{ padding: "8px 10px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", marginBottom: "12px", color: "#dc2626", fontSize: "13px" }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={loading}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "none",
                      borderRadius: "6px",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "#e5e7eb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "#f3f4f6";
                      }
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: loading ? "#9ca3af" : "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "#2563eb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.backgroundColor = "#3b82f6";
                      }
                    }}
                  >
                    {loading ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
