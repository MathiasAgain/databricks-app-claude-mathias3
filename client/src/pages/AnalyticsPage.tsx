/**
 * Analytics Page - Main application page
 *
 * Combines query input, results, and chat interface in a unified experience.
 * This is the primary page for the Nielsen Sales Analytics Assistant.
 *
 * Features:
 * - Ask questions via Genie AI
 * - Get AI-powered insights from Claude
 * - Edit charts with natural language
 */

import { useCallback, useState, useEffect } from "react";
import { QueryInput } from "@/components/query/QueryInput";
import { SuggestedQuestions } from "@/components/query/SuggestedQuestions";
import { ResultsPanel } from "@/components/query/ResultsPanel";
import { useAskQuestion, useChatWithClaude } from "@/hooks/useGenie";
import { useQueryStore } from "@/stores/queryStore";
import { useChartHistoryStore } from "@/stores/chartHistoryStore";
import type { AskQuestionResponse } from "@/types/genie";
import type { ChatRequest } from "@/types/claude";

export default function AnalyticsPage() {
  const { mutate: askQuestion } = useAskQuestion();
  const { mutate: chatWithClaude, isPending: isChatPending } =
    useChatWithClaude();

  // State for chart modification
  const [isModifyingChart, setIsModifyingChart] = useState(false);

  // Chart history store for undo/redo
  const initializeHistory = useChartHistoryStore((state) => state.initializeHistory);
  const addSnapshot = useChartHistoryStore((state) => state.addSnapshot);
  const undo = useChartHistoryStore((state) => state.undo);
  const redo = useChartHistoryStore((state) => state.redo);
  const canUndo = useChartHistoryStore((state) => state.canUndo);
  const canRedo = useChartHistoryStore((state) => state.canRedo);
  const getCurrentIndex = useChartHistoryStore((state) => state.getCurrentIndex);
  const getTotalSnapshots = useChartHistoryStore((state) => state.getTotalSnapshots);
  const resetToOriginal = useChartHistoryStore((state) => state.resetToOriginal);
  const saveTemplate = useChartHistoryStore((state) => state.saveTemplate);

  // Use store directly - no local state needed
  const currentQuery = useQueryStore((state) => state.currentQuery);
  const conversationHistory = useQueryStore(
    (state) => state.conversationHistory,
  );
  const setCurrentQuery = useQueryStore((state) => state.setCurrentQuery);
  const setConversationHistory = useQueryStore(
    (state) => state.setConversationHistory,
  );
  const clearConversationHistory = useQueryStore(
    (state) => state.clearConversationHistory,
  );
  const addToHistory = useQueryStore((state) => state.addToHistory);

  // Initialize chart history when a new query completes
  useEffect(() => {
    if (currentQuery?.queryId && currentQuery?.visualizationSpec) {
      initializeHistory(currentQuery.queryId, currentQuery.visualizationSpec);
    }
  }, [currentQuery?.queryId, currentQuery?.visualizationSpec, initializeHistory]);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    if (!currentQuery?.queryId) return;
    const spec = undo(currentQuery.queryId);
    if (spec) {
      setCurrentQuery({
        ...currentQuery,
        visualizationSpec: spec,
      });
    }
  }, [currentQuery, undo, setCurrentQuery]);

  const handleRedo = useCallback(() => {
    if (!currentQuery?.queryId) return;
    const spec = redo(currentQuery.queryId);
    if (spec) {
      setCurrentQuery({
        ...currentQuery,
        visualizationSpec: spec,
      });
    }
  }, [currentQuery, redo, setCurrentQuery]);

  const handleResetChart = useCallback(() => {
    if (!currentQuery?.queryId) return;
    const spec = resetToOriginal(currentQuery.queryId);
    if (spec) {
      setCurrentQuery({
        ...currentQuery,
        visualizationSpec: spec,
      });
    }
  }, [currentQuery, resetToOriginal, setCurrentQuery]);

  // Handle saving chart as template
  const handleSaveTemplate = useCallback(
    (spec: import("@/types/genie").VisualizationSpec, thumbnail?: string) => {
      const chartType = spec.chartType || "chart";
      const timestamp = new Date().toLocaleString();
      saveTemplate(
        `${chartType} - ${timestamp}`,
        `Saved from query: ${currentQuery?.question || "Unknown"}`,
        spec,
        thumbnail,
      );
      // Could add a toast notification here
    },
    [currentQuery?.question, saveTemplate],
  );

  const handleQueryComplete = useCallback(
    (result: AskQuestionResponse) => {
      // Save to store - this persists to localStorage
      setCurrentQuery(result);
      addToHistory(result);

      // Clear conversation history for new query
      clearConversationHistory();
    },
    [setCurrentQuery, addToHistory, clearConversationHistory],
  );

  const handleFollowupClick = useCallback(
    (question: string) => {
      if (!currentQuery) return;

      // Use Claude chat for follow-up questions instead of re-querying Genie
      const chatRequest: ChatRequest = {
        message: question,
        context: {
          conversationHistory,
          currentQueryResults: currentQuery.results,
          currentVisualizationSpec: currentQuery.visualizationSpec,
        },
      };

      chatWithClaude(chatRequest, {
        onSuccess: (chatResponse) => {
          const newMessages = [
            { role: "user", content: question },
            { role: "assistant", content: chatResponse.message },
          ];

          // Update conversation history in store
          const updatedHistory = [...conversationHistory, ...newMessages];
          setConversationHistory(updatedHistory);

          // Update the query with Claude's response and optional new visualization
          const updatedQuery: AskQuestionResponse = {
            ...currentQuery,
            aiSummary: chatResponse.message,
            suggestedFollowups: chatResponse.suggestedFollowups,
            // Update visualization spec if provided in the response
            ...(chatResponse.visualizationSpec && {
              visualizationSpec: chatResponse.visualizationSpec,
            }),
          };

          // Update store - this persists to localStorage
          setCurrentQuery(updatedQuery);
        },
      });
    },
    [
      currentQuery,
      conversationHistory,
      chatWithClaude,
      setConversationHistory,
      setCurrentQuery,
    ],
  );

  const handleNewQuery = useCallback(
    (question: string) => {
      // Use askQuestion for new data queries via Genie
      askQuestion(
        { question },
        {
          onSuccess: (result) => {
            // Save to store and clear conversation history
            handleQueryComplete(result);
          },
        },
      );
    },
    [askQuestion, handleQueryComplete],
  );

  /**
   * Handle chart editing requests
   * Uses Claude chat with visualization context to modify the chart
   */
  const handleEditChart = useCallback(
    (request: string) => {
      if (!currentQuery) return;

      setIsModifyingChart(true);

      const chatRequest: ChatRequest = {
        message: `[Chart modification request] ${request}`,
        context: {
          conversationHistory,
          currentQueryResults: currentQuery.results,
          currentVisualizationSpec: currentQuery.visualizationSpec,
        },
      };

      chatWithClaude(chatRequest, {
        onSuccess: (chatResponse) => {
          setIsModifyingChart(false);

          // Update visualization spec if Claude modified it
          if (chatResponse.visualizationSpec) {
            const updatedQuery: AskQuestionResponse = {
              ...currentQuery,
              visualizationSpec: chatResponse.visualizationSpec,
            };

            // Add to chart history for undo/redo
            addSnapshot(currentQuery.queryId, chatResponse.visualizationSpec, request);

            // Add to conversation history
            const newMessages = [
              { role: "user", content: `[Chart edit] ${request}` },
              { role: "assistant", content: "Chart updated successfully." },
            ];
            setConversationHistory([...conversationHistory, ...newMessages]);

            // Update store
            setCurrentQuery(updatedQuery);
          }
        },
        onError: () => {
          setIsModifyingChart(false);
        },
      });
    },
    [
      currentQuery,
      conversationHistory,
      chatWithClaude,
      setConversationHistory,
      setCurrentQuery,
      addSnapshot,
    ],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Sidebar - Suggested Questions */}
      <aside className="lg:col-span-4 slide-in">
        <SuggestedQuestions onQuestionSelect={handleQueryComplete} />
      </aside>

      {/* Main Content Area */}
      <div className="lg:col-span-8 space-y-6">
        {/* Query Input */}
        <section className="fade-in">
          <div className="bg-gradient-to-r from-card to-muted/30 p-6 rounded-xl border-2 border-border shadow-lg">
            <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              Ask Your Question
            </h2>
            <QueryInput onQueryComplete={handleQueryComplete} />
          </div>
        </section>

        {/* Results Panel */}
        {currentQuery && (
          <section className="fade-in">
            <ResultsPanel
              result={currentQuery}
              onFollowupClick={handleFollowupClick}
              onEditChart={handleEditChart}
              onNewQuery={handleNewQuery}
              isProcessing={isChatPending}
              isModifyingChart={isModifyingChart}
              // Chart history props
              onUndo={handleUndo}
              onRedo={handleRedo}
              onResetChart={handleResetChart}
              canUndo={canUndo(currentQuery.queryId)}
              canRedo={canRedo(currentQuery.queryId)}
              historyIndex={getCurrentIndex(currentQuery.queryId)}
              historyTotal={getTotalSnapshots(currentQuery.queryId)}
              // Template props
              onSaveTemplate={handleSaveTemplate}
            />
          </section>
        )}
      </div>
    </div>
  );
}
