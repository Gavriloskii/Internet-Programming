import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    withCredentials: true,
    validateStatus: function (status) {
        return status >= 200 && status < 500;
    }
});

// Auth endpoints
export const auth = {
    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response;
    },
    signup: async (userData) => {
        const response = await api.post('/auth/signup', userData);
        return response;
    },
    verifyToken: () => api.get('/auth/verify'),
    resetPassword: (email) => api.post('/auth/reset-password', { email }),
    updatePassword: (token, newPassword) => api.post('/auth/update-password', { token, newPassword }),
    logout: () => api.post('/auth/logout')
};

// Chat endpoints
export const chat = {
    getConversations: () => api.get('/chat/conversations'),
    getMessages: (conversationId) => api.get(`/chat/conversations/${conversationId}/messages`),
    sendMessage: (conversationId, message) => api.post(`/chat/conversations/${conversationId}/messages`, { message }),
    createConversation: (userId) => api.post('/chat/conversations', { userId })
};

// User endpoints
export const users = {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data),
    updatePreferences: (preferences) => api.put('/users/preferences', preferences),
    uploadAvatar: (formData) => api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getPotentialMatches: (page = 1, filters = {}) => api.get('/matches/potential', {
        params: {
            page,
            limit: 10,
            ...filters
        }
    }),
    getMatches: () => api.get('/matches'),
    createMatch: (userId) => api.post(`/matches/${userId}`)
};

// Journals endpoints
export const journals = {
    getAll: () => api.get('/journals'),
    getOne: (id) => api.get(`/journals/${id}`),
    create: (data) => api.post('/journals', data),
    update: (id, data) => api.put(`/journals/${id}`, data),
    delete: (id) => api.delete(`/journals/${id}`),
    addEntry: (journalId, entry) => api.post(`/journals/${journalId}/entries`, entry),
    updateEntry: (journalId, entryId, data) => api.put(`/journals/${journalId}/entries/${entryId}`, data),
    deleteEntry: (journalId, entryId) => api.delete(`/journals/${journalId}/entries/${entryId}`)
};

// Create a named export for the API object
export const apiService = {
    auth,
    chat,
    users,
    journals,
};

// Default export
export default apiService;
