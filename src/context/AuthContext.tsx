import React, { createContext, useContext, useState } from 'react';

export type Role = 'farmer' | 'authority';

interface User {
  id: string;
  name: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  login: (name: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (name: string, password: string, role: Role) => {
    // Demo authentication - simulate API call
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const userId = `${role.toUpperCase()}-${Math.random().toString(36).substr(2, 9)}`;
        setUser({ id: userId, name, role });
        resolve();
      }, 500);
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
