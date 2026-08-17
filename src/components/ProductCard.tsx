'use client';

import { SyntheticEvent } from 'react';
import { Check, Package } from 'lucide-react';

const AVAIL_CLASS: Record<string, string> = {
  Available: 'avail-yes',
  'On Demand': 'avail-ondemand',
  Limited: 'avail-limited',
};

// The vendor CDN sometimes "succeeds" with a 1x1 placeholder gif instead of 404ing, so onError alone
// won't catch it — treat a suspiciously tiny decoded image as broken too.
function handleImgLoad(e: SyntheticEvent<HTMLImageElement>, onBroken: () => void) {
  if (e.currentTarget.naturalWidth <= 4 || e.currentTarget.naturalHeight <= 4) onBroken();
}

export interface ProductCardProps {
  vendor: string;
  description: string;
  wic: string;
  availability: string;
  image: string | null;
  imageBroken: boolean;
  onImageBroken: () => void;
  /** Price/lock/ask content — left to the caller since it differs by context (locked, priced, ask-for-price). */
  foot: React.ReactNode;
  /** Presence of this enables the select checkbox overlay (portal card-selection + batch WhatsApp flows). */
  onToggleSelect?: () => void;
  selected?: boolean;
}

export function ProductCard({
  vendor,
  description,
  wic,
  availability,
  image,
  imageBroken,
  onImageBroken,
  foot,
  onToggleSelect,
  selected,
}: ProductCardProps) {
  return (
    <div className="pc-card">
      <div className="pc-card-img">
        <span className={`pc-avail-pill ${AVAIL_CLASS[availability] ?? 'avail-ondemand'}`}>{availability}</span>
        {onToggleSelect && (
          <button
            type="button"
            className={`pc-card-select select-dot ${selected ? 'checked' : ''}`}
            onClick={onToggleSelect}
            aria-label={selected ? 'Deselect' : 'Select'}
          >
            <Check />
          </button>
        )}
        {image && !imageBroken ? (
          // eslint-disable-next-line @next/next/no-img-element -- external vendor CDN image, unknown dimensions
          <img src={image} alt={description} onError={onImageBroken} onLoad={(e) => handleImgLoad(e, onImageBroken)} />
        ) : (
          <Package size={34} strokeWidth={1.3} style={{ color: 'var(--muted-2)' }} />
        )}
      </div>
      <div className="pc-card-body">
        <div className="pc-card-vendor">{vendor}</div>
        <div className="pc-card-name">{description}</div>
        <div className="pc-card-wic">{wic}</div>
        <div className="pc-card-foot">{foot}</div>
      </div>
    </div>
  );
}
