"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { GuessResult } from "@/lib/types";
import "maplibre-gl/dist/maplibre-gl.css";

type MapInstance = maplibregl.Map;
type MarkerInstance = maplibregl.Marker;

/** Style vectoriel fluide (proche roadmap Google / GeoGuessr) */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

interface Props {
  pick: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
  canPick: boolean;
  revealed?: boolean;
  target?: { lat: number; lng: number } | null;
  guesses?: GuessResult[];
  myColor?: string;
}

function makePinEl(color: string, size = 18) {
  const el = document.createElement("div");
  el.style.cssText = `
    width:${size}px;height:${size}px;border-radius:50%;
    background:${color};border:3px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,.28);
    cursor:grab;will-change:transform;
  `;
  return el;
}

export default function MapPick({
  pick,
  onPick,
  canPick,
  revealed,
  target,
  guesses = [],
  myColor = "#FF3B30",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const pickMarkerRef = useRef<MarkerInstance | null>(null);
  const resultMarkersRef = useRef<MarkerInstance[]>([]);
  const canPickRef = useRef(canPick);
  const onPickRef = useRef(onPick);

  canPickRef.current = canPick;
  onPickRef.current = onPick;

  /* Init map once */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [0, 20],
      zoom: 1.4,
      minZoom: 1,
      maxZoom: 18,
      pitch: 0,
      maxPitch: 0,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: true,
      fadeDuration: 0,
      refreshExpiredTiles: true,
      trackResize: true,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    map.scrollZoom.enable();
    map.dragPan.enable();
    map.touchZoomRotate.enable();
    map.touchZoomRotate.disableRotation();
    map.doubleClickZoom.enable();
    map.keyboard.enable();

    map.on("click", (e) => {
      if (!canPickRef.current) return;
      onPickRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("load", () => {
      map.resize();
      if (!map.getSource("guess-lines")) {
        map.addSource("guess-lines", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "guess-lines-layer",
          type: "line",
          source: "guess-lines",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 2.5,
            "line-opacity": 0.85,
          },
        });
      }
    });

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(containerRef.current);

    mapRef.current = map;

    return () => {
      ro.disconnect();
      pickMarkerRef.current?.remove();
      resultMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* Pick marker */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickMarkerRef.current) {
      pickMarkerRef.current.remove();
      pickMarkerRef.current = null;
    }

    if (pick && !revealed) {
      pickMarkerRef.current = new maplibregl.Marker({
        element: makePinEl(myColor),
        anchor: "center",
      })
        .setLngLat([pick.lng, pick.lat])
        .addTo(map);
    }
  }, [pick, revealed, myColor]);

  /* Results: lines + markers + fit */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    resultMarkersRef.current.forEach((m) => m.remove());
    resultMarkersRef.current = [];

    const setLines = () => {
      const src = map.getSource("guess-lines") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;

      if (!revealed || !target) {
        src.setData({ type: "FeatureCollection", features: [] });
        return;
      }

      src.setData({
        type: "FeatureCollection",
        features: guesses.map((g) => ({
          type: "Feature" as const,
          properties: { color: g.color },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [g.lng, g.lat],
              [target.lng, target.lat],
            ],
          },
        })),
      });
    };

    if (map.isStyleLoaded()) setLines();
    else map.once("load", setLines);

    if (revealed && target) {
      const targetMarker = new maplibregl.Marker({
        element: makePinEl("#FF3B30", 22),
        anchor: "center",
      })
        .setLngLat([target.lng, target.lat])
        .addTo(map);
      resultMarkersRef.current.push(targetMarker);

      guesses.forEach((g) => {
        const m = new maplibregl.Marker({
          element: makePinEl(g.color),
          anchor: "center",
        })
          .setLngLat([g.lng, g.lat])
          .addTo(map);
        resultMarkersRef.current.push(m);
      });

      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([target.lng, target.lat]);
      guesses.forEach((g) => bounds.extend([g.lng, g.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 6, duration: 800 });
    }
  }, [revealed, target, guesses]);

  /* Cursor */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = canPick ? "crosshair" : "";
  }, [canPick]);

  return <div ref={containerRef} className="maplibre-root" />;
}
