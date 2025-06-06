import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  title: string;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ title, children }) => {
  const isMobile = window.innerWidth < 1024; // Matches lg: breakpoint in Tailwind
  console.log('Layout rendering, isMobile:', isMobile);

  return (
    <div className="flex min-h-screen">
      <Sidebar isMobile={isMobile} />
      <div className="flex-1 p-6 bg-gray-100 dark:bg-gray-900 lg:ml-64">
        <Header title={title} />
        {children}
      </div>
    </div>
  );
};

export default Layout;