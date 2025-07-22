import { useConfirm } from "../hooks/useConfirm";

export function ConfirmationContainer() {
  const { isOpen, options, resolvePromise, close } = useConfirm();

  const handleConfirm = () => {
    close();
    resolvePromise?.(true);
  };

  const handleCancel = () => {
    close();
    resolvePromise?.(false);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-1000 p-5">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-2">
          {options.title || "Confirmation Required"}
        </h2>
        {options.description && (
          <p className="mb-4 text-sm text-gray-600">{options.description}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            onClick={handleCancel}
          >
            {options.cancelText || "Cancel"}
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleConfirm}
          >
            {options.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
