import React, { useState, useEffect } from 'react';
import { ProjectContext } from './ProjectContextDefinition';
import { optimizeFabricCutting } from '../utils/fabricOptimizer';
import { runFabricOptimizationTask } from '../utils/optimizerRunner';
import { createTemplatePatternsForProduct, getProductTypeById } from '../data/productTypes';
import { 
  isSupabaseConfigured, 
  fetchProjectsFromSupabase, 
  syncProjectToSupabase, 
  deleteProjectFromSupabase 
} from '../services/supabaseService';

const STORAGE_KEY = 'ai_fabric_cutter_projects_v1';
const MOCK_PROJECT_IDS = ['proj-1', 'proj-2', 'proj-3', 'proj-4'];

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => !MOCK_PROJECT_IDS.includes(p.id));
        }
      }
    } catch (e) {
      console.warn('Failed to load projects from localStorage', e);
    }
    return [];
  });

  const [activeProjectId, setActiveProjectId] = useState(null);

  const [supabaseStatus, setSupabaseStatus] = useState(() =>
    isSupabaseConfigured ? 'connecting' : 'unconfigured'
  );
  const [supabaseError, setSupabaseError] = useState(null);

  // Hydrate projects from Supabase on mount if connected
  useEffect(() => {
    let isMounted = true;
    async function hydrateFromSupabase() {
      if (isSupabaseConfigured) {
        try {
          const res = await fetchProjectsFromSupabase();
          if (!isMounted) return;
          if (!res.error && Array.isArray(res.data)) {
            const realProjects = res.data.filter((p) => !MOCK_PROJECT_IDS.includes(p.id));
            setProjects(realProjects);
            setSupabaseStatus('connected');
            setSupabaseError(null);
          } else {
            setSupabaseStatus(res.isSchemaMissing ? 'schema-missing' : 'error');
            setSupabaseError(res.error);
          }
        } catch (err) {
          if (isMounted) {
            setSupabaseStatus('error');
            setSupabaseError(err.message);
          }
        }
      }
    }
    hydrateFromSupabase();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.warn('Failed to persist projects to localStorage', e);
    }
  }, [projects]);

  const getProject = (id) => {
    const p = projects.find((proj) => proj.id === id);
    if (!p) return null;

    // Lazily generate placements for completed projects that lack placed coordinates
    if (
      p.status === 'Completed' &&
      (!p.layoutPlacements || p.layoutPlacements.length === 0) &&
      Array.isArray(p.patterns) &&
      p.patterns.length > 0
    ) {
      try {
        const res = optimizeFabricCutting({
          fabricWidth: Number(p.fabricWidth) || 150,
          fabricLength: Number(p.fabricLength) || 500,
          patterns: p.patterns,
          extractedShape: p.extractedShape,
          minSpacing: p.minSpacing !== undefined ? Number(p.minSpacing) : 0.5,
          allowRotation: p.allowRotation !== undefined ? Boolean(p.allowRotation) : true,
          respectGrain: p.respectGrain !== undefined ? Boolean(p.respectGrain) : true,
          optimizationPriority: p.optimizationPriority || 'Minimum Fabric Waste',
          useParametricContour: true
        });
        if (res && Array.isArray(res.layoutPlacements) && res.layoutPlacements.length > 0) {
          p.layoutPlacements = res.layoutPlacements;
          p.placedCount = res.placedCount;
          p.unplacedCount = res.unplacedCount;
          p.unplacedPieces = res.unplacedPieces || [];
          p.actualLengthUsedCm = res.actualLengthUsedCm;
          p.actualLengthUsedM = res.actualLengthUsedM;
          p.markerUtilization = res.markerUtilization || res.utilization;
          p.markerWastePercentage = res.markerWastePercentage || res.wastePercentage;
          p.markerAreaM2 = res.markerAreaM2;
          p.markerWasteAreaM2 = res.markerWasteAreaM2;
        }
      } catch (err) {
        console.warn('Lazy layout generation fallback error:', err);
      }
    }

    return p;
  };

  const createProject = (projectData) => {
    const newId = `proj-${Date.now().toString(36)}`;
    const productType = projectData.productType || 'Shirt';
    const prodObj = getProductTypeById(productType);
    const resolvedProductType = prodObj ? prodObj.name : productType;
    const isCustomType = Boolean(prodObj?.isCustom) || resolvedProductType === 'Other / Custom Garment' || resolvedProductType === 'Custom Product';

    // Initialize with template pieces if requested and available (default true for non-custom)
    let initialPatterns = [];
    if (Array.isArray(projectData.patterns) && projectData.patterns.length > 0) {
      initialPatterns = projectData.patterns;
    } else if (projectData.loadTemplates !== false && !isCustomType) {
      initialPatterns = createTemplatePatternsForProduct(resolvedProductType, newId.slice(-4));
    }

    const totalPieces = initialPatterns.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    const newProject = {
      id: newId,
      name: projectData.name || 'Untitled Fabric Cut Plan',
      productType: resolvedProductType,
      fabricType: projectData.fabricType || 'Cotton',
      fabricWidth: Number(projectData.fabricWidth) || 150,
      fabricLength: Number(projectData.fabricLength) || 500,
      stretch: projectData.stretch || 'No',
      grainDirection: projectData.grainDirection || 'Vertical',
      createdAt: new Date().toISOString(),
      status: 'Draft',
      optimizationPriority: 'Minimum Fabric Waste',
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      utilization: 0,
      wastePercentage: 0,
      fabricSavedMeters: 0,
      fabricSavedKg: 0,
      waterSavedLiters: 0,
      co2SavedKg: 0,
      totalPieces,
      placedCount: 0,
      unplacedCount: 0,
      patternImage: null,
      extractedShape: null,
      fabricImage: projectData.fabricImage || null,
      patterns: initialPatterns,
      defects: Array.isArray(projectData.defects) ? projectData.defects : [],
      layoutPlacements: []
    };

    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newId);
    syncProjectToSupabase(newProject);
    return newProject;
  };

  const loadProductTemplates = (projectId, productTypeOrId) => {
    const templates = createTemplatePatternsForProduct(productTypeOrId, projectId.slice(-4));
    const prodObj = getProductTypeById(productTypeOrId);
    const newProductType = prodObj ? prodObj.name : 'Other / Custom Garment';

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const totalPieces = templates.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          const updated = {
            ...p,
            productType: newProductType,
            patterns: templates,
            totalPieces
          };
          syncProjectToSupabase(updated);
          return updated;
        }
        return p;
      })
    );
    return templates;
  };

  const updatePatternQuantity = (projectId, patternId, quantity) => {
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    updatePattern(projectId, patternId, { quantity: qty });
  };

  const updateProject = (id, updates) => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      const target = next.find((p) => p.id === id);
      if (target) syncProjectToSupabase(target);
      return next;
    });
  };

  const deleteProject = async (projectId) => {
    if (!projectId) {
      return { success: false, error: 'Project ID is required' };
    }

    try {
      let remoteResult = null;
      if (isSupabaseConfigured && supabaseStatus === 'connected') {
        remoteResult = await deleteProjectFromSupabase(projectId);
      }

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (activeProjectId === projectId) {
        setActiveProjectId(null);
      }

      return {
        success: true,
        deletedId: projectId,
        isRemote: Boolean(remoteResult?.remoteDeleted)
      };
    } catch (err) {
      console.error('[ProjectContext] deleteProject error:', err);
      return { success: false, error: err.message || 'Failed to delete project' };
    }
  };

  const uploadProjectPatternImage = (projectId, imageData) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            patternImage: imageData,
            extractedShape: null // reset extracted shape on new upload
          };
        }
        return p;
      })
    );
  };

  const setProjectExtractedShape = (projectId, shapeData) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            extractedShape: shapeData
          };
        }
        return p;
      })
    );
  };

  const removeProjectPatternImage = (projectId) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            patternImage: null,
            extractedShape: null
          };
        }
        return p;
      })
    );
  };

  const uploadProjectFabricImage = (projectId, imageData) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const updated = {
            ...p,
            fabricImage: imageData
          };
          syncProjectToSupabase(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const removeProjectFabricImage = (projectId) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const updated = {
            ...p,
            fabricImage: null
          };
          syncProjectToSupabase(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const addPattern = (projectId, patternData) => {
    const patternId = `pat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newPattern = {
      id: patternId,
      name: patternData.name || 'Pattern Piece',
      category: patternData.category || 'FRONT',
      shapeType: patternData.shapeType || 'front-bodice',
      width: Number(patternData.width) || 30,
      height: Number(patternData.height) || 40,
      quantity: Number(patternData.quantity) || 1,
      rotationAllowed: patternData.rotationAllowed !== undefined ? patternData.rotationAllowed : true,
      grainConstraint: patternData.grainConstraint || 'Vertical',
      color: patternData.color || '#0284c7',
      imageUrl: patternData.imageUrl || null,
      imageName: patternData.imageName || null,
      imageType: patternData.imageType || null,
      imageSize: patternData.imageSize || null,
      outline: Array.isArray(patternData.outline) ? patternData.outline : null,
      normalizedCoordinates: Array.isArray(patternData.normalizedCoordinates) 
        ? patternData.normalizedCoordinates 
        : (Array.isArray(patternData.outline) ? patternData.outline : null),
      isImageDerived: Boolean(patternData.isImageDerived),
      isUncalibrated: patternData.isUncalibrated !== undefined ? Boolean(patternData.isUncalibrated) : false,
      hasCalibrationReference: Boolean(patternData.hasCalibrationReference),
      calibrationScale: patternData.calibrationScale || null,
      calibratedDimension: patternData.calibratedDimension || null,
      calibrationReferenceCm: patternData.calibrationReferenceCm || null,
      area: ((Number(patternData.width) || 30) * (Number(patternData.height) || 40)) / 10000
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const updatedPatterns = [...(p.patterns || []), newPattern];
          const totalPieces = updatedPatterns.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          return {
            ...p,
            patterns: updatedPatterns,
            totalPieces
          };
        }
        return p;
      })
    );
    return newPattern;
  };

  const updatePattern = (projectId, patternId, updates) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const updatedPatterns = (p.patterns || []).map((pat) =>
            pat.id === patternId ? { ...pat, ...updates } : pat
          );
          const totalPieces = updatedPatterns.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          return {
            ...p,
            patterns: updatedPatterns,
            totalPieces
          };
        }
        return p;
      })
    );
  };

  const deletePattern = (projectId, patternId) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const updatedPatterns = (p.patterns || []).filter((pat) => pat.id !== patternId);
          const totalPieces = updatedPatterns.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          return {
            ...p,
            patterns: updatedPatterns,
            totalPieces
          };
        }
        return p;
      })
    );
  };

  const addProjectDefect = (projectId, defectData) => {
    const defectId = defectData.id || `defect-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newDefect = {
      id: defectId,
      x: Number(defectData.x) || 0,
      y: Number(defectData.y) || 0,
      radius: Number(defectData.radius) || 4,
      clearance: Number(defectData.clearance) || 0.5,
      type: defectData.type || 'Flaw / Stain',
      note: defectData.note || 'Surface obstacle zone'
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const currentDefects = Array.isArray(p.defects) ? p.defects : [];
          const updated = {
            ...p,
            defects: [...currentDefects, newDefect]
          };
          syncProjectToSupabase(updated);
          return updated;
        }
        return p;
      })
    );
    return newDefect;
  };

  const removeProjectDefect = (projectId, defectId) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const currentDefects = Array.isArray(p.defects) ? p.defects : [];
          const updated = {
            ...p,
            defects: currentDefects.filter((d) => d.id !== defectId)
          };
          syncProjectToSupabase(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const clearProjectDefects = (projectId) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const updated = {
            ...p,
            defects: []
          };
          syncProjectToSupabase(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const updateOptimizationSettings = (projectId, settings) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, ...settings } : p))
    );
  };

  /**
   * Runs the REAL 2D fabric cutting optimization engine using user's actual fabric dimensions and pattern data
   */
  const runFabricOptimization = (projectId, customSettings = {}) => {
    try {
      const project = getProject(projectId);
      if (!project) return { success: false, error: 'Project not found.' };

      const currentVariant = typeof project.layoutVariant === 'number' 
        ? project.layoutVariant 
        : (typeof project.selectedLayoutIndex === 'number' ? project.selectedLayoutIndex : 0);
      const targetVariant = customSettings.layoutVariant !== undefined
        ? Number(customSettings.layoutVariant)
        : customSettings.cycleLayoutVariant
        ? currentVariant + 1
        : (customSettings.resetVariant ? 0 : currentVariant);

      const fabricWidth = Number(project.fabricWidth);
      const fabricLength = Number(project.fabricLength);
      const patterns = project.patterns || [];
      const minSpacing = customSettings.minSpacing !== undefined 
        ? Number(customSettings.minSpacing) 
        : (project.minSpacing !== undefined ? Number(project.minSpacing) : 0.5);
      const allowRotation = customSettings.allowRotation !== undefined 
        ? Boolean(customSettings.allowRotation) 
        : (project.allowRotation !== undefined ? Boolean(project.allowRotation) : true);
      const respectGrain = customSettings.respectGrain !== undefined 
        ? Boolean(customSettings.respectGrain) 
        : (project.respectGrain !== undefined ? Boolean(project.respectGrain) : true);
      const optimizationPriority = customSettings.optimizationPriority || project.optimizationPriority || 'Minimum Fabric Waste';

      const useParametricContour = customSettings.useParametricContour !== undefined
        ? Boolean(customSettings.useParametricContour)
        : (project.useParametricContour !== undefined ? Boolean(project.useParametricContour) : false);

      // Execute real 2D nesting optimization
      const result = optimizeFabricCutting({
        fabricWidth,
        fabricLength,
        patterns,
        extractedShape: project.extractedShape,
        defects: project.defects || [],
        minSpacing,
        allowRotation,
        respectGrain,
        optimizationPriority,
        layoutVariant: targetVariant,
        useParametricContour
      }, {
        layoutVariant: targetVariant,
        useParametricContour
      });

      const updatedProject = {
        ...project,
        minSpacing,
        allowRotation,
        respectGrain,
        optimizationPriority,
        layoutVariant: result.selectedLayoutIndex !== undefined ? result.selectedLayoutIndex : targetVariant,
        candidateLayoutsCount: result.candidateLayoutsCount || 1,
        selectedLayoutIndex: result.selectedLayoutIndex !== undefined ? result.selectedLayoutIndex : 0,
        hasAlternativeLayout: Boolean(result.hasAlternativeLayout),
        layoutSignature: result.layoutSignature || null,
        status: result.success ? 'Completed' : 'Draft',
        utilization: result.utilization || 0,
        wastePercentage: result.wastePercentage || 0,
        totalPieces: result.totalPieces || patterns.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0),
        placedCount: result.placedCount || 0,
        unplacedCount: result.unplacedCount || 0,
        unplacedPieces: result.unplacedPieces || [],
        totalArea: result.totalArea || 0,
        usedArea: result.usedArea || 0,
        wasteArea: result.wasteArea || 0,
        evaluatedFabricAreaM2: result.evaluatedFabricAreaM2 || result.totalArea || 0,
        placedPatternAreaM2: result.placedPatternAreaM2 || result.usedArea || 0,
        unusedAreaM2: result.unusedAreaM2 || result.wasteArea || 0,
        actualLengthUsedCm: result.actualLengthUsedCm || 0,
        actualLengthUsedM: result.actualLengthUsedM || 0,
        remainingRollLengthCm: result.remainingRollLengthCm !== undefined ? result.remainingRollLengthCm : Math.max(0, fabricLength - (result.actualLengthUsedCm || 0)),
        remainingRollLengthM: result.remainingRollLengthM !== undefined ? result.remainingRollLengthM : Number((Math.max(0, fabricLength - (result.actualLengthUsedCm || 0)) / 100).toFixed(2)),
        markerAreaM2: result.markerAreaM2 || 0,
        markerUtilization: result.markerUtilization || 0,
        markerWastePercentage: result.markerWastePercentage || 0,
        markerWasteAreaM2: result.markerWasteAreaM2 !== undefined ? result.markerWasteAreaM2 : 0,
        hasValidBaseline: result.hasValidBaseline || false,
        baselineUtilization: result.baselineUtilization !== undefined ? result.baselineUtilization : 0,
        baselineWastePercentage: result.baselineWastePercentage !== undefined ? result.baselineWastePercentage : 100,
        baselineUsedArea: result.baselineUsedArea || 0,
        baselineWasteArea: result.baselineWasteArea || 0,
        baselineLengthUsedCm: result.baselineLengthUsedCm || 0,
        baselineLengthUsedM: result.baselineLengthUsedM || 0,
        baselineMarkerAreaM2: result.baselineMarkerAreaM2 || 0,
        baselineMarkerUtilization: result.baselineMarkerUtilization || 0,
        baselinePlacedCount: result.baselinePlacedCount || 0,
        utilizationDeltaPp: result.utilizationDeltaPp !== undefined ? result.utilizationDeltaPp : 0,
        wasteDeltaPp: result.wasteDeltaPp !== undefined ? result.wasteDeltaPp : 0,
        fabricSavedMeters: result.fabricSavedMeters || 0,
        fabricSavedKg: result.fabricSavedKg || 0,
        waterSavedLiters: result.waterSavedLiters || 0,
        co2SavedKg: result.co2SavedKg || 0,
        traditionalWastePercentage: result.hasValidBaseline && result.baselineWastePercentage !== undefined ? result.baselineWastePercentage : null,
        traditionalWasteArea: result.hasValidBaseline && result.baselineWasteArea !== undefined ? result.baselineWasteArea : null,
        layoutPlacements: result.layoutPlacements || [],
        optimizationWarning: result.warning || null,
        optimizationError: result.success ? null : result.error
      };

      updateProject(projectId, updatedProject);
      return result;
    } catch (err) {
      console.error('runFabricOptimization error:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during optimization.'
      };
    }
  };

  /**
   * Runs the real 2D nesting optimization asynchronously off the main thread with step-by-step progress events.
   * Progress reaches 100% ONLY after valid placement is generated and state is persisted.
   */
  const runFabricOptimizationAsync = async (projectId, customSettings = {}, onProgress = null, options = {}) => {
    try {
      onProgress?.({ percent: 12, status: 'Analyzing fabric dimensions & grain alignment...', stepId: 1 });
      await new Promise((r) => setTimeout(r, 40));

      const project = getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found.' };
      }

      onProgress?.({ percent: 25, status: 'Processing 2D pattern polygon contours...', stepId: 2 });
      await new Promise((r) => setTimeout(r, 40));

      const currentVariant = typeof project.layoutVariant === 'number' 
        ? project.layoutVariant 
        : (typeof project.selectedLayoutIndex === 'number' ? project.selectedLayoutIndex : 0);
      const targetVariant = customSettings.layoutVariant !== undefined
        ? Number(customSettings.layoutVariant)
        : customSettings.cycleLayoutVariant
        ? currentVariant + 1
        : (customSettings.resetVariant ? 0 : currentVariant);

      const fabricWidth = Number(project.fabricWidth);
      const fabricLength = Number(project.fabricLength);
      const patterns = project.patterns || [];
      const minSpacing = customSettings.minSpacing !== undefined 
        ? Number(customSettings.minSpacing) 
        : (project.minSpacing !== undefined ? Number(project.minSpacing) : 0.5);
      const allowRotation = customSettings.allowRotation !== undefined 
        ? Boolean(customSettings.allowRotation) 
        : (project.allowRotation !== undefined ? Boolean(project.allowRotation) : true);
      const respectGrain = customSettings.respectGrain !== undefined 
        ? Boolean(customSettings.respectGrain) 
        : (project.respectGrain !== undefined ? Boolean(project.respectGrain) : true);
      const optimizationPriority = customSettings.optimizationPriority || project.optimizationPriority || 'Minimum Fabric Waste';

      const useParametricContour = customSettings.useParametricContour !== undefined
        ? Boolean(customSettings.useParametricContour)
        : (project.useParametricContour !== undefined ? Boolean(project.useParametricContour) : false);

      // Run optimization via Web Worker off the main thread (with cooperative fallback)
      const result = await runFabricOptimizationTask(
        {
          fabricWidth,
          fabricLength,
          patterns,
          extractedShape: project.extractedShape,
          defects: project.defects || [],
          minSpacing,
          allowRotation,
          respectGrain,
          optimizationPriority,
          layoutVariant: targetVariant,
          useParametricContour
        },
        {
          signal: options.signal,
          onProgress: (p) => {
            onProgress?.(p);
          },
          maxTimeMs: options.maxTimeMs || 5000,
          maxEvaluations: options.maxEvaluations || 30,
          layoutVariant: targetVariant,
          useParametricContour
        }
      );

      // If cancelled or failed, exit immediately without persisting incomplete failure
      if (result?.cancelled) {
        return { success: false, cancelled: true, error: 'Optimization was cancelled.' };
      }

      if (!result || !result.success) {
        return result || { success: false, error: 'Could not place pattern pieces inside fabric dimensions.' };
      }

      onProgress?.({ percent: 96, status: 'Persisting cutting layout & metrics...', stepId: 5 });

      const updatedProject = {
        ...project,
        minSpacing,
        allowRotation,
        respectGrain,
        optimizationPriority,
        layoutVariant: result.selectedLayoutIndex !== undefined ? result.selectedLayoutIndex : targetVariant,
        candidateLayoutsCount: result.candidateLayoutsCount || 1,
        selectedLayoutIndex: result.selectedLayoutIndex !== undefined ? result.selectedLayoutIndex : 0,
        hasAlternativeLayout: Boolean(result.hasAlternativeLayout),
        layoutSignature: result.layoutSignature || null,
        status: 'Completed',
        utilization: result.utilization || 0,
        wastePercentage: result.wastePercentage || 0,
        totalPieces: result.totalPieces || patterns.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0),
        placedCount: result.placedCount || 0,
        unplacedCount: result.unplacedCount || 0,
        unplacedPieces: result.unplacedPieces || [],
        totalArea: result.totalArea || 0,
        usedArea: result.usedArea || 0,
        wasteArea: result.wasteArea || 0,
        evaluatedFabricAreaM2: result.evaluatedFabricAreaM2 || result.totalArea || 0,
        placedPatternAreaM2: result.placedPatternAreaM2 || result.usedArea || 0,
        unusedAreaM2: result.unusedAreaM2 || result.wasteArea || 0,
        actualLengthUsedCm: result.actualLengthUsedCm || 0,
        actualLengthUsedM: result.actualLengthUsedM || 0,
        remainingRollLengthCm: result.remainingRollLengthCm !== undefined ? result.remainingRollLengthCm : Math.max(0, fabricLength - (result.actualLengthUsedCm || 0)),
        remainingRollLengthM: result.remainingRollLengthM !== undefined ? result.remainingRollLengthM : Number((Math.max(0, fabricLength - (result.actualLengthUsedCm || 0)) / 100).toFixed(2)),
        markerAreaM2: result.markerAreaM2 || 0,
        markerUtilization: result.markerUtilization || 0,
        markerWastePercentage: result.markerWastePercentage || 0,
        markerWasteAreaM2: result.markerWasteAreaM2 !== undefined ? result.markerWasteAreaM2 : 0,
        hasValidBaseline: result.hasValidBaseline || false,
        baselineUtilization: result.baselineUtilization !== undefined ? result.baselineUtilization : 0,
        baselineWastePercentage: result.baselineWastePercentage !== undefined ? result.baselineWastePercentage : 100,
        baselineUsedArea: result.baselineUsedArea || 0,
        baselineWasteArea: result.baselineWasteArea || 0,
        baselineLengthUsedCm: result.baselineLengthUsedCm || 0,
        baselineLengthUsedM: result.baselineLengthUsedM || 0,
        baselineMarkerAreaM2: result.baselineMarkerAreaM2 || 0,
        baselineMarkerUtilization: result.baselineMarkerUtilization || 0,
        baselinePlacedCount: result.baselinePlacedCount || 0,
        utilizationDeltaPp: result.utilizationDeltaPp !== undefined ? result.utilizationDeltaPp : 0,
        wasteDeltaPp: result.wasteDeltaPp !== undefined ? result.wasteDeltaPp : 0,
        fabricSavedMeters: result.fabricSavedMeters || 0,
        fabricSavedKg: result.fabricSavedKg || 0,
        waterSavedLiters: result.waterSavedLiters || 0,
        co2SavedKg: result.co2SavedKg || 0,
        traditionalWastePercentage: result.hasValidBaseline && result.baselineWastePercentage !== undefined ? result.baselineWastePercentage : null,
        traditionalWasteArea: result.hasValidBaseline && result.baselineWasteArea !== undefined ? result.baselineWasteArea : null,
        layoutPlacements: result.layoutPlacements || [],
        optimizationWarning: result.warning || null,
        optimizationError: null,
        isSearchComplete: result.isSearchComplete !== undefined ? result.isSearchComplete : true,
        searchNotice: result.searchNotice || null
      };

      updateProject(projectId, updatedProject);

      // Only signal 100% once optimization has genuinely completed and been persisted
      onProgress?.({ percent: 100, status: 'Optimization finalized! Loading cut plan...', stepId: 5 });
      await new Promise((r) => setTimeout(r, 60));

      return result;
    } catch (err) {
      console.error('runFabricOptimizationAsync error:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during optimization.'
      };
    }
  };

  const resetToDefaults = () => {
    setProjects([]);
    setActiveProjectId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProjectId,
        setActiveProjectId,
        getProject,
        createProject,
        updateProject,
        deleteProject,
        isSupabaseConnected: supabaseStatus === 'connected',
        supabaseStatus,
        supabaseError,
        addPattern,
        updatePattern,
        deletePattern,
        updatePatternQuantity,
        loadProductTemplates,
        uploadProjectPatternImage,
        removeProjectPatternImage,
        uploadProjectFabricImage,
        removeProjectFabricImage,
        setProjectExtractedShape,
        addProjectDefect,
        removeProjectDefect,
        clearProjectDefects,
        updateOptimizationSettings,
        runFabricOptimization,
        runFabricOptimizationAsync,
        generateSimulatedLayout: runFabricOptimization, // alias for backwards compatibility
        resetToDefaults
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
