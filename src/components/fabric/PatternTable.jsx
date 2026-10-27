import React from 'react';
import { Plus, Trash2, Edit3, RotateCw, Compass } from 'lucide-react';
import { Button } from '../common/Button';
import { getGarmentSvgPath } from '../../utils/garmentGeometry';

export function PatternTable({
  patterns = [],
  onAddPattern,
  onEditPattern,
  onDeletePattern,
  onToggleRotation,
  onUpdateQuantity,
}) {
  return (
    <div className="w-full rounded-xl border border-cream-300 bg-white overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-cream-200 text-left text-sm">
          <thead className="bg-cream-100/90 text-xs font-semibold uppercase tracking-wider text-stone-600 font-mono">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 sm:pl-6">Pattern</th>
              <th scope="col" className="px-3 py-3.5">Width</th>
              <th scope="col" className="px-3 py-3.5">Height</th>
              <th scope="col" className="px-3 py-3.5">Quantity</th>
              <th scope="col" className="px-3 py-3.5">Rotation</th>
              <th scope="col" className="px-3 py-3.5">Grain Constraint</th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200 bg-white">
            {patterns.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-stone-400 text-sm">
                  No pattern pieces added yet. Click "+ Add Pattern" to define garment shapes.
                </td>
              </tr>
            ) : (
              patterns.map((pat) => (
                <tr key={pat.id} className="hover:bg-cream-50/70 transition-colors group">
                  {/* Pattern Name & Mini Silhouette */}
                  <td className="py-3 pl-4 pr-3 sm:pl-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center p-1.5 border border-cream-300 bg-cream-50 shrink-0"
                        style={{ borderColor: pat.color ? `${pat.color}40` : '#e8dfd3' }}
                      >
                        <svg viewBox="0 0 40 40" className="w-full h-full">
                          <path
                            d={getGarmentSvgPath(pat.shapeType || 'front-bodice', 36, 36)}
                            fill={pat.color || '#9e2a2b'}
                            fillOpacity="0.8"
                            stroke="#4a1d1d"
                            strokeWidth="1.5"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-stone-900 flex items-center gap-1.5 flex-wrap">
                          <span>{pat.name}</span>
                          {pat.isImageDerived && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200" title="Contour traced from uploaded image - verify dimensions before production">
                              Image-derived
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono font-medium text-stone-500 uppercase">
                          {pat.category || 'PART'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Width */}
                  <td className="px-3 py-3 font-mono text-stone-700 font-medium">
                    <div>{pat.width} cm</div>
                    {pat.isUncalibrated && (
                      <span className="text-[10px] font-sans text-amber-600 font-normal" title="Proportional estimate without physical scale reference">
                        ~uncalibrated
                      </span>
                    )}
                  </td>

                  {/* Height */}
                  <td className="px-3 py-3 font-mono text-stone-700 font-medium">
                    <div>{pat.height} cm</div>
                    {pat.isUncalibrated && (
                      <span className="text-[10px] font-sans text-amber-600 font-normal" title="Proportional estimate without physical scale reference">
                        ~uncalibrated
                      </span>
                    )}
                  </td>

                  {/* Quantity */}
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center gap-1 bg-cream-100 rounded-md border border-cream-300 p-0.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity && onUpdateQuantity(pat.id, Math.max(1, (Number(pat.quantity) || 1) - 1))}
                        className="w-5 h-5 flex items-center justify-center rounded text-stone-600 hover:text-stone-900 hover:bg-cream-200 text-xs font-bold transition-colors cursor-pointer"
                        title="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-1.5 text-xs font-mono font-bold text-stone-900 min-w-[20px] text-center">
                        {pat.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity && onUpdateQuantity(pat.id, (Number(pat.quantity) || 1) + 1)}
                        className="w-5 h-5 flex items-center justify-center rounded text-stone-600 hover:text-stone-900 hover:bg-cream-200 text-xs font-bold transition-colors cursor-pointer"
                        title="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  {/* Rotation */}
                  <td className="px-3 py-3">
                    <button
                      onClick={() => onToggleRotation && onToggleRotation(pat.id, !pat.rotationAllowed)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer ${
                        pat.rotationAllowed
                          ? 'bg-crimson-50 text-crimson-800 border border-crimson-200 hover:bg-crimson-100'
                          : 'bg-cream-100 text-stone-600 border border-cream-300 hover:bg-cream-200'
                      }`}
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>{pat.rotationAllowed ? 'Allowed (180°)' : 'Locked'}</span>
                    </button>
                  </td>

                  {/* Grain Constraint */}
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-stone-600 bg-cream-100 px-2 py-1 rounded border border-cream-300 font-mono">
                      <Compass className="w-3 h-3 text-stone-400" />
                      {pat.grainConstraint || 'Vertical'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 pl-3 pr-4 sm:pr-6 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => onEditPattern && onEditPattern(pat)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-cream-200 transition-colors cursor-pointer"
                        title="Edit Pattern"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeletePattern && onDeletePattern(pat.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-crimson-700 hover:bg-crimson-50 transition-colors cursor-pointer"
                        title="Delete Pattern"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
