import React, { useState, useEffect, useRef } from 'react';
import { postChatMessage } from '../../api/prescriptionService';
import { Send, Bot, User, Sparkles, Brain } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Pharma AI, your intelligent health assistant. How can I help with your health questions today?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data } = await postChatMessage(
        [...messages, userMessage].map(msg => ({ role: msg.role, content: msg.content }))
      );
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting. Please try again later.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col">

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-border/70 p-4">
        <div className="max-w-4xl mx-auto flex items-center space-x-3">
          <div className="w-10 h-10 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-700">
              Pharma AI Assistant
            </h1>
            <p className="text-sm text-slate-500">Your intelligent health companion</p>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-brand-500" />
            <span className="text-sm text-slate-500">AI Powered</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {messages.map((message, index) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4 slide-in-bottom`}
            style={{animationDelay: `${index * 0.1}s`}}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md transition-all duration-300 ${
                message.role === 'user' 
                  ? 'bg-brand-600 text-white' 
                  : 'bg-white border border-border/60 text-slate-900'
              }`}
            >
              <div className="flex items-start space-x-3">
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-brand-100' : 'text-slate-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start mb-4 slide-in-bottom">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white border border-border/60 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white/90 backdrop-blur-md border-t border-border/70 p-4">
        <div className="max-w-4xl mx-auto flex space-x-3">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me about medications, health advice, or prescription information..."
            disabled={isLoading}
            className="form-input flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="button-style px-6"
          >
            {isLoading ? (
              <div className="loading-spinner w-4 h-4"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Quick Suggestions */}
        <div className="max-w-4xl mx-auto mt-3 flex flex-wrap gap-2">
          {['Medication interactions', 'Side effects', 'Dosage information', 'Health tips'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInputMessage(suggestion)}
              disabled={isLoading}
              className="px-3 py-1 text-xs bg-white border border-border rounded-full text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-all duration-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;