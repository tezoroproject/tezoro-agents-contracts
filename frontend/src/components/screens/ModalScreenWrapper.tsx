import { PropsWithChildren, ReactNode } from "react";
import { CloseIcon } from "../../ui/icons/close";
import { cn } from "../../utils/utils";

type ModalScreenWrapperProps = {
  headerText: ReactNode | string;
  containerClassName?: string;
  isBottomLayer?: boolean;
  isVisible?: boolean;
  onBack?: () => void;
  renderActionButton?: () => ReactNode;
};

export function ModalScreenWrapper({
  headerText,
  children,
  containerClassName,
  isBottomLayer,
  isVisible,
  onBack,
  renderActionButton,
}: PropsWithChildren<ModalScreenWrapperProps>) {
  return (
    <div
      className={cn(
        "absolute top-full left-0 z-[11] w-full bottom-0 overflow-hidden flex flex-col gap-5",
        "rounded-[20px] border border-[#f4f4f4] transition-all ease duration-300 bg-white",
        "max-[410px]:p-[14px_16px_16px] max-[540px]:p-[14px_20px_20px] p-[14px_25px_25px]",
        isVisible && "top-4",
        isBottomLayer && "bg-neutral-100 scale-95 -translate-y-2 top-0",
        containerClassName
      )}
    >
      <div className="flex justify-between">
        <div className="flex gap-2">
          <h2 className="text-[18px] max-[540px]:text-[16px] leading-[140%] pt-[6px]">
            {headerText}
          </h2>
        </div>
        {renderActionButton ? (
          renderActionButton()
        ) : (
          <CloseIcon type="button" onClick={onBack} />
        )}
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
    </div>
  );
}
