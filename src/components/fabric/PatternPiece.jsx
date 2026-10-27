import React from 'react';
import { getGarmentSvgPath } from '../../utils/garmentGeometry';
import { polygonToSvgPath, transformNormalizedToWorldPolygon } from '../../utils/polygonGeometry';
import { createPieceCuttingProfile } from '../../utils/cuttingSimulator';

// Harmonious atelier palette to avoid synthetic neon primary colors
function getAtelierPatternColor(rawColor) {
  if (!rawColor) return '#3A5A6D';
  const c = String(rawColor).toLowerCase().trim();
  if (c === '#0284c7' || c === '#0ea5e9' || c === '#38bdf8' || c === '#2563eb' || c === '#1d4ed8') {
    return '#3A5A6D'; // Atelier Slate Indigo
  }
  if (c === '#059669' || c === '#10b981' || c === '#16a34a' || c === '#22c55e') {
    return '#2D5A3D'; // Atelier Deep Forest
  }
  if (c === '#d97706' || c === '#f59e0b' || c === '#eab308' || c === '#ea580c') {
    return '#A2593C'; // Atelier Terracotta Ochre
  }
  if (c === '#7c3aed' || c === '#8b5cf6' || c === '#a855f7' || c === '#9333ea') {
    return '#68455B'; // Atelier Heather Plum
  }
  if (c === '#0891b2' || c === '#06b6d4') {
    return '#3B686B'; // Atelier Muted Petrol
  }
  if (c === '#e11d48' || c === '#f43f5e' || c === '#dc2626') {
    return '#8C3D4A'; // Atelier Rosewood
  }
  return rawColor;
}

export function PatternPiece({
  placement,
  scale = 1,
  isSelected = false,
  isHovered = false,
  isColliding = false,
  isDragging = false,
  isInteractiveMode = false,
  showGrainLine = true,
  showLabels = true,
  showDimensions = true,
  simulationStatus = 'ready', // 'ready' | 'pending' | 'active' | 'completed'
  activePieceProgress = 0,
  onClick,
  onPointerDown,
  onRotate,
  onMouseEnter,
  onMouseLeave,
}) {
  const {
    name,
    category,
    x,
    y,
    width,
    height,
    rotation = 0,
    shapeType = 'front-bodice',
    color = '#0284c7',
    outline = null,
    relativePoints = null,
    originalWidth,
    originalHeight
  } = placement;

  const displayColor = getAtelierPatternColor(color);

  // Scaled coordinates
  const sx = x * scale;
  const sy = y * scale;
  const sw = width * scale;
  const sh = height * scale;

  // Unrotated base dimensions
  const is90or270 = rotation === 90 || rotation === 270;
  const origW = originalWidth !== undefined ? originalWidth : (is90or270 ? height : width);
  const origH = originalHeight !== undefined ? originalHeight : (is90or270 ? width : height);
  const w0 = origW * scale;
  const h0 = origH * scale;

  // Determine pathD and shape transformation
  let pathD = '';
  let shapeTransform = '';

  if (relativePoints && Array.isArray(relativePoints) && relativePoints.length >= 3) {
    // Exact polygon vertices already aligned to local [0, width] x [0, height]
    pathD = polygonToSvgPath(relativePoints, scale, scale);
    shapeTransform = '';
  } else if (outline && Array.isArray(outline) && outline.length >= 3) {
    const transform = transformNormalizedToWorldPolygon(outline, origW, origH, rotation, 0, 0);
    pathD = polygonToSvgPath(transform.relativePoints, scale, scale);
    shapeTransform = '';
  } else {
    // Standard parametric garment shape (front-bodice, collar, cuff, pocket, etc.)
    pathD = getGarmentSvgPath(shapeType, w0, h0);
    if (rotation === 90) {
      shapeTransform = `translate(${sw}, 0) rotate(90)`;
    } else if (rotation === 180) {
      shapeTransform = `translate(${sw}, ${sh}) rotate(180)`;
    } else if (rotation === 270) {
      shapeTransform = `translate(0, ${sh}) rotate(270)`;
    } else {
      shapeTransform = '';
    }
  }

  // Transform center for rotation
  const cx = sw / 2;
  const cy = sh / 2;

  const isCutActive = simulationStatus === 'active';
  const isCutCompleted = simulationStatus === 'completed';
  const isCutPending = simulationStatus === 'pending';

  // Compute live cutting path and head position when piece is actively being cut
  let activeCutState = null;
  if (isCutActive) {
    const profile = createPieceCuttingProfile(placement, scale);
    activeCutState = profile.getCutStateAt(activePieceProgress);
  }

  return (
    <g
      transform={`translate(${sx}, ${sy})`}
      className={`${
        isInteractiveMode
          ? isDragging
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : 'cursor-pointer'
      } transition-all duration-75 select-none group ${isDragging ? 'opacity-90' : ''}`}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <g transform={shapeTransform || undefined}>
        {/* Glow shadow when hovered, selected, colliding, or actively cutting */}
        {(isHovered || isSelected || isCutActive || isColliding) && (
          <path
            d={pathD}
            fill="none"
            stroke={
              isColliding
                ? '#ef4444'
                : isSelected
                ? '#143823'
                : isCutActive
                ? '#143823'
                : '#2D5A3D'
            }
            strokeWidth={scale * (isColliding ? 3.5 : isCutActive ? 3 : 2.5)}
            className={`filter drop-shadow-md ${
              isColliding
                ? 'opacity-90 animate-pulse'
                : isCutActive
                ? 'opacity-80 animate-pulse'
                : 'opacity-70'
            }`}
          />
        )}

        {/* Main Pattern Body */}
        <path
          d={pathD}
          fill={isColliding ? '#ef4444' : displayColor}
          fillOpacity={
            isColliding
              ? 0.75
              : isSelected
              ? 0.95
              : isCutActive
              ? 0.88
              : isHovered
              ? 0.85
              : isCutCompleted
              ? 0.78
              : isCutPending
              ? 0.55
              : 0.82
          }
          stroke={
            isColliding
              ? '#dc2626'
              : isSelected
              ? '#143823'
              : isCutCompleted
              ? '#2D5A3D'
              : isCutActive
              ? '#143823'
              : '#1F2E26'
          }
          strokeWidth={Math.max(1, scale * (isColliding ? 0.8 : isCutCompleted || isCutActive ? 0.6 : 0.4))}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Seam Allowance Guideline (dashed inner contour) */}
        <path
          d={pathD}
          transform={`scale(0.92) translate(${w0 * 0.04}, ${h0 * 0.04})`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth={Math.max(0.75, scale * 0.2)}
          strokeDasharray={`${scale * 1.5},${scale * 1.2}`}
        />
      </g>

      {/* Grain Line Indicator */}
      {showGrainLine && sw > 20 && sh > 25 && (
        <g opacity={isCutPending ? 0.4 : 0.65} transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
          <line
            x1={0}
            y1={-Math.min(sh, sw) * 0.25}
            x2={0}
            y2={Math.min(sh, sw) * 0.25}
            stroke="#ffffff"
            strokeWidth={Math.max(1, scale * 0.3)}
            strokeDasharray={`${scale * 2},${scale * 1}`}
          />
          {/* Top arrow */}
          <path
            d={`M ${-scale * 1.2},${-Math.min(sh, sw) * 0.25 + scale * 2} L 0,${-Math.min(sh, sw) * 0.25} L ${scale * 1.2},${-Math.min(sh, sw) * 0.25 + scale * 2}`}
            stroke="#ffffff"
            strokeWidth={Math.max(1, scale * 0.3)}
            fill="none"
          />
          {/* Bottom arrow */}
          <path
            d={`M ${-scale * 1.2},${Math.min(sh, sw) * 0.25 - scale * 2} L 0,${Math.min(sh, sw) * 0.25} L ${scale * 1.2},${Math.min(sh, sw) * 0.25 - scale * 2}`}
            stroke="#ffffff"
            strokeWidth={Math.max(1, scale * 0.3)}
            fill="none"
          />
        </g>
      )}

      {/* Pattern Label and Category */}
      {showLabels && (
        <g transform={`translate(${cx}, ${cy})`} opacity={isCutPending ? 0.6 : 1}>
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
            fontSize={Math.max(8.5, Math.min(13, scale * 3.6))}
            fontWeight="600"
            letterSpacing="0.05em"
            className="pointer-events-none font-sans uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]"
          >
            {category || name}
          </text>
          {showDimensions && sw > 40 && sh > 35 && (
            <text
              y={Math.max(10, scale * 4)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255, 255, 255, 0.9)"
              fontSize={Math.max(6.5, Math.min(9.5, scale * 2.3))}
              fontWeight="500"
              className="pointer-events-none font-sans drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
            >
              {origW}×{origH}cm
            </text>
          )}
        </g>
      )}

      {/* Rotation badge if rotated */}
      {rotation > 0 && sw > 25 && !isInteractiveMode && (
        <g transform={`translate(${sw - scale * 5}, ${scale * 4})`}>
          <circle r={scale * 2.8} fill="rgba(15, 23, 42, 0.75)" />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
            fontSize={Math.max(5, scale * 2)}
            fontWeight="bold"
            className="font-mono"
          >
            {rotation}°
          </text>
        </g>
      )}

      {/* Collision Warning Indicator */}
      {isColliding && (
        <g transform={`translate(${scale * 3}, ${scale * 3})`}>
          <rect
            x={0}
            y={0}
            width={Math.max(48, scale * 16)}
            height={Math.max(16, scale * 5.5)}
            rx={3}
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth="1"
            className="filter drop-shadow-sm animate-pulse"
          />
          <text
            x={Math.max(24, scale * 8)}
            y={Math.max(11, scale * 3.8)}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={Math.max(7, Math.min(10, scale * 2.6))}
            fontWeight="bold"
            fontFamily="monospace"
          >
            ⚠️ OVERLAP
          </text>
        </g>
      )}

      {/* Interactive Rotation Button when selected or hovered */}
      {isInteractiveMode && onRotate && (isSelected || isHovered) && (
        <g
          transform={`translate(${sw - Math.max(10, scale * 4.5)}, ${Math.max(10, scale * 4.5)})`}
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onRotate(placement);
          }}
          title="Click to rotate 90° clockwise (or press 'R')"
        >
          <circle
            r={Math.max(9, scale * 3.5)}
            fill="#1e293b"
            stroke="#ffffff"
            strokeWidth="1.5"
            className="hover:fill-crimson-800 transition-colors shadow-md"
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
            fontSize={Math.max(9, scale * 3.2)}
            fontWeight="bold"
          >
            ↻
          </text>
        </g>
      )}

      {/* Active Laser / Knife Cut Tracing Path */}
      {isCutActive && activeCutState && (
        <g className="active-cut-trace" transform={shapeTransform || undefined}>
          {/* Laser Glow Stroke behind */}
          <path
            d={activeCutState.tracedPath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={Math.max(2.5, scale * 0.9)}
            strokeOpacity={0.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Laser Kerf Cut Line */}
          <path
            d={activeCutState.tracedPath}
            fill="none"
            stroke="#ffffff"
            strokeWidth={Math.max(1.2, scale * 0.45)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Cutting Head / Laser Torch Indicator */}
          {activeCutState.currentPoint && (
            <g transform={`translate(${activeCutState.currentPoint.x}, ${activeCutState.currentPoint.y})`}>
              {/* Outer Laser Pulse */}
              <circle r={Math.max(4.5, scale * 1.8)} fill="#ef4444" opacity={0.4} />
              {/* Mid Core */}
              <circle r={Math.max(2.5, scale * 1.0)} fill="#f43f5e" />
              {/* White Hot Spot */}
              <circle r={Math.max(1.2, scale * 0.5)} fill="#ffffff" />
            </g>
          )}
        </g>
      )}

      {/* Completed Piece Cut Status Ring / Badge */}
      {isCutCompleted && (
        <g className="completed-cut-badge">
          {/* Completed crisp cut perimeter stroke */}
          <path
            d={pathD}
            transform={shapeTransform || undefined}
            fill="none"
            stroke="#10b981"
            strokeWidth={Math.max(1.5, scale * 0.55)}
            strokeDasharray={`${scale * 3},${scale * 1.5}`}
            strokeOpacity={0.9}
          />
          {/* Small completed checkmark badge in corner */}
          {sw > 22 && (
            <g transform={`translate(${scale * 4.5}, ${scale * 4.5})`}>
              <circle r={scale * 2.6} fill="#059669" />
              <path
                d={`M ${-scale * 1.1},0 L ${-scale * 0.2},${scale * 0.9} L ${scale * 1.2},${-scale * 0.7}`}
                fill="none"
                stroke="#ffffff"
                strokeWidth={Math.max(0.8, scale * 0.35)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}
        </g>
      )}
    </g>
  );
}
