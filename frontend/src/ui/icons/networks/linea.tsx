import { SVGProps } from "react";

export function LineaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="256"
      height="256"
      viewBox="0 0 256 256"
      fill="none"
      {...props}
    >
      <rect width="256" height="256" fill="#121212" rx={128} ry={128} />
      <rect
        width="116"
        height="122"
        transform="translate(70 67)"
        fill="#121212"
      />
      <mask
        id="mask0_5764_4093"
        maskUnits="userSpaceOnUse"
        x="70"
        y="67"
        width="116"
        height="121"
      >
        <path d="M185.467 67.3063H70V187.94H185.467V67.3063Z" fill="white" />
      </mask>
      <g mask="url(#mask0_5764_4093)">
        <path
          d="M165.896 187.94H70V86.8811H91.9411V168.354H165.896V187.93V187.94Z"
          fill="white"
        />
        <path
          d="M165.896 106.456C176.705 106.456 185.467 97.692 185.467 86.8812C185.467 76.0703 176.705 67.3063 165.896 67.3063C155.087 67.3063 146.324 76.0703 146.324 86.8812C146.324 97.692 155.087 106.456 165.896 106.456Z"
          fill="white"
        />
      </g>
    </svg>
  );
}
