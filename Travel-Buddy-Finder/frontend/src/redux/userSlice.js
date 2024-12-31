import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { auth, apiService } from '../services/api';
import Cookies from 'js-cookie'; // Import js-cookie for cookie management

// Async thunk for updating profile
export const updateProfile = createAsyncThunk(
    'user/updateProfile',
    async (formData, { rejectWithValue }) => {
        try {
            const response = await apiService.users.updateProfile(formData);
            console.log('Profile update response:', response);
            if (!response.data || !response.data.data || !response.data.data.user) {
                throw new Error('Invalid response format from server');
            }
            return response.data.data.user;
        } catch (error) {
            console.error('Profile update error:', error);
            return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
        }
    }
);

// Initial state
const initialState = {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    settings: {
        theme: 'light',
        notifications: true
    }
};

// Async thunks
export const signupUser = createAsyncThunk(
    'user/signup',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await auth.signup(userData);
            if (!response.data.data.user) {
                throw new Error('No user data received');
            }
            return response.data.data.user;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Signup failed');
        }
    }
);

export const loginUser = createAsyncThunk(
    'user/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await auth.login(credentials);
            console.log('Login response:', response); // Log the response
            if (!response.data.data.user) {
                throw new Error('No user data received');
            }
            // Set the token in cookies
            Cookies.set('jwt', response.data.data.token);
            return response.data.data.user;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Login failed');
        }
    }
);

export const logoutUser = createAsyncThunk(
    'user/logout',
    async (_, { rejectWithValue }) => {
        try {
            await auth.logout();
            Cookies.remove('jwt');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Logout failed');
        }
    }
);

// Slice
const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        loginStart: (state) => {
            state.loading = true;
            state.error = null;
        },
        login: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = true;
            state.loading = false;
            state.error = null;
        },
        loginFailure: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.loading = false;
            state.error = null;
        },
        updatePreferences: (state, action) => {
            state.user = {
                ...state.user,
                travelPreferences: {
                    ...state.user.travelPreferences,
                    ...action.payload
                }
            };
        },
        addMatch: (state, action) => {
            if (!state.user.matches) {
                state.user.matches = [];
            }
            state.user.matches.push(action.payload);
        },
        removeMatch: (state, action) => {
            if (state.user.matches) {
                state.user.matches = state.user.matches.filter(
                    match => match._id !== action.payload
                );
            }
        },
        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },
        clearError: (state) => {
            state.error = null;
        },
        updateSettings: (state, action) => {
            state.settings = { ...state.settings, ...action.payload };
        }
    },
    extraReducers: (builder) => {
        builder
            // Signup
            .addCase(signupUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(signupUser.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isAuthenticated = true;
                state.loading = false;
                state.error = null;
            })
            .addCase(signupUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Login
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.user = action.payload;
                state.isAuthenticated = true;
                state.loading = false;
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Logout
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.isAuthenticated = false;
                state.loading = false;
                state.error = null;
            })
// Handle updateProfile
            .addCase(updateProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                // Update the entire user object with the response
                state.user = action.payload;
            })
            .addCase(updateProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

// Actions
export const {
    loginStart,
    login,
    loginFailure,
    logout,
    updatePreferences,
    addMatch,
    removeMatch,
    setError,
    clearError,
    updateSettings
} = userSlice.actions;

// Selectors
export const selectUser = (state) => state.user.user;
export const selectIsAuthenticated = (state) => state.user.isAuthenticated;
export const selectLoading = (state) => state.user.loading;
export const selectError = (state) => state.user.error;
export const selectSettings = (state) => state.user.settings;

export default userSlice.reducer;
