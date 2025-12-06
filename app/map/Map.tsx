"use client";

import { useEffect, useRef } from "react";
import MapView from "@arcgis/core/views/MapView";
import Config from "@arcgis/core/config";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import esriConfig from "@arcgis/core/config";

interface ArcgisMapProps {
  center?: number[];
  onLocationSelect?: (coords: { latitude: number; longitude: number }) => void;
  isSelecting?: boolean;
  className?: string;
}

// Set API key once at module level
if (process.env.NEXT_PUBLIC_ARCGIS_API_KEY) {
  esriConfig.apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
}

export default function ArcgisMap({
  center,
  onLocationSelect,
  isSelecting = false,
  className,
}: ArcgisMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const isSelectingRef = useRef(isSelecting);

  // Update refs when props change
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
    isSelectingRef.current = isSelecting;

    if (viewRef.current && viewRef.current.container) {
      viewRef.current.container.style.cursor = isSelecting
        ? "crosshair"
        : "default";
    }
  }, [onLocationSelect, isSelecting]);

  // Update view center when center prop changes
  useEffect(() => {
    if (viewRef.current && center) {
      viewRef.current
        .goTo({
          center: center,
          zoom: 12,
        })
        .catch((error: any) => {
          // Ignore interruption errors which happen if the user interacts with the map
          // while it's animating or if another goTo call replaces this one
          if (error.name !== "view:goto-interrupted") {
            console.error("Map center update failed:", error);
          }
        });
    }
  }, [center]);

  useEffect(() => {
    if (!mapRef.current) return;

    // If view already exists, don't create another
    if (viewRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      // Dynamic imports to avoid SSR issues
      const [{ default: Map }] = await Promise.all([
        import("@arcgis/core/Map"),
      ]);

      if (cancelled) return;

      const map = new Map({
        basemap: "streets-vector",
      });

      const view = new MapView({
        container: mapRef.current!,
        map,
        center: center || [25.0, 46.0],
        zoom: center ? 12 : 6,
      });

      viewRef.current = view;

      // Wait for view to be ready
      await view.when();

      if (cancelled) {
        view.destroy();
        return;
      }

      view.ui.remove("attribution");

      // Set initial cursor
      if (view.container) {
        view.container.style.cursor = isSelectingRef.current
          ? "crosshair"
          : "default";
      }

      // Add layer for selected marker
      const graphicsLayer = new GraphicsLayer();
      map.add(graphicsLayer);

      view.on("click", (event) => {
        // Only proceed if we are in selecting mode and have a callback
        if (!isSelectingRef.current || !onLocationSelectRef.current) return;

        graphicsLayer.removeAll();

        const point = event.mapPoint;

        const simpleMarkerSymbol = {
          type: "simple-marker" as const,
          color: [226, 119, 40],
          outline: {
            color: [255, 255, 255],
            width: 1,
          },
        };

        const pointGraphic = new Graphic({
          geometry: point,
          symbol: simpleMarkerSymbol,
        });

        graphicsLayer.add(pointGraphic);

        onLocationSelectRef.current({
          latitude: point.latitude,
          longitude: point.longitude,
        });
      });
    };

    initMap().catch((err) => {
      // Ignore abort errors - they're expected during cleanup
      if (err?.name !== "AbortError") {
        console.error("Map init error:", err);
      }
    });

    return () => {
      cancelled = true;
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []);

  // Handle center changes separately
  useEffect(() => {
    if (viewRef.current && center) {
      viewRef.current.goTo({
        center: center,
        zoom: 12,
      });
    }
  }, [center]);

  return (
    <div
      ref={mapRef}
      className={className}
      style={{ width: "100%", height: "100%", borderRadius: "0" }}
    ></div>
  );
}
