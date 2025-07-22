import { useContext } from "react";
import { ConfirmationContext } from "../contexts/ConfirmationContext";

export const useConfirm = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmationProvider");
  }
  return context;
};
