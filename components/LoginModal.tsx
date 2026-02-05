"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabaseClient";
import styles from "./LoginModal.module.css";

const REMEMBER_KEY = "login-remember-email";

type Props = {
  onClose: () => void;
};

function UserIcon() {
  return (
    <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className={styles.toggleIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className={styles.toggleIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginModal({ onClose }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (rememberMe) {
        try {
          localStorage.setItem(REMEMBER_KEY, email);
        } catch {
          // ignore
        }
      } else {
        try {
          localStorage.removeItem(REMEMBER_KEY);
        } catch {
          // ignore
        }
      }
      const supabase = getSupabaseClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data?.session) {
        const role = data.session.user?.app_metadata?.role as string | undefined;
        onClose();
        if (role === "Kasir") {
          router.push("/admin/penjualan");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} aria-hidden="true" />
      <aside className={styles.panel} role="dialog" aria-label="Form masuk">
        <div className={styles.header}>
          <h2 className={styles.title}>User Login</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Tutup"
          >
            ×
          </button>
        </div>
        <div className={styles.logoWrap}>
          <img src="/logo_simatik.png.png" alt="Simatik App" className={styles.logoImage} />
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="modal-email">User ID / Email</label>
            <div className={styles.inputWrap}>
              <UserIcon />
              <input
                id="modal-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan user ID atau email"
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="modal-password">Password</label>
            <div className={styles.inputWrap}>
              <LockIcon />
              <input
                id="modal-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div className={styles.options}>
            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember Me</span>
            </label>
            <a href="#" className={styles.forgotLink} onClick={(e) => { e.preventDefault(); }}>
              Forgot Password
            </a>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.submitWrap}>
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
