import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { RootLayout } from './layouts/RootLayout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { AddPatternsPage } from './pages/AddPatternsPage';
import { OptimizeSettingsPage } from './pages/OptimizeSettingsPage';
import { OptimizeResultPage } from './pages/OptimizeResultPage';
import { SustainabilityReportPage } from './pages/SustainabilityReportPage';
import { ProfilePage } from './pages/ProfilePage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { ReThreadPage } from './pages/ReThreadPage';
import { ReportsPage } from './pages/ReportsPage';

import { UserProfileProvider } from './context/UserProfileContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProfileProvider>
          <ProjectProvider>
            <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="rethread" element={<ReThreadPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="project/new" element={<NewProjectPage />} />
              <Route path="project/:id/patterns" element={<AddPatternsPage />} />
              <Route path="project/:id/optimize" element={<OptimizeSettingsPage />} />
              <Route path="project/:id/result" element={<OptimizeResultPage />} />
              <Route path="project/:id/sustainability" element={<SustainabilityReportPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<ProfilePage />} />
              <Route path="sustainability" element={<SustainabilityReportPage />} />
              <Route path="new-project" element={<Navigate to="/project/new" replace />} />
              <Route path="optimizer" element={<Navigate to="/project/demo-proj-1/optimize" replace />} />
              <Route path="simulation" element={<Navigate to="/project/demo-proj-1/result" replace />} />
              <Route path="privacy" element={<PrivacyPolicyPage />} />
              <Route path="terms" element={<TermsPage />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </UserProfileProvider>
  </AuthProvider>
</ThemeProvider>
  );
}
