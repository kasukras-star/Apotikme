"use client";

import DashboardLayout from "../../../components/DashboardLayout";

export default function PengaturanPage() {
  return (
    <DashboardLayout>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "24px" }}>
          Pengaturan
        </h2>
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "24px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <p style={{ color: "#64748b" }}>
            Halaman untuk pengaturan sistem. Fitur ini akan segera tersedia.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

