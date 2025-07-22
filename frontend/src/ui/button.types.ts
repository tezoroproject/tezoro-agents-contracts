import { ButtonHTMLAttributes } from "react";

export enum ButtonVariants {
  DEFAULT = "default",
  SECONDARY = "secondary",
}

export type ButtonProps = {
  disabled?: boolean;
  isLoading?: boolean;
  isPositiveLoading?: boolean;
  variant?: ButtonVariants;
} & ButtonHTMLAttributes<HTMLButtonElement>;
