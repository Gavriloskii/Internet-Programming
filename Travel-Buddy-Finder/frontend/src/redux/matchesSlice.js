import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { users } from '../services/api';
import { addNotification } from './notificationsSlice';

// Async thunks
export const fetchMatches = createAsyncThunk(
    'matches/fetchMatches',
    async (_, { rejectWithValue }) => {
        try {
            const response = await users.getMatches();
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to fetch matches');
        }
    }
);

export const fetchPotentialMatches = createAsyncThunk(
    'matches/fetchPotentialMatches',
    async (_, { rejectWithValue }) => {
        try {
            const response = await users.getPotentialMatches();
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to fetch potential matches');
        }
    }
);

const initialState = {
    matches: [],
    potentialMatches: [],
    currentMatch: null,
    recentMatches: [],
    loading: false,
    error: null,
    matchStats: {
        totalMatches: 0,
        newMatches: 0,
        activeChats: 0
    }
};

const matchesSlice = createSlice({
    name: 'matches',
    initialState,
    reducers: {
        setCurrentMatch: (state, action) => {
            state.currentMatch = action.payload;
        },
        addMatch: (state, action) => {
            const newMatch = action.payload;
            state.matches.unshift(newMatch);
            state.recentMatches.unshift(newMatch);
            state.matchStats.totalMatches++;
            state.matchStats.newMatches++;
        },
        removeMatch: (state, action) => {
            const matchId = action.payload;
            state.matches = state.matches.filter(match => match.id !== matchId);
            state.recentMatches = state.recentMatches.filter(match => match.id !== matchId);
            state.matchStats.totalMatches--;
        },
        updateMatch: (state, action) => {
            const updatedMatch = action.payload;
            state.matches = state.matches.map(match =>
                match.id === updatedMatch.id ? { ...match, ...updatedMatch } : match
            );
        },
        clearRecentMatches: (state) => {
            state.recentMatches = [];
            state.matchStats.newMatches = 0;
        },
        removePotentialMatch: (state, action) => {
            const userId = action.payload;
            state.potentialMatches = state.potentialMatches.filter(match => match.id !== userId);
        },
        updateMatchStats: (state, action) => {
            state.matchStats = { ...state.matchStats, ...action.payload };
        },
        resetMatchState: () => initialState
    },
    extraReducers: (builder) => {
        // Handle fetchMatches
        builder
            .addCase(fetchMatches.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMatches.fulfilled, (state, action) => {
                state.loading = false;
                state.matches = action.payload;
                state.matchStats.totalMatches = action.payload.length;
            })
            .addCase(fetchMatches.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

        // Handle fetchPotentialMatches
        builder
            .addCase(fetchPotentialMatches.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPotentialMatches.fulfilled, (state, action) => {
                state.loading = false;
                state.potentialMatches = action.payload;
            })
            .addCase(fetchPotentialMatches.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

// Selectors
export const selectMatches = (state) => state.matches.matches;
export const selectPotentialMatches = (state) => state.matches.potentialMatches;
export const selectCurrentMatch = (state) => state.matches.currentMatch;
export const selectRecentMatches = (state) => state.matches.recentMatches;
export const selectMatchStats = (state) => state.matches.matchStats;
export const selectMatchesLoading = (state) => state.matches.loading;
export const selectMatchesError = (state) => state.matches.error;

// Actions
export const {
    setCurrentMatch,
    addMatch,
    removeMatch,
    updateMatch,
    clearRecentMatches,
    removePotentialMatch,
    updateMatchStats,
    resetMatchState
} = matchesSlice.actions;

// Thunks
export const handleNewMatch = (matchData) => (dispatch) => {
    dispatch(addMatch(matchData));
    
    // Create a notification for the new match
    dispatch(addNotification({
        id: `match-${matchData.id}`,
        type: 'match',
        content: `You have a new match with ${matchData.name}!`,
        timestamp: new Date().toISOString(),
        data: matchData
    }));
};

export const handleMatchRemoval = (matchId) => (dispatch) => {
    dispatch(removeMatch(matchId));
    // Additional cleanup actions can be added here
};

export default matchesSlice.reducer;
