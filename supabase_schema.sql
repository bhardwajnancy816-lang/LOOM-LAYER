-- ==============================================================================
-- Loom & Layer — Supabase Production Database Schema
-- Run this script in the Supabase Dashboard -> SQL Editor -> Click "Run"
-- ==============================================================================

-- 1. Enable UUID and PostGIS extensions (if needed for future GIS contours)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Fabric Cut Plan',
  product_type TEXT NOT NULL DEFAULT 'Shirt',
  fabric_type TEXT NOT NULL DEFAULT 'Cotton',
  fabric_width NUMERIC NOT NULL DEFAULT 150,
  fabric_length NUMERIC NOT NULL DEFAULT 500,
  stretch TEXT NOT NULL DEFAULT 'No',
  grain_direction TEXT NOT NULL DEFAULT 'Vertical',
  status TEXT NOT NULL DEFAULT 'Draft',
  optimization_priority TEXT NOT NULL DEFAULT 'Minimum Fabric Waste',
  min_spacing NUMERIC NOT NULL DEFAULT 0.5,
  allow_rotation BOOLEAN NOT NULL DEFAULT true,
  respect_grain BOOLEAN NOT NULL DEFAULT true,
  utilization NUMERIC NOT NULL DEFAULT 0,
  waste_percentage NUMERIC NOT NULL DEFAULT 0,
  actual_length_used_cm NUMERIC DEFAULT 0,
  actual_length_used_m NUMERIC DEFAULT 0,
  remaining_roll_length_cm NUMERIC DEFAULT 0,
  remaining_roll_length_m NUMERIC DEFAULT 0,
  marker_utilization NUMERIC DEFAULT 0,
  marker_waste_percentage NUMERIC DEFAULT 0,
  marker_area_m2 NUMERIC DEFAULT 0,
  marker_waste_area_m2 NUMERIC DEFAULT 0,
  fabric_saved_meters NUMERIC DEFAULT 0,
  fabric_saved_kg NUMERIC DEFAULT 0,
  water_saved_liters NUMERIC DEFAULT 0,
  co2_saved_kg NUMERIC DEFAULT 0,
  total_pieces INTEGER NOT NULL DEFAULT 0,
  placed_count INTEGER NOT NULL DEFAULT 0,
  unplaced_count INTEGER NOT NULL DEFAULT 0,
  unplaced_pieces JSONB DEFAULT '[]'::jsonb,
  layout_placements JSONB DEFAULT '[]'::jsonb,
  pattern_image TEXT DEFAULT NULL,
  extracted_shape JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Patterns Table (Piece Templates)
CREATE TABLE IF NOT EXISTS public.patterns (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Pattern Piece',
  category TEXT NOT NULL DEFAULT 'FRONT',
  shape_type TEXT NOT NULL DEFAULT 'front-bodice',
  width NUMERIC NOT NULL DEFAULT 30,
  height NUMERIC NOT NULL DEFAULT 40,
  quantity INTEGER NOT NULL DEFAULT 1,
  rotation_allowed BOOLEAN NOT NULL DEFAULT true,
  grain_constraint TEXT NOT NULL DEFAULT 'Vertical',
  color TEXT NOT NULL DEFAULT '#0284c7',
  outline JSONB DEFAULT NULL,
  normalized_coordinates JSONB DEFAULT NULL,
  is_image_derived BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Cutting Plans & CAM Export History Table
CREATE TABLE IF NOT EXISTS public.cutting_plans (
  id TEXT PRIMARY KEY DEFAULT ('plan-' || substr(md5(random()::text), 1, 8)),
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Cutting Plan Master',
  marker_utilization NUMERIC NOT NULL DEFAULT 0,
  full_roll_utilization NUMERIC NOT NULL DEFAULT 0,
  cut_length_cm NUMERIC NOT NULL DEFAULT 0,
  cut_length_m NUMERIC NOT NULL DEFAULT 0,
  estimated_cut_seconds INTEGER NOT NULL DEFAULT 0,
  placements JSONB NOT NULL DEFAULT '[]'::jsonb,
  dxf_url TEXT DEFAULT NULL,
  svg_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Indexes for High Performance Queries
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_project_id ON public.patterns(project_id);
CREATE INDEX IF NOT EXISTS idx_cutting_plans_project_id ON public.cutting_plans(project_id);

-- 6. Trigger for updated_at on projects
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- 7. Enable Row Level Security (RLS) with permissive read/write policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutting_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access (for development atelier use)
DROP POLICY IF EXISTS "Public access projects" ON public.projects;
CREATE POLICY "Public access projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access patterns" ON public.patterns;
CREATE POLICY "Public access patterns" ON public.patterns FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access cutting_plans" ON public.cutting_plans;
CREATE POLICY "Public access cutting_plans" ON public.cutting_plans FOR ALL USING (true) WITH CHECK (true);

-- 8. Seed Initial Atelier Benchmark Projects
INSERT INTO public.projects (
  id, name, product_type, fabric_type, fabric_width, fabric_length,
  status, utilization, waste_percentage, actual_length_used_cm, actual_length_used_m,
  remaining_roll_length_cm, remaining_roll_length_m, marker_utilization,
  total_pieces, placed_count, unplaced_count, fabric_saved_meters, fabric_saved_kg
) VALUES
(
  'proj-1', 'Summer Shirt Collection', 'Shirt', 'Organic Cotton Poplin', 150, 500,
  'Completed', 14.8, 85.2, 91.0, 0.91, 409.0, 4.09, 81.2,
  9, 9, 0, 4.3, 1.2
),
(
  'proj-2', 'Heavy Denim Workwear Jacket', 'Jacket', 'Raw Indigo Denim', 160, 400,
  'Completed', 91.7, 8.3, 360.0, 3.60, 40.0, 0.40, 91.7,
  14, 14, 0, 7.2, 2.0
),
(
  'proj-3', 'Linen Resortwear Line', 'Dress/Gown', 'Belgian Natural Linen', 140, 350,
  'Completed', 93.8, 6.2, 320.0, 3.20, 30.0, 0.30, 93.8,
  11, 11, 0, 3.8, 1.1
),
(
  'proj-4', 'Athletic Performance Tops', 'T-shirt', 'Recycled Polyester Mesh', 150, 600,
  'Completed', 95.4, 4.6, 560.0, 5.60, 40.0, 0.40, 95.4,
  18, 18, 0, 3.1, 0.9
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  fabric_width = EXCLUDED.fabric_width,
  fabric_length = EXCLUDED.fabric_length,
  utilization = EXCLUDED.utilization,
  status = EXCLUDED.status;
