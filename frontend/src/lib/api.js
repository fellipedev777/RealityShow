import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - add JWT
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('lr_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('lr_token');
      localStorage.removeItem('lr_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Rooms
export const roomsAPI = {
  list: () => api.get('/rooms'),
  get: (slug) => api.get(`/rooms/${slug}`),
  join: (data) => api.post('/rooms/join', data),
};

// Participants
export const participantsAPI = {
  list: () => api.get('/participants'),
  active: () => api.get('/participants/active'),
  gameState: () => api.get('/participants/info/game-state'),
  update: (id, data) => api.patch(`/participants/${id}`, data),
};

// Provas
export const provasAPI = {
  active: () => api.get('/provas/active'),
  create: (data) => api.post('/provas/create', data),
  answer: (id, data) => api.post(`/provas/${id}/answer`, data),
  scores: (id) => api.get(`/provas/${id}/scores`),
};

// Votes
export const votesAPI = {
  cast: (data) => api.post('/votes/cast', data),
  status: () => api.get('/votes/status'),
  results: () => api.get('/votes/results'),
};

// Sincerão
export const sincerao = {
  current: () => api.get('/sincerao/current'),
  comment: (data) => api.post('/sincerao/comment', data),
  history: () => api.get('/sincerao/history'),
};

// Private Messages
export const messagesAPI = {
  conversations: () => api.get('/messages/conversations'),
  getConversation: (partnerId) => api.get(`/messages/${partnerId}`),
  send: (partnerId, content) => api.post(`/messages/${partnerId}`, { content }),
  unreadCount: () => api.get('/messages/unread/count'),
};

// Admin
export const adminAPI = {
  startGame: () => api.post('/admin/start-game'),
  updateState: (key, value) => api.post('/admin/update-state', { key, value }),
  openSincerao: (theme) => api.post('/admin/open-sincerao', { theme }),
  closeSincerao: () => api.post('/admin/close-sincerao'),
  openVotacao: () => api.post('/admin/open-votacao'),
  closeVotacao: () => api.post('/admin/close-votacao'),
  eliminate: (user_id, speech = null) => api.post('/admin/eliminate', { user_id, speech }),
  nextWeek: () => api.post('/admin/next-week'),
  dashboard: () => api.get('/admin/dashboard'),
  openPublicVoting: () => api.post('/admin/open-public-voting'),
  closePublicVoting: () => api.post('/admin/close-public-voting'),
  importFormsVotes: (sheet_url, vote_column = 2) => api.post('/admin/import-forms-votes', { sheet_url, vote_column }),
  formsVotesResults: () => api.get('/admin/forms-votes-results'),
};

// Public (no auth)
export const publicAPI = {
  paredao: () => api.get('/public/paredao'),
  results: () => api.get('/public/results'),
};
