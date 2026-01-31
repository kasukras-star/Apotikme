"use client";

import { useState } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";

export default function BackupRestorePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleBackup = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Simulasi backup
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Simpan semua data dari localStorage ke JSON
      const backupData = {
        units: localStorage.getItem("units"),
        apotiks: localStorage.getItem("apotiks"),
        suppliers: localStorage.getItem("suppliers"),
        customers: localStorage.getItem("customers"),
        kategoris: localStorage.getItem("kategoris"),
        products: localStorage.getItem("products"),
        pengaturanPerusahaan: localStorage.getItem("pengaturanPerusahaan"),
        pengaturanSistem: localStorage.getItem("pengaturanSistem"),
        timestamp: new Date().toISOString(),
      };

      // Download sebagai file JSON
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-apotik-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess("Backup berhasil! File telah diunduh.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat backup";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const text = await file.text();
        const backupData = JSON.parse(text);

        // Restore data ke localStorage
        if (backupData.units) localStorage.setItem("units", backupData.units);
        if (backupData.apotiks) localStorage.setItem("apotiks", backupData.apotiks);
        if (backupData.suppliers) localStorage.setItem("suppliers", backupData.suppliers);
        if (backupData.customers) localStorage.setItem("customers", backupData.customers);
        if (backupData.kategoris) localStorage.setItem("kategoris", backupData.kategoris);
        if (backupData.products) localStorage.setItem("products", backupData.products);
        if (backupData.pengaturanPerusahaan) localStorage.setItem("pengaturanPerusahaan", backupData.pengaturanPerusahaan);
        if (backupData.pengaturanSistem) localStorage.setItem("pengaturanSistem", backupData.pengaturanSistem);

        setSuccess("Restore berhasil! Halaman akan dimuat ulang.");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "File backup tidak valid";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  return (
    <DashboardLayout>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
          Backup & Restore
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                marginBottom: "12px",
                color: "#1e293b",
              }}
            >
              Backup Data
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginBottom: "20px",
              }}
            >
              Unduh semua data sistem sebagai file backup.
            </p>
            <button
              onClick={handleBackup}
              disabled={loading}
              style={{
                padding: "10px 20px",
                backgroundColor: loading ? "#9ca3af" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "background-color 0.2s",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = "#059669";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = "#10b981";
                }
              }}
            >
              {loading ? "Memproses..." : "💾 Backup Data"}
            </button>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                marginBottom: "12px",
                color: "#1e293b",
              }}
            >
              Restore Data
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                marginBottom: "20px",
              }}
            >
              Pulihkan data dari file backup sebelumnya.
            </p>
            <button
              onClick={handleRestore}
              disabled={loading}
              style={{
                padding: "10px 20px",
                backgroundColor: loading ? "#9ca3af" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "background-color 0.2s",
                width: "100%",
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
              {loading ? "Memproses..." : "📥 Restore Data"}
            </button>
          </div>
        </div>

        {(error || success) && (
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "16px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: "24px",
            }}
          >
            {error && (
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  color: "#dc2626",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "6px",
                  color: "#16a34a",
                  fontSize: "14px",
                }}
              >
                {success}
              </div>
            )}
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
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "12px",
              color: "#1e293b",
            }}
          >
            Informasi Backup
          </h3>
          <ul
            style={{
              fontSize: "14px",
              color: "#64748b",
              paddingLeft: "20px",
              lineHeight: "1.8",
            }}
          >
            <li>Backup akan menyimpan semua data: Unit, Apotik, Supplier, Customer, Kategori, Produk, dan Pengaturan</li>
            <li>File backup berformat JSON dan dapat dibuka dengan text editor</li>
            <li>Restore akan mengganti semua data yang ada dengan data dari file backup</li>
            <li>Disarankan untuk melakukan backup secara berkala</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
