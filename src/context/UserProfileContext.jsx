import React, { createContext, useContext, useState, useEffect } from 'react';

const USER_PROFILE_STORAGE_KEY = 'loom_layer_atelier_profile_prefs_v1';

const DEFAULT_PROFILE = {
  name: 'Nancy',
  email: 'nonu@example.com',
  role: 'Student / Developer',
  organization: 'Loom & Layer',
  avatar: '/atelier/user_avatar.jpg',
  bio: 'Atelier pattern grading & sustainable circular nesting specialist.',
  preferences: {
    defaultFabric: 'Cotton',
    defaultSpacing: 0.5,
    allowRotation: true,
    respectGrain: true,
    optimizationPriority: 'Minimum Fabric Waste',
    autoSaveLayouts: true
  },
  units: {
    unitSystem: 'metric',
    precision: 1,
    areaUnit: 'm²',
    weightUnit: 'kg'
  },
  notifications: {
    emailNestingDone: true,
    scrapAlerts: true,
    weeklyESG: false,
    browserNotifications: true,
    notificationEmail: 'nonu@example.com'
  },
  dataStorage: {
    autoBackupCAD: true,
    keepHistoryDays: 90
  },
  integrations: {
    dxfAama: true,
    gerber: true,
    lectra: false,
    optitex: false,
    apiKey: 'll_live_948271038472'
  },
  appearance: {
    theme: 'cream',
    highContrastRulers: true,
    gridOpacity: 80,
    botanicalAccents: true
  }
};

const UserProfileContext = createContext(null);

export function UserProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          preferences: { ...DEFAULT_PROFILE.preferences, ...(parsed.preferences || {}) },
          units: { ...DEFAULT_PROFILE.units, ...(parsed.units || {}) },
          notifications: { ...DEFAULT_PROFILE.notifications, ...(parsed.notifications || {}) },
          dataStorage: { ...DEFAULT_PROFILE.dataStorage, ...(parsed.dataStorage || {}) },
          integrations: { ...DEFAULT_PROFILE.integrations, ...(parsed.integrations || {}) },
          appearance: { ...DEFAULT_PROFILE.appearance, ...(parsed.appearance || {}) }
        };
      }
    } catch (e) {
      console.warn('Failed to parse user profile from localStorage:', e);
    }
    return DEFAULT_PROFILE;
  });

  // Save to localStorage whenever profile changes
  useEffect(() => {
    try {
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save profile to localStorage:', e);
    }
  }, [profile]);

  const updateProfile = (updates) => {
    setProfile((prev) => ({
      ...prev,
      ...updates
    }));
  };

  const updateAvatar = (newAvatarUrl) => {
    setProfile((prev) => ({
      ...prev,
      avatar: newAvatarUrl
    }));
  };

  const resetAvatar = () => {
    setProfile((prev) => ({
      ...prev,
      avatar: DEFAULT_PROFILE.avatar
    }));
  };

  const updateSection = (section, updates) => {
    setProfile((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        ...updates
      }
    }));
  };

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        updateProfile,
        updateAvatar,
        resetAvatar,
        updateSection
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      profile: DEFAULT_PROFILE,
      updateProfile: () => {},
      updateAvatar: () => {},
      resetAvatar: () => {},
      updateSection: () => {}
    };
  }
  return context;
}
