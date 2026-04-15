"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LotteryType } from '@/lib/combinations';
import { storage } from '@/lib/storage';

interface LotteryContextType {
  activeType: LotteryType;
  setActiveType: (type: LotteryType) => void;
  isInitialized: boolean;
}

const LotteryContext = createContext<LotteryContextType | undefined>(undefined);

export function LotteryProvider({ children }: { children: React.ReactNode }) {
  const [activeType, setActiveTypeState] = useState<LotteryType>('SSQ');
  const [isInitialized, setIsInitialized] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await storage.getSettings<{ activeType: LotteryType }>('global_settings');
      if (settings?.activeType) {
        setActiveTypeState(settings.activeType);
      }
    } catch (error) {
      console.error('Failed to load global lottery settings:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const setActiveType = useCallback(async (type: LotteryType) => {
    setActiveTypeState(type);
    try {
      await storage.setSettings('global_settings', { activeType: type });
      // Dispatch event to notify other components if needed, 
      // though context handles most cases.
      window.dispatchEvent(new Event('lottery-type-changed'));
    } catch (error) {
      console.error('Failed to save global lottery settings:', error);
    }
  }, []);

  return (
    <LotteryContext.Provider value={{ activeType, setActiveType, isInitialized }}>
      {children}
    </LotteryContext.Provider>
  );
}

export function useLotteryContext() {
  const context = useContext(LotteryContext);
  if (context === undefined) {
    throw new Error('useLotteryContext must be used within a LotteryProvider');
  }
  return context;
}
