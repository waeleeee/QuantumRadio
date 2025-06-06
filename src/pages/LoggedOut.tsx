import React from 'react';
import { LogIn } from 'lucide-react';
import Button from '../components/ui/Button';

const LoggedOut: React.FC = () => {
  // Simulate logging back in by reloading the page
  const handleLoginAgain = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full px-6 py-8 bg-white dark:bg-gray-800 shadow-md rounded-lg">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-6">
            <LogIn className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            You've Been Logged Out
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your session has ended. Thank you for using the Quantum Radio admin dashboard.
          </p>
          
          <Button 
            variant="primary" 
            size="lg"
            fullWidth
            leftIcon={<LogIn className="mr-1" size={18} />}
            onClick={handleLoginAgain}
          >
            Log In Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoggedOut;