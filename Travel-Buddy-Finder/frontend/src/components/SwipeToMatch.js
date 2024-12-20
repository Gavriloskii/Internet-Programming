import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import SwipeCard from './SwipeCard';
import MatchNotification from './MatchNotification';
import MatchFilters from './MatchFilters';
import { users } from '../services/api';
import socketService from '../services/socketService';
import { toast } from 'react-hot-toast';
import { analytics } from '../services/analytics';

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const PRELOAD_THRESHOLD = 3;
const PULL_TO_REFRESH_THRESHOLD = 100;

const SwipeToMatch = () => {
    const dispatch = useDispatch();
    const containerRef = useRef(null);
    const abortControllerRef = useRef(null);
    const loadingTimeoutRef = useRef(null);
    const activeAnimationsRef = useRef(new Set());

    const [showFilters, setShowFilters] = useState(false);
    const [potentialMatches, setPotentialMatches] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showMatch, setShowMatch] = useState(false);
    const [matchedUser, setMatchedUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingState, setLoadingState] = useState('idle');
    const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
    const [lastSwipeDirection, setLastSwipeDirection] = useState(null);
    const [preloadedImages, setPreloadedImages] = useState(new Set());
    const [swipeHistory, setSwipeHistory] = useState([]);
    const [matchQueue, setMatchQueue] = useState([]);
    const [lastSwipeTimestamp, setLastSwipeTimestamp] = useState(Date.now());
    const [filters, setFilters] = useState({
        personalityType: '',
        budget: '',
        interests: []
    });

    // Pull-to-refresh state
    const [pullStartY, setPullStartY] = useState(0);
    const [pullMoveY, setPullMoveY] = useState(0);
    const [isPulling, setIsPulling] = useState(false);

    // Monitor network status
    useEffect(() => {
        const handleOnline = () => setNetworkStatus(true);
        const handleOffline = () => setNetworkStatus(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Enhanced match handling with error recovery
    const handleMatch = useCallback((matchData) => {
        setMatchedUser(matchData.user);
        setShowMatch(true);
        
        dispatch({ type: 'matches/addMatch', payload: matchData });
        
        if (matchData.conversation) {
            dispatch({ type: 'chat/addConversation', payload: matchData.conversation });
            if (matchData.message) {
                dispatch({ 
                    type: 'chat/addMessage', 
                    payload: {
                        conversationId: matchData.conversation.id,
                        message: matchData.message
                    }
                });
            }
        }

        analytics.track('Match Created', {
            matchedUserId: matchData.user._id,
            matchScore: matchData.matchScore
        });
    }, [dispatch]);

    // Enhanced image preloading with error recovery
    const preloadImages = useCallback((users) => {
        const priorityQueue = users.slice(0, 3);
        const backgroundQueue = users.slice(3);

        priorityQueue.forEach(user => {
            if (user.profilePicture && !preloadedImages.has(user.profilePicture)) {
                const img = new Image();
                img.importance = 'high';
                img.loading = 'eager';
                img.onerror = () => {
                    console.warn(`Failed to preload image: ${user.profilePicture}`);
                };
                img.src = user.profilePicture;
                setPreloadedImages(prev => new Set([...prev, user.profilePicture]));
            }
        });

        requestIdleCallback(() => {
            backgroundQueue.forEach(user => {
                if (user.profilePicture && !preloadedImages.has(user.profilePicture)) {
                    const img = new Image();
                    img.importance = 'low';
                    img.loading = 'lazy';
                    img.onerror = () => {
                        console.warn(`Failed to preload image: ${user.profilePicture}`);
                    };
                    img.src = user.profilePicture;
                    setPreloadedImages(prev => new Set([...prev, user.profilePicture]));
                }
            });
        });
    }, [preloadedImages]);

    // Optimized match queue processing
    const processMatchQueue = useCallback(async () => {
        if (matchQueue.length === 0) return;

        const currentBatch = matchQueue.slice(0, 3);
        
        try {
            const results = await Promise.allSettled(
                currentBatch.map(async match => {
                    try {
                        const result = await match.promise;
                        return { match, result };
                    } catch (err) {
                        console.error('Match processing error:', err);
                        return { match, error: err };
                    }
                })
            );

            const successfulMatches = results
                .filter(r => r.status === 'fulfilled' && r.value.result?.isMatch)
                .map(r => r.value);

            if (successfulMatches.length > 0) {
                successfulMatches.sort((a, b) => 
                    (b.result.matchScore || 0) - (a.result.matchScore || 0)
                );

                successfulMatches.forEach((match, index) => {
                    setTimeout(() => {
                        handleMatch({
                            user: match.match.user,
                            conversation: match.result.conversation,
                            matchScore: match.result.matchScore
                        });
                    }, index * 800);
                });

                if (window.navigator.vibrate) {
                    window.navigator.vibrate(successfulMatches.map(() => [50, 100]).flat());
                }
            }
        } catch (err) {
            console.error('Batch processing error:', err);
        } finally {
            setMatchQueue(prev => prev.slice(3));
            
            if (matchQueue.length > 3) {
                setTimeout(processMatchQueue, 1000);
            }
        }
    }, [matchQueue, handleMatch]);

    // Handle undo action
    const handleUndo = useCallback((toastId) => {
        if (swipeHistory.length === 0) return;

        const lastSwipe = swipeHistory[swipeHistory.length - 1];
        setCurrentIndex(prev => prev - 1);
        setSwipeHistory(prev => prev.slice(0, -1));
        toast.dismiss(toastId);
        
        analytics.track('Swipe Undo', {
            userId: lastSwipe.user._id,
            originalDirection: lastSwipe.direction
        });
    }, [swipeHistory]);

    // Load potential matches
    const loadPotentialMatches = useCallback(async (resetList = false, isRefresh = false) => {
        if (!networkStatus) {
            setError('No internet connection. Please check your network.');
            return;
        }

        setLoadingState('loading');
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        clearTimeout(loadingTimeoutRef.current);

        loadingTimeoutRef.current = setTimeout(() => {
            if (!potentialMatches.length) {
                setIsLoading(true);
            }
        }, 500);

        try {
            if (resetList) {
                setPage(1);
                setPotentialMatches([]);
                setCurrentIndex(0);
                setLastSwipeDirection(null);
            }

            const currentPage = resetList || isRefresh ? 1 : page;
            const batchSize = resetList ? BATCH_SIZE * 2 : 
                             networkStatus === 'slow' ? Math.floor(BATCH_SIZE / 2) : BATCH_SIZE;

            const response = await users.getPotentialMatches(
                currentPage,
                {
                    ...filters,
                    lastSwipeDirection,
                    limit: batchSize,
                    includeDetails: currentPage === 1
                },
                abortControllerRef.current.signal
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            const validMatches = data.data
                .filter(match => (
                    match?._id &&
                    match?.name &&
                    match?.travelPreferences &&
                    !potentialMatches.some(existing => existing._id === match._id)
                ))
                .map(match => ({
                    ...match,
                    preloaded: false,
                    matchScore: match.matchScore || 0
                }));

            validMatches.sort((a, b) => b.matchScore - a.matchScore);

            setPotentialMatches(prev => {
                const newMatches = resetList || isRefresh ? validMatches : [...prev, ...validMatches];
                preloadImages(newMatches.slice(currentIndex, currentIndex + 3));
                return newMatches;
            });

            setHasMore(validMatches.length >= batchSize);
            setRetryCount(0);

            if (isRefresh) {
                setIsRefreshing(false);
                toast.success('New matches found!');
            }

        } catch (err) {
            if (err.name === 'AbortError') return;

            console.error('Error loading matches:', err);
            setLoadingState('error');
            
            if (!networkStatus) {
                setError('Network connection lost. Reconnecting...');
                return;
            }

            if (retryCount < MAX_RETRIES) {
                const baseDelay = RETRY_DELAY * Math.pow(2, retryCount);
                const jitter = Math.random() * 1000;
                const delay = Math.min(baseDelay + jitter, 10000);
                
                toast.error(
                    `Loading matches failed. Retrying in ${Math.ceil(delay/1000)}s...`, 
                    { duration: delay }
                );
                
                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                    loadPotentialMatches(resetList);
                }, delay);
            } else {
                setError('Unable to load matches. Please try again later.');
                toast.error('Failed to load matches after multiple attempts', {
                    action: {
                        label: 'Retry',
                        onClick: () => {
                            setRetryCount(0);
                            setError(null);
                            loadPotentialMatches(true);
                        }
                    }
                });
            }
        } finally {
            clearTimeout(loadingTimeoutRef.current);
            setIsLoading(false);
            setLoadingState('idle');
        }
    }, [page, filters, potentialMatches, currentIndex, retryCount, lastSwipeDirection, networkStatus, preloadImages]);

    // Pull-to-refresh handlers
    const handleTouchStart = useCallback((e) => {
        const scrollTop = containerRef.current?.scrollTop || 0;
        if (scrollTop === 0) {
            setPullStartY(e.touches[0].clientY);
            setIsPulling(true);
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (!isPulling) return;

        const touchY = e.touches[0].clientY;
        const pullDistance = touchY - pullStartY;

        if (pullDistance > 0) {
            e.preventDefault();
            setPullMoveY(Math.min(pullDistance * 0.5, PULL_TO_REFRESH_THRESHOLD * 1.5));
        }
    }, [isPulling, pullStartY]);

    const handleTouchEnd = useCallback(() => {
        if (!isPulling) return;

        const shouldRefresh = pullMoveY >= PULL_TO_REFRESH_THRESHOLD;
        
        if (shouldRefresh && !isRefreshing && !isLoading) {
            setIsRefreshing(true);
            loadPotentialMatches(true, true).finally(() => {
                setIsRefreshing(false);
            });
        }

        setPullStartY(0);
        setPullMoveY(0);
        setIsPulling(false);
    }, [isPulling, pullMoveY, isRefreshing, isLoading, loadPotentialMatches]);

    // Cleanup animations when component unmounts or filters change
    useEffect(() => {
        return () => {
            // Clear any active animations
            activeAnimationsRef.current.forEach(animationId => {
                const [userId] = animationId.split('-');
                const cardElement = document.querySelector(`[data-user-id="${userId}"]`);
                if (cardElement) {
                    cardElement.style.transform = '';
                    cardElement.style.transition = 'none';
                }
            });
            activeAnimationsRef.current.clear();
        };
    }, [filters]); // Cleanup when filters change

    // Initialize matches and socket event listeners
    useEffect(() => {
        let isMounted = true;
        let retryTimeout;

        const initializeMatches = async () => {
            if (!isMounted) return;
            
            try {
                setIsLoading(true);
                setError(null);

                const response = await users.getPotentialMatches(1, {
                    limit: 10,
                    includeDetails: true
                });

                if (!isMounted) return;

                if (!response?.data) {
                    throw new Error('Invalid response format');
                }

                setPotentialMatches(response.data.data || []);
                setHasMore((response.data.data || []).length >= 10);
                setLoadingState('success');
            } catch (error) {
                if (!isMounted) return;
                console.error('Failed to initialize matches:', error);
                setError('Unable to load matches. Please check your profile settings and try again.');
                setLoadingState('error');
                toast.error('Failed to load matches. Please ensure your profile is complete.');
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        // Set up socket event listeners only
        socketService.on('match', handleMatch);
        socketService.on('error', (error) => {
            console.error('Socket error:', error);
            if (isMounted) {
                toast.error('Connection error. Please refresh the page.');
            }
        });

        // Initialize matches
        initializeMatches();

        return () => {
            isMounted = false;
            clearTimeout(retryTimeout);
            socketService.off('match', handleMatch);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []); // Empty dependency array since we only want this to run once

    // Load more matches when running low
    useEffect(() => {
        let isMounted = true;
        let loadMoreTimeout;

        const loadMore = async () => {
            if (!isLoading && !error && hasMore && potentialMatches.length > 0 && 
                potentialMatches.length - currentIndex <= PRELOAD_THRESHOLD) {
                try {
                    const nextPage = Math.floor(potentialMatches.length / 10) + 1;
                    const response = await users.getPotentialMatches(nextPage, {
                        limit: 10,
                        includeDetails: false
                    });

                    if (!isMounted || !response?.data) return;

                    const newMatches = response.data.data || [];
                    if (newMatches.length > 0) {
                        setPotentialMatches(prev => {
                            // Filter out duplicates
                            const existingIds = new Set(prev.map(m => m._id));
                            const uniqueNewMatches = newMatches.filter(m => !existingIds.has(m._id));
                            return [...prev, ...uniqueNewMatches];
                        });
                        setHasMore(newMatches.length >= 10);
                    } else {
                        setHasMore(false);
                    }
                } catch (error) {
                    console.error('Error loading more matches:', error);
                    // Don't show error toast for loading more, just stop loading
                    setHasMore(false);
                }
            }
        };

        loadMoreTimeout = setTimeout(loadMore, 500); // Increased debounce time

        return () => {
            isMounted = false;
            clearTimeout(loadMoreTimeout);
        };
    }, [currentIndex, potentialMatches.length, isLoading, hasMore, error]);

    // Handle swipe
    const handleSwipe = useCallback(async (direction) => {
        const potentialMatch = potentialMatches[currentIndex];
        if (!potentialMatch) return;

        let swipePromise = null;
        const swipeTimestamp = Date.now();
        const animationId = `${potentialMatch._id}-${direction}-${swipeTimestamp}`;
        activeAnimationsRef.current.add(animationId);

        try {
            setIsLoading(true);
            setLastSwipeDirection(direction);
            
            // Track analytics before any state updates
            analytics.track('Swipe Action', {
                direction,
                userId: potentialMatch._id,
                matchScore: potentialMatch.matchScore,
                swipeSpeed: swipeTimestamp - lastSwipeTimestamp
            });

            // If it's a right swipe, initiate socket connection first
            if (direction === 'right') {
                try {
                    swipePromise = socketService.swipe(potentialMatch._id, direction);
                } catch (socketError) {
                    console.error('Socket initialization error:', socketError);
                    toast.error('Connection error. Please refresh the page.');
                    return;
                }
            }

            // Update state after socket initialization
            setCurrentIndex(prev => prev + 1);
            setSwipeHistory(prev => [...prev, { user: potentialMatch, direction }]);
            setLastSwipeTimestamp(swipeTimestamp);

            // Handle right swipe match processing
            if (direction === 'right' && swipePromise) {
                setMatchQueue(prev => [...prev, {
                    user: potentialMatch,
                    promise: swipePromise
                }]);

                try {
                    await processMatchQueue();
                } catch (matchError) {
                    console.error('Match processing error:', matchError);
                    // Don't show error for match processing failures
                }
            }

            // Load more matches if needed
            if (currentIndex >= potentialMatches.length - PRELOAD_THRESHOLD && hasMore) {
                const nextPage = Math.floor(potentialMatches.length / 10) + 1;
                try {
                    const response = await users.getPotentialMatches(nextPage, {
                        limit: 10,
                        includeDetails: false
                    });

                    if (response?.data?.data) {
                        setPotentialMatches(prev => {
                            const existingIds = new Set(prev.map(m => m._id));
                            const uniqueNewMatches = response.data.data.filter(m => !existingIds.has(m._id));
                            return [...prev, ...uniqueNewMatches];
                        });
                        setHasMore(response.data.data.length >= 10);
                    }
                } catch (loadError) {
                    console.error('Error loading more matches:', loadError);
                    setHasMore(false);
                }
            }

        } catch (err) {
            console.error('Swipe error:', err);
            
            // Revert state changes
            setCurrentIndex(prev => Math.max(prev - 1, 0));
            setSwipeHistory(prev => prev.slice(0, -1));
            
            // Show error with undo option
            toast((t) => (
                <div>
                    <p>{err.message || 'Failed to process swipe.'}</p>
                    <button 
                        onClick={() => handleUndo(t.id)}
                        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
                    >
                        Undo
                    </button>
                </div>
            ));
        } finally {
            setIsLoading(false);
            // Cleanup animation state
            activeAnimationsRef.current.delete(animationId);
            const cardElement = document.querySelector(`[data-user-id="${potentialMatch._id}"]`);
            if (cardElement) {
                cardElement.style.transition = 'none';
                // Reset any ongoing animations
                const animations = cardElement.getAnimations();
                animations.forEach(animation => animation.cancel());
            }
        }
    }, [currentIndex, potentialMatches, hasMore, processMatchQueue, handleUndo, lastSwipeTimestamp, users]);

    const handleFilterChange = useCallback((newFilters) => {
        setFilters(newFilters);
        loadPotentialMatches(true);
    }, [loadPotentialMatches]);

    const closeMatchNotification = useCallback(() => {
        setShowMatch(false);
        setMatchedUser(null);
    }, []);

    const toggleFilters = useCallback(() => {
        setShowFilters(prev => !prev);
    }, []);

    // Loading state
    const renderLoadingState = () => {
        if (loadingState === 'loading' && potentialMatches.length === 0) {
            return (
                <div className="min-h-[80vh] flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
                        <p className="mt-4 text-gray-600 dark:text-gray-400">
                            {networkStatus ? 'Finding your perfect travel buddy...' : 'Connecting...'}
                        </p>
                        {!networkStatus && (
                            <p className="mt-2 text-sm text-red-500">
                                Please check your internet connection
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    // Error state
    const renderErrorState = () => {
        if (loadingState === 'error' || error) {
            return (
                <div className="min-h-[80vh] flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={() => {
                                setRetryCount(0);
                                setError(null);
                                setLoadingState('loading');
                                loadPotentialMatches(true);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Try Again
                        </button>
                        {!networkStatus && (
                            <p className="mt-4 text-sm text-gray-500">
                                Waiting for network connection...
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <>
            {renderLoadingState()}
            {renderErrorState()}
            {!error && !isLoading && potentialMatches.length === 0 ? (
                <div className="min-h-[80vh] flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            No More Matches
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            We've run out of potential matches for now. Check back later or adjust your filters!
                        </p>
                        <button
                            onClick={() => {
                                setLoadingState('loading');
                                loadPotentialMatches(true);
                            }}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            disabled={!networkStatus}
                        >
                            {networkStatus ? 'Refresh Matches' : 'Waiting for Connection...'}
                        </button>
                    </div>
                </div>
            ) : (
                <div 
                    ref={containerRef}
                    className="min-h-[80vh] relative overflow-hidden"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Pull to Refresh Indicator */}
                    {isPulling && (
                        <motion.div 
                            className="absolute top-0 left-0 right-0 flex justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ 
                                y: pullMoveY,
                                opacity: Math.min(pullMoveY / PULL_TO_REFRESH_THRESHOLD, 1)
                            }}
                        >
                            <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
                                {isRefreshing ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                                ) : (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {pullMoveY >= PULL_TO_REFRESH_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Filter Toggle Button */}
                    <button
                        onClick={toggleFilters}
                        className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg z-10"
                        aria-label="Toggle filters"
                    >
                        <AdjustmentsHorizontalIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </button>

                    {/* Filters Panel */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, x: 300 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 300 }}
                                className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-xl z-50"
                            >
                                <MatchFilters
                                    filters={filters}
                                    onChange={handleFilterChange}
                                    onClose={toggleFilters}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        </div>
                    )}

                    {/* Swipe Cards */}
                    <div className="max-w-lg mx-auto relative h-[600px]">
                        {potentialMatches.map((user, index) => {
                            if (index < currentIndex || index >= currentIndex + 3) return null;
                            
                            const isTop = index === currentIndex;
                            
                            return (
                                <AnimatePresence key={user._id} mode="wait">
                                    <SwipeCard
                                        key={user._id}
                                        user={user}
                                        isTop={isTop}
                                        onSwipe={handleSwipe}
                                        style={{
                                            position: 'absolute',
                                            width: '100%',
                                            height: '100%',
                                            zIndex: potentialMatches.length - index
                                        }}
                                        analytics={analytics}
                                        data-user-id={user._id}
                                    />
                                </AnimatePresence>
                            );
                        })}
                    </div>

                    {/* Match Notification */}
                    <AnimatePresence>
                        {showMatch && matchedUser && (
                            <MatchNotification
                                user={matchedUser}
                                onClose={closeMatchNotification}
                            />
                        )}
                    </AnimatePresence>
                </div>
            )}
        </>
    );
};

export default SwipeToMatch;
