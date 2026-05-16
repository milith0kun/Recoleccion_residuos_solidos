'use client';

import { useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';

interface Props {
  onClick: (e: LeafletMouseEvent) => void;
  enabled?: boolean;
}

/**
 * Captures clicks on a Leaflet map. Must be rendered inside <MapContainer>.
 * The wrapping page should dynamic-import this with ssr:false because the
 * useMapEvents hook touches the Leaflet runtime.
 */
export default function MapClickCapture({ onClick, enabled = true }: Props) {
  useMapEvents({
    click(e) {
      if (enabled) onClick(e);
    },
  });
  return null;
}
