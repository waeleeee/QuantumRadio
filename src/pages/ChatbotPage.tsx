// src/pages/ChatbotPage.tsx
import React from 'react';
import Layout from '../components/layout/Layout'; // Assuming your Layout component is here
import Chatbot from '../components/Chatbot';

const ChatbotPage: React.FC = () => {
  return (
    <Layout title="Chatbot Assistant"> {/* Use your existing Layout component */}
      <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md h-full flex flex-col">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Chat with your Data</h2>
        <Chatbot />
      </div>
    </Layout>
  );
};

export default ChatbotPage;