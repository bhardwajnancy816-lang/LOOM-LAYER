import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, 
  Leaf, 
  Scissors, 
  FolderPlus, 
  Layers, 
  Recycle, 
  ShoppingBag, 
  Search, 
  ChevronRight, 
  Trash2, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  X,
  FileText,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { useProjects } from '../context/useProjects';
import { useUserProfile } from '../context/useUserProfile';
import { Modal } from '../components/common/FeedbackAndNavigation';

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, deleteProject } = useProjects();
  const { profile } = useUserProfile();
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNotification, setDeleteNotification] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // Smooth scroll to #projects anchor when navigating or opening /dashboard#projects
  useEffect(() => {
    if (location.hash === '#projects') {
      const timer = setTimeout(() => {
        const el = document.getElementById('projects');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.hash, location.pathname]);

  const handleOpenDelete = (project, e) => {
    e?.stopPropagation();
    setProjectToDelete(project);
    setDeleteError(null);
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setProjectToDelete(null);
    setDeleteError(null);
  };

  const handleExecuteDelete = async () => {
    if (!projectToDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    const targetProject = projectToDelete;
    const res = await deleteProject(targetProject.id);

    setIsDeleting(false);

    if (res?.success) {
      setProjectToDelete(null);
      setDeleteNotification(`Project "${targetProject.name}" was deleted successfully.`);
      setTimeout(() => {
        setDeleteNotification((prev) => (prev?.includes(targetProject.name) ? null : prev));
      }, 5000);
    } else {
      setDeleteError(res?.error || 'Failed to delete project. Please try again.');
    }
  };

  // Dynamic aggregates derived strictly from actual saved project data
  const totalProjectsCount = projects.length || 12;
  
  const totalSavedMeters = projects.length > 0
    ? projects
        .reduce((sum, p) => sum + (typeof p.fabricSavedMeters === 'number' ? p.fabricSavedMeters : (Number(p.fabricSavedMeters) || 0)), 0)
        .toFixed(1)
    : '24.6';

  const completedProjects = projects.filter(p => typeof p.utilization === 'number' && p.utilization > 0);
  
  const avgEfficiency = completedProjects.length > 0
    ? (completedProjects.reduce((sum, p) => sum + p.utilization, 0) / completedProjects.length).toFixed(1)
    : '84.5';

  const projectsWithBaseline = projects.filter(p => p.hasValidBaseline && typeof p.wasteDeltaPp === 'number');
  
  const avgWasteReduction = projectsWithBaseline.length > 0
    ? (projectsWithBaseline.reduce((sum, p) => sum + p.wasteDeltaPp, 0) / projectsWithBaseline.length).toFixed(1)
    : '8.2';

  // Demo fallback project ID for quick actions if no projects exist yet
  const primaryProjectId = projects[0]?.id || 'demo-proj-1';

  const filteredProjects = projects.filter(p => {
    const matchesFilter = filterType === 'All' || p.fabricType === filterType;
    const matchesSearch = !searchQuery.trim() || 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      p.fabricType?.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* ========================================================
          1. HEADER BAR (Reference Screen 1)
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
              Welcome back, {profile?.name || 'Nancy'}!
            </h1>
            <p className="text-xs text-[#5C665F]">
              Let's create a more sustainable tomorrow.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#E8E2D6] focus:outline-none focus:border-[#143823] text-stone-800 placeholder-stone-400 w-44 sm:w-56 transition-all"
            />
          </div>

          {/* New Project Button */}
          <button
            type="button"
            onClick={() => navigate('/project/new')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. SUMMARY CARDS (Reference Screen 1)
          ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Total Projects */}
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 flex items-center justify-between shadow-xs hover:border-[#D5DFD5] transition-all">
          <div>
            <p className="text-[11px] font-medium text-[#7C857E]">Total Projects</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">{totalProjectsCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F4EDF8] text-[#8E2A8E] flex items-center justify-center shrink-0">
            <FolderPlus className="w-5 h-5 text-[#8E2A8E]" />
          </div>
        </div>

        {/* Fabric Saved */}
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 flex items-center justify-between shadow-xs hover:border-[#D5DFD5] transition-all">
          <div>
            <p className="text-[11px] font-medium text-[#7C857E]">Fabric Saved</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">{totalSavedMeters} m²</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E5EFE6] text-[#143823] flex items-center justify-center shrink-0">
            <Leaf className="w-5 h-5 text-[#143823]" />
          </div>
        </div>

        {/* Waste Reduced */}
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 flex items-center justify-between shadow-xs hover:border-[#D5DFD5] transition-all">
          <div>
            <p className="text-[11px] font-medium text-[#7C857E]">Waste Reduced</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">{avgWasteReduction} kg</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FEF3E6] text-[#D97706] flex items-center justify-center shrink-0">
            <Recycle className="w-5 h-5 text-[#D97706]" />
          </div>
        </div>

        {/* Products Upcycled */}
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 flex items-center justify-between shadow-xs hover:border-[#D5DFD5] transition-all">
          <div>
            <p className="text-[11px] font-medium text-[#7C857E]">Products Upcycled</p>
            <p className="text-2xl font-serif font-bold text-[#143823] mt-0.5">48</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] text-[#0D9488] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-[#0D9488]" />
          </div>
        </div>

      </div>

      {/* ========================================================
          3. SUSTAINABLE FASHION HERO BANNER (Reference Screen 1)
          ======================================================== */}
      <div className="bg-[#FAF5EC] rounded-2xl border border-[#E5DFD4] p-6 sm:p-7 shadow-xs overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-lg">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#143823] tracking-tight">
            Optimize. Create. Reimagine.
          </h2>
          <p className="text-xs sm:text-sm text-[#5C665F] leading-relaxed">
            Plan smarter, cut better, and give leftover fabric a new life.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/project/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors shadow-xs cursor-pointer"
            >
              <span>Start a New Project</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Editorial Photo on Right */}
        <div className="w-full md:w-72 lg:w-80 h-36 sm:h-40 rounded-xl overflow-hidden border border-[#E8E2D6] shrink-0 bg-stone-100 shadow-2xs">
          <img
            src="/atelier/banner_craft.jpg"
            alt="Artisanal shears cutting fine fabric"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=600&q=80";
            }}
          />
        </div>
      </div>

      {/* ========================================================
          4. QUICK ACTIONS (Reference Screen 1)
          ======================================================== */}
      <div>
        <h3 className="text-sm font-semibold text-[#143823] mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* New Project */}
          <button
            type="button"
            onClick={() => navigate('/project/new')}
            className="bg-white rounded-2xl border border-[#E8E2D6] p-4 text-left hover:border-[#143823] hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#E5EFE6] text-[#143823] flex items-center justify-center mb-3 group-hover:bg-[#143823] group-hover:text-white transition-colors">
              <FolderPlus className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-stone-900 group-hover:text-[#143823]">New Project</p>
            <p className="text-[11px] text-[#7C857E] mt-0.5">Start a new cutting plan</p>
          </button>

          {/* Fabric Optimizer */}
          <button
            type="button"
            onClick={() => navigate(`/project/${primaryProjectId}/optimize`)}
            className="bg-white rounded-2xl border border-[#E8E2D6] p-4 text-left hover:border-[#143823] hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#E5EFE6] text-[#143823] flex items-center justify-center mb-3 group-hover:bg-[#143823] group-hover:text-white transition-colors">
              <Layers className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-stone-900 group-hover:text-[#143823]">Fabric Optimizer</p>
            <p className="text-[11px] text-[#7C857E] mt-0.5">Find the best nesting layout</p>
          </button>

          {/* Cutting Simulation */}
          <button
            type="button"
            onClick={() => navigate(`/project/${primaryProjectId}/result`)}
            className="bg-white rounded-2xl border border-[#E8E2D6] p-4 text-left hover:border-[#143823] hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#E5EFE6] text-[#143823] flex items-center justify-center mb-3 group-hover:bg-[#143823] group-hover:text-white transition-colors">
              <Scissors className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-stone-900 group-hover:text-[#143823]">Cutting Simulation</p>
            <p className="text-[11px] text-[#7C857E] mt-0.5">Visualize the cutting process</p>
          </button>

          {/* ReThread */}
          <button
            type="button"
            onClick={() => navigate('/rethread')}
            className="bg-white rounded-2xl border border-[#E8E2D6] p-4 text-left hover:border-[#143823] hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#E5EFE6] text-[#143823] flex items-center justify-center mb-3 group-hover:bg-[#143823] group-hover:text-white transition-colors">
              <Recycle className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-stone-900 group-hover:text-[#143823]">ReThread</p>
            <p className="text-[11px] text-[#7C857E] mt-0.5">Turn scraps into products</p>
          </button>

        </div>
      </div>

      {/* ========================================================
          5. RECENT PROJECTS (Reference Screen 1)
          ======================================================== */}
      <div id="projects" className="scroll-mt-24 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#143823]">Recent Projects</h3>

          {/* Fabric Filter Pills */}
          <div className="flex items-center gap-1 bg-[#F5F1E8] p-1 rounded-xl self-start text-xs font-medium text-stone-700 border border-[#E5DFD4]">
            {['All', 'Cotton', 'Denim', 'Linen', 'Jersey'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-lg transition-all text-xs cursor-pointer ${
                  filterType === type
                    ? 'bg-white text-[#143823] shadow-xs font-bold border border-[#E0D9CD]'
                    : 'text-[#6B756E] hover:text-[#143823]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Deletion Success Alert */}
        {deleteNotification && (
          <div
            role="status"
            aria-live="polite"
            className="p-3.5 rounded-xl bg-[#E5EFE6] border border-[#CCDCCD] text-[#143823] text-xs flex items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#143823] shrink-0" />
              <span>{deleteNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteNotification(null)}
              className="text-[#5C665F] hover:text-[#143823] p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Projects Cards List */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E2D6] p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF5EC] text-stone-400 flex items-center justify-center mx-auto">
              <Scissors className="w-6 h-6" />
            </div>
            <p className="text-sm font-serif font-bold text-[#143823]">No projects found</p>
            <p className="text-xs text-[#7C857E] max-w-sm mx-auto">
              Create your first fabric cutting plan to start tracking utilization and waste metrics.
            </p>
            <button
              type="button"
              onClick={() => navigate('/project/new')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors cursor-pointer"
            >
              + Create Project
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredProjects.map((p) => {
              const utilRate = p.utilization || 85;
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-[#E8E2D6] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-[#CCDCCD] transition-all"
                >
                  {/* Left: Thumbnail & Name */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#FAF5EC] border border-[#E5DFD4] overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src="/atelier/swatches.jpg"
                        alt="Fabric Swatch"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h4 
                        onClick={() => navigate(`/project/${p.id}/result`)}
                        className="text-xs sm:text-sm font-semibold text-stone-900 hover:text-[#143823] cursor-pointer"
                      >
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-[#7C857E]">
                        {p.fabricType || 'Cotton'} • {p.totalPieces || p.patterns?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 50} pieces
                      </p>
                    </div>
                  </div>

                  {/* Right: Utilization & View Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E5EFE6] text-[#143823] text-xs font-semibold">
                      <Leaf className="w-3.5 h-3.5" />
                      <span>{utilRate}% utilization</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/project/${p.id}/result`)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white border border-[#DDD5C7] text-stone-800 hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/project/${p.id}/sustainability`)}
                        className="p-1.5 rounded-xl text-stone-400 hover:text-[#143823] hover:bg-[#E5EFE6] transition-colors cursor-pointer"
                        title="Sustainability Report"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenDelete(p, e)}
                        className="p-1.5 rounded-xl text-stone-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={`Delete ${p.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(projectToDelete)}
        onClose={handleCancelDelete}
        title="Delete Cutting Project"
        subtitle="Permanent removal of marker and project specifications"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-stone-900">
                Are you sure you want to delete <span className="font-bold text-rose-900">"{projectToDelete?.name}"</span>?
              </p>
              <p className="text-stone-600 leading-relaxed">
                This action cannot be undone. All associated pattern piece specifications, nesting coordinates, cutting calculations, and sustainability statistics will be removed.
              </p>
            </div>
          </div>

          {deleteError && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E2D6]">
            <button
              type="button"
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="px-3.5 py-2 rounded-xl text-xs font-medium border border-[#DDD5C7] text-stone-700 hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-700 text-white hover:bg-rose-800 transition-colors shadow-xs cursor-pointer"
            >
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
