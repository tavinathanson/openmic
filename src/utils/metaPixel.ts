declare global {
  interface Window {
    fbq: (event: string, eventName: string, parameters?: Record<string, unknown>) => void;
  }
}

export const trackRegistration = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Lead');
  }
}; 