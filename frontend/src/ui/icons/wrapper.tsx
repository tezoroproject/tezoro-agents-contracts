import { HTMLProps, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function IconWrapper({
  onClick,
  children,
  className,
  ...rest
}: {
  onClick?: () => void;
  children: ReactNode;
  type?: "button" | "submit" | "reset" | undefined;
} & Omit<HTMLProps<HTMLButtonElement>, "onClick" | "type">) {
  return (
    <button
      className={twMerge(
        "shrink-0 w-10 h-10 rounded-[12px] bg-[#f5f5f5] flex items-center",
        "justify-center cursor-pointer",
        className
      )}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
