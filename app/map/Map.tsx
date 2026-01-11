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
  showHeatmap?: boolean;
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
  showHeatmap = false,
}: ArcgisMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<MapView | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const isSelectingRef = useRef(isSelecting);
  const ticketsRef = useRef(tickets);
  const userHomeLocationRef = useRef(userHomeLocation);
  const graphicsLayerRef = useRef<GraphicsLayer | null>(null);
  const heatmapLayerRef = useRef<__esri.FeatureLayer | null>(null);
  const showHeatmapRef = useRef(showHeatmap);
  const router = useRouter();

  // Highlight fix: Ref to track hovered item
  const lastHoveredId = useRef<string | null>(null);

  // Update refs when props change
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
    isSelectingRef.current = isSelecting;
    ticketsRef.current = tickets;
    userHomeLocationRef.current = userHomeLocation;
    showHeatmapRef.current = showHeatmap;

    if (viewRef.current && viewRef.current.container) {
      viewRef.current.container.style.cursor = isSelecting
        ? "crosshair"
        : "default";
    }

    // Refresh graphics when tickets or home location change
    if (viewRef.current && graphicsLayerRef.current) {
      updateGraphics(graphicsLayerRef.current);
    }

    // Toggle layer visibility based on heatmap mode
    if (graphicsLayerRef.current) {
      graphicsLayerRef.current.visible = !showHeatmap;
    }
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.visible = showHeatmap;
      // Update heatmap data when toggled on
      if (showHeatmap) {
        updateHeatmapLayer();
      }
    }
  }, [onLocationSelect, isSelecting, tickets, userHomeLocation, showHeatmap]);

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

  const updateHeatmapLayer = async () => {
    if (!heatmapLayerRef.current || !viewRef.current) return;

    const layer = heatmapLayerRef.current;

    // Dynamically import Graphic if needed, but we already use it elsewhere.
    // Ensuring it is imported.
    const Graphic = (await import("@arcgis/core/Graphic")).default;

    try {
      // Query all existing features to delete
      const query = layer.createQuery();
      query.where = "1=1";
      const results = await layer.queryFeatures(query);
      const existingFeatures = results.features;

      // Create new graphics
      const newGraphics = ticketsRef.current.map(
        (ticket, index) =>
          new Graphic({
            geometry: {
              type: "point",
              longitude: ticket.location.longitude,
              latitude: ticket.location.latitude,
            } as __esri.Point,
            attributes: {
              // Using a simple index-based ID.
              // In a real app, you might want persistent IDs if you update individual items.
              ObjectID: index + 1,
              category: ticket.category,
              weight: 1,
            },
          })
      );

      // Apply edits: delete all existing, add new ones
      await layer.applyEdits({
        deleteFeatures: existingFeatures,
        addFeatures: newGraphics,
      });
    } catch (error) {
      console.error("Failed to update heatmap layer:", error);
    }
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

      // Create heatmap layer with HeatmapRenderer
      const [FeatureLayer, HeatmapRenderer] = await Promise.all([
        import("@arcgis/core/layers/FeatureLayer"),
        import("@arcgis/core/renderers/HeatmapRenderer"),
      ]);

      // Create initial features for heatmap
      const heatmapFeatures = ticketsRef.current.map(
        (ticket, index) =>
          new Graphic({
            geometry: {
              type: "point",
              longitude: ticket.location.longitude,
              latitude: ticket.location.latitude,
            } as __esri.Point,
            attributes: {
              ObjectID: index,
              category: ticket.category,
              weight: 1,
            },
          })
      );

      const heatmapLayer = new FeatureLayer.default({
        source: heatmapFeatures,
        objectIdField: "ObjectID",
        geometryType: "point",
        spatialReference: { wkid: 4326 },
        fields: [
          { name: "ObjectID", type: "oid" },
          { name: "category", type: "string" },
          { name: "weight", type: "double" },
        ],
        renderer: new HeatmapRenderer.default({
          colorStops: [
            { color: "rgba(63, 40, 102, 0)", ratio: 0 },
            { color: "#472b77", ratio: 0.083 },
            { color: "#4e2d87", ratio: 0.166 },
            { color: "#563098", ratio: 0.249 },
            { color: "#5d32a8", ratio: 0.332 },
            { color: "#6735be", ratio: 0.415 },
            { color: "#7139d4", ratio: 0.498 },
            { color: "#7b3ce9", ratio: 0.581 },
            { color: "#853fff", ratio: 0.664 },
            { color: "#a46fbf", ratio: 0.747 },
            { color: "#c29f80", ratio: 0.83 },
            { color: "#e0cf40", ratio: 0.913 },
            { color: "#ffff00", ratio: 1 },
          ],
          radius: 18,
          minDensity: 0,
          maxDensity: 0.04625,
        }),
        visible: showHeatmapRef.current,
      });

      map.add(heatmapLayer);
      heatmapLayerRef.current = heatmapLayer;

      // Set initial visibility based on showHeatmap prop
      graphicsLayer.visible = !showHeatmapRef.current;

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
