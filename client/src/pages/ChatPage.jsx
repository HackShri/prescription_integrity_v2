import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import Chatbot from '../components/shared/Chatbot';
import Header from '../components/layout/Header';

const ChatbotPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-4 max-w-4xl mx-auto">
        <Button onClick={() => navigate('/dashboard')} variant="ghost" className="mb-4">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Button>
        <Chatbot />
      </main>
    </div>
  );
};

export default ChatbotPage;