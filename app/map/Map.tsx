"use client";

import { useEffect, useRef } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Config from "@arcgis/core/config";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";

interface ArcgisMapProps {
  center?: number[];
  onLocationSelect?: (coords: { latitude: number; longitude: number }) => void;
}

export default function ArcgisMap({ center, onLocationSelect }: ArcgisMapProps) {
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
      center: center || [25.0, 46.0],
      zoom: center? 12 : 6
    });

    view.ui.remove("attribution");

    // Add layer for selected marker
    const graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);

    if (onLocationSelect) {
      view.on("click", (event) => {
        graphicsLayer.removeAll();

        const point = event.mapPoint;
        
        const simpleMarkerSymbol = {
          type: "simple-marker" as const,
          color: [226, 119, 40],
          outline: {
            color: [255, 255, 255],
            width: 1
          }
        };

        const pointGraphic = new Graphic({
          geometry: point,
          symbol: simpleMarkerSymbol
        });

        graphicsLayer.add(pointGraphic);

        onLocationSelect({
          latitude: point.latitude,
          longitude: point.longitude
        });
      });
    }

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
