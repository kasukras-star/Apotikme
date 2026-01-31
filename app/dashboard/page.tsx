"use client";

import DashboardLayout from "../../components/DashboardLayout";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
          Selamat Datang di Dashboard
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
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
            <h3 style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
              Total Produk
            </h3>
            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#1e293b" }}>
              0
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
              Total Penjualan Hari Ini
            </h3>
            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#1e293b" }}>
              Rp 0
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
              Stok Menipis
            </h3>
            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#ef4444" }}>
              0
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>
              Pesanan Pending
            </h3>
            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b" }}>
              0
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
          <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
            Ringkasan Aktivitas
          </h3>
          <p style={{ color: "#64748b" }}>
            Dashboard ini menampilkan ringkasan aktivitas dan statistik sistem
            apotik. Gunakan menu sidebar untuk mengakses berbagai fitur seperti
            Data Master, Merchandise, Warehouse, dan lainnya.
        </p>
      </div>
    </div>
    </DashboardLayout>
  );
}
