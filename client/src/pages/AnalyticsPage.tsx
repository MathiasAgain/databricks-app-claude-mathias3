/**
 * Analytics Page - Main application page
 *
 * Clean, focused interface for data exploration with AI assistance.
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

  const [isModifyingChart, setIsModifyingChart] = useState(false);

  // Chart history store
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

  // Query store
  const currentQuery = useQueryStore((state) => state.currentQuery);
  const conversationHistory = useQueryStore((state) => state.conversationHistory);
  const setCurrentQuery = useQueryStore((state) => state.setCurrentQuery);
  const setConversationHistory = useQueryStore((state) => state.setConversationHistory);
  const clearConversationHistory = useQueryStore((state) => state.clearConversationHistory);
  const addToHistory = useQueryStore((state) => state.addToHistory);

  // Initialize chart history
  useEffect(() => {
    if (currentQuery?.queryId && currentQuery?.visualizationSpec) {
      initializeHistory(currentQuery.queryId, currentQuery.visualizationSpec);
    }
  }, [currentQuery?.queryId, currentQuery?.visualizationSpec, initializeHistory]);

  const handleUndo = useCallback(() => {
    if (!currentQuery?.queryId) return;
    const spec = undo(currentQuery.queryId);
    if (spec) {
      setCurrentQuery({ ...currentQuery, visualizationSpec: spec });
    }
  }, [currentQuery, undo, setCurrentQuery]);

  const handleRedo = useCallback(() => {
    if (!currentQuery?.queryId) return;
    const spec = redo(currentQuery.queryId);
    if (spec) {
      setCurrentQuery({ ...currentQuery, visualizationSpec: spec });
    }
  }, [currentQuery, redo, setCurrentQuery]);

  const handleResetChart = useCallback(() => {
    if (!currentQuery?.queryId) return;
    const spec = resetToOriginal(currentQuery.queryId);
    if (spec) {
      setCurrentQuery({ ...currentQuery, visualizationSpec: spec });
    }
  }, [currentQuery, resetToOriginal, setCurrentQuery]);

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
    },
    [currentQuery?.question, saveTemplate],
  );

  const handleQueryComplete = useCallback(
    (result: AskQuestionResponse) => {
      setCurrentQuery(result);
      addToHistory(result);
      clearConversationHistory();
    },
    [setCurrentQuery, addToHistory, clearConversationHistory],
  );

  const handleFollowupClick = useCallback(
    (question: string) => {
      if (!currentQuery) return;

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

          setConversationHistory([...conversationHistory, ...newMessages]);

          const updatedQuery: AskQuestionResponse = {
            ...currentQuery,
            aiSummary: chatResponse.message,
            suggestedFollowups: chatResponse.suggestedFollowups,
            ...(chatResponse.visualizationSpec && {
              visualizationSpec: chatResponse.visualizationSpec,
            }),
          };

          setCurrentQuery(updatedQuery);
        },
      });
    },
    [currentQuery, conversationHistory, chatWithClaude, setConversationHistory, setCurrentQuery],
  );

  const handleNewQuery = useCallback(
    (question: string) => {
      askQuestion({ question }, {
        onSuccess: (result) => handleQueryComplete(result),
      });
    },
    [askQuestion, handleQueryComplete],
  );

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

          if (chatResponse.visualizationSpec) {
            const updatedQuery: AskQuestionResponse = {
              ...currentQuery,
              visualizationSpec: chatResponse.visualizationSpec,
            };

            addSnapshot(currentQuery.queryId, chatResponse.visualizationSpec, request);
            setConversationHistory([
              ...conversationHistory,
              { role: "user", content: `[Chart edit] ${request}` },
              { role: "assistant", content: "Chart updated." },
            ]);
            setCurrentQuery(updatedQuery);
          }
        },
        onError: () => setIsModifyingChart(false),
      });
    },
    [currentQuery, conversationHistory, chatWithClaude, setConversationHistory, setCurrentQuery, addSnapshot],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Query Input - Clean, centered */}
      <div className="bg-card rounded-xl border p-6">
        <QueryInput onQueryComplete={handleQueryComplete} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Suggested Questions - Sidebar */}
        <aside className="lg:col-span-1 order-2 lg:order-1">
          <SuggestedQuestions onQuestionSelect={handleQueryComplete} />
        </aside>

        {/* Results - Main Area */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          {currentQuery ? (
            <ResultsPanel
              result={currentQuery}
              onFollowupClick={handleFollowupClick}
              onEditChart={handleEditChart}
              onNewQuery={handleNewQuery}
              isProcessing={isChatPending}
              isModifyingChart={isModifyingChart}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onResetChart={handleResetChart}
              canUndo={canUndo(currentQuery.queryId)}
              canRedo={canRedo(currentQuery.queryId)}
              historyIndex={getCurrentIndex(currentQuery.queryId)}
              historyTotal={getTotalSnapshots(currentQuery.queryId)}
              onSaveTemplate={handleSaveTemplate}
            />
          ) : (
            <div className="flex items-center justify-center h-64 bg-muted/20 rounded-lg border border-dashed">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-muted-foreground">
                  Ask a question or select a suggestion to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
