import React from 'react';
import Layout from '../components/layout/Layout';
import ChatbotComponent from '../components/Chatbot';

const Chatbot = () => {
  return (
    <Layout title="AI Assistant">
      <div className="mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="h-[800px]">
            <ChatbotComponent />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Chatbot; 