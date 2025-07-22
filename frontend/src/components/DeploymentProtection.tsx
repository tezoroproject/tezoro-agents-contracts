import { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../utils/utils";

type DeploymentProtection = HTMLAttributes<HTMLDivElement>;

export function DeploymentProtection({
  children,
  className,
  ...props
}: PropsWithChildren<DeploymentProtection>) {
  return (
    <div className={cn("relative", className)} {...props}>
      {children}
    </div>
  );
}
