import { SVGProps } from "react";

export function BaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 146 146"
      fill="none"
      {...props}
    >
      <circle cx={73} cy={73} r={73} fill="#0052FF" />
      <path
        fill="#fff"
        d="M73.323 123.729c28.294 0 51.23-22.897 51.23-51.141 0-28.245-22.936-51.142-51.23-51.142-26.843 0-48.865 20.61-51.052 46.843h67.715v8.597H22.27c2.187 26.233 24.209 46.843 51.052 46.843Z"
      />
    </svg>
  );
}
