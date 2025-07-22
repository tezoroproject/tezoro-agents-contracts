import { SVGProps } from "react";
import { IconWrapper } from "./wrapper";
import { twMerge } from "tailwind-merge";
import { cn } from "../../utils/utils";

export function CloseIcon({
  onClick,
  className,
  wrapperClassName,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "onClick"> & {
  wrapperClassName?: string;
  onClick?: () => void;
}) {
  return (
    <IconWrapper onClick={onClick} className={cn("group", wrapperClassName)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="19"
        height="19"
        viewBox="0 0 19 19"
        fill="none"
        className={twMerge("transition group-hover:opacity-70", className)}
        {...props}
      >
        <path
          d="M3.00533 15.9908L16 2.99609"
          stroke="#7D7D7D"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3.00533 3.00142L16 15.9961"
          stroke="#7D7D7D"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </IconWrapper>
  );
}
