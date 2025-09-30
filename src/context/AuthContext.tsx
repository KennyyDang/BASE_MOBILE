import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Parent, Child } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: Parent | null;
  login: (userData: Parent) => void;
  logout: () => void;
  updateUser: (userData: Partial<Parent>) => void;
  addChild: (child: Child) => void;
  updateChild: (childId: string, childData: Partial<Child>) => void;
  removeChild: (childId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<Parent | null>(null);

  const login = (userData: Parent) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData: Partial<Parent>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const addChild = (child: Child) => {
    if (user) {
      setUser({ ...user, children: [...user.children, child] });
    }
  };

  const updateChild = (childId: string, childData: Partial<Child>) => {
    if (user) {
      const updatedChildren = user.children.map(child =>
        child.id === childId ? { ...child, ...childData } : child
      );
      setUser({ ...user, children: updatedChildren });
    }
  };

  const removeChild = (childId: string) => {
    if (user) {
      const filteredChildren = user.children.filter(child => child.id !== childId);
      setUser({ ...user, children: filteredChildren });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      logout, 
      updateUser, 
      addChild, 
      updateChild, 
      removeChild 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
