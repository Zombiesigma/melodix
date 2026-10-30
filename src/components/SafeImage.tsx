"use client";

import { useState } from "react";

type SafeImageProps = {
  src?: string | null;
  alt?: string;
  className?: string;

  /**
   * Membuat image mengisi parent.
   * Digunakan seperti `fill` pada next/image.
   */
  fill?: boolean;

  /**
   * Memprioritaskan loading image.
   */
  priority?: boolean;

  /**
   * Ukuran image ketika tidak menggunakan fill.
   */
  width?: number;
  height?: number;

  /**
   * Object positioning / sizing.
   */
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  objectPosition?: string;
};

export default function SafeImage({
  src,
  alt = "",
  className = "",
  fill = false,
  priority = false,
  width,
  height,
  objectFit = "cover",
  objectPosition = "center",
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  const cleanSrc =
    typeof src === "string"
      ? src.trim()
      : "";

  /*
   * Tidak ada source atau image gagal dimuat.
   */
  if (!cleanSrc || failed) {
    return (
      <div
        className={[
          "flex items-center justify-center bg-[#0d0d0d]",
          fill
            ? "absolute inset-0 h-full w-full"
            : "h-full w-full",
          className,
        ].join(" ")}
      >
        <div className="flex flex-col items-center gap-2 text-zinc-700">
          <span className="text-xl">
            ♪
          </span>

          <span className="text-[9px] font-bold tracking-[0.18em]">
            NO COVER
          </span>
        </div>
      </div>
    );
  }

  const imageStyle: React.CSSProperties = {
    objectFit,
    objectPosition,
  };

  if (fill) {
    imageStyle.position = "absolute";
    imageStyle.inset = 0;
    imageStyle.width = "100%";
    imageStyle.height = "100%";
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      style={imageStyle}
    />
  );
}
