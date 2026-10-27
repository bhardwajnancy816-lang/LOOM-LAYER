import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Scissors, 
  Layers, 
  Sparkles, 
  Leaf, 
  Search, 
  Bookmark, 
  BookmarkCheck, 
  Printer, 
  Trash2, 
  Check, 
  ChevronRight, 
  LayoutDashboard, 
  FolderPlus, 
  FileText, 
  Settings, 
  Clock, 
  ShoppingBag, 
  Maximize2, 
  Square, 
  Recycle, 
  X,
  Tag
} from 'lucide-react';
import { 
  SCRAP_SHAPES, 
  FABRIC_TYPES, 
  SCRAP_SAMPLE_PRESETS, 
  evaluateScrapRecommendations 
} from '../utils/rethreadCatalog';

const SAVED_PLANS_KEY = 'rethread_saved_plans_v1';

export function ReThreadPage() {
  // Scrap Form Inputs matching reference default (Cotton Cut-offs: 24 x 36 cm, 35 pcs)
  const [scrapInput, setScrapInput] = useState({
    width: 24,
    length: 36,
    quantity: 35,
    fabricType: 'Cotton',
    shapeType: 'rectangular'
  });

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePresetName, setActivePresetName] = useState('Cotton Cut-offs');
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [savedPlans, setSavedPlans] = useState(() => {
    try {
      const stored = localStorage.getItem(SAVED_PLANS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist saved plans
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(savedPlans));
    } catch (e) {
      console.error('Failed to save ReThread plans to localStorage', e);
    }
  }, [savedPlans]);

  // Compute live deterministic recommendations
  const evaluation = useMemo(() => {
    return evaluateScrapRecommendations(scrapInput);
  }, [scrapInput]);

  // Filter recommendations by category & search query
  const filteredRecommendations = useMemo(() => {
    let list = evaluation.recommendations;
    if (activeCategory !== 'All') {
      list = list.filter((r) => r.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [evaluation.recommendations, activeCategory, searchQuery]);

  const categoryChips = [
    'All',
    'Accessories',
    'Bags & Storage',
    'Home & Kitchen',
    'Garment Findings',
    'Pet Products'
  ];

  const handleApplyPreset = (preset) => {
    setActivePresetName(preset.name);
    setScrapInput({
      width: preset.width,
      length: preset.length,
      quantity: preset.quantity,
      fabricType: preset.fabricType,
      shapeType: preset.shapeType
    });
  };

  const handleClearAll = () => {
    setActivePresetName('');
    setScrapInput({
      width: 0,
      length: 0,
      quantity: 0,
      fabricType: 'Cotton',
      shapeType: 'rectangular'
    });
  };

  const handleToggleSavePlan = (product) => {
    const isAlreadySaved = savedPlans.some(
      (p) =>
        p.productId === product.id &&
        p.scrapSpecs.width === scrapInput.width &&
        p.scrapSpecs.length === scrapInput.length &&
        p.scrapSpecs.quantity === scrapInput.quantity
    );

    if (isAlreadySaved) {
      setSavedPlans((prev) =>
        prev.filter(
          (p) =>
            !(
              p.productId === product.id &&
              p.scrapSpecs.width === scrapInput.width &&
              p.scrapSpecs.length === scrapInput.length &&
              p.scrapSpecs.quantity === scrapInput.quantity
            )
        )
      );
    } else {
      const newPlan = {
        id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        savedAt: new Date().toISOString(),
        productId: product.id,
        productName: product.name,
        category: product.category,
        estimatedUnits: product.estimatedUnits,
        difficulty: product.difficulty,
        hardwareNeeded: product.hardwareNeeded,
        formulaExplanation: product.formulaExplanation,
        displaySpec: product.displaySpec,
        scrapSpecs: { ...scrapInput },
        totalScrapAreaM2: evaluation.totalScrapAreaM2
      };
      setSavedPlans((prev) => [newPlan, ...prev]);
    }
  };

  const handleRemoveSavedPlan = (planId) => {
    setSavedPlans((prev) => prev.filter((p) => p.id !== planId));
  };

  const handlePrintPlan = (plan) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ReThread Cutting Ticket — ${plan.productName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; margin: 36px; color: #1e293b; line-height: 1.4; }
            h1 { font-size: 18px; margin-bottom: 2px; color: #143823; }
            .subtitle { font-size: 11px; color: #64748b; margin-bottom: 20px; font-mono; }
            .section { margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #e2ebe2; color: #143823; font-size: 11px; font-weight: bold; }
            .disclaimer { font-size: 10px; color: #94a3b8; margin-top: 24px; font-style: italic; }
          </style>
        </head>
        <body>
          <h1>Loom & Layer — ReThread Circular Upcycling Ticket</h1>
          <div class="subtitle">Cutting Room Remnant Spec • Issued on ${new Date().toLocaleDateString()}</div>
          
          <div class="section">
            <strong>Target Product:</strong> ${plan.productName} <span class="badge">${plan.category}</span><br>
            <strong>Estimated Producible Yield:</strong> ~${plan.estimatedUnits} units<br>
            <strong>Difficulty Level:</strong> ${plan.difficulty}<br>
            <strong>Hardware / Findings Required:</strong> ${plan.hardwareNeeded || 'None'}
          </div>

          <div class="section">
            <strong>Source Scrap Batch Specifications:</strong>
            <div class="grid" style="margin-top: 6px;">
              <div>• Scrap Dimensions: ${plan.scrapSpecs.width} × ${plan.scrapSpecs.length} cm</div>
              <div>• Available Quantity: ${plan.scrapSpecs.quantity} pieces</div>
              <div>• Fabric Category: ${plan.scrapSpecs.fabricType}</div>
              <div>• Offcut Geometry: ${plan.scrapSpecs.shapeType}</div>
            </div>
          </div>

          <div class="section">
            <strong>Production Logic:</strong>
            <p style="font-size: 11px; line-height: 1.5; color: #334155;">${plan.formulaExplanation}</p>
          </div>

          <div class="disclaimer">
            * Deterministic production estimate based on nominal scrap surface area and standard seam allowances (0.5–1.0 cm). Actual output depends on grainline consistency and factory cutting tolerances.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const isSavedForCurrentSpecs = (prodId) => {
    return savedPlans.some(
      (p) =>
        p.productId === prodId &&
        p.scrapSpecs.width === scrapInput.width &&
        p.scrapSpecs.length === scrapInput.length &&
        p.scrapSpecs.quantity === scrapInput.quantity
    );
  };

  return (
    <div className="space-y-5">
          
          {/* ========================================================
              B. TOP HERO SECTION
              ======================================================== */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left Hero Title & Description */}
            <div className="flex items-center gap-4">
              {/* Circular Atelier Emblem Badge */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-[#D5DFD5] shadow-xs shrink-0 bg-white">
                <img
                  src="/rethread/rethread_hero_badge.jpg"
                  alt="ReThread Atelier"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>

              <div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#143823] tracking-tight leading-none">
                  ReThread
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-[#1F3324] mt-1">
                  Transform leftover fabric into useful, beautiful products.
                </p>
                <p className="text-[11px] sm:text-xs text-[#5C665F] mt-0.5">
                  Reduce textile waste by upcycling your cutting-room offcuts.
                </p>
              </div>
            </div>

            {/* Right Hero Banner: Patchwork Photo + Deep Green Card */}
            <div className="h-22 sm:h-24 lg:w-[420px] rounded-2xl overflow-hidden border border-[#E5DFD4] flex shadow-xs shrink-0">
              {/* Patchwork Quilt Photo */}
              <div className="w-1/2 h-full bg-stone-200 overflow-hidden relative">
                <img
                  src="/rethread/rethread_hero_patchwork.jpg"
                  alt="Patchwork textile"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Forest Green Editorial Message */}
              <div className="w-1/2 h-full bg-[#143823] p-3 sm:p-3.5 flex flex-col justify-center text-white relative">
                <h3 className="font-serif text-sm sm:text-base font-bold text-cream-100 leading-tight">
                  Same Fabric. <br />
                  New Stories.
                </h3>
                <div className="flex items-center gap-1 text-[10px] text-[#A6C5AE] mt-1.5 font-sans">
                  <Leaf className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">From scraps to something special.</span>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================
              C. MAIN TWO-COLUMN LAYOUT
              Left Panel: 34% (col-span-4), Right Panel: 66% (col-span-8)
              ======================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* ========================================================
                D. LEFT PANEL — LEFTOVER SCRAP SPECIFICATIONS (~34%)
                ======================================================== */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 sm:p-5 shadow-2xs space-y-4">
                
                {/* 1. Title & Explanatory Subtitle */}
                <div className="pb-3 border-b border-[#F0EBE1]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#FBF0EE] text-[#8E2A2A] flex items-center justify-center">
                        <Scissors className="w-3.5 h-3.5 -rotate-45" />
                      </div>
                      <h2 className="font-serif text-base font-bold text-[#16281C]">
                        1. Leftover Scrap Specifications
                      </h2>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </div>
                  <p className="text-xs text-[#626D64] mt-1 leading-normal">
                    Enter the measurements from your cutting table to get product recommendations.
                  </p>
                </div>

                {/* 2. Quick Presets (Example Offcuts) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-800">
                      Quick Presets (Example Offcuts)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(SCRAP_SAMPLE_PRESETS[1])}
                      className="text-stone-500 hover:text-stone-900 transition-colors text-[11px]"
                    >
                      View All
                    </button>
                  </div>

                  {/* 4 Compact Preset Cards in a row */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {SCRAP_SAMPLE_PRESETS.map((preset) => {
                      const isSelected = activePresetName === preset.name;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className={`p-1.5 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                            isSelected
                              ? 'border-2 border-[#1E4D2B] bg-[#F4F8F4] shadow-2xs'
                              : 'border-[#EAE3D6] bg-white hover:bg-[#FAF7F2]'
                          }`}
                        >
                          <div className="w-full h-10 sm:h-12 rounded-lg overflow-hidden bg-stone-100">
                            <img
                              src={preset.image}
                              alt={preset.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="mt-1 min-w-0">
                            <div className="font-bold text-[9.5px] sm:text-[10px] text-stone-900 leading-tight">
                              {preset.name}
                            </div>
                            <div className="text-[8.5px] sm:text-[9px] font-mono text-stone-500 whitespace-nowrap">
                              {preset.width} × {preset.length} cm
                            </div>
                            <div className="text-[8.5px] sm:text-[9px] font-mono text-stone-400">
                              {preset.quantity} pcs
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Enter Scrap Details */}
                <div className="space-y-2 pt-2 border-t border-[#F0EBE1]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-800">
                      Enter Scrap Details
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-stone-500 hover:text-stone-900 transition-colors text-[11px]"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* 3 Aligned Inputs */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Width */}
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1 font-sans">
                        Scrap Width (cm)
                      </label>
                      <div className="bg-white border border-[#DDD5C7] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 focus-within:border-[#1E4D2B] focus-within:ring-1 focus-within:ring-[#1E4D2B]">
                        <Square className="w-3 h-3 text-stone-400 shrink-0" />
                        <input
                          type="number"
                          min="1"
                          step="0.5"
                          value={scrapInput.width || ''}
                          onChange={(e) => {
                            setActivePresetName('');
                            setScrapInput({
                              ...scrapInput,
                              width: Math.max(0, Number(e.target.value) || 0)
                            });
                          }}
                          className="w-full text-xs font-mono font-bold text-stone-900 bg-transparent outline-none"
                        />
                      </div>
                    </div>

                    {/* Length */}
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1 font-sans">
                        Scrap Length (cm)
                      </label>
                      <div className="bg-white border border-[#DDD5C7] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 focus-within:border-[#1E4D2B] focus-within:ring-1 focus-within:ring-[#1E4D2B]">
                        <Maximize2 className="w-3 h-3 text-stone-400 shrink-0" />
                        <input
                          type="number"
                          min="1"
                          step="0.5"
                          value={scrapInput.length || ''}
                          onChange={(e) => {
                            setActivePresetName('');
                            setScrapInput({
                              ...scrapInput,
                              length: Math.max(0, Number(e.target.value) || 0)
                            });
                          }}
                          className="w-full text-xs font-mono font-bold text-stone-900 bg-transparent outline-none"
                        />
                      </div>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-1 font-sans">
                        Piece Quantity
                      </label>
                      <div className="bg-white border border-[#DDD5C7] rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 focus-within:border-[#1E4D2B] focus-within:ring-1 focus-within:ring-[#1E4D2B]">
                        <Layers className="w-3 h-3 text-stone-400 shrink-0" />
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={scrapInput.quantity || ''}
                          onChange={(e) => {
                            setActivePresetName('');
                            setScrapInput({
                              ...scrapInput,
                              quantity: Math.max(0, parseInt(e.target.value, 10) || 0)
                            });
                          }}
                          className="w-full text-xs font-mono font-bold text-stone-900 bg-transparent outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Fabric Type (Optional) */}
                <div className="space-y-1.5 pt-2 border-t border-[#F0EBE1]">
                  <span className="text-xs font-medium text-stone-800 block">
                    Fabric Type (Optional)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Cotton', 'Denim', 'Linen', 'Jersey', 'Mixed'].map((fabric) => {
                      const isSelected = scrapInput.fabricType === fabric;
                      return (
                        <button
                          key={fabric}
                          type="button"
                          onClick={() => setScrapInput({ ...scrapInput, fabricType: fabric })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                            isSelected
                              ? 'bg-[#143823] text-white border-[#143823] shadow-2xs font-semibold'
                              : 'bg-white hover:bg-[#F8F5EE] border-[#DDD5C7] text-stone-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-cream-100" />}
                          {!isSelected && <Tag className="w-3 h-3 text-stone-400" />}
                          <span>{fabric}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Forest Green Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('recommendations-grid');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#143823] hover:bg-[#1A452B] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Scissors className="w-4 h-4 -rotate-45 text-[#A6C5AE]" />
                  <span>Find Matching Products →</span>
                </button>

                {/* 6. Soft Sage-Green Informational Callout */}
                <div className="rounded-xl bg-[#E5EFE6] border border-[#D2E4D4] p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#D4E7D7] flex items-center justify-center text-[#143823] shrink-0">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-[#143823]">
                      You're giving fabric a second life!
                    </div>
                    <div className="text-[11px] text-[#415947] font-mono mt-0.5">
                      Estimated scrap area: {evaluation.totalScrapAreaCm2.toLocaleString()} cm² ({(evaluation.totalScrapAreaCm2 / 10000).toFixed(2)} m²)
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ========================================================
                E. RIGHT PANEL — CIRCULAR PRODUCT RECOMMENDATIONS (~66%)
                ======================================================== */}
            <div id="recommendations-grid" className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 sm:p-5 shadow-2xs space-y-4">
                
                {/* Section Header: Leaf Icon, Title, Subtitle, Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EBE1]">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#E5EFE6] text-[#143823] flex items-center justify-center">
                        <Leaf className="w-3.5 h-3.5" />
                      </div>
                      <h2 className="font-serif text-base font-bold text-[#16281C]">
                        2. Circular Product Recommendations
                      </h2>
                    </div>
                    <p className="text-xs text-[#5A665D] mt-0.5">
                      7 product ideas match this {scrapInput.fabricType} scrap batch.
                    </p>
                  </div>

                  {/* Search Input Field */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search product..."
                      className="w-full sm:w-56 bg-white border border-[#DDD5C7] rounded-full pl-3.5 pr-8 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#143823]"
                    />
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Category Filter Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {categoryChips.map((cat) => {
                    const isSelected = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#143823] text-white font-medium shadow-2xs'
                            : 'bg-[#F5F2EB] hover:bg-[#EFEAE0] text-stone-700 border border-[#E5DFD4]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* 3-Column Product Cards Grid on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredRecommendations.slice(0, activeCategory === 'All' && !searchQuery ? 6 : filteredRecommendations.length).map((prod) => {
                    const isSaved = isSavedForCurrentSpecs(prod.id);
                    const isFeasible = prod.estimatedUnits > 0;

                    return (
                      <div
                        key={prod.id}
                        className="bg-white rounded-xl border border-[#E8E2D6] hover:border-[#D5CDC0] hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between group"
                      >
                        {/* Product Image Section with Badges */}
                        <div className="h-36 w-full relative bg-[#FAF6F0] overflow-hidden">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src = '/rethread/rethread_cup_sleeve.jpg';
                            }}
                          />

                          {/* Best Match Badge */}
                          {prod.isBestMatch && (
                            <span className="absolute top-2.5 right-10 bg-[#176B39] text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-2xs">
                              Best Match
                            </span>
                          )}

                          {/* Bookmark Save Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleSavePlan(prod)}
                            title={isSaved ? 'Remove from saved plans' : 'Save plan'}
                            className="absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white/90 backdrop-blur-xs text-stone-700 hover:text-[#143823] shadow-2xs transition-colors cursor-pointer"
                          >
                            {isSaved ? (
                              <BookmarkCheck className="w-3.5 h-3.5 text-[#143823]" />
                            ) : (
                              <Bookmark className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Product Details Section */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                          
                          <div>
                            {/* Product Name (Full Title visible) */}
                            <h3 className="font-bold text-xs sm:text-[13px] text-[#16281C] leading-snug line-clamp-2 min-h-[2.4em]">
                              {prod.name}
                            </h3>

                            {/* Category & Difficulty Badges */}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="bg-[#F3EFE7] text-[#635B50] text-[10px] px-2 py-0.5 rounded font-medium">
                                {prod.category}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                  prod.difficulty === 'Easy'
                                    ? 'bg-[#E6F3E8] text-[#1F6E35]'
                                    : 'bg-[#FFF2E0] text-[#A65B15]'
                                }`}
                              >
                                {prod.difficulty}
                              </span>
                            </div>
                          </div>

                          {/* 3 Metric Specs Row */}
                          <div className="grid grid-cols-3 gap-0.5 pt-2 border-t border-[#F0EBE0] text-[10.5px] font-mono text-stone-700 items-center text-center">
                            {/* Producible Yield */}
                            <div className="flex flex-col items-center justify-center">
                              <span className="flex items-center gap-1 font-bold text-stone-900 text-xs">
                                <ShoppingBag className="w-3 h-3 text-stone-400 shrink-0" />
                                <span>~{isFeasible ? prod.estimatedUnits : 0}</span>
                              </span>
                              <span className="text-[9px] text-stone-400 font-sans">
                                {prod.unitLabel || 'units'}
                              </span>
                            </div>

                            {/* Sewing Time */}
                            <div className="flex flex-col items-center justify-center border-x border-[#F0EBE0]/60 px-0.5">
                              <span className="flex items-center gap-1 font-bold text-stone-900 text-xs">
                                <Scissors className="w-2.5 h-2.5 -rotate-45 text-stone-400 shrink-0" />
                                <span>~{prod.estimatedSewTimeMin}m</span>
                              </span>
                              <span className="text-[9px] text-stone-400 font-sans">
                                sewing time
                              </span>
                            </div>

                            {/* Dimensions */}
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-bold text-stone-900 text-[10.5px] leading-tight">
                                {prod.minPieceWidth}×{prod.minPieceLength} cm
                              </span>
                              <span className="text-[9px] text-stone-400 font-sans">
                                ({prod.piecesPerUnit} {prod.piecesPerUnit > 1 ? 'pcs' : 'pc'})
                              </span>
                            </div>
                          </div>

                          {/* View Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedProductModal(prod)}
                            className="w-full pt-2 border-t border-[#F0EBE0] text-center text-xs font-semibold text-stone-800 hover:text-[#143823] transition-colors py-0.5 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>View Details →</span>
                          </button>

                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

          </div>

          {/* ========================================================
              G. BOTTOM IMPACT & UTILIZATION SUMMARY
              ======================================================== */}
          <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 sm:p-5 shadow-2xs space-y-3">
            <h3 className="font-serif text-sm sm:text-base font-bold text-[#16281C]">
              Impact & Utilization Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
              
              {/* Metric 1: Circular Gauge Potential Scrap Utilization */}
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#E5ECE5]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#1E6B38]"
                      strokeDasharray={`${evaluation.potentialScrapUtilization}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute font-serif text-xs font-bold text-[#143823]">
                    {evaluation.potentialScrapUtilization}%
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-xs text-stone-800">
                    Potential Scrap
                  </div>
                  <div className="text-xs text-stone-600">
                    Utilization
                  </div>
                </div>
              </div>

              {/* Metric 2: Estimated Products */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F6EBEB] text-[#8E2A2A] flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-mono text-sm sm:text-base font-bold text-stone-900 leading-tight">
                    ~{scrapInput.quantity || 35}
                  </div>
                  <div className="text-[11px] text-stone-500 font-sans">
                    Products (example)
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    From {scrapInput.quantity} scrap pieces
                  </div>
                </div>
              </div>

              {/* Metric 3: Fabric Area Used */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E5EFE6] text-[#143823] flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-mono text-sm sm:text-base font-bold text-stone-900 leading-tight">
                    ~{(evaluation.totalScrapAreaCm2 / 10000).toFixed(2)} m²
                  </div>
                  <div className="text-[11px] text-stone-500 font-sans">
                    Fabric Area Used
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    {evaluation.totalScrapAreaCm2.toLocaleString()} cm²
                  </div>
                </div>
              </div>

              {/* Metric 4: Textile Waste Diverted */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E5EFE6] text-[#1E6B38] flex items-center justify-center shrink-0">
                  <Recycle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-mono text-sm sm:text-base font-bold text-stone-900 leading-tight">
                    ~{evaluation.textileWasteDivertedKg.toFixed(2)} kg
                  </div>
                  <div className="text-[11px] text-stone-500 font-sans">
                    Textile Waste Diverted
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    Estimated ({scrapInput.fabricType})
                  </div>
                </div>
              </div>

              {/* Metric 5: Botanical Decorative Message */}
              <div className="rounded-xl bg-[#E6F1E6] border border-[#D5E6D7] p-3 flex items-center justify-between col-span-1 sm:col-span-2 lg:col-span-1 relative overflow-hidden">
                <div className="relative z-10 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#143823]">
                    <Leaf className="w-3.5 h-3.5 text-[#1E6B38]" />
                    <span>Small scraps.</span>
                  </div>
                  <div className="font-bold text-xs text-[#143823]">
                    Big impact.
                  </div>
                  <div className="text-[10px] font-mono text-[#556A58] pt-1">
                    Reduce. Reuse. Reimagine.
                  </div>
                </div>

                {/* Botanical foliage line art */}
                <svg
                  className="w-16 h-16 text-[#C2DEC5] shrink-0 pointer-events-none"
                  viewBox="0 0 60 60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 55 Q 30 40 50 10" />
                  <path d="M20 46 C 26 38 32 40 38 48 C 30 48 24 48 20 46 Z" fill="currentColor" opacity="0.3" />
                  <path d="M35 32 C 40 24 48 26 52 34 C 44 34 38 34 35 32 Z" fill="currentColor" opacity="0.3" />
                </svg>
              </div>

            </div>
          </div>

          {/* ========================================================
              SAVED PLANS CUTTING TICKETS DRAWER / SECTION
              ======================================================== */}
          {savedPlans.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F0EBE0]">
                <div className="flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-[#143823]" />
                  <h3 className="font-serif text-sm sm:text-base font-bold text-[#16281C]">
                    Saved Cutting Tickets ({savedPlans.length})
                  </h3>
                </div>
                <span className="text-xs font-mono text-stone-500">
                  Ready for workshop production
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {savedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EAE3D6] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-stone-900 truncate">
                        {plan.productName}
                      </div>
                      <div className="text-[11px] font-mono text-stone-500 mt-0.5">
                        ~{plan.estimatedUnits} units from {plan.scrapSpecs.quantity} scraps ({plan.scrapSpecs.width}×{plan.scrapSpecs.length} cm {plan.scrapSpecs.fabricType})
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePrintPlan(plan)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-white hover:bg-cream-100 text-stone-800 border border-[#DDD5C7] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Printer className="w-3 h-3 text-[#143823]" />
                        <span>Print</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSavedPlan(plan.id)}
                        className="p-1 rounded text-stone-400 hover:text-rose-700 transition-colors cursor-pointer"
                        title="Remove plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


      {/* ========================================================
          PRODUCT DETAIL MODAL
          ======================================================== */}
      {/* ========================================================
          PRODUCT DETAIL MODAL (Matching Reference Screen 9)
          ======================================================== */}
      {selectedProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8E2D6] max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            
            {/* Top Navigation & Close */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE0]">
              <button
                type="button"
                onClick={() => setSelectedProductModal(null)}
                className="text-xs font-semibold text-[#143823] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>← Back to Recommendations</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedProductModal(null)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Two Column Layout matching Screen 9 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              
              {/* Left Column: Product Photo & Gallery */}
              <div className="space-y-3">
                <div className="h-52 sm:h-60 rounded-xl overflow-hidden bg-stone-100 border border-[#E8E2D6]">
                  <img
                    src={selectedProductModal.image}
                    alt={selectedProductModal.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/rethread/rethread_hero_patchwork.jpg";
                    }}
                  />
                </div>

                {/* Thumbnail Gallery Strip */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    selectedProductModal.image,
                    '/rethread/rethread_scrunchies.jpg',
                    '/rethread/rethread_patchwork_bandana.jpg',
                    '/rethread/rethread_mini_pouch.jpg'
                  ].map((imgSrc, idx) => (
                    <div
                      key={idx}
                      className="w-12 h-12 rounded-lg overflow-hidden border border-[#DDD5C7] shrink-0 bg-stone-50"
                    >
                      <img
                        src={imgSrc}
                        alt="Gallery preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Title, Badges, Metrics & Materials */}
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-[#143823]">
                      {selectedProductModal.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleToggleSavePlan(selectedProductModal)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isSavedForCurrentSpecs(selectedProductModal.id)
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : 'border-[#DDD5C7] text-stone-400 hover:text-rose-700'
                      }`}
                      title="Save item"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Chips: Category & Difficulty */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E5EFE6] text-[#143823] border border-[#CCDCCD]">
                      {selectedProductModal.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3E6] text-[#D97706] border border-[#FDE3C2]">
                      {selectedProductModal.difficulty}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#5C665F] leading-relaxed">
                  {selectedProductModal.description}
                </p>

                {/* 3 Metric Pills */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <span className="text-[10px] text-[#7C857E] block">Producible</span>
                    <strong className="text-[#143823] font-mono text-xs">
                      ~{selectedProductModal.estimatedUnits} units
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <span className="text-[10px] text-[#7C857E] block">Sewing</span>
                    <strong className="text-stone-800 font-mono text-xs">
                      ~{selectedProductModal.estimatedSewTimeMin} min
                    </strong>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <span className="text-[10px] text-[#7C857E] block">Scrap Min</span>
                    <strong className="text-stone-800 font-mono text-xs">
                      {selectedProductModal.minPieceWidth}×{selectedProductModal.minPieceLength}cm
                    </strong>
                  </div>
                </div>

                {/* Materials & Findings Strip */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-stone-800 block">
                    Materials & Findings:
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#DDD5C7] text-stone-700">
                      Fabric Scraps ({selectedProductModal.minPieceWidth}×{selectedProductModal.minPieceLength} cm)
                    </span>
                    {selectedProductModal.hardwareNeeded && (
                      <span className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#DDD5C7] text-stone-700">
                        {selectedProductModal.hardwareNeeded}
                      </span>
                    )}
                    <span className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#DDD5C7] text-stone-700">
                      Thread
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#DDD5C7] text-stone-700">
                      Optional Lining
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#F0EBE0]">
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleSavePlan(selectedProductModal);
                      setSelectedProductModal(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isSavedForCurrentSpecs(selectedProductModal.id)
                        ? 'bg-[#E5EFE6] text-[#143823] border border-[#CCDCCD]'
                        : 'bg-[#143823] text-white hover:bg-[#1A452B]'
                    }`}
                  >
                    {isSavedForCurrentSpecs(selectedProductModal.id) ? 'Saved to Plan' : 'Add to Plan →'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handlePrintPlan({
                        productName: selectedProductModal.name,
                        category: selectedProductModal.category,
                        estimatedUnits: selectedProductModal.estimatedUnits,
                        difficulty: selectedProductModal.difficulty,
                        hardwareNeeded: selectedProductModal.hardwareNeeded,
                        formulaExplanation: selectedProductModal.formulaExplanation,
                        scrapSpecs: { ...scrapInput }
                      });
                    }}
                    className="p-2 rounded-xl text-stone-700 bg-white border border-[#DDD5C7] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                    title="Print Cutting Ticket"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
