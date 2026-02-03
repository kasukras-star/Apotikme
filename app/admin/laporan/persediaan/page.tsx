"use client";

import DashboardLayout from "../../../../components/DashboardLayout";

export default function LaporanPersediaanPage() {
  return (
    <DashboardLayout>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "24px", color: "var(--text-primary)" }}>
          Laporan Persediaan
        </h2>
        <div
          style={{
            backgroundColor: "var(--surface)",
            padding: "24px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }}>
            Laporan persediaan. Fitur ini akan segera tersedia.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
