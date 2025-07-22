"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef } from "react";
import { useImmer } from "use-immer";
import {
  LocalStorageData,
  localStorageSchema,
} from "../schemas/localstorage-schema";
import { LocalStorageContext } from "../contexts/LocalStorageContext";
import { TabsEnum } from "../constants";

const STORAGE_KEY = "__tzo_storage__";

function loadFromStorage(): LocalStorageData | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return undefined;

    const parsed = JSON.parse(stored);
    const result = localStorageSchema.safeParse(parsed);
    if (!result.success) throw result.error;
    return result.data;
  } catch (e) {
    console.error("Invalid local storage data:", e);
    localStorage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

const DEFAULT_LOCAL_STORAGE: LocalStorageData = {
  allocations: [],
  isInitialized: false,
  screen: {
    type: "home",
    tab: TabsEnum.ASSETS,
  },
};

const INITIAL_LOCAL_STORAGE: LocalStorageData = {
  allocations: [],
  isInitialized: true,
  screen: {
    type: "home",
    tab: TabsEnum.ASSETS,
  },
};

export function LocalStorageProvider({ children }: PropsWithChildren) {
  const [safeLocalStorage, setSafeLocalStorage] = useImmer<LocalStorageData>(
    DEFAULT_LOCAL_STORAGE
  );

  const prevJsonRef = useRef<string | null>(null);

  useEffect(() => {
    const loaded = loadFromStorage();
    console.log("Loaded local storage:", loaded);
    setSafeLocalStorage(loaded ?? INITIAL_LOCAL_STORAGE);
  }, [setSafeLocalStorage]);

  // Write to localStorage on every update
  useEffect(() => {
    if (!safeLocalStorage.isInitialized) return;

    const newJson = JSON.stringify(safeLocalStorage);
    if (newJson !== prevJsonRef.current) {
      localStorage.setItem(STORAGE_KEY, newJson);
      prevJsonRef.current = newJson;
    }
  }, [safeLocalStorage]);

  const memoizedValue = useMemo(
    () => ({
      safeLocalStorage,
      updateLocalStorage: setSafeLocalStorage,
    }),
    [setSafeLocalStorage, safeLocalStorage]
  );

  return (
    <LocalStorageContext.Provider value={memoizedValue}>
      {children}
    </LocalStorageContext.Provider>
  );
}
