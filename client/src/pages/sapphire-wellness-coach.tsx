import { Button } from "@/components/ui/button";
import { useLocalRuntime, AssistantRuntimeProvider, ThreadPrimitive, MessagePrimitive, ComposerPrimitive } from "@assistant-ui/react";
import type { ChatModelAdapter, TextMessagePartProps } from "@assistant-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo, useState, useEffect, Children } from "react";
import Sidebar from "@/components/sidebar";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { trackPage, trackEvent, AnalyticsEvents } from "@/lib/analytics";

export default function SapphireWellnessCoachPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Generate a simple session-based thread_id
  const [threadId] = useState(() =>
    `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Track page view
  useEffect(() => {
    trackPage('Wellness Coach', {
      userId: user?.email,
    });
    trackEvent(AnalyticsEvents.WELLNESS_COACH_VIEWED, {
      userId: user?.email,
      timestamp: new Date().toISOString(),
    });
  }, [user?.email]);

  // Create adapter function
  const adapter = useMemo<ChatModelAdapter>(() => ({
    async *run({ messages, abortSignal }) {
      const lastMessage = messages[messages.length - 1];
      const userMessage = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : lastMessage.content.map(c => c.type === 'text' ? c.text : '').join('');

      // Track message sent
      trackEvent(AnalyticsEvents.WELLNESS_COACH_MESSAGE_SENT, {
        userId: user?.email,
        threadId,
        messageLength: userMessage.length,
        timestamp: new Date().toISOString(),
      });

      try {
        // Call our LangGraph backend with thread_id for memory persistence
        const apiUrl = import.meta.env.VITE_WELLNESS_COACH_API_URL || 'http://localhost:8004';
        const response = await fetch(`${apiUrl}/api/wellness-coach/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage,
            thread_id: threadId,
            user_email: user?.email || 'anonymous@example.com'
          }),
          signal: abortSignal,
        });

        if (!response.ok) {
          throw new Error('Failed to get response from wellness coach');
        }

        const data = await response.json();
        const responseText = data.response || data.message || 'I apologize, but I encountered an issue. Please try again.';

        // Stream word by word — ReactMarkdown re-renders the full accumulated text each time
        const words = responseText.split(' ');
        let accumulatedText = '';

        for (let i = 0; i < words.length; i++) {
          accumulatedText += (i > 0 ? ' ' : '') + words[i];

          yield {
            content: [
              {
                type: "text" as const,
                text: accumulatedText,
              },
            ],
          };

          await new Promise(resolve => setTimeout(resolve, 30));
        }

      } catch (error) {
        console.error('Error calling wellness coach:', error);
        
        const apiUrl = import.meta.env.VITE_WELLNESS_COACH_API_URL || 'http://localhost:8004';
        yield {
          content: [
            {
              type: "text" as const,
              text: `I apologize, but I encountered an error connecting to the wellness coach service. Please ensure the backend LangGraph agent is running at ${apiUrl} and try again.`,
            },
          ],
        };
      }
    },
  }), [threadId, user?.email]);

  // Use Local Runtime with the adapter
  const runtime = useLocalRuntime(adapter);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/dashboard')}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏥</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Sapphire Wellness Buddy</h1>
                <p className="text-sm text-slate-600">AI-powered health guidance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area with assistant-ui */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white m-4 rounded-lg shadow-sm border border-slate-200">
          <AssistantRuntimeProvider runtime={runtime}>
            <ThreadPrimitive.Root className="flex-1 flex flex-col h-full">
              <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-6 space-y-4">
                <ThreadPrimitive.Empty>
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-6">
                      <span className="text-5xl">🏥</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900 mb-3">
                      Welcome to Sapphire Wellness Buddy
                    </h2>
                    <p className="text-base text-slate-600 max-w-2xl">
                      I'm here to help you with personalized health recommendations, answer questions about your wellness journey, and provide guidance based on your health data. How can I assist you today?
                    </p>
                  </div>
                </ThreadPrimitive.Empty>

                <ThreadPrimitive.Messages
                  components={{
                    UserMessage: () => (
                      <div className="flex gap-3 justify-end">
                        <div className="max-w-[70%] bg-primary text-primary-foreground rounded-lg px-4 py-3">
                          <MessagePrimitive.Content components={{
                            Text: ({ text }: TextMessagePartProps) => (
                              <p className="text-sm whitespace-pre-wrap">{text ?? ""}</p>
                            )
                          }} />
                        </div>
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-blue-600">You</span>
                        </div>
                      </div>
                    ),
                    AssistantMessage: () => (
                      <div className="flex gap-3 justify-start">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">🏥</span>
                        </div>
                        <div className="max-w-[70%] bg-slate-100 text-slate-900 rounded-lg px-4 py-3 text-sm">
                          <MessagePrimitive.Content components={{
                            Text: ({ text }: TextMessagePartProps) => {
                              if (!text || text.trim() === "") {
                                return (
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                  </div>
                                );
                              }
                              return (
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    a: ({ children, ...props }) => (
                                      <a className="text-blue-600 hover:underline" {...props}>{children}</a>
                                    ),
                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                    em: ({ children }) => <em className="italic">{children}</em>,
                                    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                                    code: ({ children }) => (
                                      <code className="bg-slate-800 text-slate-100 px-2 py-1 rounded text-xs font-mono">{children}</code>
                                    ),
                                    pre: ({ children }) => (
                                      <pre className="bg-slate-800 text-slate-100 p-3 rounded-lg overflow-x-auto my-2">{children}</pre>
                                    ),
                                    ul: ({ children }) => <ul className="list-disc list-outside ml-4 my-1 space-y-0.5">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal list-outside ml-4 my-1 space-y-0.5">{children}</ol>,
                                    li: ({ children }) => {
                                      const arr = Children.toArray(children);
                                      const isEmpty = arr.every(c => typeof c === 'string' && c.trim() === '');
                                      if (isEmpty) return null;
                                      return <li className="leading-relaxed">{children}</li>;
                                    },
                                    h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1 text-slate-900">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-1 text-slate-900">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1 text-slate-800 border-b border-slate-200 pb-0.5">{children}</h3>,
                                    hr: () => <hr className="my-2 border-slate-300" />,
                                    blockquote: ({ children }) => (
                                      <blockquote className="border-l-4 border-blue-500 pl-3 my-2 italic text-slate-700">{children}</blockquote>
                                    ),
                                  }}
                                >
                                  {text}
                                </ReactMarkdown>
                              );
                            }
                          }} />
                        </div>
                      </div>
                    ),
                  }}
                />
              </ThreadPrimitive.Viewport>

              <div className="border-t border-slate-200 p-4 bg-slate-50">
                <ComposerPrimitive.Root className="flex gap-2 max-w-4xl mx-auto">
                  <ComposerPrimitive.Input 
                    placeholder="Ask me anything about your wellness..."
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <ComposerPrimitive.Send asChild>
                    <Button 
                      size="icon"
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-12 w-12"
                    >
                      <span className="text-lg">→</span>
                    </Button>
                  </ComposerPrimitive.Send>
                </ComposerPrimitive.Root>
              </div>
            </ThreadPrimitive.Root>
          </AssistantRuntimeProvider>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200">
          <p className="text-xs text-slate-500 text-center">
            This AI assistant provides general wellness guidance. Always consult healthcare professionals for medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}

// Made with Bob