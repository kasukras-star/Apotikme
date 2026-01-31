"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "../../../../components/DashboardLayout";
import { getSupabaseClient } from "../../../../lib/supabaseClient";

interface CartItem {
  itemType?: "product";
  id: string;
  produkId: string;
  kodeProduk: string;
  namaProduk: string;
  unitId?: string;
  namaUnit: string;
  qty: number;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
}

interface CartItemRacikan {
  itemType: "racikan";
  id: string;
  racikanId: string;
  kodeRacikan: string;
  namaRacikan: string;
  qty: number;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
}

type CartLine = CartItem | CartItemRacikan;

interface Customer {
  id: string;
  kodeCustomer: string;
  namaCustomer: string;
  alamat: string;
  telepon: string;
  email: string;
}

interface Penjualan {
  id: string;
  nomorTransaksi: string;
  tanggalTransaksi: string;
  customerId: string | null;
  items: CartLine[];
  subtotal: number;
  diskonGlobal: number;
  diskonAmount: number;
  ppn: number;
  ppnAmount: number;
  total: number;
  paymentMethod: string;
  apotikId: string;
  createdAt: string;
}

export default function HistoryPenjualanPage() {
  const pathname = usePathname();
  const [penjualanList, setPenjualanList] = useState<Penjualan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredList, setFilteredList] = useState<Penjualan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [selectedPenjualan, setSelectedPenjualan] = useState<Penjualan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // POS session (sama seperti Inventory submenu)
  const [isPosLoggedIn, setIsPosLoggedIn] = useState(false);
  const [currentApotikName, setCurrentApotikName] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userApotikIds, setUserApotikIds] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedApotikId, setSelectedApotikId] = useState<string | null>(null);

  useEffect(() => {
    // Load user apotik access
    const loadUserAccess = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      
      if (session) {
        const apotikIds = session.user?.app_metadata?.apotikIds as string[] | undefined;
        const superAdmin = session.user?.app_metadata?.isSuperAdmin as boolean | undefined;
        
        setUserApotikIds(apotikIds || []);
        setIsSuperAdmin(superAdmin || false);
        
        // Get selected apotik from sessionStorage
        const saved = sessionStorage.getItem("selectedApotikId");
        if (superAdmin) {
          setSelectedApotikId(saved || "all");
        } else if (apotikIds && apotikIds.length > 0) {
          setSelectedApotikId(saved && apotikIds.includes(saved) ? saved : apotikIds[0]);
        }
      }
    };
    
    loadUserAccess();

    // Cek session POS (sama seperti akses Inventory pada submenu PO)
    const posSession = sessionStorage.getItem("posSession");
    if (posSession) {
      try {
        const session = JSON.parse(posSession);
        if (session.apotikId && session.apotikName) {
          setCurrentApotikName(session.apotikName);
          setIsPosLoggedIn(true);
        }
      } catch (err) {
        console.error("Error loading POS session:", err);
        sessionStorage.removeItem("posSession");
      }
    }

    const savedPenjualan = localStorage.getItem("penjualan");
    const savedCustomers = localStorage.getItem("customers");

    if (savedPenjualan) {
      try {
        const parsed = JSON.parse(savedPenjualan);
        // Sort by date descending (newest first)
        const sorted = parsed.sort((a: Penjualan, b: Penjualan) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setPenjualanList(sorted);
      } catch (err) {
        console.error("Error loading penjualan:", err);
      }
    }

    if (savedCustomers) {
      try {
        const parsed = JSON.parse(savedCustomers);
        setCustomers(parsed);
      } catch (err) {
        console.error("Error loading customers:", err);
      }
    }
    setIsCheckingSession(false);
  }, []);

  useEffect(() => {
    let filtered = penjualanList;

    // Filter by apotik access
    if (selectedApotikId) {
      if (selectedApotikId === "all" && isSuperAdmin) {
        // Super admin melihat semua
        // No filter needed
      } else {
        // Filter by selected apotik
        filtered = filtered.filter((p) => p.apotikId === selectedApotikId);
      }
    } else if (!isSuperAdmin && userApotikIds.length > 0) {
      // If no selection but user has apotikIds, filter by user's apotiks
      filtered = filtered.filter((p) => userApotikIds.includes(p.apotikId));
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.nomorTransaksi.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.customerId &&
            customers
              .find((c) => c.id === p.customerId)
              ?.namaCustomer.toLowerCase()
              .includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by date
    if (filterDate) {
      filtered = filtered.filter((p) => p.tanggalTransaksi === filterDate);
    }

    setFilteredList(filtered);
  }, [searchTerm, filterDate, penjualanList, customers, selectedApotikId, isSuperAdmin, userApotikIds]);

  const getCustomerName = (customerId: string | null): string => {
    if (!customerId) return "-";
    const customer = customers.find((c) => c.id === customerId);
    return customer ? customer.namaCustomer : "-";
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number): string => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  const handleViewDetail = (penjualan: Penjualan) => {
    setSelectedPenjualan(penjualan);
    setShowDetailModal(true);
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedPenjualan(null);
  };

  const handlePosLogout = () => {
    sessionStorage.removeItem("posSession");
    setIsPosLoggedIn(false);
    setCurrentApotikName("");
    window.location.href = "/admin/penjualan";
  };

  const handlePrintReceipt = (penjualan: Penjualan) => {
    const customerData = penjualan.customerId
      ? customers.find((c) => c.id === penjualan.customerId)
      : null;

    const receiptData = {
      ...penjualan,
      customer: customerData,
    };

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Struk - ${penjualan.nomorTransaksi}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                @page { size: 80mm auto; margin: 0; }
              }
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                font-size: 12px;
              }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 16px; }
              .item { margin-bottom: 12px; }
              .summary { margin-top: 16px; }
              .total { border-top: 2px solid #000; padding-top: 8px; font-weight: bold; font-size: 16px; }
              .footer { text-align: center; border-top: 1px dashed #ccc; padding-top: 16px; font-size: 11px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 8px 0;">SISTEM APOTIK</h2>
              <p style="font-size: 12px; margin: 4px 0;">Struk Pembayaran</p>
              <p style="font-size: 11px; margin: 4px 0;">${formatDate(penjualan.tanggalTransaksi)}</p>
            </div>
            <div style="margin-bottom: 16px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>No. Transaksi:</span>
                <span style="font-weight: 500;">${penjualan.nomorTransaksi}</span>
              </div>
              ${customerData ? `<div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Customer:</span>
                <span style="font-weight: 500;">${customerData.namaCustomer}</span>
              </div>` : ""}
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Metode:</span>
                <span style="font-weight: 500; text-transform: capitalize;">${penjualan.paymentMethod}</span>
              </div>
            </div>
            <div style="border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; padding: 12px 0; margin-bottom: 16px;">
              ${penjualan.items
                .map(
                  (item) => {
                    const isRacikan = item.itemType === "racikan";
                    const nama = isRacikan ? "Jasa Racik: " + item.namaRacikan : item.namaProduk;
                    const kode = isRacikan ? item.kodeRacikan : item.kodeProduk;
                    const unitLabel = isRacikan ? "pcs" : item.namaUnit;
                    return `
                <div style="margin-bottom: 12px; font-size: 12px;">
                  <div style="font-weight: 500; margin-bottom: 4px;">${nama}</div>
                  <div style="font-size: 11px; color: #666; margin-bottom: 2px;">
                    ${kode} | ${item.qty} ${unitLabel} × Rp ${item.hargaSatuan.toLocaleString("id-ID")}
                  </div>
                  ${item.diskon > 0 ? `<div style="font-size: 11px; color: #666; margin-bottom: 2px;">Diskon: Rp ${item.diskon.toLocaleString("id-ID")}</div>` : ""}
                  <div style="display: flex; justify-content: space-between; margin-top: 4px; font-weight: 500;">
                    <span>Subtotal:</span>
                    <span>Rp ${item.subtotal.toLocaleString("id-ID")}</span>
                  </div>
                </div>
              `;
                  }
                )
                .join("")}
            </div>
            <div style="margin-bottom: 16px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>Subtotal:</span>
                <span>Rp ${penjualan.subtotal.toLocaleString("id-ID")}</span>
              </div>
              ${penjualan.diskonGlobal > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>Diskon Global (${penjualan.diskonGlobal}%):</span>
                <span>Rp ${penjualan.diskonAmount.toLocaleString("id-ID")}</span>
              </div>` : ""}
              ${penjualan.ppn > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span>PPN (${penjualan.ppn}%):</span>
                <span>Rp ${penjualan.ppnAmount.toLocaleString("id-ID")}</span>
              </div>` : ""}
              <div style="border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
                <span>TOTAL:</span>
                <span>Rp ${penjualan.total.toLocaleString("id-ID")}</span>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 4px 0;">Terima kasih atas kunjungan Anda</p>
              <p style="margin: 4px 0;">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  // Loading saat cek session
  if (isCheckingSession) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#f1f5f9" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "16px", color: "#64748b" }}>Memuat...</div>
        </div>
      </div>
    );
  }

  // Konten utama (filter, tabel, modal) – dipakai di layout POS dan Dashboard
  const mainContent = (
    <div>
        {/* Filter & Search */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: "16px",
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Cari nomor transaksi atau customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
            }}
          />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "13px",
            }}
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate("")}
              style={{
                padding: "8px 16px",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {filteredList.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              {penjualanList.length === 0
                ? "Belum ada transaksi penjualan."
                : "Tidak ada transaksi yang sesuai dengan filter."}
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    No. Transaksi
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Tanggal
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Customer
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Jumlah Item
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Total
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    Metode
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "12px 16px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                      width: "120px",
                    }}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((penjualan) => (
                  <tr
                    key={penjualan.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        fontWeight: "500",
                        color: "#1e293b",
                      }}
                    >
                      {penjualan.nomorTransaksi}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {formatDate(penjualan.tanggalTransaksi)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {getCustomerName(penjualan.customerId)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: "#64748b",
                      }}
                    >
                      {penjualan.items.length} item
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        fontWeight: "500",
                        textAlign: "right",
                        color: "#1e293b",
                      }}
                    >
                      {formatCurrency(penjualan.total)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                        color: "#64748b",
                        textTransform: "capitalize",
                      }}
                    >
                      {penjualan.paymentMethod}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "13px",
                      }}
                    >
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          onClick={() => handleViewDetail(penjualan)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Lihat Detail"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ color: "#3b82f6" }}
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handlePrintReceipt(penjualan)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Print Struk"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ color: "#64748b" }}
                          >
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedPenjualan && (
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
              zIndex: 2000,
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "24px",
                borderRadius: "8px",
                width: "90%",
                maxWidth: "600px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "600", margin: 0 }}>
                  Detail Transaksi
                </h2>
                <button
                  onClick={handleCloseDetail}
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
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                  <span style={{ color: "#64748b" }}>No. Transaksi:</span>
                  <span style={{ fontWeight: "500" }}>{selectedPenjualan.nomorTransaksi}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                  <span style={{ color: "#64748b" }}>Tanggal:</span>
                  <span>{formatDate(selectedPenjualan.tanggalTransaksi)}</span>
                </div>
                {selectedPenjualan.customerId && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                    <span style={{ color: "#64748b" }}>Customer:</span>
                    <span>{getCustomerName(selectedPenjualan.customerId)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                  <span style={{ color: "#64748b" }}>Metode Pembayaran:</span>
                  <span style={{ textTransform: "capitalize" }}>{selectedPenjualan.paymentMethod}</span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", padding: "16px 0", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>Detail Barang</h3>
                {selectedPenjualan.items.map((item: CartLine, index: number) => {
                  const isRacikan = (item as CartItemRacikan).itemType === "racikan";
                  const nama = isRacikan ? `Jasa Racik: ${(item as CartItemRacikan).namaRacikan}` : (item as CartItem).namaProduk;
                  const kode = isRacikan ? (item as CartItemRacikan).kodeRacikan : (item as CartItem).kodeProduk;
                  const unitLabel = isRacikan ? "pcs" : (item as CartItem).namaUnit;
                  return (
                    <div
                      key={index}
                      style={{
                        padding: "12px",
                        backgroundColor: isRacikan ? "#f0fdf4" : "#f8fafc",
                        borderRadius: "6px",
                        marginBottom: "8px",
                      }}
                    >
                      <div style={{ fontWeight: "500", marginBottom: "4px" }}>{nama}</div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                        {kode} | {item.qty} {unitLabel} × {formatCurrency(item.hargaSatuan)}
                      </div>
                      {item.diskon > 0 && (
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                          Diskon: {formatCurrency(item.diskon)}
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontWeight: "500" }}>
                        <span>Subtotal:</span>
                        <span>{formatCurrency(item.subtotal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                  <span style={{ color: "#64748b" }}>Subtotal:</span>
                  <span>{formatCurrency(selectedPenjualan.subtotal)}</span>
                </div>
                {selectedPenjualan.diskonGlobal > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                    <span style={{ color: "#64748b" }}>Diskon Global ({selectedPenjualan.diskonGlobal}%):</span>
                    <span>{formatCurrency(selectedPenjualan.diskonAmount)}</span>
                  </div>
                )}
                {selectedPenjualan.ppn > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                    <span style={{ color: "#64748b" }}>PPN ({selectedPenjualan.ppn}%):</span>
                    <span>{formatCurrency(selectedPenjualan.ppnAmount)}</span>
                  </div>
                )}
                <div
                  style={{
                    borderTop: "2px solid #e2e8f0",
                    paddingTop: "12px",
                    marginTop: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "18px",
                    fontWeight: "600",
                  }}
                >
                  <span>Total:</span>
                  <span style={{ color: "#3b82f6" }}>{formatCurrency(selectedPenjualan.total)}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => handlePrintReceipt(selectedPenjualan)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  Print Struk
                </button>
                <button
                  onClick={handleCloseDetail}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );

  // Sudah login POS: tampilkan layout sama seperti Inventory (sidebar POS, header apotik, data langsung)
  if (isPosLoggedIn) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex" }}>
        {/* POS Sidebar (sama seperti Inventory) */}
        <div
          style={{
            width: isSidebarCollapsed ? "80px" : "260px",
            height: "100vh",
            backgroundColor: "transparent",
            color: "#1e293b",
            padding: "20px 0",
            overflowY: "auto",
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 1000,
            borderRight: "1px solid #e2e8f0",
            transition: "width 0.3s ease",
          }}
        >
          <div style={{ padding: isSidebarCollapsed ? "0 10px 20px" : "0 20px 20px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: isSidebarCollapsed ? "center" : "space-between", alignItems: "center" }}>
              {!isSidebarCollapsed && (
                <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "#1e293b" }}>Sistem Apotik</h2>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#64748b", fontSize: "18px" }}
                title={isSidebarCollapsed ? "Expand" : "Collapse"}
              >
                {isSidebarCollapsed ? "→" : "←"}
              </button>
            </div>
          </div>
          <nav style={{ marginTop: "20px" }}>
            <div>
              <div style={{ padding: isSidebarCollapsed ? "12px 10px" : "12px 20px", backgroundColor: "#eff6ff", borderLeft: "3px solid #3b82f6", color: "#3b82f6", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px" }}>
                <img src="/icons/pos.svg" alt="POS" style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                {!isSidebarCollapsed && <span>POS</span>}
                {!isSidebarCollapsed && <span style={{ marginLeft: "auto" }}>▼</span>}
              </div>
              {!isSidebarCollapsed && (
                <div>
                  <Link href="/admin/penjualan/dashboard" style={{ display: "flex", alignItems: "center", padding: "10px 20px 10px 48px", color: pathname === "/admin/penjualan/dashboard" ? "#3b82f6" : "#64748b", textDecoration: "none", fontSize: "13px", backgroundColor: pathname === "/admin/penjualan/dashboard" ? "#eff6ff" : "transparent", borderLeft: pathname === "/admin/penjualan/dashboard" ? "3px solid #3b82f6" : "1px solid #e2e8f0" }}>
                    <img src="/icons/dashboard.svg" alt="" style={{ width: "16px", height: "16px", marginRight: "10px" }} />
                    Dashboard
                  </Link>
                  <Link href="/admin/penjualan" style={{ display: "flex", alignItems: "center", padding: "10px 20px 10px 48px", color: pathname === "/admin/penjualan" ? "#3b82f6" : "#64748b", textDecoration: "none", fontSize: "13px", backgroundColor: pathname === "/admin/penjualan" ? "#eff6ff" : "transparent", borderLeft: pathname === "/admin/penjualan" ? "3px solid #3b82f6" : "1px solid #e2e8f0" }}>
                    <img src="/icons/penjualan.svg" alt="" style={{ width: "16px", height: "16px", marginRight: "10px" }} />
                    Penjualan
                  </Link>
                  <Link href="/admin/penjualan/history" style={{ display: "flex", alignItems: "center", padding: "10px 20px 10px 48px", color: pathname === "/admin/penjualan/history" ? "#3b82f6" : "#64748b", textDecoration: "none", fontSize: "13px", backgroundColor: pathname === "/admin/penjualan/history" ? "#eff6ff" : "transparent", borderLeft: pathname === "/admin/penjualan/history" ? "3px solid #3b82f6" : "1px solid #e2e8f0" }}>
                    <img src="/icons/laporan.svg" alt="" style={{ width: "16px", height: "16px", marginRight: "10px" }} />
                    History Penjualan
                  </Link>
                  <Link href="/admin/penjualan/inventory" style={{ display: "flex", alignItems: "center", padding: "10px 20px 10px 48px", color: pathname === "/admin/penjualan/inventory" ? "#3b82f6" : "#64748b", textDecoration: "none", fontSize: "13px", backgroundColor: pathname === "/admin/penjualan/inventory" ? "#eff6ff" : "transparent", borderLeft: pathname === "/admin/penjualan/inventory" ? "3px solid #3b82f6" : "1px solid #e2e8f0" }}>
                    <img src="/icons/inventory.svg" alt="" style={{ width: "16px", height: "16px", marginRight: "10px" }} />
                    Inventory
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Main area: header + konten */}
        <div style={{ marginLeft: isSidebarCollapsed ? "80px" : "260px", flex: 1, minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column", padding: "24px", transition: "margin-left 0.3s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", padding: "10px 16px", backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", backgroundColor: "#3b82f6", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>{currentApotikName}</div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>History Penjualan</div>
              </div>
            </div>
            <button onClick={handlePosLogout} style={{ padding: "8px 16px", backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
              Keluar
            </button>
          </div>
          {mainContent}
        </div>
      </div>
    );
  }

  // Akses dari menu utama (bukan dari POS): pakai DashboardLayout
  return (
    <DashboardLayout>
      {mainContent}
    </DashboardLayout>
  );
}

