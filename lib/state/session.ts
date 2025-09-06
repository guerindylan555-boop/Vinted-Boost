import { create } from 'zustand';

type User = {
  id: string;
  email: string;
};

type SessionState = {
  user: User | null;
};

type SessionActions = {
  setUser: (user: User | null) => void;
};

export const useSessionStore = create<SessionState & SessionActions>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

