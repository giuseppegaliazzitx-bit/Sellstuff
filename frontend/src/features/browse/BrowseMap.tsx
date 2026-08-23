import { useEffect, useRef } from "react";
import type { MapPin } from "../../shared/api/types";
import "leaflet/dist/leaflet.css";

const OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ESRI =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export function BrowseMap({
  pins,
  satellite,
  onSelect,
}: {
  pins: MapPin[];
  satellite: boolean;
  onSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !ref.current || mapRef.current) return;
      const L = mod.default ?? mod;
      const map = L.map(ref.current).setView([32.7767, -96.797], 11);
      layerRef.current = L.tileLayer(OSM, {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      if (layerRef.current) map.removeLayer(layerRef.current);
      layerRef.current = L.tileLayer(satellite ? ESRI : OSM, {
        attribution: satellite
          ? "Tiles &copy; Esri"
          : "&copy; OpenStreetMap contributors",
      }).addTo(map);
    });
  }, [satellite]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      pins.forEach((p) => {
        const m = L.marker([p.lat, p.lng]).bindTooltip(p.price_label).addTo(map);
        if (onSelect) m.on("click", () => onSelect(p.id));
      });
    });
  }, [pins, onSelect]);

  return <div ref={ref} className="h-full min-h-[20rem] w-full" data-testid="browse-map" />;
}
