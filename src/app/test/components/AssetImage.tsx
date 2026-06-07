/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * Renders a Firebase Storage asset through the server-side asset proxy so the
 * bucket stays private (see /api/assets). Plain <img> is used intentionally —
 * assets are dynamic, access-controlled, and not known at build time.
 */
export function AssetImage({
  path,
  alt,
  className,
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={`/api/assets?path=${encodeURIComponent(path)}`}
      alt={alt}
      className={className}
      draggable={false}
    />
  );
}
