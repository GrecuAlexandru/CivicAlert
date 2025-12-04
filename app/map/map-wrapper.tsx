"use client";

import dynamic from "next/dynamic";

const ArcgisMap = dynamic(() => import("./Map"), {
  ssr: false,
});

export default function MapWrapper() {
  return <ArcgisMap />;
}
