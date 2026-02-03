"use client";

import { useState } from "react";
import DashboardLayout from "../../../../components/DashboardLayout";

export default function LaporanDataProdukPage() {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <DashboardLayout>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "24px", color: "var(--text-primary)" }}>
          Laporan Data Produk
        </h2>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "8px",
            backgroundColor: "var(--bg-secondary, #f8fafc)",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
                padding: "16px",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                minHeight: "80px",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "box-shadow 0.2s, border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "var(--primary, #2563eb)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: "48px",
                  height: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "var(--hover-bg)",
                  borderRadius: "8px",
                }}
              >
                <img
                  src="/icons/produk.svg"
                  alt=""
                  style={{ width: "28px", height: "28px", objectFit: "contain" }}
                />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "var(--text-primary)",
                    marginBottom: "4px",
                    lineHeight: 1.3,
                  }}
                >
                  Data Produk
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.4,
                  }}
                >
                  Laporan data produk
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Modal form laporan */}
        {showReportModal && (
          <>
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
                zIndex: 1100,
              }}
              onClick={() => setShowReportModal(false)}
              aria-hidden
            />
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "90%",
                maxWidth: "800px",
                maxHeight: "90vh",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                zIndex: 1101,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                  Laporan Data Produk
                </h3>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  style={{
                    width: "36px",
                    height: "36px",
                    border: "none",
                    background: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                  aria-label="Tutup"
                >
                  ×
                </button>
              </div>
              <div style={{ padding: "24px", overflow: "auto", flex: 1 }}>
                <form
                  onSubmit={(e) => e.preventDefault()}
                  style={{ display: "flex", flexDirection: "column", gap: "20px" }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: "500",
                          color: "var(--text-secondary)",
                          marginBottom: "6px",
                        }}
                      >
                        Tanggal dari
                      </label>
                      <input
                        type="date"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: "14px",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: "500",
                          color: "var(--text-secondary)",
                          marginBottom: "6px",
                        }}
                      >
                        Tanggal sampai
                      </label>
                      <input
                        type="date"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: "14px",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      style={{
                        padding: "10px 20px",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "var(--surface)",
                        backgroundColor: "var(--primary, #2563eb)",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "0.9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                    >
                      Tampilkan Laporan
                    </button>
                  </div>
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "20px",
                      backgroundColor: "var(--bg-secondary, #f8fafc)",
                      minHeight: "200px",
                    }}
                  >
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
                      Hasil laporan data produk akan ditampilkan di sini setelah memilih periode dan mengklik &quot;Tampilkan Laporan&quot;.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
