import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getSupabase } from '../services/supabase';
import { createAuthController, initialAuthState } from '../services/authController';
import { AuthIssue } from '../services/authErrors';

export const AuthContext = createContext(null);

export function AuthProvider({ children, clientFactory = getSupabase }) {
  const [state, setState] = useState(initialAuthState);
  const controllerRef = useRef(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let controller;
    let listener;
    let configurationTimer;
    try {
      controller = createAuthController(clientFactory(), setState);
      controllerRef.current = controller;
      void controller.start();
      listener = AppState.addEventListener('change', (status) => {
        if (status === 'active') void controller.refresh();
      });
    } catch {
      configurationTimer = setTimeout(() => {
        setState({ ...initialAuthState, phase: 'configuration_error', error: new AuthIssue('configuration', 'Account access is temporarily unavailable. Please contact support.') });
      }, 0);
    }
    return () => { clearTimeout(configurationTimer); listener?.remove(); controller?.stop(); controllerRef.current = null; };
  }, [clientFactory, attempt]);

  function invoke(method, ...args) {
    if (!controllerRef.current) return Promise.reject(new AuthIssue('configuration', 'Account access is unavailable. Please try again.'));
    return controllerRef.current[method](...args);
  }

  return (
    <AuthContext.Provider value={{
      ...state,
      login: (values) => invoke('login', values),
      register: (values) => invoke('register', values),
      resendConfirmation: (email) => invoke('resendConfirmation', email),
      logout: () => invoke('logout'),
      retry: () => { if (controllerRef.current) void invoke('refresh'); else setAttempt((current) => current + 1); },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
