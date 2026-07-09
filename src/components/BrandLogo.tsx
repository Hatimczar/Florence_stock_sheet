import { BRAND_LOGO_PATHS } from '@/lib/brandLogoPaths';

function initials(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9 ]/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

/** Real brand mark for known vendors; a clean letter monogram fallback for the long tail of distributor brands. */
export function BrandLogo({ vendor, size = 16 }: { vendor: string; size?: number }) {
  const path = BRAND_LOGO_PATHS[vendor.trim().toUpperCase()];

  if (path) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
        <path d={path} />
      </svg>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(127,127,127,0.3)',
        color: 'currentColor',
        fontSize: size * 0.48,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(vendor)}
    </span>
  );
}
