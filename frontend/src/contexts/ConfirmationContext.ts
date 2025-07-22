import { createContext } from "react";

export interface ConfirmationOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ConfirmationContextProps {
  confirm: (options?: ConfirmationOptions) => Promise<boolean>;
  close: () => void;
  options: ConfirmationOptions;
  resolvePromise?: (confirmed: boolean) => void;
  isOpen: boolean;
}

export const ConfirmationContext = createContext<
  ConfirmationContextProps | undefined
>(undefined);
