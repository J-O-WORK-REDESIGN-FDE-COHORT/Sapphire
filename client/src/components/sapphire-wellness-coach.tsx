import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalRuntime, AssistantRuntimeProvider, ThreadPrimitive, MessagePrimitive, ComposerPrimitive } from "@assistant-ui/react";
import type { ChatModelAdapter, TextMessagePartProps } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface SapphireWellnessCoachProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SapphireWellnessCoach({ isOpen, onClose }: SapphireWellnessCoachProps) {
  const { user } = useAuth();

  // Generate a simple session-based thread_id
  const [threadId] = useState(() =>
    `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Create adapter function
  const adapter = useMemo<ChatModelAdapter>(() => ({
    async *run({ messages, abortSignal }) {
      const lastMessage = messages[messages.length - 1];
      const userMessage = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : lastMessage.content.map(c => c.type === 'text' ? c.text : '').join('');

      try {
        // Call our LangGraph backend with thread_id for memory persistence
        const response = await fetch('http://localhost:8004/api/wellness-coach/chat', {
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
        const timestamp = data.timestamp || new Date().toISOString();

        // Format timestamp for display
        const formattedTime = new Date(timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });

        // For markdown responses, send the full text at once to allow proper parsing
        const displayText = `${responseText}\n\n_${formattedTime}_`;

        yield {
          content: [
            {
              type: "text" as const,
              text: displayText,
            },
          ],
        };

      } catch (error) {
        console.error('Error calling wellness coach:', error);
        
        yield {
          content: [
            {
              type: "text" as const,
              text: 'I apologize, but I encountered an error connecting to the wellness coach service. Please ensure the backend LangGraph agent is running at http://localhost:8004 and try again.',
            },
          ],
        };
      }
    },
  }), [threadId, user?.email]);

  // Use Local Runtime with the adapter
  const runtime = useLocalRuntime(adapter);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏥</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Sapphire Wellness Buddy</h2>
              <p className="text-sm text-slate-600">AI-powered health guidance</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Chat Area with assistant-ui */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <AssistantRuntimeProvider runtime={runtime}>
            <ThreadPrimitive.Root className="flex-1 flex flex-col h-full">
              <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-4 space-y-4">
                <ThreadPrimitive.Empty>
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
                      <span className="text-4xl">🏥</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Welcome to Sapphire Wellness Buddy
                    </h3>
                    <p className="text-sm text-slate-600 max-w-md">
                      I'm here to help you with personalized health recommendations, answer questions about your wellness journey, and provide guidance based on your health data. How can I assist you today?
                    </p>
                  </div>
                </ThreadPrimitive.Empty>

                <ThreadPrimitive.Messages
                  components={{
                    UserMessage: () => (
                      <div className="flex gap-3 justify-end">
                        <div className="max-w-[70%] bg-primary text-primary-foreground rounded-lg px-4 py-2">
                          <MessagePrimitive.Content components={{
                            Text: ({ text }: TextMessagePartProps) => (
                              <p className="text-sm whitespace-pre-wrap">{text ?? ""}</p>
                            )
                          }} />
                        </div>
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-blue-600">You</span>
                        </div>
                      </div>
                    ),
                    AssistantMessage: () => (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">🏥</span>
                        </div>
                        <div className="max-w-[70%] bg-blue-50 text-slate-900 rounded-lg px-4 py-2 text-sm">
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
                                    code: ({ children }) => (
                                      <code className="bg-slate-800 text-slate-100 px-2 py-1 rounded text-xs font-mono">{children}</code>
                                    ),
                                    pre: ({ children }) => (
                                      <pre className="bg-slate-800 text-slate-100 p-3 rounded-lg overflow-x-auto my-2">{children}</pre>
                                    ),
                                    ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
                                    li: ({ children }) => <li className="ml-2">{children}</li>,
                                    ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
                                    h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-bold my-2">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold my-1">{children}</h3>,
                                    hr: () => <hr className="my-2 border-slate-400" />,
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

              <div className="border-t border-slate-200 p-4">
                <ComposerPrimitive.Root className="flex gap-2">
                  <ComposerPrimitive.Input 
                    placeholder="Ask me anything about your wellness..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ComposerPrimitive.Send asChild>
                    <Button 
                      size="icon"
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    >
                      <span>→</span>
                    </Button>
                  </ComposerPrimitive.Send>
                </ComposerPrimitive.Root>
              </div>
            </ThreadPrimitive.Root>
          </AssistantRuntimeProvider>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-500 text-center">
            This AI assistant provides general wellness guidance. Always consult healthcare professionals for medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
