import { useContext } from "react";
import { LocalStorageContext } from "../contexts/LocalStorageContext";

export function useLocalStorage() {
  return useContext(LocalStorageContext);
}
