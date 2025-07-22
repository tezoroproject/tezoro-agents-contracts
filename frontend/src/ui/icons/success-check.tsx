import { SVGProps } from "react";

export function SuccessCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="19"
      viewBox="0 0 18 19"
      fill="none"
      {...props}
    >
      <rect y="0.5" width="18" height="18" rx="9" fill="#02BDA7" />
      <path
        d="M5.5 9.5L8 12L12.5 7.5"
        stroke="white"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
