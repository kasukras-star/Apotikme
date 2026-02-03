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
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
    <div className={`${styles.page} ${showLoginModal ? styles.modalOpen : ""}`}>
      <main className={styles.main}>
        <img
          src="/landing-bg.png"
          alt="Simatik"
          className={styles.logoImage}
        />
        <button
          type="button"
          className={styles.ctaButton}
          onClick={() => setShowLoginModal(true)}
        >
          Masuk
        </button>
        {showLoginModal && (
          <LoginModal onClose={() => setShowLoginModal(false)} />
        )}
      </main>
    </div>
  );
}
