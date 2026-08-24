import { useEffect, useRef } from "react";
import type { MapPin } from "../../shared/api/types";
import "leaflet/dist/leaflet.css";

const OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ESRI =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function bucketPins(pins: MapPin[], zoom: number): { lat: number; lng: number; pins: MapPin[] }[] {
  if (zoom >= 14 || pins.length <= 1) {
    return pins.map((p) => ({ lat: p.lat, lng: p.lng, pins: [p] }));
  }
  const cell = 0.45 * 0.5 ** Math.max(zoom - 6, 0);
  const groups = new Map<string, MapPin[]>();
  for (const p of pins) {
    const key = `${Math.round(p.lat / cell)}_${Math.round(p.lng / cell)}`;
    const list = groups.get(key) || [];
    list.push(p);
    groups.set(key, list);
  }
  return [...groups.values()].map((list) => ({
    lat: list.reduce((s, p) => s + p.lat, 0) / list.length,
    lng: list.reduce((s, p) => s + p.lng, 0) / list.length,
    pins: list,
  }));
}

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
  const clusterRef = useRef<any>(null);
  const pinsRef = useRef(pins);
  const onSelectRef = useRef(onSelect);
  pinsRef.current = pins;
  onSelectRef.current = onSelect;

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
      const redraw = () => drawClusters(L, map);
      map.on("zoomend", redraw);
      redraw();
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
        attribution: satellite ? "Tiles &copy; Esri" : "&copy; OpenStreetMap contributors",
      }).addTo(map);
    });
  }, [satellite]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      drawClusters(L, map);
    });
  }, [pins]);

  function drawClusters(L: any, map: any) {
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }
    const group = L.layerGroup();
    const zoom = map.getZoom();
    for (const bucket of bucketPins(pinsRef.current, zoom)) {
      if (bucket.pins.length === 1) {
        const p = bucket.pins[0];
        const marker = L.marker([p.lat, p.lng]).bindTooltip(p.price_label);
        marker.on("click", () => onSelectRef.current?.(p.id));
        group.addLayer(marker);
      } else {
        const n = bucket.pins.length;
        const icon = L.divIcon({
          className: "",
          html: `<div class="pin-cluster">${n}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        const marker = L.marker([bucket.lat, bucket.lng], { icon });
        marker.on("click", () => map.setView([bucket.lat, bucket.lng], Math.min(zoom + 2, 16)));
        group.addLayer(marker);
      }
    }
    group.addTo(map);
    clusterRef.current = group;
  }

  return <div ref={ref} className="h-full min-h-[18rem] w-full" data-testid="browse-map" />;
}
