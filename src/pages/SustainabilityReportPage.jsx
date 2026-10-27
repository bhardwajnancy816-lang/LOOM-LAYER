import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Leaf, 
  Download, 
  Recycle, 
  ShoppingBag, 
  CloudRain, 
  Zap, 
  TreePine, 
  Trash2,
  ChevronDown,
  Info
} from 'lucide-react';
import { useProjects } from '../context/useProjects';
import { useUserProfile } from '../context/useUserProfile';
import { generatePrintableSustainabilityReportHTML, openPrintableDocument } from '../utils/cuttingPlanGenerator';

export function SustainabilityReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, getProject } = useProjects();
  const { profile } = useUserProfile();
  const [selectedProjectId, setSelectedProjectId] = useState(id || 'all');
  const [downloading, setDownloading] = useState(false);

  const activeProject = selectedProjectId !== 'all' ? getProject(selectedProjectId) : projects[0];

  // Calculated or reference metrics
  const totalFabricSaved = '24.6';
  const totalWasteReduced = '8.2';
  const productsUpcycled = 48;
  const co2Impact = '32.4';

  const handleExportReport = () => {
    if (!activeProject) return;
    setDownloading(true);
    try {
      const htmlContent = generatePrintableSustainabilityReportHTML(activeProject);
      openPrintableDocument(htmlContent, `${activeProject.name || 'ESG'}_Sustainability_Report`);
    } catch (err) {
      console.error('Error generating ESG sustainability print report:', err);
    } finally {
      setTimeout(() => {
        setDownloading(false);
      }, 800);
    }
  };

  // Monthly bar data for Jan-Jun
  const monthlyData = [
    { month: 'Jan', used: 65, saved: 35 },
    { month: 'Feb', used: 55, saved: 45 },
    { month: 'Mar', used: 70, saved: 30 },
    { month: 'Apr', used: 50, saved: 50 },
    { month: 'May', used: 80, saved: 20 },
    { month: 'Jun', used: 60, saved: 40 }
  ];

  // Material composition percentages
  const materials = [
    { name: 'Cotton', percent: 45, color: '#143823' },
    { name: 'Denim', percent: 25, color: '#2C5E3B' },
    { name: 'Linen', percent: 15, color: '#688E6D' },
    { name: 'Jersey', percent: 10, color: '#A3BFA6' },
    { name: 'Others', percent: 5, color: '#D5DFD5' }
  ];

  return (
    <div className="space-y-6">
      
      {/* ========================================================
          1. HEADER BAR (Reference Screen 6)
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
              Sustainability
            </h1>
            <p className="text-xs text-[#5C665F]">
              Track your impact and contribute to a greener fashion industry.
            </p>
          </div>
        </div>

        {/* Project Selector & Export */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-white border border-[#DDD5C7] rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-[#7C857E]">Select Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-semibold text-stone-800 focus:outline-none cursor-pointer"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportReport}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Exporting...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. TOP METRIC CARDS (Reference Screen 6)
          ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Total Fabric Saved */}
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-medium text-[#7C857E]">Total Fabric Saved</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">{totalFabricSaved} m²</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E5EFE6] text-[#143823] flex items-center justify-center shrink-0">
            <Leaf className="w-5 h-5 text-[#143823]" />
          </div>
        </div>

        {/* Textile Waste Reduced */}
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-medium text-[#7C857E]">Textile Waste Reduced</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">{totalWasteReduced} kg</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FEF3E6] text-[#D97706] flex items-center justify-center shrink-0">
            <Recycle className="w-5 h-5 text-[#D97706]" />
          </div>
        </div>

        {/* Upcycled Products */}
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-medium text-[#7C857E]">Upcycled Products</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">{productsUpcycled}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] text-[#0D9488] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-[#0D9488]" />
          </div>
        </div>

        {/* CO2 Impact */}
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-medium text-[#7C857E]">CO₂ Impact (Est.)</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">{co2Impact} kg</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E5EFE6] text-[#143823] flex items-center justify-center shrink-0">
            <TreePine className="w-5 h-5 text-[#143823]" />
          </div>
        </div>

      </div>

      {/* ========================================================
          3. MIDDLE SECTION: FABRIC USAGE VS WASTE + MATERIAL COMPOSITION
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Fabric Usage vs Waste (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8E2D6] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#143823]">
              Fabric Usage vs Waste
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#143823]" />
                <span className="text-stone-600 text-[11px]">Fabric Used</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#8EAA90]" />
                <span className="text-stone-600 text-[11px]">Waste Saved</span>
              </div>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-4 pb-2">
            <div className="h-44 flex items-end justify-between gap-3 px-2 border-b border-[#DDD5C7]">
              {monthlyData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <div className="w-full max-w-[36px] flex items-end gap-1 h-full">
                    {/* Fabric Used bar */}
                    <div
                      className="flex-1 bg-[#143823] rounded-t-sm transition-all group-hover:bg-[#1A452B]"
                      style={{ height: `${d.used}%` }}
                      title={`Fabric Used: ${d.used}%`}
                    />
                    {/* Waste Saved bar */}
                    <div
                      className="flex-1 bg-[#8EAA90] rounded-t-sm transition-all group-hover:bg-[#7D9B7F]"
                      style={{ height: `${d.saved}%` }}
                      title={`Waste Saved: ${d.saved}%`}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[#7C857E] mt-1">
                    {d.month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Material Composition Donut Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8E2D6] p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-[#143823]">
            Material Composition
          </h2>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
            {/* SVG Donut Ring */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#FAF8F5" strokeWidth="16" />
                {/* Cotton 45% */}
                <circle
                  cx="50" cy="50" r="38" fill="none" stroke="#143823" strokeWidth="16"
                  strokeDasharray="107 238" strokeDashoffset="0"
                />
                {/* Denim 25% */}
                <circle
                  cx="50" cy="50" r="38" fill="none" stroke="#2C5E3B" strokeWidth="16"
                  strokeDasharray="59 238" strokeDashoffset="-107"
                />
                {/* Linen 15% */}
                <circle
                  cx="50" cy="50" r="38" fill="none" stroke="#688E6D" strokeWidth="16"
                  strokeDasharray="36 238" strokeDashoffset="-166"
                />
                {/* Jersey 10% */}
                <circle
                  cx="50" cy="50" r="38" fill="none" stroke="#A3BFA6" strokeWidth="16"
                  strokeDasharray="24 238" strokeDashoffset="-202"
                />
                {/* Others 5% */}
                <circle
                  cx="50" cy="50" r="38" fill="none" stroke="#D5DFD5" strokeWidth="16"
                  strokeDasharray="12 238" strokeDashoffset="-226"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="text-xs font-serif font-bold text-[#143823]">24.6 m²</span>
                <span className="text-[9px] text-[#7C857E]">Total Saved</span>
              </div>
            </div>

            {/* Material Legend */}
            <div className="space-y-2 text-xs">
              {materials.map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-4 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-stone-700 font-sans text-xs">{m.name}</span>
                  </div>
                  <span className="font-bold text-stone-900">{m.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================
          4. IMPACT HIGHLIGHTS (Reference Screen 6)
          ======================================================== */}
      <div>
        <h3 className="text-sm font-semibold text-[#143823] mb-3">Impact Highlights</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* Trees Saved */}
          <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 text-center shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#E5EFE6] text-[#143823] flex items-center justify-center mx-auto mb-2">
              <TreePine className="w-5 h-5 text-[#143823]" />
            </div>
            <p className="text-[11px] font-medium text-[#7C857E]">Trees Saved (Est.)</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">3.2</p>
          </div>

          {/* Water Conserved */}
          <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 text-center shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#E6F4F1] text-[#0D9488] flex items-center justify-center mx-auto mb-2">
              <CloudRain className="w-5 h-5 text-[#0D9488]" />
            </div>
            <p className="text-[11px] font-medium text-[#7C857E]">Water Conserved (L)</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">1,520</p>
          </div>

          {/* Energy Saved */}
          <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 text-center shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3E6] text-[#D97706] flex items-center justify-center mx-auto mb-2">
              <Zap className="w-5 h-5 text-[#D97706]" />
            </div>
            <p className="text-[11px] font-medium text-[#7C857E]">Energy Saved (kWh)</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">18.6</p>
          </div>

          {/* Landfill Waste Reduced */}
          <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 text-center shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#F4EDF8] text-[#8E2A8E] flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-5 h-5 text-[#8E2A8E]" />
            </div>
            <p className="text-[11px] font-medium text-[#7C857E]">Landfill Waste Reduced (kg)</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">8.2</p>
          </div>

        </div>
      </div>

    </div>
  );
}
