import { HTMLProps, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: HTMLProps<HTMLDivElement>["className"];
}) {
  return (
    <div
      className={twMerge(
        "w-full max-w-full px-5 mx-auto",
        "sm:px-8 sm:max-w-[680px]",
        "md:max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}
