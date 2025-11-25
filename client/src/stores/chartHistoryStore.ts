/**
 * Zustand store for managing chart modification history and templates.
 *
 * Enables undo/redo functionality for visualization changes.
 * Stores up to 10 visualization states for each query.
 * Also manages saved chart templates.
 *
 * Features:
 * - Track visualization changes over time
 * - Undo/redo functionality
 * - Version indicator (e.g., "Version 3 of 5")
 * - Save and load chart templates
 * - Persists to localStorage
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { VisualizationSpec } from "../types";

/**
 * Saved chart template
 */
export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  visualizationSpec: VisualizationSpec;
  createdAt: number;
  thumbnail?: string; // Base64 encoded preview image
}

/**
 * A snapshot of a visualization state
 */
export interface ChartSnapshot {
  id: string;
  visualizationSpec: VisualizationSpec;
  timestamp: number;
  description: string; // e.g., "Changed colors to blue"
}

/**
 * History entry for a specific query
 */
export interface QueryChartHistory {
  queryId: string;
  originalSpec: VisualizationSpec;
  snapshots: ChartSnapshot[];
  currentIndex: number; // Points to current snapshot in history
}

interface ChartHistoryStore {
  // Map of queryId -> chart history
  histories: Record<string, QueryChartHistory>;

  // Saved chart templates
  templates: ChartTemplate[];

  // Maximum snapshots to keep per query
  maxSnapshots: number;

  // History Actions
  initializeHistory: (queryId: string, originalSpec: VisualizationSpec) => void;
  addSnapshot: (
    queryId: string,
    spec: VisualizationSpec,
    description: string,
  ) => void;
  undo: (queryId: string) => VisualizationSpec | null;
  redo: (queryId: string) => VisualizationSpec | null;
  canUndo: (queryId: string) => boolean;
  canRedo: (queryId: string) => boolean;
  getCurrentIndex: (queryId: string) => number;
  getTotalSnapshots: (queryId: string) => number;
  getOriginalSpec: (queryId: string) => VisualizationSpec | null;
  resetToOriginal: (queryId: string) => VisualizationSpec | null;
  clearHistory: (queryId: string) => void;
  clearAllHistories: () => void;

  // Template Actions
  saveTemplate: (
    name: string,
    description: string,
    spec: VisualizationSpec,
    thumbnail?: string,
  ) => ChartTemplate;
  deleteTemplate: (templateId: string) => void;
  getTemplates: () => ChartTemplate[];
  applyTemplate: (templateId: string) => VisualizationSpec | null;
}

/**
 * Generate a unique snapshot ID
 */
function generateSnapshotId(): string {
  return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a unique template ID
 */
function generateTemplateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Chart History Store
 * Manages undo/redo functionality for visualization modifications
 */
export const useChartHistoryStore = create<ChartHistoryStore>()(
  persist(
    (set, get) => ({
      histories: {},
      templates: [],
      maxSnapshots: 10,

      initializeHistory: (queryId, originalSpec) => {
        const existing = get().histories[queryId];
        if (existing) return; // Don't reinitialize existing history

        set((state) => ({
          histories: {
            ...state.histories,
            [queryId]: {
              queryId,
              originalSpec,
              snapshots: [
                {
                  id: generateSnapshotId(),
                  visualizationSpec: originalSpec,
                  timestamp: Date.now(),
                  description: "Original chart",
                },
              ],
              currentIndex: 0,
            },
          },
        }));
      },

      addSnapshot: (queryId, spec, description) => {
        const history = get().histories[queryId];
        if (!history) {
          // Initialize if not exists
          get().initializeHistory(queryId, spec);
          return;
        }

        set((state) => {
          const currentHistory = state.histories[queryId];
          if (!currentHistory) return state;

          // Remove any snapshots after current index (discard redo history)
          const newSnapshots = currentHistory.snapshots.slice(
            0,
            currentHistory.currentIndex + 1,
          );

          // Add new snapshot
          newSnapshots.push({
            id: generateSnapshotId(),
            visualizationSpec: spec,
            timestamp: Date.now(),
            description,
          });

          // Trim to max snapshots (keep most recent, but always keep original)
          const trimmedSnapshots =
            newSnapshots.length > state.maxSnapshots
              ? [newSnapshots[0], ...newSnapshots.slice(-(state.maxSnapshots - 1))]
              : newSnapshots;

          return {
            histories: {
              ...state.histories,
              [queryId]: {
                ...currentHistory,
                snapshots: trimmedSnapshots,
                currentIndex: trimmedSnapshots.length - 1,
              },
            },
          };
        });
      },

      undo: (queryId) => {
        const history = get().histories[queryId];
        if (!history || history.currentIndex <= 0) return null;

        const newIndex = history.currentIndex - 1;
        set((state) => ({
          histories: {
            ...state.histories,
            [queryId]: {
              ...state.histories[queryId],
              currentIndex: newIndex,
            },
          },
        }));

        return history.snapshots[newIndex].visualizationSpec;
      },

      redo: (queryId) => {
        const history = get().histories[queryId];
        if (!history || history.currentIndex >= history.snapshots.length - 1) {
          return null;
        }

        const newIndex = history.currentIndex + 1;
        set((state) => ({
          histories: {
            ...state.histories,
            [queryId]: {
              ...state.histories[queryId],
              currentIndex: newIndex,
            },
          },
        }));

        return history.snapshots[newIndex].visualizationSpec;
      },

      canUndo: (queryId) => {
        const history = get().histories[queryId];
        return history ? history.currentIndex > 0 : false;
      },

      canRedo: (queryId) => {
        const history = get().histories[queryId];
        return history
          ? history.currentIndex < history.snapshots.length - 1
          : false;
      },

      getCurrentIndex: (queryId) => {
        const history = get().histories[queryId];
        return history ? history.currentIndex + 1 : 0; // 1-indexed for display
      },

      getTotalSnapshots: (queryId) => {
        const history = get().histories[queryId];
        return history ? history.snapshots.length : 0;
      },

      getOriginalSpec: (queryId) => {
        const history = get().histories[queryId];
        return history ? history.originalSpec : null;
      },

      resetToOriginal: (queryId) => {
        const history = get().histories[queryId];
        if (!history) return null;

        set((state) => ({
          histories: {
            ...state.histories,
            [queryId]: {
              ...state.histories[queryId],
              currentIndex: 0,
            },
          },
        }));

        return history.originalSpec;
      },

      clearHistory: (queryId) => {
        set((state) => {
          const { [queryId]: _, ...rest } = state.histories;
          return { histories: rest };
        });
      },

      clearAllHistories: () => {
        set({ histories: {} });
      },

      // Template Actions
      saveTemplate: (name, description, spec, thumbnail) => {
        const newTemplate: ChartTemplate = {
          id: generateTemplateId(),
          name,
          description,
          visualizationSpec: spec,
          createdAt: Date.now(),
          thumbnail,
        };

        set((state) => ({
          templates: [...state.templates, newTemplate].slice(-20), // Keep max 20 templates
        }));

        return newTemplate;
      },

      deleteTemplate: (templateId) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== templateId),
        }));
      },

      getTemplates: () => {
        return get().templates;
      },

      applyTemplate: (templateId) => {
        const template = get().templates.find((t) => t.id === templateId);
        return template ? template.visualizationSpec : null;
      },
    }),
    {
      name: "chart-history-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
