"use client";

import React, { useState, useMemo } from "react";

// --- 3D Engine Math & Helpers --- //

const BASE_VERTICES = [
  { x: -1, y: -1, z: -1 }, // 0
  { x: 1, y: -1, z: -1 }, // 1
  { x: 1, y: 1, z: -1 }, // 2
  { x: -1, y: 1, z: -1 }, // 3
  { x: -1, y: -1, z: 1 }, // 4
  { x: 1, y: -1, z: 1 }, // 5
  { x: 1, y: 1, z: 1 }, // 6
  { x: -1, y: 1, z: 1 }, // 7
];

const FACES = [
  [0, 3, 2, 1], // front
  [5, 6, 7, 4], // back
  [4, 7, 3, 0], // left
  [1, 2, 6, 5], // right
  [4, 0, 1, 5], // top
  [3, 7, 6, 2], // bottom
];

// Computes the convex hull for the 2D shadow points using Graham Scan
function getConvexHull(pts: { x: number; y: number }[]) {
  if (pts.length <= 3) return pts;
  const sorted = [...pts].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o: any, a: any, b: any) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  
  const lower = [];
  for (let i = 0; i < sorted.length; i++) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0
    ) {
      lower.pop();
    }
    lower.push(sorted[i]);
  }
  
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0
    ) {
      upper.pop();
    }
    upper.push(sorted[i]);
  }
  
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// Calculates the area of a 2D polygon using the Shoelace Formula
function getPolygonArea(pts: { x: number; y: number }[]) {
  let area = 0;
  const n = pts.length;
  if (n < 3) return 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area / 2);
}

export default function Home() {
  const [rotX, setRotX] = useState(330);
  const [rotY, setRotY] = useState(45);

  const { facesToRender, shadowPointsStr, shadowArea } = useMemo(() => {
    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;
    const cx = Math.cos(radX), sx = Math.sin(radX);
    const cy = Math.cos(radY), sy = Math.sin(radY);

    const SIZE = 80; // Cube half-size
    const FL = 600; // Focal length for perspective

    // 1. Rotate the 3D coordinates
    const rotated = BASE_VERTICES.map((v) => {
      // Rotation around X axis
      const y1 = v.y * cx - v.z * sx;
      const z1 = v.y * sx + v.z * cx;
      // Rotation around Y axis
      const x2 = v.x * cy + z1 * sy;
      const z2 = -v.x * sy + z1 * cy;
      return { x: x2 * SIZE, y: y1 * SIZE, z: z2 * SIZE };
    });

    // 2. Calculate Shadow coordinates mapped onto a virtual 3D floor
    const FLOOR_Y = 160;
    const lightRay = { x: 0.3, y: 1.0, z: -0.2 }; 
    
    const shadow3D = rotated.map((p) => {
      const t = (FLOOR_Y - p.y) / lightRay.y; 
      return {
        x: p.x + t * lightRay.x,
        y: FLOOR_Y,
        z: p.z + t * lightRay.z,
      };
    });

    // 3. Project 3D points to 2D space (Perspective Camera)
    const project = (p: { x: number; y: number; z: number }) => {
      const scale = FL / (FL + p.z);
      return { x: p.x * scale, y: p.y * scale, z: p.z };
    };

    const projCube = rotated.map(project);
    const projShadow = shadow3D.map(project);

    // 4. Trace the outline of the shadow and calculate its area
    const shadowHull = getConvexHull(projShadow);
    const shadowStr = shadowHull.map((p) => `${p.x},${p.y}`).join(" ");
    const area = getPolygonArea(shadowHull);

    // 5. Lighting and Backface Culling for the Cube
    const lightDir = { x: -0.5, y: -0.7, z: -0.8 }; 
    const lLen = Math.sqrt(lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2);
    lightDir.x /= lLen; lightDir.y /= lLen; lightDir.z /= lLen;

    const renderedFaces = [];
    for (let i = 0; i < FACES.length; i++) {
      const indices = FACES[i];
      const p0 = rotated[indices[0]];
      const p1 = rotated[indices[1]];
      const p2 = rotated[indices[2]];

      const v1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
      const v2 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };

      let nx = v1.y * v2.z - v1.z * v2.y;
      let ny = v1.z * v2.x - v1.x * v2.z;
      let nz = v1.x * v2.y - v1.y * v2.x;
      const nLen = Math.sqrt(nx ** 2 + ny ** 2 + nz ** 2);
      nx /= nLen; ny /= nLen; nz /= nLen;

      const cx = indices.reduce((sum, idx) => sum + rotated[idx].x, 0) / 4;
      const cy = indices.reduce((sum, idx) => sum + rotated[idx].y, 0) / 4;
      const cz = indices.reduce((sum, idx) => sum + rotated[idx].z, 0) / 4;

      const viewDot = nx * cx + ny * cy + nz * (cz + FL);

      if (viewDot < 0) {
        const intensity = nx * lightDir.x + ny * lightDir.y + nz * lightDir.z;
        const factor = 0.35 + Math.max(0, intensity) * 0.65;

        const r = Math.round(59 * factor);
        const g = Math.round(130 * factor);
        const b = Math.round(246 * factor);

        const pts = indices.map((idx) => `${projCube[idx].x},${projCube[idx].y}`).join(" ");

        renderedFaces.push({
          id: i,
          points: pts,
          color: `rgb(${r}, ${g}, ${b})`,
          avgZ: cz,
        });
      }
    }

    renderedFaces.sort((a, b) => b.avgZ - a.avgZ);

    return { 
      facesToRender: renderedFaces, 
      shadowPointsStr: shadowStr,
      shadowArea: area
    };
  }, [rotX, rotY]);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-6 sm:p-12">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 bg-white dark:bg-zinc-950 p-8 sm:p-12 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
            Interactive 3D Engine
          </h1>
        </div>

        {/* 3D Render Viewport */}
        <div className="flex flex-col items-center w-full">
          <div className="relative w-full max-w-md aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-inner">
            <svg viewBox="-300 -300 600 600" className="w-full h-full">
              <defs>
                <filter id="shadow-blur">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
              </defs>

              {/* Render Sorted Cube Faces */}
              {facesToRender.map((f) => (
                <polygon
                  key={f.id}
                  points={f.points}
                  fill={f.color}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
          </div>
          
          {/* Shadow Area Readout Display - HIGH CONTRAST UPDATE */}
          <div className="flex justify-between items-center w-full max-w-md mt-4 px-4 py-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Projected Shadow Area</span>
            <span className="tabular-nums font-mono text-base font-bold bg-blue-500 text-white px-3 py-1.5 rounded-md shadow-md">
              {Math.round(shadowArea).toLocaleString()} px²
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col w-full max-w-md gap-6">
          <div className="flex flex-col gap-3">
            <label className="flex justify-between text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <span>X-Axis Rotation (Pitch)</span>
              <span className="tabular-nums font-mono">{rotX}°</span>
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={rotX}
              onChange={(e) => setRotX(Number(e.target.value))}
              className="w-full cursor-pointer accent-blue-500"
            />
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex justify-between text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <span>Y-Axis Rotation (Yaw)</span>
              <span className="tabular-nums font-mono">{rotY}°</span>
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={rotY}
              onChange={(e) => setRotY(Number(e.target.value))}
              className="w-full cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </main>
    </div>
  );
}