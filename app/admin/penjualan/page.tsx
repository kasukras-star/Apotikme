"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../../../lib/supabaseClient";

interface Product {
  id: string;
  kodeProduk: string;
  namaProduk: string;
  kategori: string;
  satuan: string;
  hargaBeli: number;
  hargaJual: number;
  stokAwal: number;
  units?: ProductUnit[];
  stokPerApotik?: { [apotikId: string]: number };
}

interface ProductUnit {
  id: string;
  namaUnit: string;
  hargaBeli: number;
  hargaJual: number;
  konversi: number;
  isBaseUnit: boolean;
}

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

interface RacikanMaster {
  id: string;
  kodeRacikan: string;
  namaRacikan: string;
  hargaDasarJasaRacik?: number;
  batasRacik?: number;
  pengaliRacik?: number;
  hargaDasarJasaBungkus?: number;
  batasBungkus?: number;
  pengaliBungkus?: number;
  jasaRacik?: number;
  jasaBungkus?: number;
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

interface Apotik {
  id: string;
  kodeApotik: string;
  namaApotik: string;
  alamat: string;
  telepon: string;
  email: string;
  statusAktif: boolean;
  posPassword?: string;
}

export default function PenjualanPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [racikans, setRacikans] = useState<RacikanMaster[]>([]);
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [showRacikanModal, setShowRacikanModal] = useState(false);
  const [racikanModalProductLine, setRacikanModalProductLine] = useState<CartItem | null>(null);
  const [racikanModalSelectedId, setRacikanModalSelectedId] = useState<string>("");
  const [racikanModalQty, setRacikanModalQty] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [diskonGlobal, setDiskonGlobal] = useState(0);
  const [ppn, setPpn] = useState<number | null>(null); // null = none, 11 = 11%, 12 = 12%
  const [paymentMethod, setPaymentMethod] = useState("tunai"); // tunai, kartu, transfer
  const [loading, setLoading] = useState(false);
  const [currentApotikId, setCurrentApotikId] = useState<string>("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // POS Login states
  const [isPosLoggedIn, setIsPosLoggedIn] = useState(false);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);
  const [selectedApotikLogin, setSelectedApotikLogin] = useState<string>("");
  const [posPassword, setPosPassword] = useState<string>("");
  const [currentApotikName, setCurrentApotikName] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userApotikIds, setUserApotikIds] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Load data and check POS session
  useEffect(() => {
    const savedProducts = localStorage.getItem("products");
    const savedCustomers = localStorage.getItem("customers");
    const savedApotiks = localStorage.getItem("apotiks");

    if (savedProducts) {
      try {
        const parsed = JSON.parse(savedProducts);
        setProducts(parsed);
      } catch (err) {
        console.error("Error loading products:", err);
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

    if (savedApotiks) {
      try {
        const parsed = JSON.parse(savedApotiks);
        const activeApotiks = parsed.filter((a: Apotik) => a.statusAktif !== false);
        setApotiks(activeApotiks);
      } catch (err) {
        console.error("Error loading apotiks:", err);
      }
    }

    const hasApotiksFromStorage = !!savedApotiks;

    const savedRacikans = localStorage.getItem("racikans");
    if (savedRacikans) {
      try {
        const parsed = JSON.parse(savedRacikans);
        setRacikans(parsed);
      } catch (err) {
        console.error("Error loading racikans:", err);
      }
    }

    const hasRacikansFromStorage = !!savedRacikans;

    // Get current user's apotik access: dari session dulu, jika kosong ambil dari API (data terbaru di DB).
    const loadUserApotikAccess = async (): Promise<{ access_token?: string } | null> => {
      try {
        const supabase = getSupabaseClient();
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        let session = refreshData.session;
        if (refreshError || !session) {
          const { data: sessionData } = await supabase.auth.getSession();
          session = sessionData.session;
        }
        if (session?.user) {
          const role = (session.user.app_metadata?.role as string) || null;
          setUserRole(role);
          let ids = (session.user.app_metadata?.apotikIds as string[] | undefined) || [];
          let superAdmin = !!session.user.app_metadata?.isSuperAdmin;
          if (ids.length === 0 && session.access_token) {
            try {
              const res = await fetch("/api/user/apotik-access", {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              if (res.ok) {
                const data = await res.json();
                ids = data.apotikIds || [];
                superAdmin = !!data.isSuperAdmin;
              }
            } catch (_) {}
          }
          setUserApotikIds(ids);
          setIsSuperAdmin(superAdmin);
          return session;
        }
      } catch (err) {
        console.error("Error loading user apotik access:", err);
        try {
          const supabase = getSupabaseClient();
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            let ids = (data.session.user.app_metadata?.apotikIds as string[] | undefined) || [];
            let superAdmin = !!data.session.user.app_metadata?.isSuperAdmin;
            if (ids.length === 0 && data.session.access_token) {
              const res = await fetch("/api/user/apotik-access", {
                headers: { Authorization: `Bearer ${data.session.access_token}` },
              });
              if (res.ok) {
                const apiData = await res.json();
                ids = apiData.apotikIds || [];
                superAdmin = !!apiData.isSuperAdmin;
              }
            }
            setUserApotikIds(ids);
            setIsSuperAdmin(superAdmin);
            return data.session;
          }
        } catch (_) {}
      }
      return null;
    };
    loadUserApotikAccess().then((session) => {
      if (!session) {
        router.replace("/");
        return;
      }
      if (!hasApotiksFromStorage && session.access_token) {
        fetch("/api/data/apotiks", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((r) => r.json())
          .then((list) => {
            if (Array.isArray(list)) {
              const active = list.filter((a: Apotik) => a.statusAktif !== false);
              setApotiks(active);
              if (active.length > 0) try { localStorage.setItem("apotiks", JSON.stringify(list)); } catch (_) {}
            }
          })
          .catch(() => {});
      }
      if (!hasRacikansFromStorage && session.access_token) {
        fetch("/api/data/racikans", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((r) => r.json())
          .then((list) => {
            if (Array.isArray(list)) {
              setRacikans(list);
              if (list.length > 0) try { localStorage.setItem("racikans", JSON.stringify(list)); } catch (_) {}
            }
          })
          .catch(() => {});
      }
    });

    // Check for existing POS session
    const posSession = sessionStorage.getItem("posSession");
    if (posSession) {
      try {
        const session = JSON.parse(posSession);
        if (session.apotikId && session.apotikName) {
          setCurrentApotikId(session.apotikId);
          setCurrentApotikName(session.apotikName);
          setIsPosLoggedIn(true);
        }
      } catch (err) {
        console.error("Error loading POS session:", err);
        sessionStorage.removeItem("posSession");
      }
    }
    setIsCheckingSession(false);
  }, []);

  // Handle POS Login
  const handlePosLogin = () => {
    if (!selectedApotikLogin) {
      setLoginError("Silakan pilih apotik terlebih dahulu.");
      return;
    }

    const selectedApotik = apotiks.find((a) => a.id === selectedApotikLogin);
    if (!selectedApotik) {
      setLoginError("Apotik tidak ditemukan.");
      return;
    }

    // Check password if apotik has posPassword set
    if (selectedApotik.posPassword && selectedApotik.posPassword !== posPassword) {
      setLoginError("Password salah.");
      return;
    }

    // Save POS session
    const session = {
      apotikId: selectedApotik.id,
      apotikName: selectedApotik.namaApotik,
      loginTime: new Date().toISOString(),
    };
    sessionStorage.setItem("posSession", JSON.stringify(session));

    setCurrentApotikId(selectedApotik.id);
    setCurrentApotikName(selectedApotik.namaApotik);
    setIsPosLoggedIn(true);
    setLoginError("");
    setPosPassword("");
    setSelectedApotikLogin("");
  };

  // Handle POS Logout
  const handlePosLogout = () => {
    sessionStorage.removeItem("posSession");
    setIsPosLoggedIn(false);
    setCurrentApotikId("");
    setCurrentApotikName("");
    setCartItems([]);
    setSelectedCustomer("");
    setCustomerSearch("");
    setDiskonGlobal(0);
    setPpn(null);
    setProductSearch("");
  };

  // Apotik yang boleh dipilih di POS: Admin/Manager/Super Admin lihat semua; role lain hanya apotikIds
  const canSeeAllApotiks = isSuperAdmin || userRole === "Admin" || userRole === "Manager";
  const allowedApotiks = canSeeAllApotiks
    ? apotiks
    : apotiks.filter((a) => userApotikIds.includes(a.id));

  // Filter products based on search
  const filteredProducts = products.filter(
    (product) =>
      product.namaProduk.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.kodeProduk.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Filter customers based on search
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.namaCustomer.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.kodeCustomer.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const isProductItem = (line: CartLine): line is CartItem =>
    !("itemType" in line) || (line as CartItem).itemType !== "racikan";
  const isRacikanItem = (line: CartLine): line is CartItemRacikan =>
    (line as CartItemRacikan).itemType === "racikan";

  const productCartItems = (): CartItem[] => cartItems.filter(isProductItem) as CartItem[];

  const calculateJasaRacikan = (r: RacikanMaster, qty: number): number => {
    const batasRacik = r.batasRacik ?? 10;
    const batasBungkus = r.batasBungkus ?? 10;
    const hargaRacik = r.hargaDasarJasaRacik ?? r.jasaRacik ?? 0;
    const hargaBungkus = r.hargaDasarJasaBungkus ?? r.jasaBungkus ?? 0;
    const jasaRacikTotal = Math.ceil(qty / batasRacik) * hargaRacik;
    const jasaBungkusTotal = Math.ceil(qty / batasBungkus) * hargaBungkus;
    return jasaRacikTotal + jasaBungkusTotal;
  };

  // Get available stock for product
  const getAvailableStock = (product: Product): number => {
    if (product.stokPerApotik && currentApotikId) {
      return product.stokPerApotik[currentApotikId] || 0;
    }
    return product.stokAwal || 0;
  };

  // Get product units
  const getProductUnits = (product: Product): ProductUnit[] => {
    if (product.units && product.units.length > 0) {
      return product.units;
    }
    // Return default unit if no units defined
    return [
      {
        id: "default",
        namaUnit: product.satuan,
        hargaBeli: product.hargaBeli,
        hargaJual: product.hargaJual,
        konversi: 1,
        isBaseUnit: true,
      },
    ];
  };

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    const units = getProductUnits(product);
    const defaultUnit = units.find((u) => u.isBaseUnit) || units[0];

    const newItem: CartItem = {
      itemType: "product",
      id: Date.now().toString(),
      produkId: product.id,
      kodeProduk: product.kodeProduk,
      namaProduk: product.namaProduk,
      unitId: defaultUnit.id,
      namaUnit: defaultUnit.namaUnit,
      qty: 1,
      hargaSatuan: defaultUnit.hargaJual,
      diskon: 0,
      subtotal: defaultUnit.hargaJual,
    };

    setCartItems([...cartItems, newItem]);
    setProductSearch("");
    setShowProductDropdown(false);
  };

  // Handle cart item change (product items only)
  const handleCartItemChange = (
    itemId: string,
    field: keyof CartItem,
    value: any
  ) => {
    setCartItems(
      cartItems.map((item) => {
        if (item.id !== itemId || !isProductItem(item)) return item;
        const updated = { ...item, [field]: value };
        if (field === "qty" || field === "hargaSatuan" || field === "diskon") {
          updated.subtotal = updated.qty * updated.hargaSatuan - updated.diskon;
        }
        return updated;
      })
    );
  };

  const handleRacikanItemChange = (itemId: string, field: "qty" | "diskon", value: number) => {
    setCartItems(
      cartItems.map((item) => {
        if (item.id !== itemId || !isRacikanItem(item)) return item;
        const updated = { ...item, [field]: value };
        updated.subtotal = updated.qty * updated.hargaSatuan - updated.diskon;
        return updated;
      })
    );
  };

  // Handle unit change (product items only)
  const handleUnitChange = (itemId: string, productId: string, unitId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const units = getProductUnits(product);
    const selectedUnit = units.find((u) => u.id === unitId);
    if (!selectedUnit) return;
    setCartItems(
      cartItems.map((item) => {
        if (item.id !== itemId || !isProductItem(item)) return item;
        return {
          ...item,
          unitId: selectedUnit.id,
          namaUnit: selectedUnit.namaUnit,
          hargaSatuan: selectedUnit.hargaJual,
          subtotal: item.qty * selectedUnit.hargaJual - item.diskon,
        };
      })
    );
  };

  // Remove cart item (product or racikan)
  const handleRemoveCartItem = (itemId: string) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
  };

  const openRacikanModal = (productLine: CartItem | null) => {
    setRacikanModalProductLine(productLine);
    setRacikanModalSelectedId("");
    setRacikanModalQty(productLine ? productLine.qty : 1);
    setShowRacikanModal(true);
  };

  const handleAddRacikanToCart = () => {
    if (!racikanModalSelectedId) {
      alert("Pilih racikan dari master.");
      return;
    }
    const r = racikans.find((x) => x.id === racikanModalSelectedId);
    if (!r) return;
    const qty = Math.max(1, racikanModalQty);
    const totalJasa = calculateJasaRacikan(r, qty);
    const hargaSatuan = totalJasa / qty;
    const newLine: CartItemRacikan = {
      itemType: "racikan",
      id: Date.now().toString(),
      racikanId: r.id,
      kodeRacikan: r.kodeRacikan,
      namaRacikan: r.namaRacikan,
      qty,
      hargaSatuan,
      diskon: 0,
      subtotal: totalJasa,
    };
    setCartItems([...cartItems, newLine]);
    setShowRacikanModal(false);
    setRacikanModalProductLine(null);
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const diskonAmount = (subtotal * diskonGlobal) / 100;
    const afterDiskon = subtotal - diskonAmount;
    const ppnAmount = ppn ? (afterDiskon * ppn) / 100 : 0;
    const total = afterDiskon + ppnAmount;

    return {
      subtotal,
      diskonAmount,
      afterDiskon,
      ppnAmount,
      total,
    };
  };

  const totals = calculateTotals();

  // Handle submit transaction
  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      alert("Keranjang kosong. Silakan tambahkan produk terlebih dahulu.");
      return;
    }

    // Validate stock availability before processing
    const stockErrors: string[] = [];
    const stockDeductions: { [productId: string]: number } = {};

    // Calculate total qty in pieces for each product (only product items)
    productCartItems().forEach((cartItem) => {
      const product = products.find((p) => p.id === cartItem.produkId);
      if (product && product.stokPerApotik && currentApotikId) {
        const unit = getProductUnits(product).find((u) => u.id === cartItem.unitId);
        const qtyInPieces = cartItem.qty * (unit?.konversi || 1);
        if (!stockDeductions[cartItem.produkId]) stockDeductions[cartItem.produkId] = 0;
        stockDeductions[cartItem.produkId] += qtyInPieces;
      }
    });

    // Check if stock is sufficient
    Object.keys(stockDeductions).forEach((productId) => {
      const product = products.find((p) => p.id === productId);
      if (product && product.stokPerApotik && currentApotikId) {
        const currentStock = product.stokPerApotik[currentApotikId] || 0;
        const requiredStock = stockDeductions[productId];
        if (requiredStock > currentStock) {
          stockErrors.push(
            `Stok ${product.namaProduk} tidak mencukupi. Tersedia: ${currentStock} pcs, Dibutuhkan: ${requiredStock} pcs`
          );
        }
      }
    });

    if (stockErrors.length > 0) {
      alert(stockErrors.join("\n"));
      return;
    }

    setLoading(true);
    try {
      // Generate transaction number
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const savedTransactions = localStorage.getItem("penjualan");
      const transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
      const sequence = String(transactions.length + 1).padStart(4, "0");
      const nomorTransaksi = `POS-${year}${month}-${sequence}`;

      // Create transaction object
      const transaction = {
        id: Date.now().toString(),
        nomorTransaksi,
        tanggalTransaksi: today.toISOString().split("T")[0],
        customerId: selectedCustomer || null,
        items: cartItems,
        subtotal: totals.subtotal,
        diskonGlobal,
        diskonAmount: totals.diskonAmount,
        ppn: ppn || 0,
        ppnAmount: totals.ppnAmount,
        total: totals.total,
        paymentMethod,
        apotikId: currentApotikId,
        createdAt: new Date().toISOString(),
      };

      // Save transaction
      transactions.push(transaction);
      localStorage.setItem("penjualan", JSON.stringify(transactions));

      // Update stock - only product items
      const updatedProducts = [...products];
      const stockDeductions: { [productId: string]: number } = {};
      productCartItems().forEach((cartItem) => {
        const product = updatedProducts.find((p) => p.id === cartItem.produkId);
        if (product && product.stokPerApotik && currentApotikId) {
          const unit = getProductUnits(product).find((u) => u.id === cartItem.unitId);
          const qtyInPieces = cartItem.qty * (unit?.konversi || 1);
          if (!stockDeductions[cartItem.produkId]) stockDeductions[cartItem.produkId] = 0;
          stockDeductions[cartItem.produkId] += qtyInPieces;
        }
      });

      // Apply stock deductions
      Object.keys(stockDeductions).forEach((productId) => {
        const productIndex = updatedProducts.findIndex((p) => p.id === productId);
        if (productIndex >= 0) {
          const product = updatedProducts[productIndex];
          if (product.stokPerApotik && currentApotikId) {
            const currentStock = product.stokPerApotik[currentApotikId] || 0;
            updatedProducts[productIndex] = {
              ...product,
              stokPerApotik: {
                ...product.stokPerApotik,
                [currentApotikId]: Math.max(0, currentStock - stockDeductions[productId]),
              },
            };
          }
        }
      });
      
      setProducts(updatedProducts);
      localStorage.setItem("products", JSON.stringify(updatedProducts));

      // Set receipt data
      const customerData = selectedCustomer 
        ? customers.find((c) => c.id === selectedCustomer)
        : null;

      setReceiptData({
        ...transaction,
        customer: customerData,
      });

      // Show receipt modal
      setShowReceipt(true);

      // Reset form
      setCartItems([]);
      setSelectedCustomer("");
      setCustomerSearch("");
      setDiskonGlobal(0);
      setPpn(null);
      setProductSearch("");
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan transaksi.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        backgroundColor: "#f1f5f9",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "16px", color: "#64748b" }}>Memuat...</div>
        </div>
      </div>
    );
  }

  // Show POS Login Modal if not logged in
  if (!isPosLoggedIn) {
  return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f1f5f9",
      }}>
          <div style={{
            backgroundColor: "#ffffff",
            padding: "32px",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            width: "100%",
            maxWidth: "400px",
          }}>
            {/* Login Header */}
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{
                width: "60px",
                height: "60px",
                backgroundColor: "#3b82f6",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#1e293b", margin: "0 0 8px 0" }}>
                Login POS Penjualan
              </h2>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                Silakan pilih apotik untuk mengakses POS
              </p>
            </div>

            {/* Login Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Apotik Selection */}
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Pilih Apotik <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={selectedApotikLogin}
                  onChange={(e) => {
                    setSelectedApotikLogin(e.target.value);
                    setLoginError("");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <option value="">-- Pilih Apotik --</option>
                  {allowedApotiks.map((apotik) => (
                    <option key={apotik.id} value={apotik.id}>
                      {apotik.namaApotik} ({apotik.kodeApotik})
                    </option>
                  ))}
                </select>
                {allowedApotiks.length === 0 && !isCheckingSession && (
                  <p style={{ fontSize: "12px", color: "#dc2626", marginTop: "6px" }}>
                    Tidak ada apotik yang diassign ke akun Anda. Hubungi admin untuk mengatur akses apotik di Pengaturan User. Jika baru saja di-assign, coba <strong>Keluar</strong> lalu login kembali.
                  </p>
                )}
              </div>

              {/* Password Input */}
      <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Password (Opsional)
                </label>
                <input
                  type="password"
                  value={posPassword}
                  onChange={(e) => {
                    setPosPassword(e.target.value);
                    setLoginError("");
                  }}
                  placeholder="Masukkan password apotik..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handlePosLogin();
                    }
                  }}
                />
                <p style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  Kosongkan jika apotik tidak memiliki password
                </p>
              </div>

              {/* Error Message */}
              {loginError && (
                <div style={{
                  padding: "10px 12px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  color: "#dc2626",
                  fontSize: "13px",
                }}>
                  {loginError}
                </div>
              )}

              {/* Login Button */}
              <button
                onClick={handlePosLogin}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#3b82f6";
                }}
              >
                Masuk ke POS
              </button>
            </div>

            {/* Footer Info */}
            <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
              Setiap apotik memiliki akun POS tersendiri
            </div>
          </div>
        </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#f8fafc",
      display: "flex",
    }}>
      {/* POS Sidebar */}
      <div style={{
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
      }}>
        <div style={{ padding: isSidebarCollapsed ? "0 10px 20px" : "0 20px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: isSidebarCollapsed ? "center" : "space-between", alignItems: "center" }}>
            {!isSidebarCollapsed && (
              <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "#1e293b" }}>
                Sistem Apotik
        </h2>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? "→" : "←"}
            </button>
          </div>
        </div>
        <nav style={{ marginTop: "20px" }}>
          {/* POS Menu */}
          <div>
            <div style={{
              padding: isSidebarCollapsed ? "12px 10px" : "12px 20px",
              backgroundColor: "#eff6ff",
              borderLeft: "3px solid #3b82f6",
              color: "#3b82f6",
              fontSize: "13px",
              fontWeight: "400",
              fontFamily: "Calibri, Arial, Helvetica, sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "flex-start",
              gap: "10px",
            }}>
              <span style={{
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <img
                  src="/icons/pos.svg"
                  alt="POS"
                  style={{
                    width: "16px",
                    height: "16px",
                    display: "block",
                    objectFit: "contain",
                  }}
                />
              </span>
              {!isSidebarCollapsed && <span>POS</span>}
              {!isSidebarCollapsed && <span style={{ fontSize: "13px", color: "#1e293b", marginLeft: "auto" }}>▼</span>}
            </div>
            {/* Submenu */}
            {!isSidebarCollapsed && (
            <div style={{ backgroundColor: "transparent" }}>
              {/* Dashboard */}
              <Link
                href="/admin/penjualan/dashboard"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  padding: isSidebarCollapsed ? "10px 10px" : "10px 20px 10px 48px",
                  color: pathname === "/admin/penjualan/dashboard" ? "#3b82f6" : "#64748b",
                  textDecoration: "none",
                  fontSize: "13px",
                  backgroundColor: pathname === "/admin/penjualan/dashboard"
                    ? "#eff6ff"
                    : "transparent",
                  borderLeft: pathname === "/admin/penjualan/dashboard"
                    ? "3px solid #3b82f6"
                    : "1px solid #e2e8f0",
                  transition: "all 0.2s",
                  lineHeight: "1.5",
                }}
                onMouseEnter={(e) => {
                  if (pathname !== "/admin/penjualan/dashboard") {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== "/admin/penjualan/dashboard") {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                title={isSidebarCollapsed ? "Dashboard" : undefined}
              >
                <span style={{ display: "flex", alignItems: "center", gap: isSidebarCollapsed ? "0" : "10px" }}>
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
                    <img
                      src="/icons/dashboard.svg"
                      alt="Dashboard"
                      style={{
                        width: "16px",
                        height: "16px",
                        display: "block",
                        objectFit: "contain",
                      }}
                    />
                  </span>
                  {!isSidebarCollapsed && <span>Dashboard</span>}
                </span>
              </Link>
              {/* Penjualan */}
              <Link
                href="/admin/penjualan"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  padding: isSidebarCollapsed ? "10px 10px" : "10px 20px 10px 48px",
                  color: pathname === "/admin/penjualan" ? "#3b82f6" : "#64748b",
                  textDecoration: "none",
                  fontSize: "13px",
                  backgroundColor: pathname === "/admin/penjualan"
                    ? "#eff6ff"
                    : "transparent",
                  borderLeft: pathname === "/admin/penjualan"
                    ? "3px solid #3b82f6"
                    : "1px solid #e2e8f0",
                  transition: "all 0.2s",
                  lineHeight: "1.5",
                }}
                onMouseEnter={(e) => {
                  if (pathname !== "/admin/penjualan") {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== "/admin/penjualan") {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                title={isSidebarCollapsed ? "Penjualan" : undefined}
              >
                <span style={{ display: "flex", alignItems: "center", gap: isSidebarCollapsed ? "0" : "10px" }}>
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
                    <img
                      src="/icons/penjualan.svg"
                      alt="Penjualan"
                      style={{
                        width: "16px",
                        height: "16px",
                        display: "block",
                        objectFit: "contain",
                      }}
                    />
                  </span>
                  {!isSidebarCollapsed && <span>Penjualan</span>}
                </span>
              </Link>
              {/* History Penjualan */}
              <Link
                href="/admin/penjualan/history"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  padding: isSidebarCollapsed ? "10px 10px" : "10px 20px 10px 48px",
                  color: pathname === "/admin/penjualan/history" ? "#3b82f6" : "#64748b",
                  textDecoration: "none",
                  fontSize: "13px",
                  backgroundColor: pathname === "/admin/penjualan/history"
                    ? "#eff6ff"
                    : "transparent",
                  borderLeft: pathname === "/admin/penjualan/history"
                    ? "3px solid #3b82f6"
                    : "1px solid #e2e8f0",
                  transition: "all 0.2s",
                  lineHeight: "1.5",
                }}
                onMouseEnter={(e) => {
                  if (pathname !== "/admin/penjualan/history") {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== "/admin/penjualan/history") {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                title={isSidebarCollapsed ? "History Penjualan" : undefined}
              >
                <span style={{ display: "flex", alignItems: "center", gap: isSidebarCollapsed ? "0" : "10px" }}>
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
                    <img
                      src="/icons/laporan.svg"
                      alt="History Penjualan"
                      style={{
                        width: "16px",
                        height: "16px",
                        display: "block",
                        objectFit: "contain",
                      }}
                    />
                  </span>
                  {!isSidebarCollapsed && <span>History Penjualan</span>}
                </span>
              </Link>
              {/* Inventory */}
              <Link
                href="/admin/penjualan/inventory"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  padding: isSidebarCollapsed ? "10px 10px" : "10px 20px 10px 48px",
                  color: pathname === "/admin/penjualan/inventory" ? "#3b82f6" : "#64748b",
                  textDecoration: "none",
                  fontSize: "13px",
                  backgroundColor: pathname === "/admin/penjualan/inventory"
                    ? "#eff6ff"
                    : "transparent",
                  borderLeft: pathname === "/admin/penjualan/inventory"
                    ? "3px solid #3b82f6"
                    : "1px solid #e2e8f0",
                  transition: "all 0.2s",
                  lineHeight: "1.5",
                }}
                onMouseEnter={(e) => {
                  if (pathname !== "/admin/penjualan/inventory") {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== "/admin/penjualan/inventory") {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
                title={isSidebarCollapsed ? "Inventory" : undefined}
              >
                <span style={{ display: "flex", alignItems: "center", gap: isSidebarCollapsed ? "0" : "10px" }}>
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
                    <img
                      src="/icons/inventory.svg"
                      alt="Inventory"
                      style={{
                        width: "16px",
                        height: "16px",
                        display: "block",
                        objectFit: "contain",
                      }}
                    />
                  </span>
                  {!isSidebarCollapsed && <span>Inventory</span>}
                </span>
              </Link>
            </div>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ 
        marginLeft: isSidebarCollapsed ? "80px" : "260px",
        flex: 1,
        minHeight: "100vh", 
        backgroundColor: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        padding: "24px",
        transition: "margin-left 0.3s ease",
      }}>
      {/* POS Header with Apotik Info and Logout */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
        padding: "10px 16px",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            backgroundColor: "#3b82f6",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
              {currentApotikName}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              POS Aktif
            </div>
          </div>
        </div>
        <button
          onClick={handlePosLogout}
          style={{
            padding: "8px 16px",
            backgroundColor: "#f1f5f9",
            color: "#64748b",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#fee2e2";
            e.currentTarget.style.borderColor = "#fecaca";
            e.currentTarget.style.color = "#dc2626";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#f1f5f9";
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.color = "#64748b";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Keluar POS
        </button>
      </div>

      <div style={{ display: "flex", gap: "16px", height: "calc(100vh - 180px)" }}>
        {/* Left Panel - Product Selection & Cart */}
        <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Product Search */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "12px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500" }}>
              Cari Produk
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Ketik nama atau kode produk..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              />
              {showProductDropdown && productSearch && filteredProducts.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    marginTop: "4px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    zIndex: 1000,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  {filteredProducts.map((product) => {
                    const availableStock = getAvailableStock(product);
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        style={{
                          padding: "12px",
                          cursor: "pointer",
                          borderBottom: "1px solid #f1f5f9",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f8fafc";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "500" }}>{product.namaProduk}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {product.kodeProduk} | Stok: {availableStock} {product.satuan} | Rp{" "}
                            {product.hargaJual.toLocaleString("id-ID")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "12px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              flex: 1,
              overflowY: "auto",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>
              Keranjang ({cartItems.length})
            </h3>
            <div style={{ marginBottom: "8px" }}>
              <button
                type="button"
                onClick={() => openRacikanModal(null)}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  backgroundColor: "#f0fdf4",
                  color: "#166534",
                  border: "1px solid #bbf7d0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                + Tambah Jasa Racik
              </button>
            </div>
            {cartItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#64748b", fontSize: "13px" }}>
                Keranjang kosong. Silakan tambahkan produk.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {cartItems.map((item) => {
                  if (isRacikanItem(item)) {
                    return (
                      <div
                        key={item.id}
                        style={{
                          border: "1px solid #d1fae5",
                          borderRadius: "6px",
                          padding: "10px",
                          backgroundColor: "#f0fdf4",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "500", fontSize: "13px", marginBottom: "2px", color: "#166534" }}>
                              Jasa Racik: {item.namaRacikan}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>{item.kodeRacikan}</div>
                          </div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                            <div style={{ width: "60px" }}>
                              <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Qty</label>
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleRacikanItemChange(item.id, "qty", parseInt(e.target.value) || 1)}
                                style={{
                                  width: "100%",
                                  padding: "5px 6px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                }}
                              />
                            </div>
                            <div style={{ width: "90px" }}>
                              <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Harga</label>
                              <div style={{ padding: "5px 0", fontSize: "11px" }}>
                                Rp {item.hargaSatuan.toLocaleString("id-ID")}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveCartItem(item.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              fontSize: "18px",
                              padding: "0 4px",
                              alignSelf: "flex-start",
                              marginTop: "18px",
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <div style={{ marginTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="Diskon"
                            value={item.diskon || ""}
                            onChange={(e) =>
                              handleRacikanItemChange(item.id, "diskon", parseFloat(e.target.value) || 0)
                            }
                            style={{
                              width: "70px",
                              padding: "4px 6px",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              fontSize: "11px",
                            }}
                          />
                          <div style={{ fontWeight: "600", fontSize: "13px" }}>
                            Rp {item.subtotal.toLocaleString("id-ID")}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  const product = products.find((p) => p.id === item.produkId);
                  const units = product ? getProductUnits(product) : [];
                  const availableStock = product ? getAvailableStock(product) : 0;
                  return (
                    <div
                      key={item.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        padding: "10px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "500", fontSize: "13px", marginBottom: "4px" }}>{item.namaProduk}</div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{item.kodeProduk}</div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                          <div style={{ width: "120px" }}>
                            <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Unit</label>
                            <select
                              value={item.unitId || "default"}
                              onChange={(e) => handleUnitChange(item.id, item.produkId, e.target.value)}
                              style={{
                                width: "100%",
                                padding: "5px 6px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                fontSize: "11px",
                              }}
                            >
                              {units.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.namaUnit} - Rp {unit.hargaJual.toLocaleString("id-ID")}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div style={{ width: "70px" }}>
                            <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Qty</label>
                            <input
                              type="number"
                              min="1"
                              max={availableStock}
                              value={item.qty}
                              onChange={(e) =>
                                handleCartItemChange(item.id, "qty", parseInt(e.target.value) || 1)
                              }
                              style={{
                                width: "100%",
                                padding: "5px 6px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                fontSize: "11px",
                              }}
                            />
                          </div>
                          <div style={{ width: "100px" }}>
                            <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Harga</label>
                            <input
                              type="number"
                              value={item.hargaSatuan}
                              onChange={(e) =>
                                handleCartItemChange(item.id, "hargaSatuan", parseFloat(e.target.value) || 0)
                              }
                              style={{
                                width: "100%",
                                padding: "5px 6px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                fontSize: "11px",
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => openRacikanModal(item)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "11px",
                              backgroundColor: "#f0fdf4",
                              color: "#166534",
                              border: "1px solid #bbf7d0",
                              borderRadius: "4px",
                              cursor: "pointer",
                              alignSelf: "flex-end",
                              marginTop: "18px",
                            }}
                            title="Tambah jasa racik untuk item ini"
                          >
                            Racik
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveCartItem(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "18px",
                            padding: "0 4px",
                            alignSelf: "flex-start",
                            marginTop: "20px",
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                          <label style={{ fontSize: "11px", color: "#64748b" }}>Diskon</label>
                          <input
                            type="number"
                            min="0"
                            value={item.diskon}
                            onChange={(e) =>
                              handleCartItemChange(item.id, "diskon", parseFloat(e.target.value) || 0)
                            }
                            style={{
                              width: "70px",
                              padding: "5px 6px",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              fontSize: "11px",
                            }}
                          />
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>Subtotal</div>
                          <div style={{ fontWeight: "600", fontSize: "13px" }}>
                            Rp {item.subtotal.toLocaleString("id-ID")}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Pilih Racikan */}
        {showRacikanModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "24px",
                width: "100%",
                maxWidth: "420px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "600" }}>
                Tambah Jasa Racik
              </h3>
              {racikanModalProductLine && (
                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                  Untuk item: {racikanModalProductLine.namaProduk} (qty {racikanModalProductLine.qty})
                </p>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px" }}>
                  Pilih Racikan dari Master
                </label>
                <select
                  value={racikanModalSelectedId}
                  onChange={(e) => setRacikanModalSelectedId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                >
                  <option value="">-- Pilih racikan --</option>
                  {racikans.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.kodeRacikan} - {r.namaRacikan}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", marginBottom: "6px" }}>
                  Jumlah (qty)
                </label>
                <input
                  type="number"
                  min="1"
                  value={racikanModalQty}
                  onChange={(e) => setRacikanModalQty(parseInt(e.target.value) || 1)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                />
              </div>
              {racikanModalSelectedId && (() => {
                const r = racikans.find((x) => x.id === racikanModalSelectedId);
                if (!r) return null;
                const totalJasa = calculateJasaRacikan(r, racikanModalQty);
                return (
                  <div style={{ marginBottom: "16px", padding: "10px", backgroundColor: "#f0fdf4", borderRadius: "8px", fontSize: "13px" }}>
                    <span style={{ color: "#64748b" }}>Total jasa racik: </span>
                    <strong style={{ color: "#166534" }}>Rp {totalJasa.toLocaleString("id-ID")}</strong>
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowRacikanModal(false)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    backgroundColor: "#f1f5f9",
                    color: "#64748b",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddRacikanToCart}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    backgroundColor: "#166534",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  Tambah ke Keranjang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Panel - Summary & Payment */}
        <div style={{ width: "380px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Customer Selection */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "12px",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500" }}>
              Customer (Opsional)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Cari customer..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              />
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    marginTop: "4px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    zIndex: 1000,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer.id);
                        setCustomerSearch(customer.namaCustomer);
                        setShowCustomerDropdown(false);
                      }}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div style={{ fontWeight: "500" }}>{customer.namaCustomer}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {customer.kodeCustomer}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        <div
          style={{
            backgroundColor: "#ffffff",
              padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>
              Ringkasan
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 100px", gap: "12px", alignItems: "center", fontSize: "13px" }}>
                <span style={{ color: "#64748b" }}>Subtotal</span>
                <span></span>
                <span style={{ fontWeight: "500", textAlign: "right" }}>
                  Rp {totals.subtotal.toLocaleString("id-ID")}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 100px", gap: "12px", alignItems: "center", fontSize: "13px" }}>
                <span style={{ color: "#64748b" }}>Diskon Global</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={diskonGlobal}
                  onChange={(e) => setDiskonGlobal(parseFloat(e.target.value) || 0)}
                  style={{
                    width: "70px",
                    padding: "5px 6px",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    fontSize: "11px",
                    textAlign: "right",
                  }}
                />
                <span style={{ fontWeight: "500", textAlign: "right" }}>
                  Rp {totals.diskonAmount.toLocaleString("id-ID")}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 100px", gap: "12px", alignItems: "center", fontSize: "13px" }}>
                <span style={{ color: "#64748b" }}>PPN {ppn !== null ? `(${ppn}%)` : ""}</span>
                <select
                  value={ppn === null ? "none" : ppn.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPpn(value === "none" ? null : parseInt(value));
                  }}
                  style={{
                    width: "70px",
                    padding: "5px 6px",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    fontSize: "11px",
                  }}
                >
                  <option value="none">None</option>
                  <option value="11">11%</option>
                  <option value="12">12%</option>
                </select>
                <span style={{ fontWeight: "500", textAlign: "right" }}>
                  Rp {totals.ppnAmount.toLocaleString("id-ID")}
                </span>
              </div>
              <div
                style={{
                  borderTop: "2px solid #e2e8f0",
                  paddingTop: "10px",
                  marginTop: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "16px", fontWeight: "600" }}>Total</span>
                <span style={{ fontSize: "16px", fontWeight: "600", color: "#3b82f6" }}>
                  Rp {totals.total.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500" }}>
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              >
                <option value="tunai">Tunai</option>
                <option value="kartu">Kartu Debit/Kredit</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || cartItems.length === 0}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: loading || cartItems.length === 0 ? "#9ca3af" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: loading || cartItems.length === 0 ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!loading && cartItems.length > 0) {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && cartItems.length > 0) {
                  e.currentTarget.style.backgroundColor = "#3b82f6";
                }
              }}
            >
              {loading ? "Memproses..." : "Bayar"}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
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
            id="receipt-content"
            style={{
              backgroundColor: "#ffffff",
              padding: "24px",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "400px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Receipt Header */}
            <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #e2e8f0", paddingBottom: "16px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: "0 0 8px 0", color: "#1e293b" }}>
                SISTEM APOTIK
              </h2>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0" }}>
                Struk Pembayaran
              </p>
              <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0" }}>
                {new Date(receiptData.tanggalTransaksi).toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0" }}>
                {new Date().toLocaleTimeString("id-ID")}
              </p>
            </div>

            {/* Transaction Info */}
            <div style={{ marginBottom: "16px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#64748b" }}>No. Transaksi:</span>
                <span style={{ fontWeight: "500" }}>{receiptData.nomorTransaksi}</span>
              </div>
              {receiptData.customer && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#64748b" }}>Customer:</span>
                  <span style={{ fontWeight: "500", textAlign: "right" }}>{receiptData.customer.namaCustomer}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#64748b" }}>Metode:</span>
                <span style={{ fontWeight: "500", textTransform: "capitalize" }}>{receiptData.paymentMethod}</span>
              </div>
            </div>

            {/* Items List */}
            <div style={{ borderTop: "1px dashed #e2e8f0", borderBottom: "1px dashed #e2e8f0", padding: "12px 0", marginBottom: "16px" }}>
              {receiptData.items.map((item: CartLine, index: number) => {
                const isRacikan = (item as CartItemRacikan).itemType === "racikan";
                const nama = isRacikan ? `Jasa Racik: ${(item as CartItemRacikan).namaRacikan}` : (item as CartItem).namaProduk;
                const kode = isRacikan ? (item as CartItemRacikan).kodeRacikan : (item as CartItem).kodeProduk;
                const unitLabel = isRacikan ? "pcs" : (item as CartItem).namaUnit;
                return (
                  <div key={index} style={{ marginBottom: "12px", fontSize: "12px" }}>
                    <div style={{ fontWeight: "500", marginBottom: "4px" }}>{nama}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>
                      <span>{kode} | {item.qty} {unitLabel} × Rp {item.hargaSatuan.toLocaleString("id-ID")}</span>
                    </div>
                    {item.diskon > 0 && (
                      <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>
                        Diskon: Rp {item.diskon.toLocaleString("id-ID")}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontWeight: "500" }}>
                      <span>Subtotal:</span>
                      <span>Rp {item.subtotal.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div style={{ marginBottom: "16px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Subtotal:</span>
                <span>Rp {receiptData.subtotal.toLocaleString("id-ID")}</span>
              </div>
              {receiptData.diskonGlobal > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#64748b" }}>Diskon Global ({receiptData.diskonGlobal}%):</span>
                  <span>Rp {receiptData.diskonAmount.toLocaleString("id-ID")}</span>
                </div>
              )}
              {receiptData.ppn > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#64748b" }}>PPN ({receiptData.ppn}%):</span>
                  <span>Rp {receiptData.ppnAmount.toLocaleString("id-ID")}</span>
                </div>
              )}
              <div style={{ borderTop: "2px solid #1e293b", paddingTop: "8px", marginTop: "8px", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px" }}>
                <span>TOTAL:</span>
                <span style={{ color: "#3b82f6" }}>Rp {receiptData.total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", borderTop: "1px dashed #e2e8f0", paddingTop: "16px", fontSize: "11px", color: "#64748b" }}>
              <p style={{ margin: "4px 0" }}>Terima kasih atas kunjungan Anda</p>
              <p style={{ margin: "4px 0" }}>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button
                onClick={() => {
                  const printContent = document.getElementById("receipt-content");
                  if (printContent) {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Struk - ${receiptData.nomorTransaksi}</title>
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
                            ${printContent.innerHTML}
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
                  }
                }}
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
                Print
              </button>
              <button
                onClick={() => setShowReceipt(false)}
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
      </div>
  );
}
