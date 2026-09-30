import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/common/GlassCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Bot,
  User,
  Lightbulb,
  MessageSquare,
  TrendingUp,
  Receipt,
  FileText,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const AIAssistantPage = () => {
  const location = useLocation();
  const { user } = useAuth();
  const {
    financialSummary,
    invoiceSummary,
    transactions,
    invoices,
    expenseCategoryBreakdown,
    currency,
  } = useFinance();

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState([
    {
      id: 'conv-1',
      title: 'Current Treasury Overview',
      date: 'Today',
      messages: [
        {
          id: 'm-1',
          sender: 'assistant',
          text: `Hello ${user?.name || 'Shiva'}! I am your FinAI Autonomous Treasury Copilot. I have synchronized all your ledger entries, banking accounts, and receivables. What would you like to explore today?`,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          suggestions: [
            'How much did I spend this month?',
            'Which invoices are overdue?',
            'Give me a financial summary.',
            'What are my biggest expenses?',
          ],
        },
      ],
    },
    {
      id: 'conv-2',
      title: 'Cloud Infrastructure Audit',
      date: 'Yesterday',
      messages: [
        {
          id: 'm-2',
          sender: 'user',
          text: 'Analyze our AWS and GCP spending trend.',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'm-3',
          sender: 'assistant',
          text: `AWS + Google Cloud spend totaled ${formatCurrency(81000, currency)} this month, representing 17.7% of total operational burn. GPU inference was the highest cost component.`,
          timestamp: new Date(Date.now() - 86350000).toISOString(),
        },
      ],
    },
  ]);

  const [activeConvId, setActiveConvId] = useState('conv-1');
  const chatBottomRef = useRef(null);

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) || conversations[0];

  // Auto-scroll on message updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isTyping]);

  // Handle preloaded query passed from an AIInsightCard
  useEffect(() => {
    if (location.state?.preloadedQuery) {
      handleSendMessage(location.state.preloadedQuery);
    }
  }, [location.state]);

  const suggestedPrompts = [
    'How much did I spend this month?',
    'What are my biggest expenses?',
    'Compare this month with last month.',
    'Which invoices are overdue?',
    'Where am I spending the most?',
    'Give me a financial summary.',
    'What is our projected cash runway?',
  ];

  // Simulated Intelligent Financial Engine
  const generateAIResponse = (query) => {
    const q = query.toLowerCase();

    if (q.includes('spend') && (q.includes('this month') || q.includes('month'))) {
      const topCat = expenseCategoryBreakdown[0];
      return `You spent ${formatCurrency(
        financialSummary.thisMonthExpenses,
        currency
      )} this month across all operational accounts. Your largest single category was ${
        topCat.name
      } at ${formatCurrency(topCat.value, currency)} (${topCat.percentage}% of total).`;
    }

    if (q.includes('biggest expense') || q.includes('spending the most')) {
      const topCategories = expenseCategoryBreakdown.slice(0, 3);
      return `Here are your top 3 expenditure areas:\n\n1. **${
        topCategories[0].name
      }**: ${formatCurrency(topCategories[0].value, currency)} (${
        topCategories[0].percentage
      }%)\n2. **${topCategories[1].name}**: ${formatCurrency(
        topCategories[1].value,
        currency
      )} (${topCategories[1].percentage}%)\n3. **${
        topCategories[2].name
      }**: ${formatCurrency(topCategories[2].value, currency)} (${
        topCategories[2].percentage
      }%)\n\nSingle largest transaction: ${formatCurrency(
        financialSummary.largestExpense,
        currency
      )} (Payroll & Engineering).`;
    }

    if (q.includes('overdue') || q.includes('invoice')) {
      const overdueList = invoices.filter((i) => i.status === 'Overdue');
      if (overdueList.length > 0) {
        const details = overdueList
          .map(
            (i) =>
              `• **#${i.id}** (${i.customerName}): ${formatCurrency(
                i.balanceDue,
                currency
              )} (Due ${formatDate(i.dueDate)})`
          )
          .join('\n');
        return `You have **${overdueList.length} overdue invoice(s)** totaling **${formatCurrency(
          invoiceSummary.overdue,
          currency
        )}**:\n\n${details}\n\nAutomated gentle payment reminders are currently scheduled.`;
      }
      return `Great news! You have zero overdue invoices. Total pending receivables awaiting maturity: ${formatCurrency(
        invoiceSummary.pending,
        currency
      )}.`;
    }

    if (q.includes('summary') || q.includes('financial overview') || q.includes('compare')) {
      return `**FinAI Executive Financial Summary**:\n\n• **Liquid Treasury Balance**: ${formatCurrency(
        financialSummary.totalBalance,
        currency
      )}\n• **Total Recognized Income**: ${formatCurrency(
        financialSummary.totalIncome,
        currency
      )}\n• **Total Operational Burn**: ${formatCurrency(
        financialSummary.totalExpenses,
        currency
      )}\n• **Net Operating Cash Flow**: +${formatCurrency(
        financialSummary.netCashFlow,
        currency
      )}\n• **Accounts Receivable**: ${formatCurrency(
        invoiceSummary.pending + invoiceSummary.overdue,
        currency
      )}\n\nYour operating liquidity is strong with positive cash flow velocity (+14.2% MoM).`;
    }

    if (q.includes('runway') || q.includes('cash runway') || q.includes('reserve')) {
      const monthlyBurn = financialSummary.thisMonthExpenses || 458000;
      const runwayMonths = (financialSummary.totalBalance / monthlyBurn).toFixed(1);
      return `At your current average monthly burn of ${formatCurrency(
        monthlyBurn,
        currency
      )}, your liquid reserves of ${formatCurrency(
        financialSummary.totalBalance,
        currency
      )} provide approximately **${runwayMonths} months of runway** without factoring in incoming receivables.`;
    }

    // Default intelligent response
    return `Based on your synchronized FinAI ledger, your organization holds ${formatCurrency(
      financialSummary.totalBalance,
      currency
    )} across corporate accounts with a net positive cash flow of +${formatCurrency(
      financialSummary.netCashFlow,
      currency
    )}. You have ${invoices.length} active invoices and ${transactions.length} reconciled ledger entries. Is there a specific vendor, category, or customer balance you would like me to drill into?`;
  };

  const handleSendMessage = (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg = {
      id: `m-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    // Update conversation with user message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              messages: [...c.messages, userMsg],
            }
          : c
      )
    );

    setInputMessage('');
    setIsTyping(true);

    // Simulate AI thinking and realistic typing
    setTimeout(() => {
      const aiResponseText = generateAIResponse(text);
      const aiMsg = {
        id: `m-ai-${Date.now()}`,
        sender: 'assistant',
        text: aiResponseText,
        timestamp: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                title: c.messages.length <= 1 ? text.slice(0, 30) + '...' : c.title,
                messages: [...c.messages, aiMsg],
              }
            : c
        )
      );

      setIsTyping(false);
    }, 700);
  };

  const handleNewConversation = () => {
    const newId = `conv-${Date.now()}`;
    const newConv = {
      id: newId,
      title: 'New Financial Analysis',
      date: 'Just now',
      messages: [
        {
          id: `m-init-${Date.now()}`,
          sender: 'assistant',
          text: `Started a fresh treasury inquiry session. Ask any questions regarding cash reserves, vendor burn, or invoice schedules.`,
          timestamp: new Date().toISOString(),
          suggestions: [
            'Give me a financial summary.',
            'What are my biggest expenses?',
            'What is our projected cash runway?',
          ],
        },
      ],
    };
    setConversations([newConv, ...conversations]);
    setActiveConvId(newId);
  };

  const handleClearCurrent = () => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? {
              ...c,
              messages: [
                {
                  id: `m-cleared-${Date.now()}`,
                  sender: 'assistant',
                  text: 'Conversation history reset. How can I help you analyze your finances?',
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : c
      )
    );
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm shadow-indigo-600/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-100 font-sans">
                FinAI Assistant Copilot
              </h1>
              <Badge variant="purple" size="sm">
                Real-Time Ledger AI
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Direct intelligence query against your real-time cash flow and accounting books
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Trash2}
            onClick={handleClearCurrent}
          >
            Clear Chat
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleNewConversation}
          >
            New Session
          </Button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex gap-6 pt-4 min-h-0">
        {/* Left: Conversation History List (hidden on small mobile) */}
        <div className="hidden md:flex flex-col w-64 glass-panel rounded-2xl border border-white/10 p-3 shrink-0">
          <div className="flex items-center justify-between px-2 py-1.5 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Conversations</span>
            <span className="font-mono text-[10px]">{conversations.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full text-left p-3 rounded-xl transition-all text-xs flex items-start gap-2.5 ${
                  conv.id === activeConvId
                    ? 'bg-indigo-600/20 border border-indigo-500/30 text-white font-medium shadow-sm'
                    : 'glass-subtle text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{conv.title}</p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{conv.date}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Quick Stats Pill in sidebar */}
          <div className="mt-3 p-3 rounded-xl glass-subtle text-[11px] text-slate-400 border border-white/5">
            <span className="font-semibold text-slate-200 block mb-1">Live Intelligence Active</span>
            <span>All queries reference current fiscal parameters & verified transactions.</span>
          </div>
        </div>

        {/* Right / Main: Chat Interface */}
        <div className="flex-1 flex flex-col glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {activeConversation.messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${
                    isAssistant ? 'items-start' : 'items-start flex-row-reverse'
                  } animate-fade-in`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                      isAssistant
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-600/20'
                        : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      isAssistant
                        ? 'glass-card border border-white/10 text-slate-200 shadow-md'
                        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>

                    {/* Suggestions chips */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-white/10 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider block">
                          Suggested Inquiries:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(suggestion)}
                              className="text-xs px-2.5 py-1 rounded-lg glass-subtle hover:bg-indigo-500/20 text-indigo-200 hover:text-white border border-indigo-500/30 transition-all flex items-center gap-1.5"
                            >
                              <span>{suggestion}</span>
                              <ArrowRight className="w-3 h-3 text-indigo-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <span
                      className={`text-[9px] block mt-2 ${
                        isAssistant ? 'text-slate-500' : 'text-indigo-200'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start gap-3.5 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="glass-card rounded-2xl px-4 py-3 border border-white/10 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompt Carousel Chips */}
          <div className="px-4 py-2.5 border-t border-white/10 bg-slate-900/30 overflow-x-auto flex items-center gap-2 text-xs no-scrollbar">
            <span className="text-[10px] text-slate-400 uppercase font-semibold shrink-0">
              Quick prompts:
            </span>
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                className="whitespace-nowrap px-3 py-1 rounded-full glass-subtle text-slate-300 hover:text-white hover:border-indigo-500/40 transition-colors shrink-0 text-[11px]"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Message Input Bar */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-900/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask FinAI about cash reserves, vendor expenses, or overdue invoices..."
                className="flex-1 glass-input rounded-xl px-4 py-3 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!inputMessage.trim() || isTyping}
                icon={Send}
                className="shrink-0 px-4 py-3"
              >
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
