import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { assistantApi } from '../api/assistant';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { MarkdownRenderer } from '../components/common/MarkdownRenderer';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Bot,
  User,
  Lightbulb,
  MessageSquare,
  Copy,
  RotateCcw,
  AlertCircle,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const AIAssistantPage = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { currency } = useFinance();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [errorState, setErrorState] = useState(null); // { message, lastQuery }
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  // Conversation Renaming State
  const [editingConvId, setEditingConvId] = useState(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  // Conversation Deletion State
  const [deletingConvId, setDeletingConvId] = useState(null);

  const chatContainerRef = useRef(null);
  const chatBottomRef = useRef(null);
  const isAtBottomRef = useRef(true);

  // Load conversations on mount
  const loadConversations = useCallback(async () => {
    try {
      const convList = await assistantApi.getConversations(30);
      setConversations(convList);
      if (convList.length > 0 && !activeConvId) {
        setActiveConvId(convList[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [activeConvId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages whenever activeConvId changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const fetchMessages = async () => {
      setIsLoadingHistory(true);
      setErrorState(null);
      try {
        const msgs = await assistantApi.getMessages(activeConvId, 50);
        if (isMounted) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Failed to load messages for conversation', activeConvId, err);
        if (isMounted) {
          showToast({
            title: 'History Error',
            message: 'Failed to load conversation history.',
            type: 'error',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchMessages();
    return () => {
      isMounted = false;
    };
  }, [activeConvId, showToast]);

  // Auto-scroll handler
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  useEffect(() => {
    if (isAtBottomRef.current) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSubmitting]);

  // Preloaded query from navigation state
  useEffect(() => {
    if (location.state?.preloadedQuery) {
      handleSendMessage(location.state.preloadedQuery);
    }
  }, [location.state]);

  // Send message
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSubmitting) return;

    setErrorState(null);
    setInputMessage('');

    // Optimistically append user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsSubmitting(true);
    isAtBottomRef.current = true;

    try {
      const response = await assistantApi.chat(text, activeConvId, currency || 'INR');
      
      const assistantMsg = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        tools_called: response.tools_called,
        created_at: response.created_at || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If this was a new conversation, update active ID and refresh conversation list
      if (!activeConvId || response.conversation_id !== activeConvId) {
        setActiveConvId(response.conversation_id);
      }
      await loadConversations();
    } catch (err) {
      console.error('AI chat failed:', err);
      const errMsg = err?.message || 'Failed to connect to FinAI Assistant. Please try again.';
      setErrorState({ message: errMsg, lastQuery: text });
      setInputMessage(text); // Preserve user text for easy recovery
      showToast({
        title: 'Assistant Request Failed',
        message: errMsg,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setErrorState(null);
    setInputMessage('');
  };

  const handleStartRename = (conv) => {
    setEditingConvId(conv.id);
    setEditTitleInput(conv.title);
  };

  const handleSaveRename = async (convId) => {
    if (!editTitleInput.trim()) return;
    try {
      await assistantApi.updateConversation(convId, editTitleInput.trim());
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: editTitleInput.trim() } : c))
      );
      setEditingConvId(null);
      showToast({ title: 'Conversation Renamed', type: 'success' });
    } catch (err) {
      console.error('Rename failed:', err);
      showToast({ title: 'Error', message: 'Failed to rename conversation.', type: 'error' });
    }
  };

  const handleDeleteConversation = async () => {
    if (!deletingConvId) return;
    try {
      await assistantApi.deleteConversation(deletingConvId);
      setConversations((prev) => prev.filter((c) => c.id !== deletingConvId));
      if (activeConvId === deletingConvId) {
        setActiveConvId(null);
        setMessages([]);
      }
      showToast({ title: 'Conversation Deleted', type: 'info' });
    } catch (err) {
      console.error('Delete failed:', err);
      showToast({ title: 'Error', message: 'Failed to delete conversation.', type: 'error' });
    } finally {
      setDeletingConvId(null);
    }
  };

  const handleCopyMessage = (msgId, content) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    showToast({ title: 'Copied to clipboard', type: 'info', duration: 2000 });
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const suggestedPrompts = [
    'What is my total income?',
    'What are my total expenses this month?',
    'Show my five latest transactions.',
    'Which category has the highest expenses?',
    'Compare this month with last month.',
    'Show my unpaid invoices.',
    'What is my current net balance?',
  ];

  return (
    <div className="h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-9.5rem)] min-h-[520px] flex flex-col gap-4 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 font-sans flex items-center gap-2">
              FinAI Financial Copilot
              <Badge variant="indigo" size="sm">
                Live DB
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Natural language financial assistant connected to your authenticated ledger
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={handleCreateNewConversation}
        >
          New Chat
        </Button>
      </div>

      {/* Main Chat Layout: Sidebar + Chat Window */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        {/* Left Drawer: Conversations List (Hidden on small mobile when chatting) */}
        <GlassCard className="hidden lg:flex flex-col p-3.5 space-y-3 overflow-hidden">
          <div className="flex items-center justify-between px-2 pt-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Chat History
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              {conversations.length}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {conversations.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No past conversations.
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                const isEditing = conv.id === editingConvId;

                return (
                  <div
                    key={conv.id}
                    onClick={() => !isEditing && setActiveConvId(conv.id)}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitleInput}
                          onChange={(e) => setEditTitleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(conv.id);
                            if (e.key === 'Escape') setEditingConvId(null);
                          }}
                          className="w-full bg-slate-900 border border-indigo-500/50 rounded px-2 py-1 text-slate-100 text-xs focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(conv.id)}
                          className="p-1 hover:text-emerald-400 text-slate-400"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingConvId(null)}
                          className="p-1 hover:text-rose-400 text-slate-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-medium truncate">{conv.title || 'Untitled Chat'}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(conv.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(conv);
                            }}
                            className="p-1 hover:text-indigo-300 text-slate-500"
                            title="Rename chat"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingConvId(conv.id);
                            }}
                            className="p-1 hover:text-rose-400 text-slate-500"
                            title="Delete chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>

        {/* Right Pane: Active Chat Window */}
        <GlassCard className="lg:col-span-3 flex flex-col p-0 overflow-hidden relative border border-slate-200/80 dark:border-white/10">
          {/* Messages Container */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5"
          >
            {messages.length === 0 && !isLoadingHistory ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-glass">
                  <Bot className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">
                  Welcome, {user?.name || 'Treasury Officer'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                  FinAI analyzes your real PostgreSQL transactions, invoices, and payment ledger entries to provide instant answers with complete financial accuracy.
                </p>

                {/* Suggested Prompts */}
                <div className="w-full mt-6 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    Try asking:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    {suggestedPrompts.slice(0, 4).map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="p-2.5 rounded-xl glass-subtle hover:bg-slate-800/60 hover:border-indigo-500/30 text-xs text-slate-300 hover:text-slate-100 transition-all flex items-center justify-between group"
                      >
                        <span className="truncate">{prompt}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || index}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs shadow-sm ${
                        isUser
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm relative group ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-slate-900/90 border border-slate-700/60 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {/* Tool Call Badges if Assistant */}
                      {!isUser && msg.tools_called && msg.tools_called.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                          {msg.tools_called.map((tc, tcIdx) => (
                            <span
                              key={tcIdx}
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            >
                              <Cpu className="w-2.5 h-2.5" />
                              {tc.tool}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Content */}
                      {isUser ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}

                      {/* Copy & Meta Footer */}
                      <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400">
                        <span>
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>

                        {!isUser && (
                          <button
                            onClick={() => handleCopyMessage(msg.id || index, msg.content)}
                            className="opacity-0 group-hover:opacity-100 hover:text-slate-200 transition-opacity flex items-center gap-1"
                            title="Copy response"
                          >
                            {copiedMsgId === (msg.id || index) ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copy</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Submitting Loading Indicator */}
            {isSubmitting && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 text-xs text-slate-300">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span>FinAI is querying verified ledger records...</span>
                </div>
              </div>
            )}

            {/* Error Message & Retry Action */}
            {errorState && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-300">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="truncate">{errorState.message}</span>
                </div>
                {errorState.lastQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => handleSendMessage(errorState.lastQuery)}
                    className="shrink-0 text-xs py-1"
                  >
                    Retry
                  </Button>
                )}
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-900/90 backdrop-blur-md shrink-0">
            <div className="relative flex items-end gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask FinAI about income, expenses, cash runway, unpaid invoices... (Enter to send, Shift+Enter for newline)"
                rows={1}
                disabled={isSubmitting}
                className="w-full resize-none max-h-32 min-h-[44px] py-2.5 pl-3.5 pr-12 rounded-xl glass-input text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 transition-colors"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isSubmitting}
                className="absolute right-2 bottom-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-all shadow-md"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 text-center">
              FinAI verifies all figures with SQL tool-calling against your active enterprise ledger.
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingConvId}
        onClose={() => setDeletingConvId(null)}
        onConfirm={handleDeleteConversation}
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation and all associated financial query logs? This action cannot be undone."
        confirmText="Delete Chat"
        type="danger"
      />
    </div>
  );
};
