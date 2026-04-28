import { create } from 'zustand';

export const useStore = create((set, get) => ({
  // Auth
  user: null,
  token: null,

  setUser: (user) => set({ user }),
  updateUser: (patch) => set(s => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
  setToken: (token) => {
    if (typeof window !== 'undefined') localStorage.setItem('lr_token', token);
    set({ token });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lr_token');
      localStorage.removeItem('lr_user');
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

  // Elimination modal
  eliminationModal: null,
  showElimination: (data) => set({ eliminationModal: data }),
  closeElimination: () => set({ eliminationModal: null }),

  // Reality winner
  realityWinner: null,
  setRealityWinner: (winner) => set({ realityWinner: winner }),

  // Survivor celebration
  survivorCelebration: null,
  setSurvivorCelebration: (data) => set({ survivorCelebration: data }),

  // Anjo / Líder phases
  anjoChoosing: false,
  setAnjoChoosing: (v) => set({ anjoChoosing: v }),
  liderIndicating: false,
  setLiderIndicating: (v) => set({ liderIndicating: v }),

  // Sincrôneo
  sincerao: null,
  setSincerao: (s) => set({ sincerao: s }),

  // Timer
  questionTimer: 0,
  setQuestionTimer: (t) => set({ questionTimer: t }),
}));
