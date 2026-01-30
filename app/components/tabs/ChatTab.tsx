"use client";

import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  sender: "user" | "agent";
  text: string;
}

interface ChatTabProps {
  messages: Message[];
  input: string;
  isThinking: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
}

export function ChatTab({
  messages,
  input,
  isThinking,
  onInputChange,
  onSendMessage,
}: ChatTabProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSendMessage();
    }
  };

  return (
    <div className="h-[50vh] flex flex-col">
      <div className="flex-grow overflow-y-auto space-y-3 p-2">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">
            Start chatting with the ERC-8004 Agent...
          </p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-2xl shadow ${
                msg.sender === "user"
                  ? "bg-[#0052FF] text-white self-end"
                  : "bg-gray-100 dark:bg-gray-700 self-start"
              }`}
            >
              <ReactMarkdown
                components={{
                  a: props => (
                    <a
                      {...props}
                      className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                }}
              >
                {msg.text}
              </ReactMarkdown>
            </div>
          ))
        )}
        {isThinking && (
          <div className="text-right mr-2 text-gray-500 italic">Thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <input
          type="text"
          className="flex-grow p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
          placeholder="Type a message (try: 'get my agent identity' or 'register agent')..."
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isThinking}
        />
        <button
          onClick={onSendMessage}
          className={`px-6 py-2 rounded-full font-semibold transition-all ${
            isThinking
              ? "bg-gray-300 cursor-not-allowed text-gray-500"
              : "bg-[#0052FF] hover:bg-[#003ECF] text-white shadow-md"
          }`}
          disabled={isThinking}
        >
          Send
        </button>
      </div>
    </div>
  );
}
