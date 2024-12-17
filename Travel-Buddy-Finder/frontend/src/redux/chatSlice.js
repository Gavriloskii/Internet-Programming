import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import socketService from '../services/socketService';

// Async thunks
export const fetchMessages = createAsyncThunk(
    'chat/fetchMessages',
    async (conversationId) => {
        const response = await socketService.emit('fetchMessages', { conversationId });
        return { conversationId, messages: response.messages };
    }
);

export const fetchConversations = createAsyncThunk(
    'chat/fetchConversations',
    async () => {
        const response = await socketService.emit('fetchConversations');
        return response.conversations;
    }
);

export const sendMessage = createAsyncThunk(
    'chat/sendMessage',
    async ({ conversationId, message }) => {
        await socketService.emit('sendMessage', { conversationId, message });
        return { conversationId, message };
    }
);

const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        messages: {},
        conversations: [],
        typingStatus: {},
        onlineUsers: {},
        unreadCounts: {},
        loading: false,
        error: null
    },
    reducers: {
        setTypingStatus: (state, action) => {
            const { conversationId, isTyping } = action.payload;
            state.typingStatus[conversationId] = isTyping;
        },
        addMessage: (state, action) => {
            const { conversationId, message } = action.payload;
            if (!state.messages[conversationId]) {
                state.messages[conversationId] = [];
            }
            state.messages[conversationId].push(message);
        },
        updateMessageStatus: (state, action) => {
            const { conversationId, messageId, status } = action.payload;
            const message = state.messages[conversationId]?.find(m => m.id === messageId);
            if (message) {
                message.status = status;
            }
        },
        addConversation: (state, action) => {
            state.conversations.push(action.payload);
        },
        updateConversation: (state, action) => {
            const index = state.conversations.findIndex(c => c.id === action.payload.id);
            if (index !== -1) {
                state.conversations[index] = action.payload;
            }
        },
        updateOnlineStatus: (state, action) => {
            const { userId, isOnline } = action.payload;
            state.onlineUsers[userId] = isOnline;
        },
        updateUnreadCount: (state, action) => {
            const { conversationId, count } = action.payload;
            state.unreadCounts[conversationId] = count;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMessages.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                const { conversationId, messages } = action.payload;
                state.messages[conversationId] = messages;
                state.loading = false;
            })
            .addCase(fetchMessages.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(fetchConversations.fulfilled, (state, action) => {
                state.conversations = action.payload;
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                const { conversationId, message } = action.payload;
                if (!state.messages[conversationId]) {
                    state.messages[conversationId] = [];
                }
                state.messages[conversationId].push(message);
            });
    }
});

// Selectors
export const selectMessages = (state) => state.chat.messages;
export const selectConversations = (state) => state.chat.conversations;
export const selectTypingStatus = (state) => state.chat.typingStatus;
export const selectChatLoading = (state) => state.chat.loading;
export const selectChatError = (state) => state.chat.error;
export const selectOnlineUsers = (state) => state.chat.onlineUsers;
export const selectUnreadCounts = (state) => state.chat.unreadCounts;

export const {
    setTypingStatus,
    addMessage,
    updateMessageStatus,
    addConversation,
    updateConversation,
    updateOnlineStatus,
    updateUnreadCount
} = chatSlice.actions;

export default chatSlice.reducer;
