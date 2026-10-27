import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Layers, 
  Compass, 
  Ruler, 
  CheckCircle2, 
  Info, 
  Camera, 
  Trash2, 
  FileImage, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Leaf,
  Check,
  UploadCloud
} from 'lucide-react';
import { fabricTypes } from '../data/mockProjects';
import { PRODUCT_TYPES } from '../data/productTypes';
import { useProjects } from '../context/useProjects';
import { useUserProfile } from '../context/useUserProfile';
import { CameraCaptureModal } from '../components/fabric/CameraCaptureModal';
import { FabricAnalysisCard } from '../components/fabric/FabricAnalysisCard';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { validatePatternImageFile, readImageFileAsDataUrl } from '../utils/imageUploadValidator';
import { analyzeFabricImage } from '../utils/fabricAnalysisEngine';

const GARMENT_CATEGORIES = [
  { id: 'All', label: 'All Silhouettes' },
  { id: 'Tops', label: 'Tops' },
  { id: 'Bottoms', label: 'Bottoms' },
  { id: 'Dresses', label: 'Dresses' },
  { id: 'Outerwear', label: 'Outerwear' },
  { id: 'Others', label: 'Others' }
];

const GARMENT_METAS = {
  shirt: {
    category: 'Tops',
    preview: 'Front, back, sleeves, collar & cuffs',
    tag: 'Classic Atelier',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
        <path d="M12 2v20" />
      </svg>
    )
  },
  't-shirt': {
    category: 'Tops',
    preview: 'Front, back body & sleeves',
    tag: 'Casual Knit',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v4h3v10h12V10h3V6l-3-4a6 6 0 0 1-12 0z" />
      </svg>
    )
  },
  'trousers-pants': {
    category: 'Bottoms',
    preview: 'Front/back legs, waistband & pockets',
    tag: 'Tailored Bottom',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3h14l-1 18-5-1-1-9-1 9-5 1L5 3z" />
        <path d="M12 3v9" />
      </svg>
    )
  },
  jeans: {
    category: 'Bottoms',
    preview: 'Legs, coin pocket, yoke & waistband',
    tag: 'Denim Workwear',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 3h16l-1.5 18-5.5-1-1-8-1 8-5.5 1L4 3z" />
        <path d="M8 7h2" />
        <path d="M14 7h2" />
        <path d="M12 3v8" />
      </svg>
    )
  },
  jacket: {
    category: 'Outerwear',
    preview: 'Lapels, front/back, sleeves & collar',
    tag: 'Structured Outerwear',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4 2 9v11h6V10l4-3 4 3v10h6V9l-2-5-8-2-8 2z" />
        <path d="M12 7v13" />
        <path d="M8 4l4 4 4-4" />
      </svg>
    )
  },
  'hoodie-sweatshirt': {
    category: 'Outerwear',
    preview: 'Hood, front pouch & raglan sleeves',
    tag: 'Sportswear Knit',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6 2 10v10h5v-5h10v5h5V10l-2-4-5-3c-3 1-3 1-6 0L4 6z" />
        <path d="M9 15h6" />
      </svg>
    )
  },
  dress: {
    category: 'Dresses',
    preview: 'Bodice, flowing skirt panels & sleeves',
    tag: 'One-Piece Silhouette',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6l2 5-2 3 5 10H4l5-10-2-3 2-5z" />
        <path d="M9 11h6" />
      </svg>
    )
  },
  skirt: {
    category: 'Bottoms',
    preview: 'Flared front/back panels & waistband',
    tag: 'Waist Silhouette',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4h10l4 17H3L7 4z" />
        <path d="M10 4v17" />
        <path d="M14 4v17" />
      </svg>
    )
  },
  kurta: {
    category: 'Tops',
    preview: 'Front placket, side slits & sleeves',
    tag: 'Traditional Tunic',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 2h10l3 5-2 2-1-1v14H7V8L6 9 4 7l3-5z" />
        <path d="M12 2v7" />
        <path d="M7 16l-2 5" />
        <path d="M17 16l2 5" />
      </svg>
    )
  },
  blouse: {
    category: 'Tops',
    preview: 'Feminine collar, front drape & sleeves',
    tag: 'Feminine Tailored',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3h10l4 6-3 3-1-1v9H7v-9L6 12 3 9l4-6z" />
        <path d="M10 3l2 5 2-5" />
      </svg>
    )
  },
  shorts: {
    category: 'Bottoms',
    preview: 'Front/back legs & waistband',
    tag: 'Casual Bottom',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16l-1 12-6-1-1-5-1 5-6 1L4 4z" />
      </svg>
    )
  },
  uniform: {
    category: 'Outerwear',
    preview: 'Workwear jacket, trousers & pockets',
    tag: 'Industrial Utility',
    renderIcon: () => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l3 5-3 2v11H6V10L3 8l3-5z" />
        <path d="M12 3v5" />
        <path d="M10 11h4" />
      </svg>
    )
  },
  custom: {
    category: 'Others',
    preview: 'Freeform manual pieces & blueprint import',
    tag: 'Custom Bespoke',
    renderIcon: () => (
      <Scissors className="w-4 h-4 -rotate-45" />
    )
  }
};

export function NewProjectPage() {
  const navigate = useNavigate();
  const { createProject } = useProjects();
  const { profile } = useUserProfile();
  const [isFabricCameraOpen, setIsFabricCameraOpen] = useState(false);
  const [isAnalyzingFabric, setIsAnalyzingFabric] = useState(false);
  const fabricFileInputRef = useRef(null);
  const productTypeScrollRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [formData, setFormData] = useState({
    name: 'Summer Collection',
    description: '',
    category: 'Tops',
    productType: 'Shirt',
    targetQuantity: 100,
    units: 'Pieces',
    fabricType: 'Cotton',
    fabricWidth: 150,
    fabricLength: 500,
    allowRotation: true,
    grainDirection: 'As per pattern',
    loadTemplates: true,
    fabricImage: null
  });

  const [errors, setErrors] = useState({});

  const scrollProductTypes = (direction) => {
    if (productTypeScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      productTypeScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const selectedProduct = PRODUCT_TYPES.find((pt) => pt.name === formData.productType) || PRODUCT_TYPES[0];
  const selectedMeta = GARMENT_METAS[selectedProduct.id] || GARMENT_METAS['shirt'];

  const filteredProducts = selectedCategory === 'All'
    ? PRODUCT_TYPES
    : PRODUCT_TYPES.filter((pt) => {
        const meta = GARMENT_METAS[pt.id] || GARMENT_METAS['shirt'];
        return meta.category === selectedCategory;
      });

  const handleProductSelect = (pt, targetCategory) => {
    const meta = GARMENT_METAS[pt.id] || GARMENT_METAS['shirt'];
    setFormData((prev) => ({
      ...prev,
      productType: pt.name,
      category: targetCategory || meta.category || 'Tops',
      loadTemplates: pt.isCustom ? false : prev.loadTemplates
    }));
  };

  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    if (catId !== 'All') {
      const match = PRODUCT_TYPES.filter((pt) => {
        const meta = GARMENT_METAS[pt.id] || GARMENT_METAS['shirt'];
        return meta.category === catId;
      });
      if (match.length > 0) {
        const currentMeta = GARMENT_METAS[selectedProduct.id] || GARMENT_METAS['shirt'];
        if (currentMeta.category !== catId) {
          handleProductSelect(match[0], catId);
        }
      }
    }
    if (productTypeScrollRef.current) {
      productTypeScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name || !formData.name.trim()) {
      errs.name = 'Project name is required';
    }
    const widthNum = Number(formData.fabricWidth);
    if (!formData.fabricWidth || isNaN(widthNum) || widthNum < 20) {
      errs.fabricWidth = 'Width must be at least 20cm';
    }
    setErrors(errs);
    return {
      isValid: Object.keys(errs).length === 0,
      errors: errs
    };
  };

  const handleFabricCameraConfirm = (captured) => {
    if (!captured?.dataUrl) return;
    setFormData((prev) => ({
      ...prev,
      fabricImage: {
        imageUrl: captured.dataUrl,
        imageName: `Fabric_Capture_${Date.now().toString(36)}.jpg`,
        formattedSize: captured.formattedSize,
        sizeBytes: captured.sizeBytes,
        capturedAt: captured.capturedAt || new Date().toISOString(),
        width: captured.width,
        height: captured.height
      }
    }));
  };

  const handleFabricFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validatePatternImageFile(file);
    if (!validation.isValid) return;

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setFormData((prev) => ({
        ...prev,
        fabricImage: {
          imageUrl: dataUrl,
          imageName: validation.fileInfo.name,
          formattedSize: validation.fileInfo.formattedSize,
          sizeBytes: validation.fileInfo.size,
          capturedAt: new Date().toISOString()
        }
      }));
    } catch (err) {
      console.error('Failed to read fabric image:', err);
    }
  };

  const handleRemoveFabricImage = () => {
    setFormData((prev) => ({ ...prev, fabricImage: null }));
    if (fabricFileInputRef.current) fabricFileInputRef.current.value = '';
  };

  const handleAnalyzeFabric = async () => {
    if (!formData.fabricImage?.imageUrl || isAnalyzingFabric) return;
    setIsAnalyzingFabric(true);
    try {
      const result = await analyzeFabricImage(formData.fabricImage.imageUrl);
      setFormData((prev) => ({
        ...prev,
        fabricImage: {
          ...prev.fabricImage,
          analysis: result
        }
      }));
    } catch (err) {
      console.error('Fabric analysis failed:', err);
    } finally {
      setIsAnalyzingFabric(false);
    }
  };

  const handleApplyGrainDirection = (newGrain) => {
    setFormData((prev) => ({
      ...prev,
      grainDirection: newGrain,
      fabricImage: prev.fabricImage
        ? {
            ...prev.fabricImage,
            analysis: prev.fabricImage.analysis
              ? { ...prev.fabricImage.analysis, isConfirmedByUser: true }
              : null
          }
        : null
    }));
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const { isValid } = validate();
    if (!isValid) return;

    try {
      const newProject = createProject({
        ...formData,
        fabricWidth: Number(formData.fabricWidth) || 150,
        fabricLength: Number(formData.fabricLength) || 500,
        targetQuantity: Number(formData.targetQuantity) || 100
      });
      if (newProject && newProject.id) {
        navigate(`/project/${newProject.id}/patterns`);
      } else {
        setErrors((prev) => ({ ...prev, general: 'Failed to create project.' }));
      }
    } catch (err) {
      console.error('Failed to create project:', err);
      setErrors((prev) => ({ ...prev, general: 'Could not create project: ' + err.message }));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================================
          1. HEADER BAR (Reference Screen 2)
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-[#D8DFD8] shadow-xs bg-[#E5EFE6] shrink-0">
            <img
              src={profile?.avatar || "/atelier/user_avatar.jpg"}
              alt={profile?.name || "Designer"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/atelier/user_avatar.jpg";
              }}
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#143823] tracking-tight">
              Create a New Project
            </h1>
            <p className="text-xs text-[#5C665F]">
              Set up your project details to start optimizing your fabric cutting plan.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. STEP INDICATOR BAR (Reference Screen 2)
          ======================================================== */}
      <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-4 overflow-x-auto pb-1 text-xs font-medium">
        
        {/* Step 1: Active */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#143823] text-white shadow-xs shrink-0">
          <span className="w-4 h-4 rounded-full bg-white text-[#143823] flex items-center justify-center font-bold text-[10px]">
            1
          </span>
          <span className="font-semibold">Project Details</span>
        </div>

        {/* Step 2 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[#7C857E] hover:text-stone-900 shrink-0">
          <span className="w-4 h-4 rounded-full bg-[#E8E2D6] text-stone-600 flex items-center justify-center text-[10px]">
            2
          </span>
          <span>Fabric & Patterns</span>
        </div>

        {/* Step 3 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[#7C857E] hover:text-stone-900 shrink-0">
          <span className="w-4 h-4 rounded-full bg-[#E8E2D6] text-stone-600 flex items-center justify-center text-[10px]">
            3
          </span>
          <span>Constraints</span>
        </div>

        {/* Step 4 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[#7C857E] hover:text-stone-900 shrink-0">
          <span className="w-4 h-4 rounded-full bg-[#E8E2D6] text-stone-600 flex items-center justify-center text-[10px]">
            4
          </span>
          <span>Review</span>
        </div>

      </div>

      {/* ========================================================
          3. TWO-COLUMN LAYOUT: FORM + EDITORIAL PHOTOGRAPHY (Reference Screen 2)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form Card (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8E2D6] p-5 sm:p-7 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Project Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                Project Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Summer Collection"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all"
              />
              {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter project description (optional)"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all"
              />
            </div>

            {/* Garment Type & Silhouette (Slidable Carousel) */}
            <div className="space-y-2.5 pt-1">
              {/* Header with Title + Silhouettes Count + Carousel Navigation Arrows */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-semibold text-stone-800">
                    Garment Type
                  </label>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#E5EFE6] text-[#143823] border border-[#CDE0D0]">
                    {filteredProducts.length} silhouettes
                  </span>
                </div>

                {/* Left & Right Slidable Navigation Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => scrollProductTypes('left')}
                    className="w-7 h-7 rounded-lg bg-white border border-[#DDD5C7] hover:border-[#143823] hover:bg-[#FAF8F5] flex items-center justify-center text-stone-700 hover:text-[#143823] transition-colors cursor-pointer shadow-2xs"
                    title="Slide left"
                    aria-label="Slide left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollProductTypes('right')}
                    className="w-7 h-7 rounded-lg bg-white border border-[#DDD5C7] hover:border-[#143823] hover:bg-[#FAF8F5] flex items-center justify-center text-stone-700 hover:text-[#143823] transition-colors cursor-pointer shadow-2xs"
                    title="Slide right"
                    aria-label="Slide right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Category Filter Pills (Horizontally Scrollable) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {GARMENT_CATEGORIES.map((cat) => {
                  const isCatActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        isCatActive
                          ? 'bg-[#143823] text-white shadow-2xs font-semibold'
                          : 'bg-[#F5F2EB] text-stone-700 hover:bg-[#EAE4D8] border border-[#E5DFD4]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Slidable Carousel with Edge Gradients */}
              <div className="relative">
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent z-10 opacity-70" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent z-10 opacity-70" />

                <div
                  ref={productTypeScrollRef}
                  className="flex gap-2.5 overflow-x-auto scroll-smooth py-1 px-0.5 snap-x"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {filteredProducts.map((pt) => {
                    const isSelected = formData.productType === pt.name;
                    const meta = GARMENT_METAS[pt.id] || GARMENT_METAS['shirt'];

                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => handleProductSelect(pt)}
                        className={`w-40 sm:w-44 shrink-0 snap-start p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                          isSelected
                            ? 'bg-[#143823] text-white border-[#143823] shadow-md ring-2 ring-[#143823]/30'
                            : 'bg-[#FAF8F5] hover:bg-[#F5F2EB] border-[#DDD5C7] hover:border-[#143823]/40 text-stone-800 hover:shadow-xs'
                        }`}
                      >
                        {/* Top: Icon + Badge */}
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shadow-2xs ${
                              isSelected
                                ? 'bg-white/15 text-white border border-white/20'
                                : 'bg-white text-[#143823] border border-[#DDD5C7]'
                            }`}
                          >
                            {meta.renderIcon()}
                          </div>

                          <div>
                            {isSelected ? (
                              <span className="text-[9px] font-mono font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-white/20">
                                <Check className="w-2.5 h-2.5 text-[#A8E6CF] stroke-[3]" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-white text-stone-600 border border-[#E5DFD4]">
                                {pt.isCustom ? 'Custom' : `${pt.defaultPieces.length} parts`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Tag */}
                        <div className="mt-2">
                          <span className={`font-serif font-bold text-xs tracking-tight block truncate ${
                            isSelected ? 'text-white' : 'text-stone-900'
                          }`}>
                            {pt.name}
                          </span>
                          <p className={`text-[9px] font-mono mt-0.5 uppercase tracking-wider truncate ${
                            isSelected ? 'text-[#D5E5D7]' : 'text-stone-500'
                          }`}>
                            {meta.tag}
                          </p>
                        </div>

                        {/* Bottom Piece Summary */}
                        <div className={`mt-2 pt-1 border-t text-[9px] truncate leading-tight ${
                          isSelected ? 'border-white/15 text-[#D5E5D7]' : 'border-[#E8E2D6] text-stone-500'
                        }`}>
                          {meta.preview}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Garment Detail Banner */}
              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#E5EFE6] border border-[#CDE0D0] text-[#143823] flex items-center justify-center shrink-0">
                    {selectedMeta.renderIcon()}
                  </div>
                  <div className="leading-tight">
                    <span className="font-semibold text-stone-900">{selectedProduct?.name}</span>
                    <span className="text-stone-500 text-[11px] ml-1.5 hidden sm:inline">
                      ({selectedProduct?.isCustom ? 'Blank template for manual pattern entry' : `${selectedProduct?.defaultPieces.length} pieces auto-loaded`})
                    </span>
                  </div>
                </div>

                {!selectedProduct?.isCustom && (
                  <label className="flex items-center gap-1.5 text-stone-700 cursor-pointer text-xs font-medium self-start sm:self-center">
                    <input
                      type="checkbox"
                      checked={formData.loadTemplates}
                      onChange={(e) => setFormData({ ...formData, loadTemplates: e.target.checked })}
                      className="h-3.5 w-3.5 rounded border-[#DDD5C7] text-[#143823] focus:ring-[#143823] cursor-pointer"
                    />
                    <span>Auto-load pieces</span>
                  </label>
                )}
              </div>
            </div>

            {/* Target Quantity + Units */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                  Target Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.targetQuantity}
                  onChange={(e) => setFormData({ ...formData, targetQuantity: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                  Units
                </label>
                <select
                  value={formData.units}
                  onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all cursor-pointer"
                >
                  <option value="Pieces">Pieces</option>
                  <option value="Dozens">Dozens</option>
                  <option value="Bundles">Bundles</option>
                </select>
              </div>
            </div>

            {/* Fabric Type + Fabric Width */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                  Fabric Type
                </label>
                <select
                  value={formData.fabricType}
                  onChange={(e) => setFormData({ ...formData, fabricType: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all cursor-pointer"
                >
                  {fabricTypes.map((ft) => (
                    <option key={ft.id || ft.name} value={ft.name}>
                      {ft.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                  Fabric Width (cm)
                </label>
                <input
                  type="number"
                  min="20"
                  max="500"
                  value={formData.fabricWidth}
                  onChange={(e) => setFormData({ ...formData, fabricWidth: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all"
                />
                {errors.fabricWidth && <p className="text-[11px] text-rose-600 mt-1">{errors.fabricWidth}</p>}
              </div>
            </div>

            {/* Allow Rotation + Grain Direction */}
            <div className="grid grid-cols-2 gap-4 items-center pt-1">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                  Allow Rotation
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, allowRotation: !formData.allowRotation })}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      formData.allowRotation ? 'bg-[#143823]' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full bg-white shadow-xs block transition-transform absolute top-0.5 ${
                        formData.allowRotation ? 'left-5.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-semibold text-stone-700">
                    {formData.allowRotation ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                  Grain Direction
                </label>
                <select
                  value={formData.grainDirection}
                  onChange={(e) => setFormData({ ...formData, grainDirection: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all cursor-pointer"
                >
                  <option value="As per pattern">As per pattern</option>
                  <option value="Vertical">Vertical (Warp)</option>
                  <option value="Horizontal">Horizontal (Weft)</option>
                  <option value="Flexible">Flexible</option>
                </select>
              </div>
            </div>

            {/* Fabric Swatch Photo / Camera Feature (Preserved) */}
            <div className="pt-2 border-t border-[#F0EBE0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#143823]" />
                  <span>Fabric Swatch Reference (Optional)</span>
                </span>
                {formData.fabricImage && (
                  <button
                    type="button"
                    onClick={handleRemoveFabricImage}
                    className="text-[11px] text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                ref={fabricFileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg"
                onChange={handleFabricFileChange}
                className="hidden"
              />

              {formData.fabricImage ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={formData.fabricImage.imageUrl}
                      alt="Fabric swatch"
                      className="w-10 h-10 rounded-lg object-cover border border-[#DDD5C7]"
                    />
                    <div>
                      <p className="text-xs font-semibold text-stone-800">{formData.fabricImage.imageName}</p>
                      <p className="text-[10px] text-stone-500">Fabric photo attached</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyzeFabric}
                    disabled={isAnalyzingFabric}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#E5EFE6] text-[#143823] hover:bg-[#D5E5D7] cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isAnalyzingFabric ? 'Analyzing...' : 'Analyze Weave'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFabricCameraOpen(true)}
                    className="flex-1 py-2 px-3 rounded-xl border border-dashed border-[#DDD5C7] hover:border-[#143823] text-stone-600 hover:text-[#143823] text-xs font-medium flex items-center justify-center gap-1.5 bg-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fabricFileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 rounded-xl border border-dashed border-[#DDD5C7] hover:border-[#143823] text-stone-600 hover:text-[#143823] text-xs font-medium flex items-center justify-center gap-1.5 bg-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>
                </div>
              )}
            </div>

            {/* Buttons Row */}
            <div className="flex items-center justify-between pt-4 border-t border-[#F0EBE0]">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[#DDD5C7] bg-white text-stone-700 hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </form>
        </div>

        {/* Right Editorial Photography & Botanical Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 shadow-xs overflow-hidden">
            {/* Swatch Photo */}
            <div className="w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-[#E8E2D6] bg-[#FAF8F5]">
              <img
                src="/atelier/swatches.jpg"
                alt="Fine Atelier Fabric Swatches"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=600&q=80";
                }}
              />
            </div>

            {/* Botanical Quote Block */}
            <div className="pt-5 pb-3 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-[#E5EFE6] text-[#143823] flex items-center justify-center mx-auto">
                <Leaf className="w-4 h-4" />
              </div>
              <blockquote className="font-serif text-sm sm:text-base text-[#143823] italic leading-relaxed px-2">
                “Plan with purpose.<br />
                Optimize with intelligence.<br />
                Create a more sustainable future.”
              </blockquote>
            </div>
          </div>
        </div>

      </div>

      {/* Camera Capture Modal (Preserved with ErrorBoundary) */}
      <ErrorBoundary
        componentName="FabricCameraCaptureModal"
        title="Camera Capture Unavailable"
        message="The camera subsystem encountered an error. You can upload an image manually instead."
        fallbackActionLabel="Choose File Instead"
        onFallbackAction={() => fabricFileInputRef.current?.click()}
      >
        <CameraCaptureModal
          isOpen={isFabricCameraOpen}
          onClose={() => setIsFabricCameraOpen(false)}
          onCaptureConfirm={handleFabricCameraConfirm}
          onFallbackToFileUpload={() => fabricFileInputRef.current?.click()}
          title="Photograph Fabric Swatch"
          subtitle="Capture fabric roll surface for visual weave and grain reference"
          targetType="fabric"
        />
      </ErrorBoundary>

    </div>
  );
}
