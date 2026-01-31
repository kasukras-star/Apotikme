"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getSupabaseClient } from "./supabaseClient";

interface Apotik {
  id: string;
  kodeApotik: string;
  namaApotik: string;
}

interface ApotikContextType {
  userApotikIds: string[];
  isSuperAdmin: boolean;
  selectedApotikId: string | null;
  apotiks: Apotik[];
  setSelectedApotikId: (id: string | null) => void;
  canAccessApotik: (apotikId: string) => boolean;
}

const ApotikContext = createContext<ApotikContextType | undefined>(undefined);

export function ApotikProvider({ children }: { children: ReactNode }) {
  const [userApotikIds, setUserApotikIds] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedApotikId, setSelectedApotikIdState] = useState<string | null>(null);
  const [apotiks, setApotiks] = useState<Apotik[]>([]);

  // Load apotiks from localStorage
  useEffect(() => {
    const savedApotiks = localStorage.getItem("apotiks");
    if (savedApotiks) {
      try {
        const parsed = JSON.parse(savedApotiks);
        setApotiks(parsed);
      } catch (err) {
        console.error("Error loading apotiks:", err);
      }
    }
  }, []);

  // Load user apotik access from session
  useEffect(() => {
    const loadUserAccess = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      
      if (session) {
        const apotikIds = session.user?.app_metadata?.apotikIds as string[] | undefined;
        const superAdmin = session.user?.app_metadata?.isSuperAdmin as boolean | undefined;
        
        setUserApotikIds(apotikIds || []);
        setIsSuperAdmin(superAdmin || false);
        
        // Load or set selected apotik
        if (superAdmin) {
          const saved = sessionStorage.getItem("selectedApotikId");
          if (saved && saved !== "all") {
            setSelectedApotikIdState(saved);
          } else {
            setSelectedApotikIdState("all");
            sessionStorage.setItem("selectedApotikId", "all");
          }
        } else if (apotikIds && apotikIds.length > 0) {
          const saved = sessionStorage.getItem("selectedApotikId");
          if (saved && apotikIds.includes(saved)) {
            setSelectedApotikIdState(saved);
          } else {
            setSelectedApotikIdState(apotikIds[0]);
            sessionStorage.setItem("selectedApotikId", apotikIds[0]);
          }
        }
      }
    };
    
    loadUserAccess();
  }, []);

  const setSelectedApotikId = (id: string | null) => {
    setSelectedApotikIdState(id);
    if (id) {
      sessionStorage.setItem("selectedApotikId", id);
    } else {
      sessionStorage.removeItem("selectedApotikId");
    }
  };

  const canAccessApotik = (apotikId: string): boolean => {
    if (isSuperAdmin) return true;
    return userApotikIds.includes(apotikId);
  };

  return (
    <ApotikContext.Provider
      value={{
        userApotikIds,
        isSuperAdmin,
        selectedApotikId,
        apotiks,
        setSelectedApotikId,
        canAccessApotik,
      }}
    >
      {children}
    </ApotikContext.Provider>
  );
}

export function useApotik() {
  const context = useContext(ApotikContext);
  if (context === undefined) {
    throw new Error("useApotik must be used within ApotikProvider");
  }
  return context;
}
