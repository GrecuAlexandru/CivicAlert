"use client";

import { useEffect, useRef } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import Config from "@arcgis/core/config";

export default function ArcgisMap() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    Config.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurPIJY1v-j0MUAqs2Z7fFgLH-LLzdltEm8uGCX0FpcdbN_tDJymY37qNmEKMYZo2iM-03V-QThvjbyd4L6BCyIvuqAeQlvgCHd6pKb7bWKq_1uJpOA2RBe1UUbjPXd3BQAFUB68B3EqdtmwvN7WFkFYh5dupp8EDV1goLKxg-ET80r7AHsC91cyMOAoZv7-j5ozbzmO1uL8_dtyHfti0h_xM.AT1_xj5BfVfv";

    const map = new Map({
      basemap: "streets-vector"
    });

    const view = new MapView({
      container: mapRef.current,
      map,
      center: [-118.7368, 34.0781],
      zoom: 10
    });

    return () => {
      view.destroy();
    };
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "400px", borderRadius: "12px" }}
    ></div>
  );
}
