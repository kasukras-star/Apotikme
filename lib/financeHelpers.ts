// Helper functions for finance calculations

/** Satu transaksi pembayaran ke supplier */
export interface PembayaranItem {
  id: string;
  /** No. Bukti Bayar (ditampilkan setelah transaksi disimpan) */
  noBukti?: string;
  tanggal: string;
  jumlah: number;
  metode?: string;
  referensi?: string;
  /** Nama file bukti transfer (setelah upload) */
  buktiFileName?: string;
  createdAt?: string;
}

export interface FakturPembelian {
  id: string;
  nomorFaktur: string;
  nomorBukti: string;
  nomorFakturSupplier: string;
  nomorFakturPajak: string;
  tanggalFaktur: string;
  tanggalJatuhTempo: string;
  supplierId: string;
  penerimaanIds: string[];
  detailBarang: any[];
  subtotal: number;
  diskonGlobal: number;
  ppn: number;
  ppnAmount: number;
  total: number;
  statusBayar: string; // "Belum Bayar", "Sebagian", "Lunas"
  /** Total yang sudah dibayar (akumulasi dari pembayaran) */
  totalDibayar?: number;
  /** Riwayat pembayaran ke supplier untuk faktur ini */
  pembayaran?: PembayaranItem[];
  createdAt: string;
  operator?: string;
  updatedAt?: string;
  apotikId?: string;
}

/**
 * Sisa hutang yang belum dibayar untuk satu faktur
 */
export function getSisaHutang(faktur: FakturPembelian): number {
  const dibayar = faktur.totalDibayar ?? 0;
  return Math.max(0, faktur.total - dibayar);
}

/**
 * Calculate total hutang from faktur list (sisa yang belum dibayar)
 */
export function calculateTotalHutang(fakturList: FakturPembelian[]): number {
  return fakturList
    .filter((f) => f.statusBayar !== "Lunas")
    .reduce((sum, f) => sum + getSisaHutang(f), 0);
}

/**
 * Get faktur yang belum lunas
 */
export function getFakturBelumLunas(fakturList: FakturPembelian[]): FakturPembelian[] {
  return fakturList.filter((f) => f.statusBayar !== "Lunas");
}

/**
 * Get faktur yang akan jatuh tempo dalam X hari
 */
export function getFakturJatuhTempo(
  fakturList: FakturPembelian[],
  days: number = 7
): FakturPembelian[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + days);

  return fakturList.filter((f) => {
    if (f.statusBayar === "Lunas") return false;
    
    const jatuhTempo = new Date(f.tanggalJatuhTempo);
    jatuhTempo.setHours(0, 0, 0, 0);
    
    return jatuhTempo >= today && jatuhTempo <= targetDate;
  });
}

/**
 * Get faktur yang sudah overdue (lewat jatuh tempo)
 */
export function getFakturOverdue(fakturList: FakturPembelian[]): FakturPembelian[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return fakturList.filter((f) => {
    if (f.statusBayar === "Lunas") return false;
    
    const jatuhTempo = new Date(f.tanggalJatuhTempo);
    jatuhTempo.setHours(0, 0, 0, 0);
    
    return jatuhTempo < today;
  });
}

/**
 * Format currency to Indonesian Rupiah
 */
export function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

/**
 * Get days until due date (negative if overdue)
 */
export function getDaysUntilDue(tanggalJatuhTempo: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(tanggalJatuhTempo);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Get status badge color based on payment status and due date
 */
export function getStatusBadgeColor(faktur: FakturPembelian): {
  backgroundColor: string;
  color: string;
  label: string;
} {
  if (faktur.statusBayar === "Lunas") {
    return {
      backgroundColor: "#d1fae5",
      color: "#065f46",
      label: "Lunas",
    };
  }

  const daysUntilDue = getDaysUntilDue(faktur.tanggalJatuhTempo);

  if (daysUntilDue < 0) {
    return {
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      label: "Overdue",
    };
  }

  if (daysUntilDue <= 7) {
    return {
      backgroundColor: "#fef3c7",
      color: "#92400e",
      label: "Jatuh Tempo",
    };
  }

  if (faktur.statusBayar === "Sebagian") {
    return {
      backgroundColor: "#fef3c7",
      color: "#92400e",
      label: "Sebagian",
    };
  }

  return {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    label: "Belum Bayar",
  };
}
