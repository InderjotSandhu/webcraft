import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AppState, User, Project, Template, TemplateCategory } from '../../types'

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // User state
        user: null,
        setUser: (user: User | null) => set({ user }),

        // Current project state
        currentProject: null,
        setCurrentProject: (project: Project | null) => set({ currentProject: project }),

        // UI state
        isLoading: false,
        setIsLoading: (loading: boolean) => set({ isLoading: loading }),

        // Template gallery state
        templates: [],
        setTemplates: (templates: Template[]) => set({ templates }),
        selectedCategory: 'all',
        setSelectedCategory: (category: TemplateCategory | 'all') => set({ selectedCategory: category }),

        // Projects state
        projects: [],
        setProjects: (projects: any[]) => set({ projects }),
      }),
      {
        name: 'webcraft-store',
        // Only persist user and UI preferences, not temporary state
        partialize: (state) => ({
          user: state.user,
          selectedCategory: state.selectedCategory,
        }),
      }
    ),
    {
      name: 'webcraft-store',
    }
  )
)
