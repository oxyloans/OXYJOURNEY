import type { ReactNode } from "react";
import "./Icon3D.css";

/**
 * A 3D icon: the same line icon stacked in layers at increasing depth so it reads as an extruded
 * object, then slowly swung back and forth in CSS. Pass the SVG shapes as children (stroke
 * "currentColor", 24x24 viewBox).
 */
const LAYERS = [-9, -6, -3, 0, 3, 6, 9];

export default function Icon3D({
  children,
  palette = "violet",
  size = 58,
}: {
  children: ReactNode;
  palette?: "violet" | "green" | "blue";
  size?: number;
}) {
  return (
    <span className={`i3d i3d-${palette}`} style={{ width: size, height: size }} aria-hidden="true">
      {LAYERS.map(z => (
        <svg
          key={z}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: `translateZ(${z}px)` }}
          className={`i3d-layer z${z < 0 ? "n" : "p"}${Math.abs(z)}`}
        >
          {children}
        </svg>
      ))}
    </span>
  );
}
