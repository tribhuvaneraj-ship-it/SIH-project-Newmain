import L from "leaflet";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type LeafletLiveMapProps = {
  latitude: number;
  longitude: number;
  workerName: string;
};

export function LeafletLiveMap({ latitude, longitude, workerName }: LeafletLiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([latitude, longitude], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const marker = L.circleMarker([latitude, longitude], {
      radius: 10,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2f7041",
      fillOpacity: 1,
    }).addTo(map);
    const popup = document.createElement("span");
    popup.textContent = workerName;
    marker.bindPopup(popup);

    mapRef.current = map;
    markerRef.current = marker;
    const resizeFrame = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelAnimationFrame(resizeFrame);
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const position: L.LatLngExpression = [latitude, longitude];
    markerRef.current?.setLatLng(position);
    if (mapRef.current) {
      mapRef.current.flyTo(position, Math.max(mapRef.current.getZoom(), 15), { duration: 0.6 });
    }
    const popup = document.createElement("span");
    popup.textContent = workerName;
    markerRef.current?.bindPopup(popup);
  }, [latitude, longitude, workerName]);

  return <div ref={containerRef} className="h-[360px] w-full overflow-hidden rounded-md border border-[#dce8df] bg-[#eaf0e9]" role="application" aria-label={`Live location for ${workerName}`} />;
}