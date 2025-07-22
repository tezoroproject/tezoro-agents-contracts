import { useEffect, useState } from "react";
import { useToast } from "../hooks/useToast";
import { cn } from "../utils/utils";

const SHOW_DURATION_MS = 7000;
const FADE_DURATION_MS = 300;

export const ToastContainer = () => {
  const { toasts } = useToast();

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 flex flex-col items-center gap-3 z-50">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

const ToastItem = ({
  toast,
}: {
  toast: { id: number; message: string; type: string };
}) => {
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showTimeout = setTimeout(() => setIsVisible(true), 10);

    const hideTimeout = setTimeout(() => {
      setIsVisible(false);
    }, SHOW_DURATION_MS);

    const removeTimeout = setTimeout(() => {
      removeToast(toast.id);
    }, SHOW_DURATION_MS + FADE_DURATION_MS);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
      clearTimeout(removeTimeout);
    };
  }, [removeToast, toast.id]);

  return (
    <div
      className={cn(
        `px-4 py-3 rounded-2xl shadow-lg text-white transform transition-all duration-300 ease-out`,
        {
          "bg-green-500": toast.type === "success",
          "bg-red-500": toast.type === "error",
          "bg-blue-500": toast.type === "info",
          "opacity-0 translate-y-[-10px] scale-95": !isVisible,
          "opacity-100 translate-y-0 scale-100": isVisible,
        }
      )}
      onClick={() => removeToast(toast.id)}
    >
      {toast.message}
    </div>
  );
};
