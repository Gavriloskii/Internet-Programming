import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true // This is important for sending cookies
});

// Initialize CSRF token
const initializeCsrf = async () => {
    try {
        const { data } = await api.get('/csrf-token');
        api.defaults.headers['X-CSRF-Token'] = data.csrfToken;
    } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
    }
};

// Initialize CSRF token for both development and production
initializeCsrf();

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Try to refresh token first
            try {
                await api.post('/auth/refresh-token');
                // Retry the original request
                return api.request(error.config);
            } catch (refreshError) {
                // If refresh fails, redirect to login
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth endpoints
export const auth = {
    login: (credentials) => api.post('/auth/login', credentials),
    signup: (userData) => api.post('/auth/signup', userData),
    verifyToken: () => api.get('/auth/verify'),
    resetPassword: (email) => api.post('/auth/reset-password', { email }),
    updatePassword: (token, newPassword) => api.post('/auth/update-password', { token, newPassword }),
    logout: () => api.post('/auth/logout')
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

// Travel Journal endpoints
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

// Chat endpoints
export const chat = {
    getConversations: () => api.get('/chat/conversations'),
    getMessages: (conversationId) => api.get(`/chat/conversations/${conversationId}/messages`),
    sendMessage: (conversationId, message) => api.post(`/chat/conversations/${conversationId}/messages`, { message }),
    createConversation: (userId) => api.post('/chat/conversations', { userId })
};

// Group endpoints
export const groups = {
    getAll: () => api.get('/groups'),
    getOne: (id) => api.get(`/groups/${id}`),
    create: (data) => api.post('/groups', data),
    update: (id, data) => api.put(`/groups/${id}`, data),
    delete: (id) => api.delete(`/groups/${id}`),
    join: (id) => api.post(`/groups/${id}/join`),
    leave: (id) => api.post(`/groups/${id}/leave`),
    getMembers: (id) => api.get(`/groups/${id}/members`)
};

// Events endpoints
export const events = {
    getAll: () => api.get('/events'),
    getOne: (id) => api.get(`/events/${id}`),
    create: (data) => api.post('/events', data),
    update: (id, data) => api.put(`/events/${id}`, data),
    delete: (id) => api.delete(`/events/${id}`),
    join: (id) => api.post(`/events/${id}/join`),
    leave: (id) => api.post(`/events/${id}/leave`),
    getParticipants: (id) => api.get(`/events/${id}/participants`)
};

// Marketplace endpoints
export const marketplace = {
    getListings: () => api.get('/marketplace/listings'),
    getListing: (id) => api.get(`/marketplace/listings/${id}`),
    createListing: (data) => api.post('/marketplace/listings', data),
    updateListing: (id, data) => api.put(`/marketplace/listings/${id}`, data),
    deleteListing: (id) => api.delete(`/marketplace/listings/${id}`),
    getMyListings: () => api.get('/marketplace/my-listings'),
    contactSeller: (listingId, message) => api.post(`/marketplace/listings/${listingId}/contact`, { message })
};

// Forum endpoints
export const forum = {
    getPosts: () => api.get('/forum/posts'),
    getPost: (id) => api.get(`/forum/posts/${id}`),
    createPost: (data) => api.post('/forum/posts', data),
    updatePost: (id, data) => api.put(`/forum/posts/${id}`, data),
    deletePost: (id) => api.delete(`/forum/posts/${id}`),
    addComment: (postId, comment) => api.post(`/forum/posts/${postId}/comments`, { comment }),
    deleteComment: (postId, commentId) => api.delete(`/forum/posts/${postId}/comments/${commentId}`),
    likePost: (id) => api.post(`/forum/posts/${id}/like`),
    unlikePost: (id) => api.post(`/forum/posts/${id}/unlike`)
};

// Itinerary endpoints
export const itineraries = {
    getAll: () => api.get('/itineraries'),
    getOne: (id) => api.get(`/itineraries/${id}`),
    create: (data) => api.post('/itineraries', data),
    update: (id, data) => api.put(`/itineraries/${id}`, data),
    delete: (id) => api.delete(`/itineraries/${id}`),
    share: (id, userId) => api.post(`/itineraries/${id}/share`, { userId }),
    unshare: (id, userId) => api.post(`/itineraries/${id}/unshare`, { userId })
};

export default {
    auth,
    users,
    journals,
    chat,
    groups,
    events,
    marketplace,
    forum,
    itineraries
};
