import { PropsWithChildren, useState } from "react";
import {
  ConfirmationContext,
  ConfirmationOptions,
} from "../contexts/ConfirmationContext";

export const ConfirmationProvider = ({ children }: PropsWithChildren) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions>({});
  const [resolvePromise, setResolvePromise] =
    useState<(confirmed: boolean) => void>();

  const confirm = (options?: ConfirmationOptions) => {
    setOptions(options || {});
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  };

  return (
    <ConfirmationContext.Provider
      value={{
        confirm,
        isOpen,
        resolvePromise,
        options,
        close: () => {
          setIsOpen(false);
        },
      }}
    >
      {children}
    </ConfirmationContext.Provider>
  );
};
