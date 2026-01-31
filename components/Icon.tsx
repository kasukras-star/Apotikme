"use client";

import Image from "next/image";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export default function Icon({ name, size = 16, className }: IconProps) {
  return (
    <Image
      src={`/icons/${name}.svg`}
      alt={name}
      width={size}
      height={size}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-block",
        filter: "none",
      }}
      className={className}
    />
  );
}


