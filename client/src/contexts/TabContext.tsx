/**
 * TabContext.tsx — Shared context for tab navigation and cross-tab communication
 * Allows TheoryTab to navigate to Visualizer and pre-load a lambda term
 */

import { createContext, useContext, useState, ReactNode } from 'react';

interface TabContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingTerm: string | null;
  setPendingTerm: (term: string | null) => void;
}

const TabContext = createContext<TabContextType>({
  activeTab: 'theory',
  setActiveTab: () => {},
  pendingTerm: null,
  setPendingTerm: () => {},
});

export function TabProvider({ children }: { children: ReactNode }) {
  // Initialize from URL hash
  const initialTab = (() => {
    const hash = window.location.hash.replace('#', '');
    return ['theory', 'visualizer', 'chemsim', 'benchmark'].includes(hash) ? hash : 'theory';
  })();

  const [activeTab, setActiveTabState] = useState(initialTab);
  const [pendingTerm, setPendingTerm] = useState<string | null>(null);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab, pendingTerm, setPendingTerm }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTab() {
  return useContext(TabContext);
}
