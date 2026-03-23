import React, { useState } from 'react';
import { cn } from '../../lib/utils';

const TabsContext = React.createContext({
  activeTab: '',
  setActiveTab: () => {},
});

const Tabs = ({ children, defaultValue = '', className = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ children, className = '' }) => (
  <div
    className={cn(
      'inline-flex h-10 items-center rounded-lg bg-slate-100 p-1 text-slate-600',
      className
    )}
  >
    {children}
  </div>
);

const TabsTrigger = ({ value, children, className = '' }) => {
  const { activeTab, setActiveTab } = React.useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2954C8]/40',
        isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
        className
      )}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, children, className = '' }) => {
  const { activeTab } = React.useContext(TabsContext);
  if (activeTab !== value) return null;

  return <div className={cn('mt-4', className)}>{children}</div>;
};

export { Tabs, TabsList, TabsTrigger, TabsContent };

