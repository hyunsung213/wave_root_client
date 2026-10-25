import Image from "next/image";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";

interface BrandLogoProps {
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export default function BrandLogo({
  width = 79,
  height = 29,
  className = "object-contain",
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt={`${BRAND_NAME} 로고`}
      width={width}
      height={height}
      priority={priority}
      sizes={`${width}px`}
      className={className}
    />
  );
}
