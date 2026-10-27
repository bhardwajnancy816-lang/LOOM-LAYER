import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Settings as SettingsIcon, 
  Ruler, 
  Bell, 
  Database, 
  Layers, 
  Palette, 
  CheckCircle2, 
  Camera, 
  Leaf,
  LogOut,
  Upload,
  Trash2,
  Download,
  Copy,
  Check,
  RotateCw,
  Sliders,
  Sparkles,
  Zap,
  Scale,
  Cpu,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useUserProfile } from '../context/useUserProfile';
import { useProjects } from '../context/useProjects';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, updateProfile, updateAvatar, resetAvatar, updateSection } = useUserProfile();
  const { projects } = useProjects();
  const [activeTab, setActiveTab] = useState('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [cacheClearSuccess, setCacheClearSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Local state initialized from profile context
  const [localProfile, setLocalProfile] = useState({
    name: profile.name || 'Nancy',
    email: profile.email || 'nonu@example.com',
    role: profile.role || 'Student / Developer',
    organization: profile.organization || 'Loom & Layer',
    bio: profile.bio || 'Atelier pattern grading & sustainable circular nesting specialist.'
  });

  const [localPrefs, setLocalPrefs] = useState({ ...profile.preferences });
  const [localUnits, setLocalUnits] = useState({ ...profile.units });
  const [localNotifs, setLocalNotifs] = useState({ ...profile.notifications });
  const [localIntegrations, setLocalIntegrations] = useState({ ...profile.integrations });
  const [localAppearance, setLocalAppearance] = useState({ ...profile.appearance });

  // Handle Photo Upload
  const handlePhotoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        updateAvatar(dataUrl);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    resetAvatar();
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveProfile = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    updateProfile(localProfile);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSavePreferences = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    updateSection('preferences', localPrefs);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveUnits = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    updateSection('units', localUnits);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveNotifications = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    updateSection('notifications', localNotifs);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveIntegrations = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    updateSection('integrations', localIntegrations);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveAppearance = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    updateSection('appearance', localAppearance);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Export all projects and configuration to a JSON backup
  const handleExportAllData = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        profile,
        projects: projects || [],
        savedReThreadPlans: JSON.parse(localStorage.getItem('rethread_saved_plans_v1') || '[]')
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loom_and_layer_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export data', e);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear saved ReThread scrap plans and cached simulation states? Your main projects will be preserved.')) {
      localStorage.removeItem('rethread_saved_plans_v1');
      setCacheClearSuccess(true);
      setTimeout(() => setCacheClearSuccess(false), 3000);
    }
  };

  const handleCopyApiKey = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(localIntegrations.apiKey || 'll_live_948271038472');
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const menuItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'units', label: 'Units & Measurements', icon: Ruler },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data & Storage', icon: Database },
    { id: 'integrations', label: 'Integrations', icon: Layers },
    { id: 'appearance', label: 'Appearance', icon: Palette }
  ];

  return (
    <div className="space-y-6">
      
      {/* ========================================================
          1. HEADER BAR
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-[#D8DFD8] shadow-xs bg-[#E5EFE6] shrink-0">
            <img
              src={profile.avatar || "/atelier/user_avatar.jpg"}
              alt="Designer Profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/atelier/user_avatar.jpg";
              }}
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#143823] tracking-tight">
              Settings
            </h1>
            <p className="text-xs text-[#5C665F]">
              Manage your account preferences and application settings.
            </p>
          </div>
        </div>

        {user && (
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate('/dashboard');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* Save Success Alert Notification */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-[#E5EFE6] border border-[#CCDCCD] text-[#143823] text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#143823] shrink-0" />
            <span>Settings updated and saved successfully!</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(false)}
            className="text-[#143823] text-xs font-bold px-2 py-0.5 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================
          2. TWO-COLUMN LAYOUT: SUB-NAV + SETTINGS CONTENT
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sub-Navigation Menu (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E8E2D6] p-3 shadow-xs space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#E5EFE6] text-[#143823] font-bold border border-[#D5DFD5]'
                    : 'text-stone-700 hover:bg-[#FAF8F5] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#143823]' : 'text-stone-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings Content Card (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E8E2D6] p-6 sm:p-7 shadow-xs relative overflow-hidden">
          
          {/* Subtle Botanical Leaf Accent in background */}
          <div className="absolute top-6 right-6 pointer-events-none opacity-20 text-[#143823]">
            <Leaf className="w-24 h-24" />
          </div>

          {/* ========================================================
              TAB 1: PROFILE INFORMATION
              ======================================================== */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-sm font-semibold text-[#143823] mb-6">
                Profile Information
              </h2>

              <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl relative z-10">
                
                {/* Avatar Photo Section with Functional File Picker */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#D5DFD5] bg-[#E5EFE6] shrink-0 shadow-xs relative group">
                    <img
                      src={profile.avatar || "/atelier/user_avatar.jpg"}
                      alt="Profile Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/atelier/user_avatar.jpg";
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium border border-[#DDD5C7] bg-[#FAF8F5] text-stone-700 hover:bg-white hover:border-[#143823] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#143823]" />
                        <span>Change Photo</span>
                      </button>

                      {profile.avatar && profile.avatar !== '/atelier/user_avatar.jpg' && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-medium border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400">JPG, PNG or WebP. Max size 5MB.</p>
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                      Name
                    </label>
                    <input
                      type="text"
                      value={localProfile.name}
                      onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all"
                      placeholder="e.g. Nancy"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={localProfile.email}
                      onChange={(e) => setLocalProfile({ ...localProfile, email: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all"
                      placeholder="e.g. nonu@example.com"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                      Role
                    </label>
                    <input
                      type="text"
                      value={localProfile.role}
                      onChange={(e) => setLocalProfile({ ...localProfile, role: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all"
                      placeholder="e.g. Student / Developer"
                    />
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                      Organization
                    </label>
                    <input
                      type="text"
                      value={localProfile.organization}
                      onChange={(e) => setLocalProfile({ ...localProfile, organization: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all"
                      placeholder="e.g. Loom & Layer"
                    />
                  </div>
                </div>

                {/* Bio / Atelier Notes */}
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                    Atelier Notes & Bio
                  </label>
                  <textarea
                    rows={2}
                    value={localProfile.bio}
                    onChange={(e) => setLocalProfile({ ...localProfile, bio: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all resize-none"
                    placeholder="Short description of your atelier or production focus..."
                  />
                </div>

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ========================================================
              TAB 2: PREFERENCES
              ======================================================== */}
          {activeTab === 'preferences' && (
            <div>
              <h2 className="text-sm font-semibold text-[#143823] mb-6">
                Cutting & Nesting Preferences
              </h2>

              <form onSubmit={handleSavePreferences} className="space-y-6 max-w-xl relative z-10">
                
                {/* Default Fabric Selection */}
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                    Default Fabric Material
                  </label>
                  <select
                    value={localPrefs.defaultFabric}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, defaultFabric: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all cursor-pointer"
                  >
                    <option value="Cotton">Cotton (Plain Weave / Poplin)</option>
                    <option value="Denim">Heavy Denim (Twill)</option>
                    <option value="Linen">Linen (Bespoke Suiting)</option>
                    <option value="Jersey">Jersey (Stretch Knit)</option>
                    <option value="Polyester">Polyester (Performance)</option>
                    <option value="Silk">Silk / Satin (Delicate Weave)</option>
                  </select>
                </div>

                {/* Default Blade Clearance Spacing */}
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                    Default Clearance Spacing (cm)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="3.0"
                      value={localPrefs.defaultSpacing}
                      onChange={(e) => setLocalPrefs({ ...localPrefs, defaultSpacing: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all"
                    />
                    <span className="text-xs font-mono font-semibold px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7] text-stone-600">
                      cm
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7C857E] mt-1">Recommended 0.5 cm for automated CNC cutter beds.</p>
                </div>

                {/* Toggle Controls */}
                <div className="space-y-3 pt-2">
                  {/* Rotation Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <div>
                      <span className="text-xs font-semibold text-stone-900 block">Allow 180° Pattern Rotation</span>
                      <span className="text-[11px] text-[#7C857E]">Permit symmetric garment pieces to rotate for higher nesting yield</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalPrefs({ ...localPrefs, allowRotation: !localPrefs.allowRotation })}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        localPrefs.allowRotation ? 'bg-[#143823]' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white shadow-xs block transition-transform absolute top-1 ${
                          localPrefs.allowRotation ? 'left-5' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Grain Lock Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <div>
                      <span className="text-xs font-semibold text-stone-900 block">Strict Grainline Alignment Lock</span>
                      <span className="text-[11px] text-[#7C857E]">Strictly respect warp and weft textile fiber directions</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalPrefs({ ...localPrefs, respectGrain: !localPrefs.respectGrain })}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        localPrefs.respectGrain ? 'bg-[#143823]' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white shadow-xs block transition-transform absolute top-1 ${
                          localPrefs.respectGrain ? 'left-5' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Auto-save Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <div>
                      <span className="text-xs font-semibold text-stone-900 block">Auto-save Nested Marker Layouts</span>
                      <span className="text-[11px] text-[#7C857E]">Automatically persist layout variants to browser storage</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalPrefs({ ...localPrefs, autoSaveLayouts: !localPrefs.autoSaveLayouts })}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        localPrefs.autoSaveLayouts ? 'bg-[#143823]' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white shadow-xs block transition-transform absolute top-1 ${
                          localPrefs.autoSaveLayouts ? 'left-5' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors shadow-xs cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ========================================================
              TAB 3: UNITS & MEASUREMENTS
              ======================================================== */}
          {activeTab === 'units' && (
            <div>
              <h2 className="text-sm font-semibold text-[#143823] mb-6">
                Units & Measurement Standards
              </h2>

              <form onSubmit={handleSaveUnits} className="space-y-6 max-w-xl relative z-10">
                
                {/* Unit System Cards */}
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-2">
                    Measurement System
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLocalUnits({ ...localUnits, unitSystem: 'metric', areaUnit: 'm²', weightUnit: 'kg' })}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        localUnits.unitSystem === 'metric'
                          ? 'border-[#143823] bg-[#E5EFE6] ring-1 ring-[#143823]'
                          : 'border-[#DDD5C7] bg-[#FAF8F5]'
                      }`}
                    >
                      <span className="text-xs font-bold text-stone-900 block">Metric System</span>
                      <span className="text-[11px] text-[#7C857E]">Centimeters (cm), Meters (m), Kilograms (kg)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLocalUnits({ ...localUnits, unitSystem: 'imperial', areaUnit: 'yd²', weightUnit: 'lb' })}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        localUnits.unitSystem === 'imperial'
                          ? 'border-[#143823] bg-[#E5EFE6] ring-1 ring-[#143823]'
                          : 'border-[#DDD5C7] bg-[#FAF8F5]'
                      }`}
                    >
                      <span className="text-xs font-bold text-stone-900 block">Imperial System</span>
                      <span className="text-[11px] text-[#7C857E]">Inches (in), Yards (yd), Pounds (lb)</span>
                    </button>
                  </div>
                </div>

                {/* Precision & Decimals */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                      Decimal Coordinate Precision
                    </label>
                    <select
                      value={localUnits.precision}
                      onChange={(e) => setLocalUnits({ ...localUnits, precision: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all cursor-pointer"
                    >
                      <option value={0}>0 decimals (e.g. 150 cm)</option>
                      <option value={1}>1 decimal (e.g. 150.5 cm)</option>
                      <option value={2}>2 decimals (e.g. 150.55 cm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                      Fabric Area Metric
                    </label>
                    <select
                      value={localUnits.areaUnit}
                      onChange={(e) => setLocalUnits({ ...localUnits, areaUnit: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all cursor-pointer"
                    >
                      <option value="m²">Square Meters (m²)</option>
                      <option value="yd²">Square Yards (yd²)</option>
                      <option value="ft²">Square Feet (ft²)</option>
                    </select>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors shadow-xs cursor-pointer"
                  >
                    Save Units
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ========================================================
              TAB 4: NOTIFICATIONS
              ======================================================== */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-sm font-semibold text-[#143823] mb-6">
                Notification & Alert Preferences
              </h2>

              <form onSubmit={handleSaveNotifications} className="space-y-4 max-w-xl relative z-10">
                
                {/* Email Delivery Input */}
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                    Notification Recipient Email
                  </label>
                  <input
                    type="email"
                    value={localNotifs.notificationEmail || localProfile.email}
                    onChange={(e) => setLocalNotifs({ ...localNotifs, notificationEmail: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] text-stone-900 focus:bg-white focus:outline-none focus:border-[#143823] transition-all"
                  />
                </div>

                {/* Notification Toggles */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <div>
                      <span className="text-xs font-semibold text-stone-900 block">Nesting Optimization Finished</span>
                      <span className="text-[11px] text-[#7C857E]">Receive an alert when algorithmic cutting solver completes</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalNotifs({ ...localNotifs, emailNestingDone: !localNotifs.emailNestingDone })}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        localNotifs.emailNestingDone ? 'bg-[#143823]' : 'bg-stone-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white shadow-xs block transition-transform absolute top-1 ${localNotifs.emailNestingDone ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <div>
                      <span className="text-xs font-semibold text-stone-900 block">High Scrap Offcut Warning</span>
                      <span className="text-[11px] text-[#7C857E]">Alert when pattern arrangement generates more than 25% waste</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalNotifs({ ...localNotifs, scrapAlerts: !localNotifs.scrapAlerts })}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        localNotifs.scrapAlerts ? 'bg-[#143823]' : 'bg-stone-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white shadow-xs block transition-transform absolute top-1 ${localNotifs.scrapAlerts ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <div>
                      <span className="text-xs font-semibold text-stone-900 block">Weekly ESG & Sustainability Digest</span>
                      <span className="text-[11px] text-[#7C857E]">Weekly report on meters saved and upcycled products made</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalNotifs({ ...localNotifs, weeklyESG: !localNotifs.weeklyESG })}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        localNotifs.weeklyESG ? 'bg-[#143823]' : 'bg-stone-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white shadow-xs block transition-transform absolute top-1 ${localNotifs.weeklyESG ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors shadow-xs cursor-pointer"
                  >
                    Save Notifications
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ========================================================
              TAB 5: DATA & STORAGE
              ======================================================== */}
          {activeTab === 'data' && (
            <div>
              <h2 className="text-sm font-semibold text-[#143823] mb-6">
                Data Management & Storage
              </h2>

              <div className="space-y-5 max-w-xl relative z-10">
                
                {/* Storage Meter Card */}
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800">Browser Cache Usage</span>
                    <span className="font-mono text-[#143823] font-bold">1.2 MB / 5.0 MB</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                    <div className="h-full bg-[#143823] rounded-full" style={{ width: '24%' }} />
                  </div>
                  <p className="text-[11px] text-[#7C857E]">
                    Stores your active pattern coordinates, fabric swatches, and saved ReThread tickets locally.
                  </p>
                </div>

                {/* Action Cards */}
                <div className="space-y-3">
                  {/* Export All Data */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#DDD5C7] hover:border-[#143823] transition-colors">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">Export Atelier Backup</span>
                      <span className="text-[11px] text-[#7C857E]">Download all projects, cutting plans, and profiles as a .json file</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportAllData}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>
                  </div>

                  {/* Clear ReThread Scraps */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#DDD5C7] hover:border-rose-300 transition-colors">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">Clear Saved Upcycling Tickets</span>
                      <span className="text-[11px] text-[#7C857E]">Purge saved ReThread plans while preserving core project records</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCache}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Cache</span>
                    </button>
                  </div>
                </div>

                {cacheClearSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Upcycling tickets and cache cleared successfully.</span>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ========================================================
              TAB 6: INTEGRATIONS
              ======================================================== */}
          {activeTab === 'integrations' && (
            <div>
              <h2 className="text-sm font-semibold text-[#143823] mb-6">
                Connected CAD & CAM Systems
              </h2>

              <form onSubmit={handleSaveIntegrations} className="space-y-5 max-w-xl relative z-10">
                
                {/* CAM Cutting Bed Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">DXF-AAMA / ASTM CAD Export</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      </div>
                      <span className="text-[11px] text-[#7C857E]">Standard universal nesting vectors for apparel plotters</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#143823]">Default</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">Gerber Technology CAM Automation</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E5EFE6] text-[#143823]">
                          Compatible
                        </span>
                      </div>
                      <span className="text-[11px] text-[#7C857E]">Direct format export for multi-ply automated cutter machines</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalIntegrations({ ...localIntegrations, gerber: !localIntegrations.gerber })}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        localIntegrations.gerber ? 'bg-[#143823]' : 'bg-stone-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white shadow-xs block transition-transform absolute top-1 ${localIntegrations.gerber ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">Lectra Vector Cutting Systems</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E5EFE6] text-[#143823]">
                          Compatible
                        </span>
                      </div>
                      <span className="text-[11px] text-[#7C857E]">Continuous contour toolpath optimization for Lectra cutters</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalIntegrations({ ...localIntegrations, lectra: !localIntegrations.lectra })}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        localIntegrations.lectra ? 'bg-[#143823]' : 'bg-stone-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white shadow-xs block transition-transform absolute top-1 ${localIntegrations.lectra ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                {/* API Key Box */}
                <div className="p-4 rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-800">Atelier REST API Key</span>
                    <span className="text-[10px] text-stone-400 font-mono">Live Factory Production</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      readOnly
                      value={localIntegrations.apiKey || 'll_live_948271038472'}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-[#DDD5C7] bg-white text-stone-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyApiKey}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#DDD5C7] bg-white text-stone-700 hover:bg-[#FAF8F5] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors shadow-xs cursor-pointer"
                  >
                    Save Integrations
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ========================================================
              TAB 7: APPEARANCE
              ======================================================== */}
          {activeTab === 'appearance' && (
            <div>
              <h2 className="text-sm font-semibold text-[#143823] mb-6">
                Visual Theme & Display Options
              </h2>

              <form onSubmit={handleSaveAppearance} className="space-y-5 max-w-xl relative z-10">
                
                {/* Theme Palette Cards */}
                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-2">
                    Application Palette
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-[#143823] bg-[#E5EFE6] ring-1 ring-[#143823]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 rounded-full bg-[#143823]" />
                        <span className="text-xs font-bold text-stone-900">Atelier Warm Cream</span>
                      </div>
                      <span className="text-[11px] text-[#7C857E]">Editorial parchment, forest-green accents & sage surfaces</span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-[#DDD5C7] bg-[#FAF8F5] opacity-60">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 rounded-full bg-stone-900" />
                        <span className="text-xs font-bold text-stone-900">Editorial Dark Mode</span>
                      </div>
                      <span className="text-[11px] text-[#7C857E]">High-contrast cutting room night mode (Auto-synced)</span>
                    </div>
                  </div>
                </div>

                {/* Appearance Toggles */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <div>
                      <span className="text-xs font-semibold text-stone-900 block">High Contrast Canvas Rulers</span>
                      <span className="text-[11px] text-[#7C857E]">Crisp 1cm calibration markings along fabric length and width</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalAppearance({ ...localAppearance, highContrastRulers: !localAppearance.highContrastRulers })}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        localAppearance.highContrastRulers ? 'bg-[#143823]' : 'bg-stone-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white shadow-xs block transition-transform absolute top-1 ${localAppearance.highContrastRulers ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
                    <div>
                      <span className="text-xs font-semibold text-stone-900 block">Botanical Art Watermarks</span>
                      <span className="text-[11px] text-[#7C857E]">Display subtle sustainable fashion botanical illustrations</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocalAppearance({ ...localAppearance, botanicalAccents: !localAppearance.botanicalAccents })}
                      className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                        localAppearance.botanicalAccents ? 'bg-[#143823]' : 'bg-stone-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white shadow-xs block transition-transform absolute top-1 ${localAppearance.botanicalAccents ? 'left-5' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors shadow-xs cursor-pointer"
                  >
                    Save Appearance
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
