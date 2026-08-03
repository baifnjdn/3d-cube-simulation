"use client";

import React, { useState, useMemo } from "react";

// --- Math & Geometry Helpers --- //

const UNIT_CUBE_VERTICES = [
  { x: -0.5, y: -0.5, z: -0.5 },
  { x: 0.5, y: -0.5, z: -0.5 },
  { x: 0.5, y: 0.5, z: -0.5 },
  { x: -0.5, y: 0.5, z: -0.5 },
  { x: -0.5, y: -0.5, z: 0.5 },
  { x: 0.5, y: -0.5, z: 0.5 },
  { x: 0.5, y: 0.5, z: 0.5 },
  { x: -0.5, y: 0.5, z: 0.5 },
];

function getEulerMatrix(rotX: number, rotY: number) {
  const cx = Math.cos((rotX * Math.PI) / 180), sx = Math.sin((rotX * Math.PI) / 180);
  const cy = Math.cos((rotY * Math.PI) / 180), sy = Math.sin((rotY * Math.PI) / 180);
  
  // Z-axis rotation is permanently 0, so cos(0) = 1 and sin(0) = 0
  const cz = 1, sz = 0;

  return [
    [cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz],
    [cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz],
    [-sy, sx * cy, cx * cy],
  ];
}

function applyMatrix(points: typeof UNIT_CUBE_VERTICES, matrix: number[][]) {
  return points.map((p) => ({
    x: p.x * matrix[0][0] + p.y * matrix[0][1] + p.z * matrix[0][2],
    y: p.x * matrix[1][0] + p.y * matrix[1][1] + p.z * matrix[1][2],
    z: p.x * matrix[2][0] + p.y * matrix[2][1] + p.z * matrix[2][2],
  }));
}

function getConvexHull(pts: { x: number; y: number }[]) {
  if (pts.length <= 3) return pts;
  const sorted = [...pts].sort((a, b) => (Math.abs(a.x - b.x) < 1e-7 ? a.y - b.y : a.x - b.x));
  const cross = (o: any, a: any, b: any) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower = [];
  for (let i = 0; i < sorted.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 1e-7) lower.pop();
    lower.push(sorted[i]);
  }

  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 1e-7) upper.pop();
    upper.push(sorted[i]);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function getPolygonArea(pts: { x: number; y: number }[]) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area / 2);
}

export default function Home() {
  const [euler, setEuler] = useState({ x: 45, y: 35 });
  const [matrix, setMatrix] = useState(() => getEulerMatrix(45, 35));

  const { shadowPts, shadowArea } = useMemo(() => {
    const rotated = applyMatrix(UNIT_CUBE_VERTICES, matrix);
    // Light is vertical & infinitely far => Orthographic Projection (ignore Z)
    const projected2D = rotated.map((p) => ({ x: p.x, y: p.y }));
    const hull = getConvexHull(projected2D);
    const area = getPolygonArea(hull);
    return { shadowPts: hull, shadowArea: area };
  }, [matrix]);

  const handleSlider = (axis: "x" | "y", val: number) => {
    const newEuler = { ...euler, [axis]: val };
    setEuler(newEuler);
    setMatrix(getEulerMatrix(newEuler.x, newEuler.y));
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 dark:bg-black font-sans p-4 sm:p-8">
      <main className="flex flex-col w-full max-w-md gap-8 bg-white dark:bg-zinc-950 p-6 sm:p-10 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        
        {/* Shape Display */}
        <div className="w-full aspect-square bg-white border border-zinc-400 relative">
          <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full overflow-visible">
            <g transform="scale(1, -1)">
              {[-1, -0.5, 0, 0.5, 1].map((tick) => (
                <React.Fragment key={tick}>
                  <line x1="-1.2" x2="1.2" y1={tick} y2={tick} stroke="#e4e4e7" strokeWidth="0.01" strokeDasharray="0.04, 0.04" />
                  <line y1="-1.2" y2="1.2" x1={tick} x2={tick} stroke="#e4e4e7" strokeWidth="0.01" strokeDasharray="0.04, 0.04" />
                </React.Fragment>
              ))}
              
              <line x1="-1.2" x2="1.2" y1="0" y2="0" stroke="#a1a1aa" strokeWidth="0.015" />
              <line y1="-1.2" y2="1.2" x1="0" x2="0" stroke="#a1a1aa" strokeWidth="0.015" />

              <polygon
                points={shadowPts.map((p) => `${p.x},${p.y}`).join(" ")}
                className="fill-blue-300/80 stroke-blue-500"
                strokeWidth="0.015"
                strokeLinejoin="round"
              />
            </g>

            {[-1.0, -0.5, 0.0, 0.5, 1.0].map((tick) => (
              <text key={`x-${tick}`} x={tick} y={1.15} fontSize="0.08" textAnchor="middle" fill="#52525b">
                {tick.toFixed(1)}
              </text>
            ))}
            {[-1.0, -0.5, 0.5, 1.0].map((tick) => (
              <text key={`y-${tick}`} x={-1.08} y={-tick + 0.03} fontSize="0.08" textAnchor="end" fill="#52525b">
                {tick.toFixed(1)}
              </text>
            ))}
          </svg>
        </div>

        {/* Calculation Result */}
        <div className="flex justify-between items-center p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Shadow Area</span>
          <span className="tabular-nums font-mono text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {shadowArea.toFixed(4)}
          </span>
        </div>

        {/* Sliders */}
        <div className="flex flex-col gap-5">
          {(["x", "y"] as const).map((axis) => (
            <div key={axis} className="flex flex-col gap-2">
              <label className="flex justify-between text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase">
                <span>{axis}-Axis</span>
                <span className="tabular-nums font-mono">{euler[axis]}°</span>
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={euler[axis]}
                onChange={(e) => handleSlider(axis, Number(e.target.value))}
                className="w-full cursor-pointer accent-zinc-800 dark:accent-zinc-200"
              />
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}