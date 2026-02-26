declare global {
  interface Window {
    fbq: (event: string, eventName: string, parameters?: Record<string, unknown>) => void;
  }
}

export const trackRegistration = (type: 'comedian' | 'audience') => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'CompleteRegistration', {
      content_name: type === 'comedian' ? 'Comedian Signup' : 'Audience Signup',
      status: true,
    });
  }
}; 