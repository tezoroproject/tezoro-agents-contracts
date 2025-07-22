import { HTMLProps } from "react";
import { twMerge } from "tailwind-merge";

export function Loader({ className, ...props }: HTMLProps<HTMLDivElement>) {
  return <div className={twMerge("custom-loader", className)} {...props} />;
}
