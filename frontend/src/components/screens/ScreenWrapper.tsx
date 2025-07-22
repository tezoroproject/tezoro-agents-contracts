import { PropsWithChildren, ReactNode } from "react";
import { CloseIcon } from "../../ui/icons/close";
import { IconWrapper } from "../../ui/icons/wrapper";
import { ArrowLeft } from "lucide-react";
import { cn } from "../../utils/utils";

type ScreenWrapperProps = {
  headerText: string;
  withBack?: boolean;
  containerClassName?: string;
  isBottomLayer?: boolean;
  onBack?: () => void;
  renderActionButton?: () => ReactNode;
};

export function ScreenWrapper({
  headerText,
  children,
  withBack,
  containerClassName,
  isBottomLayer,
  onBack,
  renderActionButton,
}: PropsWithChildren<ScreenWrapperProps>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 justify-between h-full",
        "max-[410px]:p-[14px_16px_16px] max-[540px]:p-[14px_20px_20px] p-[14px_25px_25px]",
        "border border-[#f4f4f4] rounded-[20px] bg-white transition-all ease-out duration-200",
        isBottomLayer && "bg-neutral-100 scale-95 -translate-y-2",
        containerClassName
      )}
    >
      <div className="flex justify-between">
        <div className="flex gap-2">
          {withBack ? (
            <IconWrapper className="group" onClick={onBack}>
              <ArrowLeft
                width={20}
                height={20}
                className="transition duration-300 group-hover:-translate-x-[2px]"
              />
            </IconWrapper>
          ) : null}
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
