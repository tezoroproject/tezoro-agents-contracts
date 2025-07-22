import { HTMLProps } from "react";
import { cn } from "../utils/utils";

interface InputProps extends HTMLProps<HTMLInputElement> {
  id: string;
  error?: boolean;
}

export function Checkbox({ id, className, error, ...inputProps }: InputProps) {
  return (
    <div className={cn("checkbox", error ? "checkbox-error" : "", className)}>
      <input type="checkbox" id={id} className="hidden" {...inputProps} />
      <label htmlFor={id}></label>
    </div>
  );
}
