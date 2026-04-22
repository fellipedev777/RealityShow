import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Auth
  user: null,
  token: null,

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (typeof window !== 'undefined') localStorage.setItem('bbb_token', token);
    set({ token });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bbb_token');
      localStorage.removeItem('bbb_user');
    }
    set({ user: null, token: null, gameState: null });
  },

  // Game state
  gameState: null,
  setGameState: (state) => set({ gameState: state }),
  updateGameState: (key, value) => set(s => ({
    gameState: { ...(s.gameState || {}), [key]: value }
  })),

  // Participants
  participants: [],
  setParticipants: (participants) => set({ participants }),

  // Rooms
  currentRoom: null,
  setCurrentRoom: (room) => set({ currentRoom: room }),

  // Active prova
  activeProva: null,
  setActiveProva: (prova) => set({ activeProva: prova }),
  currentQuestion: null,
  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  provaScores: [],
  setProvaScores: (scores) => set({ provaScores: scores }),

  // Announcements
  announcements: [],
  addAnnouncement: (a) => set(s => ({
    announcements: [a, ...s.announcements].slice(0, 10)
  })),
  clearAnnouncements: () => set({ announcements: [] }),

  // Paredão
  paredaoUsers: [],
  setParedaoUsers: (users) => set({ paredaoUsers: users }),

  // Sincrôneo
  sincerao: null,
  setSincerao: (s) => set({ sincerao: s }),

  // Timer
  questionTimer: 0,
  setQuestionTimer: (t) => set({ questionTimer: t }),
}));
