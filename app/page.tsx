"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import LoginModal from "../components/LoginModal";
import { getSupabaseClient } from "../lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user?.app_metadata?.role as string | undefined;
        if (role === "Kasir") {
          router.replace("/admin/penjualan");
        } else {
          router.replace("/dashboard");
        }
      }
    });
  }, [router]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.welcome}>Welcome to</p>
          <h1 className={styles.brand}>SIMATIK</h1>
          <p>
            Mulai dengan masuk untuk mengelola inventori dan penjualan.{" "}
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => setShowLoginModal(true)}
            >
              Masuk
            </button>
          </p>
        </div>
        {showLoginModal && (
          <LoginModal onClose={() => setShowLoginModal(false)} />
        )}
      </main>
    </div>
  );
}
