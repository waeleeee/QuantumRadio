import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      case 'warning':
        return <AlertCircle className="text-yellow-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  const getToastClassName = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center w-full max-w-xs p-4 text-gray-800 dark:text-gray-200 rounded shadow-lg ${getToastClassName(toast.type)}`}
          role="alert"
        >
          <div className="flex items-center">
            <div className="inline-flex items-center justify-center flex-shrink-0 mr-3">
              {getIcon(toast.type)}
            </div>
            <div className="text-sm font-normal">{toast.message}</div>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-auto -mx-1.5 -my-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded focus:ring-2 focus:ring-gray-300 p-1"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;