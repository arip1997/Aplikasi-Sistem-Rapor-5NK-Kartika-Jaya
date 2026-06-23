// Global Iframe Iframe Sandbox and Storage Safety
(() => {
  try {
    // Attempt standard read & write check on localStorage
    const testKey = '__storage_sandbox_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
  } catch (error) {
    console.warn('[Storage Sandbox Warning] Native localStorage is inaccessible in this iframe context. Activating robust in-memory virtual storage fallback.', error);
    
    const virtualStore: Record<string, string> = {};
    
    try {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: (key: string): string | null => {
            return Object.prototype.hasOwnProperty.call(virtualStore, key) ? virtualStore[key] : null;
          },
          setItem: (key: string, value: string): void => {
            virtualStore[key] = String(value);
          },
          removeItem: (key: string): void => {
            delete virtualStore[key];
          },
          clear: (): void => {
            for (const key in virtualStore) {
              delete virtualStore[key];
            }
          },
          key: (index: number): string | null => {
            const keys = Object.keys(virtualStore);
            return keys[index] || null;
          },
          get length(): number {
            return Object.keys(virtualStore).length;
          }
        },
        configurable: true,
        enumerable: true,
        writable: true
      });
    } catch (defineErr) {
      console.error('[Storage Error] Could not override window.localStorage with in-memory fallback:', defineErr);
    }
  }
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
