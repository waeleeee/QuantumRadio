import React from 'react';
import { Bell, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user } = useAuth();
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center justify-between h-16 px-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </h1>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button 
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                3
              </span>
            </button>
          </div>
          
          {/* User profile with date */}
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.prenom} {user?.nom || 'Wael Riahii'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{currentDate}</p>
            </div>
            <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              {user?.photo_profil ? (
                <img
                  src={user.photo_profil}
                  alt={`${user.prenom} ${user.nom}`}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <User size={18} className="text-gray-600 dark:text-gray-300" />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;