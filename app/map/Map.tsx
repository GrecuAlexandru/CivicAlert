"use client";

import { useEffect, useRef } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Config from "@arcgis/core/config";

interface ArcgisMapProps {
  center?: number[];
}

export default function ArcgisMap({ center }: ArcgisMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    Config.apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;

    const map = new Map({
      basemap: "streets-vector"
    });

    const view = new MapView({
      container: mapRef.current,
      map,
      center: center,
      zoom: 12
    });

    view.ui.remove("attribution");

    return () => {
      view.destroy();
    };
  }, [center]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "600px", borderRadius: "12px" }}
    ></div>
  );
}
