import React, { useState } from 'react';
import { Modal } from '../common/FeedbackAndNavigation';
import { Button } from '../common/Button';
import { Input, Select, Toggle } from '../common/FormControls';
import { patternPresets } from '../../data/mockProjects';
import { getGarmentSvgPath } from '../../utils/garmentGeometry';
import { polygonToSvgPath } from '../../utils/polygonGeometry';

export function PatternFormModal({
  isOpen,
  onClose,
  onSave,
  initialPattern = null,
}) {
  const [formData, setFormData] = useState(() => ({
    name: initialPattern?.name || 'Front Bodice',
    category: initialPattern?.category || 'FRONT',
    shapeType: initialPattern?.shapeType || 'front-bodice',
    width: initialPattern?.width || 40,
    height: initialPattern?.height || 60,
    quantity: initialPattern?.quantity || 10,
    rotationAllowed: initialPattern?.rotationAllowed !== undefined ? initialPattern.rotationAllowed : true,
    grainConstraint: initialPattern?.grainConstraint || 'Vertical',
    color: initialPattern?.color || '#0284c7',
    outline: initialPattern?.outline || null,
    normalizedCoordinates: initialPattern?.normalizedCoordinates || initialPattern?.outline || null
  }));

  const [prevPatternId, setPrevPatternId] = useState(initialPattern?.id || null);

  // Sync state if editing a different pattern piece when modal re-opens
  if (initialPattern && initialPattern.id !== prevPatternId) {
    setPrevPatternId(initialPattern.id);
    setFormData({
      name: initialPattern.name || '',
      category: initialPattern.category || 'FRONT',
      shapeType: initialPattern.shapeType || 'front-bodice',
      width: initialPattern.width || 40,
      height: initialPattern.height || 60,
      quantity: initialPattern.quantity || 1,
      rotationAllowed: initialPattern.rotationAllowed !== undefined ? initialPattern.rotationAllowed : true,
      grainConstraint: initialPattern.grainConstraint || 'Vertical',
      color: initialPattern.color || '#0284c7',
      outline: initialPattern.outline || null,
      normalizedCoordinates: initialPattern.normalizedCoordinates || initialPattern.outline || null
    });
  } else if (!initialPattern && prevPatternId !== null) {
    setPrevPatternId(null);
    setFormData({
      name: 'Front Bodice',
      category: 'FRONT',
      shapeType: 'front-bodice',
      width: 40,
      height: 60,
      quantity: 10,
      rotationAllowed: true,
      grainConstraint: 'Vertical',
      color: '#0284c7',
      outline: null,
      normalizedCoordinates: null
    });
  }

  const handleSelectPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      category: preset.category,
      shapeType: preset.shapeType,
      width: preset.width,
      height: preset.height,
      grainConstraint: preset.grainConstraint,
      color: preset.color,
      outline: null,
      normalizedCoordinates: null
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    onSave(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialPattern ? 'Edit Pattern Piece' : 'Add Cutting Pattern'}
      subtitle="Define dimensions, orientation limits, and cutting quantity"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Preset quick buttons */}
        {!initialPattern && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Garment Presets
            </label>
            <div className="grid grid-cols-5 gap-2">
              {patternPresets.map((preset) => {
                const isSelected = formData.shapeType === preset.shapeType;
                return (
                  <button
                    key={preset.shapeType}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex flex-col items-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-crimson-700 bg-crimson-50/70 shadow-2xs ring-1 ring-crimson-700'
                        : 'border-cream-300 hover:border-cream-400 hover:bg-cream-100'
                    }`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center mb-1">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path
                          d={getGarmentSvgPath(preset.shapeType, 32, 32)}
                          fill={preset.color}
                          fillOpacity="0.75"
                          stroke="#334155"
                          strokeWidth="1.2"
                        />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-stone-700 truncate w-full">
                      {preset.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Pattern Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Front Bodice S/M"
            required
          />

          <Select
            label="Garment Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={[
              { value: 'FRONT', label: 'Front Bodice / Panel' },
              { value: 'BACK', label: 'Back Bodice / Panel' },
              { value: 'SLEEVE', label: 'Sleeve' },
              { value: 'COLLAR', label: 'Collar Band / Neckband' },
              { value: 'WAISTBAND', label: 'Waistband' },
              { value: 'POCKET', label: 'Pocket / Flap' },
              { value: 'CUFF', label: 'Cuff / Hem' },
              { value: 'SKIRT', label: 'Skirt / Flared Panel' },
              { value: 'OTHER', label: 'Other Piece' }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
          <Input
            label="Width"
            type="number"
            min="1"
            max="300"
            unit="cm"
            value={formData.width}
            onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
            required
          />

          <Input
            label="Height"
            type="number"
            min="1"
            max="500"
            unit="cm"
            value={formData.height}
            onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
            required
          />

          <Input
            label="Quantity"
            type="number"
            min="1"
            max="1000"
            unit="pcs"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Grain Direction Constraint"
            value={formData.grainConstraint}
            onChange={(e) => setFormData({ ...formData, grainConstraint: e.target.value })}
            options={[
              { value: 'Vertical', label: 'Vertical (Lengthwise)' },
              { value: 'Horizontal', label: 'Horizontal (Crosswise)' },
              { value: 'Bias (45°)', label: 'Bias (45° Angle)' },
              { value: 'Flexible', label: 'Flexible / Any Angle' }
            ]}
            hint="Pattern will maintain alignment with warp grain"
          />

          <div className="pt-2">
            <Toggle
              label="Rotation Allowed"
              description="Permit 180° rotation for tighter nesting"
              checked={formData.rotationAllowed}
              onChange={(checked) => setFormData({ ...formData, rotationAllowed: checked })}
            />
          </div>
        </div>

        {/* Live Mini Preview Box */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-stone-100/70 border border-stone-200 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded border border-stone-300 p-1 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <path
                  d={
                    formData.shapeType === 'irregular' && Array.isArray(formData.outline) && formData.outline.length >= 3
                      ? polygonToSvgPath(formData.outline, 32, 32)
                      : getGarmentSvgPath(formData.shapeType, 32, 32)
                  }
                  fill={formData.color}
                  fillOpacity="0.8"
                  stroke="#334155"
                  strokeWidth="1.2"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-stone-900">{formData.name || 'Untitled Pattern'}</p>
              <p className="text-stone-500 font-mono">
                {formData.width} × {formData.height} cm • Single Area: {((formData.width * formData.height) / 10000).toFixed(3)} m²
              </p>
            </div>
          </div>
          <span className="font-bold font-mono text-stone-800 bg-white px-2.5 py-1 rounded border border-stone-200">
            Total Area: {(((formData.width * formData.height * formData.quantity) / 10000)).toFixed(2)} m²
          </span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {initialPattern ? 'Save Changes' : 'Add Pattern Piece'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
