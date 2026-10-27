import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

export { isSupabaseConfigured };

/**
 * Maps Supabase snake_case project row to Loom & Layer camelCase project model
 */
export function mapRowToProject(row, patterns = []) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || 'Untitled Fabric Cut Plan',
    productType: row.product_type || 'Shirt',
    fabricType: row.fabric_type || 'Cotton',
    fabricWidth: Number(row.fabric_width) || 150,
    fabricLength: Number(row.fabric_length) || 500,
    stretch: row.stretch || 'No',
    grainDirection: row.grain_direction || 'Vertical',
    status: row.status || 'Draft',
    optimizationPriority: row.optimization_priority || 'Minimum Fabric Waste',
    minSpacing: Number(row.min_spacing !== undefined ? row.min_spacing : 0.5),
    allowRotation: Boolean(row.allow_rotation !== undefined ? row.allow_rotation : true),
    respectGrain: Boolean(row.respect_grain !== undefined ? row.respect_grain : true),
    utilization: Number(row.utilization || 0),
    wastePercentage: Number(row.waste_percentage || 0),
    actualLengthUsedCm: Number(row.actual_length_used_cm || 0),
    actualLengthUsedM: Number(row.actual_length_used_m || 0),
    remainingRollLengthCm: Number(row.remaining_roll_length_cm || 0),
    remainingRollLengthM: Number(row.remaining_roll_length_m || 0),
    markerUtilization: Number(row.marker_utilization || 0),
    markerWastePercentage: Number(row.marker_waste_percentage || 0),
    markerAreaM2: Number(row.marker_area_m2 || 0),
    markerWasteAreaM2: Number(row.marker_waste_area_m2 || 0),
    fabricSavedMeters: Number(row.fabric_saved_meters || 0),
    fabricSavedKg: Number(row.fabric_saved_kg || 0),
    waterSavedLiters: Number(row.water_saved_liters || 0),
    co2SavedKg: Number(row.co2_saved_kg || 0),
    totalPieces: Number(row.total_pieces || (Array.isArray(patterns) ? patterns.reduce((s, p) => s + (p.quantity || 1), 0) : 0)),
    placedCount: Number(row.placed_count || 0),
    unplacedCount: Number(row.unplaced_count || 0),
    unplacedPieces: Array.isArray(row.unplaced_pieces) ? row.unplaced_pieces : [],
    layoutPlacements: Array.isArray(row.layout_placements) ? row.layout_placements : [],
    patternImage: row.pattern_image || null,
    extractedShape: row.extracted_shape || null,
    fabricImage: row.fabric_image || null,
    patterns: Array.isArray(patterns) ? patterns : [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

/**
 * Maps Loom & Layer camelCase project model to Supabase snake_case row
 */
export function mapProjectToRow(project) {
  if (!project) return null;
  return {
    id: project.id,
    name: project.name || 'Untitled Fabric Cut Plan',
    product_type: project.productType || 'Shirt',
    fabric_type: project.fabricType || 'Cotton',
    fabric_width: Number(project.fabricWidth) || 150,
    fabric_length: Number(project.fabricLength) || 500,
    stretch: project.stretch || 'No',
    grain_direction: project.grainDirection || 'Vertical',
    status: project.status || 'Draft',
    optimization_priority: project.optimizationPriority || 'Minimum Fabric Waste',
    min_spacing: Number(project.minSpacing !== undefined ? project.minSpacing : 0.5),
    allow_rotation: Boolean(project.allowRotation !== undefined ? project.allowRotation : true),
    respect_grain: Boolean(project.respectGrain !== undefined ? project.respectGrain : true),
    utilization: Number(project.utilization || 0),
    waste_percentage: Number(project.wastePercentage || 0),
    actual_length_used_cm: Number(project.actualLengthUsedCm || 0),
    actual_length_used_m: Number(project.actualLengthUsedM || 0),
    remaining_roll_length_cm: Number(project.remainingRollLengthCm || 0),
    remaining_roll_length_m: Number(project.remainingRollLengthM || 0),
    marker_utilization: Number(project.markerUtilization || 0),
    marker_waste_percentage: Number(project.markerWastePercentage || 0),
    marker_area_m2: Number(project.markerAreaM2 || 0),
    marker_waste_area_m2: Number(project.markerWasteAreaM2 || 0),
    fabric_saved_meters: Number(project.fabricSavedMeters || 0),
    fabric_saved_kg: Number(project.fabricSavedKg || 0),
    water_saved_liters: Number(project.waterSavedLiters || 0),
    co2_saved_kg: Number(project.co2SavedKg || 0),
    total_pieces: Number(project.totalPieces || (project.patterns || []).reduce((s, p) => s + (p.quantity || 1), 0)),
    placed_count: Number(project.placedCount || 0),
    unplaced_count: Number(project.unplacedCount || 0),
    unplaced_pieces: project.unplacedPieces || [],
    layout_placements: project.layoutPlacements || [],
    pattern_image: project.patternImage || null,
    extracted_shape: project.extractedShape || null,
    fabric_image: project.fabricImage || null,
    updated_at: new Date().toISOString()
  };
}

let knownSchemaMissing = false;

/**
 * Fetches all projects and their patterns from Supabase
 */
export async function fetchProjectsFromSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase client not configured', isConfigured: false };
  }

  try {
    const { data: projectRows, error: pError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (pError) {
      const isSchemaMissing = pError.code === 'PGRST205' || pError.message?.includes('schema cache');
      if (isSchemaMissing) {
        knownSchemaMissing = true;
      }
      const errorMsg = isSchemaMissing
        ? "Database table 'public.projects' not found (HTTP 404 PGRST205). The Supabase URL is valid, but the database schema has not been initialized. Run 'supabase_schema.sql' in the Supabase SQL Editor. Local browser storage is active."
        : (pError.message || 'Failed to query Supabase projects table');

      if (isSchemaMissing) {
        console.warn(`[SupabaseService] Notice: ${errorMsg}`);
      } else {
        console.error('[SupabaseService] fetchProjects error:', pError);
      }

      return {
        data: null,
        error: errorMsg,
        code: pError.code,
        isSchemaMissing,
        isConfigured: true
      };
    }

    if (!projectRows || projectRows.length === 0) {
      return { data: [], error: null, isConfigured: true };
    }

    const { data: patternRows, error: patError } = await supabase
      .from('patterns')
      .select('*');

    if (patError) console.warn('Could not fetch pattern relations:', patError.message);

    const patternsByProject = new Map();
    (patternRows || []).forEach((row) => {
      const list = patternsByProject.get(row.project_id) || [];
      list.push({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        category: row.category,
        shapeType: row.shape_type,
        width: Number(row.width),
        height: Number(row.height),
        quantity: Number(row.quantity),
        rotationAllowed: Boolean(row.rotation_allowed),
        grainConstraint: row.grain_constraint,
        color: row.color,
        outline: row.outline,
        normalizedCoordinates: row.normalized_coordinates,
        isImageDerived: Boolean(row.is_image_derived),
        imageUrl: row.image_url
      });
      patternsByProject.set(row.project_id, list);
    });

    const projects = projectRows.map((row) =>
      mapRowToProject(row, patternsByProject.get(row.id) || [])
    );

    return { data: projects, error: null, isConfigured: true };
  } catch (err) {
    const isSchemaMissing = err.code === 'PGRST205' || err.message?.includes('schema cache');
    if (isSchemaMissing) {
      console.warn(`[SupabaseService] Missing table schema detected (PGRST205). Local storage active.`);
    } else {
      console.error('[SupabaseService] Unexpected fetchProjectsFromSupabase error:', err);
    }
    return {
      data: null,
      error: err.message,
      code: err.code || null,
      isSchemaMissing: Boolean(isSchemaMissing),
      isConfigured: true
    };
  }
}

/**
 * Upserts a project and its pattern pieces to Supabase
 */
export async function syncProjectToSupabase(project) {
  if (!isSupabaseConfigured || !supabase || !project) {
    return { success: false, error: 'Supabase not configured' };
  }

  // Skip remote network requests if database schema is not initialized
  if (knownSchemaMissing) {
    return { success: false, localOnly: true, isSchemaMissing: true };
  }

  try {
    const row = mapProjectToRow(project);
    const { error: projError } = await supabase
      .from('projects')
      .upsert(row, { onConflict: 'id' });

    if (projError) {
      const isSchemaMissing = projError.code === 'PGRST205' || projError.message?.includes('schema cache');
      if (isSchemaMissing) {
        console.warn(
          '[SupabaseService] Remote sync skipped: table public.projects not found in schema cache (PGRST205). Project saved in local browser storage.'
        );
      } else {
        console.warn('[SupabaseService] syncProjectToSupabase warning:', projError.message);
      }
      return { success: false, error: projError.message, isSchemaMissing: Boolean(isSchemaMissing) };
    }

    // Synchronize pattern pieces
    if (Array.isArray(project.patterns) && project.patterns.length > 0) {
      const patternRows = project.patterns.map((p) => ({
        id: p.id,
        project_id: project.id,
        name: p.name || 'Pattern Piece',
        category: p.category || 'FRONT',
        shape_type: p.shapeType || 'front-bodice',
        width: Number(p.width) || 30,
        height: Number(p.height) || 40,
        quantity: Number(p.quantity) || 1,
        rotation_allowed: p.rotationAllowed !== undefined ? Boolean(p.rotationAllowed) : true,
        grain_constraint: p.grainConstraint || 'Vertical',
        color: p.color || '#0284c7',
        outline: p.outline || null,
        normalized_coordinates: p.normalizedCoordinates || p.outline || null,
        is_image_derived: Boolean(p.isImageDerived),
        image_url: p.imageUrl || null
      }));

      const { error: patError } = await supabase
        .from('patterns')
        .upsert(patternRows, { onConflict: 'id' });

      if (patError) console.warn('[SupabaseService] Patterns sync warning:', patError.message);
    }

    return { success: true, error: null };
  } catch (err) {
    const isSchemaMissing = err.code === 'PGRST205' || err.message?.includes('schema cache');
    console.warn('[SupabaseService] syncProjectToSupabase error (falling back to localStorage):', err.message);
    return { success: false, error: err.message, isSchemaMissing: Boolean(isSchemaMissing) };
  }
}

/**
 * Deletes a project from Supabase
 */
export async function deleteProjectFromSupabase(projectId) {
  if (!isSupabaseConfigured || !supabase || !projectId || knownSchemaMissing) {
    return { success: true, localOnly: true, isSchemaMissing: Boolean(knownSchemaMissing) };
  }
  try {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (error) {
      if (error.code === 'PGRST205') {
        return { success: true, localOnly: true, isSchemaMissing: true };
      }
      console.warn('[SupabaseService] deleteProjectFromSupabase warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, remoteDeleted: true };
  } catch (err) {
    console.warn('[SupabaseService] deleteProjectFromSupabase error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Uploads a blueprint or garment photo to Supabase Storage
 */
export async function uploadBlueprintToSupabase(file, projectId) {
  if (!isSupabaseConfigured || !supabase) {
    return { publicUrl: null, error: 'Supabase storage not configured' };
  }

  try {
    const fileExt = file.name ? file.name.split('.').pop() : 'png';
    const fileName = `${projectId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('pattern-blueprints')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type || 'image/png'
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('pattern-blueprints')
      .getPublicUrl(fileName);

    return { publicUrl: data.publicUrl, error: null };
  } catch (err) {
    console.error('uploadBlueprintToSupabase error:', err);
    return { publicUrl: null, error: err.message };
  }
}
