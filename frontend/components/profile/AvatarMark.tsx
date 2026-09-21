import type { AvatarMarkId } from "@/lib/avatars";

/**
 * Dependency-free SVG identity marks (24×24, stroke = currentColor).
 * Replaces raw emoji glyphs: crisp at every size, themeable, no font surprises.
 *
 * One geometry source feeds both the HTML persona chips (via the React
 * component below) and the SVG persona markers drawn on the Observatory map.
 */
const MARK_MARKUP: Record<AvatarMarkId, string> = {
  orbit:
    '<circle cx="12" cy="12" r="4.2"/><ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(-24 12 12)"/><circle cx="19.4" cy="8.6" r="1.4" fill="currentColor" stroke="none"/>',
  star: '<path d="M12 3.2 13.9 10l6.9 1.9-6.9 1.9L12 20.8l-1.9-7-6.9-1.9L10.1 10Z"/>',
  leaf: '<path d="M5.5 18.5C5.5 10 11 5.5 19 5c.5 8-3 13.5-11.5 13.5Z"/><path d="M6.5 17.5C10 14 13 11 17.5 6.5"/>',
  wave: '<path d="M3 10c2.5-3 5-3 7.5 0s5 3 7.5 0M3 15c2.5-3 5-3 7.5 0s5 3 7.5 0"/>',
  flame:
    '<path d="M12 3.5c3.5 3.5 5.5 6.5 5.5 9.5A5.5 5.5 0 0 1 12 18.5 5.5 5.5 0 0 1 6.5 13c0-3 2-6 5.5-9.5Zm0 6.5c1.4 1.6 2.2 3 2.2 4.4a2.2 2.2 0 1 1-4.4 0c0-1.4.8-2.8 2.2-4.4Z"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.6a8 8 0 1 0 10 9.9Z"/>',
  bolt: '<path d="M13.2 3 6 13.4h4.6L9.8 21l7.4-10.6h-4.7L13.2 3Z"/>',
  prism: '<path d="M12 4 20 18H4L12 4Z"/><path d="M12 9.5 16.5 18"/>',
  book: '<path d="M12 6.5C10 4.8 7.5 4.2 4.5 4.5v13c3-.3 5.5.3 7.5 2 2-1.7 4.5-2.3 7.5-2v-13c-3-.3-5.5.3-7.5 2Z"/><path d="M12 6.5v13"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
  feather:
    '<path d="M19 5c-6 .5-10.5 4.5-11 11l-1.5 3.5M8 16c5.5 0 10-4 11-11Z"/><path d="M6.5 19.5 8 16"/>',
  crystal: '<path d="M8 4h8l4 6-8 10L4 10l4-6Z"/><path d="M4 10h16M8 4l4 6 4-6M12 10v10"/>',
};

/** Raw SVG string sharing the exact geometry used by the React component. */
export function avatarMarkSvg(mark: AvatarMarkId, size: number): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${MARK_MARKUP[mark]}</svg>`;
}

export function AvatarMark({
  mark,
  size,
  className = "",
}: {
  mark: AvatarMarkId;
  size: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      // Static, developer-authored markup — no user input ever reaches this.
      dangerouslySetInnerHTML={{ __html: MARK_MARKUP[mark] }}
    />
  );
}
