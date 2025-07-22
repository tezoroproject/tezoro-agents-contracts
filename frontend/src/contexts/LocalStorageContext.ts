import type { Updater } from "use-immer";
import { createContext } from "react";
import { LocalStorageData } from "../schemas/localstorage-schema";

type LocalStorageContextType = {
  safeLocalStorage: LocalStorageData | undefined;
  updateLocalStorage: Updater<LocalStorageData> | undefined;
};

export const LocalStorageContext = createContext<LocalStorageContextType>({
  safeLocalStorage: undefined,
  updateLocalStorage: undefined,
});
