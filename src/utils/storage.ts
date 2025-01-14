// /src/utils/storage.ts

export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    if (!isStorageAvailable()) {
      console.warn('[storage] localStorage unavailable; using fallback memory.');
      (window as any).__fallbackStorage = (window as any).__fallbackStorage || {};
      (window as any).__fallbackStorage[key] = value;
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch (err) {
    console.warn('[storage] localStorage blocked:', err);
    (window as any).__fallbackStorage = (window as any).__fallbackStorage || {};
    (window as any).__fallbackStorage[key] = value;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    if (!isStorageAvailable()) {
      return (window as any).__fallbackStorage?.[key] || null;
    }
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn('[storage] localStorage blocked:', err);
    return (window as any).__fallbackStorage?.[key] || null;
  }
}
