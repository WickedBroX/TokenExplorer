import React from "react";

type IconProps = {
  className?: string;
};

export const XLogoIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    role="img"
    aria-hidden="true"
  >
    <path d="M19.633 0h3.81l-9.26 10.41L24 24h-7.499l-5.835-7.772L3.35 24H-.46l9.252-10.95L0 0h7.585l5.273 7.087L19.633 0Z" />
  </svg>
);

export default XLogoIcon;
