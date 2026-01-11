"use client";

import { useEffect, useRef } from "react";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import esriConfig from "@arcgis/core/config";
import { useRouter } from "next/navigation";
import "@arcgis/core/assets/esri/themes/light/main.css";
import { Ticket } from "@/app/types";
import { getPopupContent } from "./PopupContent";

interface ArcgisMapProps {
  center?: number[];
  onLocationSelect?: (coords: { latitude: number; longitude: number }) => void;
  isSelecting?: boolean;
  className?: string;
  tickets?: Ticket[];
  userHomeLocation?: { latitude: number; longitude: number } | null;
  selectedTicketId?: string | null;
}

if (process.env.NEXT_PUBLIC_ARCGIS_API_KEY) {
  esriConfig.apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
}

export default function ArcgisMap({
  center,
  onLocationSelect,
  isSelecting = false,
  className,
  tickets = [],
  userHomeLocation,
  selectedTicketId,
}: ArcgisMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const isSelectingRef = useRef(isSelecting);
  const ticketsRef = useRef(tickets);
  const userHomeLocationRef = useRef(userHomeLocation);
  const graphicsLayerRef = useRef<GraphicsLayer | null>(null);
  const router = useRouter();

  // Highlight fix: Ref to track hovered item
  const lastHoveredId = useRef<string | null>(null);

  // Update refs when props change
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
    isSelectingRef.current = isSelecting;
    ticketsRef.current = tickets;
    userHomeLocationRef.current = userHomeLocation;

    if (viewRef.current && viewRef.current.container) {
      viewRef.current.container.style.cursor = isSelecting
        ? "crosshair"
        : "default";
    }

    // Refresh graphics when tickets or home location change
    if (viewRef.current && graphicsLayerRef.current) {
      updateGraphics(graphicsLayerRef.current);
    }
  }, [onLocationSelect, isSelecting, tickets, userHomeLocation]);

  // Handle auto-popup when selectedTicketId changes
  useEffect(() => {
    if (!selectedTicketId || !viewRef.current || !graphicsLayerRef.current)
      return;

    const graphic = graphicsLayerRef.current.graphics.find(
      (g) => g.attributes?.id === selectedTicketId
    );

    if (graphic && viewRef.current.popup) {
      viewRef.current.popup.open({
        features: [graphic],
        location: graphic.geometry as any,
      });
    } else {
      viewRef.current.popup?.close();
    }
  }, [selectedTicketId]);

  const updateGraphics = (layer: GraphicsLayer) => {
    if (!layer) return;

    layer.removeAll();

    // Add Home Graphic
    if (userHomeLocationRef.current) {
      const homeSymbol = {
        type: "picture-marker",
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="blue" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        `)}`,
        width: "24px",
        height: "24px",
      } as any;

      const homeGraphic = new Graphic({
        geometry: {
          type: "point",
          latitude: userHomeLocationRef.current.latitude,
          longitude: userHomeLocationRef.current.longitude,
        } as any,
        symbol: homeSymbol,
        popupTemplate: {
          title: "Home",
          content: "Your set home location.",
        },
      });
      layer.add(homeGraphic);
    }

    // Add Ticket Graphics
    ticketsRef.current.forEach((ticket) => {
      const ticketSymbol = {
        type: "simple-marker",
        color:
          ticket.category === "infrastructure"
            ? [255, 165, 0] // Orange
            : ticket.category === "safety"
            ? [255, 69, 0] // Red
            : ticket.category === "environment"
            ? [34, 139, 34] // Green
            : [128, 128, 128], // Gray
        outline: {
          color: [255, 255, 255],
          width: 1.5,
        },
        size: 10,
      } as any;

      const ticketGraphic = new Graphic({
        geometry: {
          type: "point",
          latitude: ticket.location.latitude,
          longitude: ticket.location.longitude,
        } as any,
        symbol: ticketSymbol,
        attributes: {
          id: ticket.id,
          type: "ticket",
          title: ticket.title || "Incident",
          description: ticket.description,
          imageUrl: ticket.imageUrls?.[0] || null,
        },
        popupTemplate: {
          title: "", // No title in header
          content: getPopupContent(ticket),
        },
      });
      layer.add(ticketGraphic);
    });
  };

  // Update view center when center prop changes
  useEffect(() => {
    if (viewRef.current && viewRef.current.ready && center) {
      viewRef.current
        .goTo({
          center: center,
          zoom: 12,
        })
        .catch((error: any) => {
          if (error.name !== "view:goto-interrupted") {
            console.error("Map center update failed:", error);
          }
        });
    }
  }, [center]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (viewRef.current) return;

    let cancelled = false;

    const initMap = async () => {
      const [{ default: Map }, { default: Popup }] = await Promise.all([
        import("@arcgis/core/Map"),
        import("@arcgis/core/widgets/Popup"),
      ]);

      if (cancelled) return;

      const map = new Map({
        basemap: "streets-vector",
      });

      const popup = new Popup({
        dockEnabled: false,
        dockOptions: {
          buttonEnabled: false,
          breakpoint: false,
        },
        defaultPopupTemplateEnabled: false,
        // Basic config to remove some UI clutter
        visibleElements: {
          featureNavigation: false,
          closeButton: false, // Hidden via CSS anyway, but good to set
        },
      });

      const view = new MapView({
        container: mapRef.current!,
        map,
        center: center || [25.0, 46.0],
        zoom: center ? 12 : 6,
        popup: popup,
      });

      viewRef.current = view;

      await view.when();

      if (cancelled) {
        view.destroy();
        return;
      }

      view.ui.remove("attribution");
      // Move zoom to bottom left
      view.ui.move("zoom", "bottom-left");
      // Remove default actions
      view.popup?.actions.removeAll();

      if (view.container) {
        view.container.style.cursor = isSelectingRef.current
          ? "crosshair"
          : "default";
      }

      const graphicsLayer = new GraphicsLayer();
      map.add(graphicsLayer);
      graphicsLayerRef.current = graphicsLayer;

      // Initial graphics draw
      updateGraphics(graphicsLayer);

      // Handle interactions
      view.on("click", async (event) => {
        // Selection mode takes precedence
        if (isSelectingRef.current && onLocationSelectRef.current) {
          // Handled by selectionLayer click below
        } else {
          // Normal mode: check for ticket clicks
          const response = await view.hitTest(event);
          const graphicHit = response.results.find(
            (result) =>
              result.type === "graphic" &&
              result.graphic.attributes?.type === "ticket"
          ) as __esri.GraphicHit | undefined;

          const graphic = graphicHit?.graphic;

          if (graphic && graphic.attributes?.id) {
            router.push(`/ticket/${graphic.attributes.id}`);
          }
        }
      });

      const selectionLayer = new GraphicsLayer();
      map.add(selectionLayer);

      view.on("click", async (event) => {
        if (isSelectingRef.current && onLocationSelectRef.current) {
          selectionLayer.removeAll();

          const point = event.mapPoint;
          const simpleMarkerSymbol = {
            type: "simple-marker",
            color: [226, 119, 40],
            outline: { color: [255, 255, 255], width: 1 },
          } as any;

          const pointGraphic = new Graphic({
            geometry: point,
            symbol: simpleMarkerSymbol,
          });

          selectionLayer.add(pointGraphic);
          onLocationSelectRef.current({
            latitude: point.latitude,
            longitude: point.longitude,
          });
        }
      });

      // Hover handling
      view.on("pointer-move", async (event) => {
        if (isSelectingRef.current || !view.popup) return;

        const response = await view.hitTest(event);
        const graphicHit = response.results.find(
          (result) =>
            result.type === "graphic" &&
            result.graphic.attributes?.type === "ticket"
        ) as __esri.GraphicHit | undefined;

        const graphic = graphicHit?.graphic;

        // Highlight fix: Flicker prevention logic
        if (graphic) {
          const id = graphic.attributes.id;

          if (
            lastHoveredId.current === id &&
            view.popup &&
            view.popup.visible
          ) {
            return;
          }

          lastHoveredId.current = id;
          if (view.container) view.container.style.cursor = "pointer";

          if (view.popup) {
            view.popup.open({
              features: [graphic],
              // Highlight fix: Location anchor
              location: graphic.geometry as any,
            });
          }
        } else {
          if (lastHoveredId.current) {
            lastHoveredId.current = null;
            if (view.container) view.container.style.cursor = "default";
            if (view.popup) view.popup.close();
          }
        }
      });
    };

    initMap().catch((err) => {
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

  return (
    <div
      ref={mapRef}
      className={className}
      style={{ width: "100%", height: "100%", borderRadius: "0" }}
    ></div>
  );
}
