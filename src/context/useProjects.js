import { useContext } from 'react';
import { ProjectContext } from './ProjectContextDefinition';

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
