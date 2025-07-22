import { MouseEvent, useRef } from "react";
import { cn } from "../utils/utils";
import { ButtonProps, ButtonVariants } from "./button.types";

export function Button({
  disabled,
  isLoading,
  isPositiveLoading,
  className,
  children,
  variant = ButtonVariants.DEFAULT,
  onClick,
  ...rest
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const createRipple = (event: MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;

    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.className = `ripple ${
      variant === ButtonVariants.SECONDARY ? "dark" : ""
    }`;

    const rippleContainer = button.querySelector(".ripple-container");
    if (rippleContainer) {
      rippleContainer.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    }
  };

  return (
    <button
      type="button"
      ref={buttonRef}
      className={cn(
        "block w-full outline-none border-none overflow-hidden relative cursor-pointer px-5 leading-[140%]",
        "rounded-[16px] h-[58px] max-[510px]:h-[54px] text-[18px] max-[540px]:text-[16px]",
        "font-medium hover:opacity-90 transition relative",
        disabled || isLoading
          ? "opacity-70 pointer-events-none"
          : "pointer-events-auto",
        variant === ButtonVariants.DEFAULT && "bg-[#252525] text-white", // mineShaft
        variant === ButtonVariants.SECONDARY && "bg-[#f5f5f5] text-black", // wildSand
        isPositiveLoading && "positive-loading pointer-events-none",
        className
      )}
      onClick={(e) => {
        createRipple(e);

        setTimeout(() => {
          onClick?.(e);
        }, 200);
      }}
      {...rest}
    >
      <span className="ripple-container absolute inset-0 overflow-hidden rounded-[inherit]" />
      <span className="relative z-10 text-inherit font-[inherit]">
        {children}
      </span>
    </button>
  );
}
