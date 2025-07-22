import { useContext, useMemo } from "react";
import { LocalStorageContext } from "../contexts/LocalStorageContext";
import { LocalStorageData } from "../schemas/localstorage-schema";

export function useLocalStorageSelector<T>(
  selector: (state?: LocalStorageData) => T
): T {
  const { safeLocalStorage } = useContext(LocalStorageContext);

  return useMemo(
    () => selector(safeLocalStorage),
    [selector, safeLocalStorage]
  );
}
