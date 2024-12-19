import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import socketService from '../services/socketService';
import { addNotification } from './notificationsSlice';

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
            
            // Update unread count
            if (!message.isFromCurrentUser) {
                state.unreadCounts[conversationId] = (state.unreadCounts[conversationId] || 0) + 1;
            }
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
        },
        markConversationAsRead: (state, action) => {
            const conversationId = action.payload;
            state.unreadCounts[conversationId] = 0;
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
export const selectTotalUnreadCount = (state) => {
    const counts = state.chat.unreadCounts;
    return Object.values(counts).reduce((total, count) => total + (count || 0), 0);
};

// Thunk for handling new messages
export const handleNewMessage = (messageData) => (dispatch, getState) => {
    const { conversationId, message, sender } = messageData;
    const state = getState();
    const currentPath = state.router?.location?.pathname;
    const isInConversation = currentPath === `/app/messages/${conversationId}`;
    
    // Add the message to the chat
    dispatch(addMessage({ conversationId, message }));
    
    // Create a notification and increment unread count if not from current user and not in conversation
    if (!message.isFromCurrentUser && !isInConversation) {
        dispatch(addNotification({
            id: `message-${message.id}`,
            type: 'message',
            content: `New message from ${sender.name}`,
            timestamp: new Date().toISOString(),
            data: { conversationId, messageId: message.id }
        }));
        
        // Update unread count for the conversation
        const currentCount = state.chat.unreadCounts[conversationId] || 0;
        dispatch(updateUnreadCount({ conversationId, count: currentCount + 1 }));
    }
};

export const {
    setTypingStatus,
    addMessage,
    updateMessageStatus,
    addConversation,
    updateConversation,
    updateOnlineStatus,
    updateUnreadCount,
    markConversationAsRead
} = chatSlice.actions;

export default chatSlice.reducer;
