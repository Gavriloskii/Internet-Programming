import { act } from 'react-dom/test-utils';
import metricsSocket from '../services/metricsSocket';
import { toast } from 'react-hot-toast';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
    const mockSocket = {
        on: jest.fn(),
        emit: jest.fn(),
        removeAllListeners: jest.fn(),
        close: jest.fn(),
        connected: false
    };
    return jest.fn(() => mockSocket);
});

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
    success: jest.fn(),
    error: jest.fn()
}));

describe('MetricsSocketService', () => {
    let mockSocket;

    beforeEach(() => {
        jest.useFakeTimers();
        mockSocket = require('socket.io-client')();
        localStorage.setItem('token', 'test-token');
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
        metricsSocket.disconnect();
        localStorage.clear();
    });

    describe('Connection Management', () => {
        test('establishes connection with correct configuration', () => {
            metricsSocket.connect();

            expect(require('socket.io-client')).toHaveBeenCalledWith(
                expect.stringContaining('/metrics'),
                expect.objectContaining({
                    transports: ['websocket'],
                    reconnection: true,
                    auth: { token: 'test-token' }
                })
            );
        });

        test('handles connection success', () => {
            metricsSocket.connect();
            
            // Simulate successful connection
            const connectHandler = mockSocket.on.mock.calls.find(
                call => call[0] === 'connect'
            )[1];
            
            act(() => {
                connectHandler();
            });

            expect(toast.success).toHaveBeenCalledWith(
                'Real-time metrics connected',
                expect.any(Object)
            );
        });

        test('handles disconnection with reconnect attempts', () => {
            metricsSocket.connect();
            
            // Find disconnect handler
            const disconnectHandler = mockSocket.on.mock.calls.find(
                call => call[0] === 'disconnect'
            )[1];
            
            act(() => {
                disconnectHandler();
            });

            // Should attempt to reconnect
            jest.advanceTimersByTime(1000);
            expect(require('socket.io-client')).toHaveBeenCalledTimes(2);
        });

        test('handles authentication errors', () => {
            metricsSocket.connect();
            
            // Find unauthorized handler
            const unauthorizedHandler = mockSocket.on.mock.calls.find(
                call => call[0] === 'unauthorized'
            )[1];
            
            act(() => {
                unauthorizedHandler();
            });

            expect(toast.error).toHaveBeenCalledWith('Unauthorized metrics connection');
            expect(mockSocket.close).toHaveBeenCalled();
        });
    });

    describe('Metrics Updates', () => {
        test('buffers and processes metrics updates', () => {
            const callback = jest.fn();
            metricsSocket.subscribe('matchQuality', callback);

            // Find metrics update handler
            const updateHandler = mockSocket.on.mock.calls.find(
                call => call[0] === 'metricsUpdate'
            )[1];

            // Simulate metrics update
            act(() => {
                updateHandler({
                    matchQuality: { score: 85, trend: 'up' }
                });
            });

            // Fast-forward timers to process buffered updates
            jest.runAllTimers();

            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ score: 85, trend: 'up' })
            );
        });

        test('handles subscription and unsubscription', () => {
            const callback = jest.fn();
            const unsubscribe = metricsSocket.subscribe('userEngagement', callback);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'subscribeMetric',
                'userEngagement'
            );

            unsubscribe();

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'unsubscribeMetric',
                'userEngagement'
            );
        });

        test('throttles frequent updates', () => {
            const callback = jest.fn();
            metricsSocket.subscribe('matchQuality', callback);

            const updateHandler = mockSocket.on.mock.calls.find(
                call => call[0] === 'metricsUpdate'
            )[1];

            // Simulate rapid updates
            act(() => {
                for (let i = 0; i < 10; i++) {
                    updateHandler({
                        matchQuality: { score: 85 + i }
                    });
                }
            });

            // Only one update should be processed
            jest.runAllTimers();
            expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    describe('Historical Data', () => {
        test('requests historical data with correct parameters', async () => {
            const startDate = new Date('2023-01-01');
            const endDate = new Date('2023-01-31');

            mockSocket.emit.mockImplementation((event, data, callback) => {
                if (event === 'requestHistoricalData') {
                    callback({ data: { metrics: [] } });
                }
            });

            await metricsSocket.requestHistoricalData(
                'matchQuality',
                startDate,
                endDate
            );

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'requestHistoricalData',
                {
                    metricType: 'matchQuality',
                    startDate,
                    endDate
                },
                expect.any(Function)
            );
        });

        test('handles historical data request timeout', async () => {
            mockSocket.emit.mockImplementation(() => {
                // Don't call callback to simulate timeout
            });

            await expect(
                metricsSocket.requestHistoricalData(
                    'matchQuality',
                    new Date(),
                    new Date()
                )
            ).rejects.toThrow('Metrics request timeout');
        });
    });

    describe('Real-time Updates', () => {
        test('starts real-time updates for multiple metrics', () => {
            const metrics = ['matchQuality', 'userEngagement'];
            metricsSocket.startRealtimeUpdates(metrics);

            metrics.forEach(metric => {
                expect(mockSocket.emit).toHaveBeenCalledWith(
                    'startRealtimeUpdates',
                    metric
                );
            });
        });

        test('stops real-time updates for specific metrics', () => {
            const metric = 'matchQuality';
            metricsSocket.stopRealtimeUpdates(metric);

            expect(mockSocket.emit).toHaveBeenCalledWith(
                'stopRealtimeUpdates',
                metric
            );
        });
    });

    describe('Error Handling', () => {
        test('handles socket errors', () => {
            metricsSocket.connect();
            
            const errorHandler = mockSocket.on.mock.calls.find(
                call => call[0] === 'error'
            )[1];
            
            act(() => {
                errorHandler(new Error('Socket error'));
            });

            expect(toast.error).toHaveBeenCalledWith(
                'Metrics connection error',
                expect.any(Object)
            );
        });

        test('handles invalid subscription callbacks', () => {
            expect(() => {
                metricsSocket.subscribe('matchQuality', 'not a function');
            }).toThrow('Callback must be a function');
        });
    });

    describe('Connection Stats', () => {
        test('provides accurate connection statistics', () => {
            metricsSocket.connect();
            const callback = jest.fn();
            metricsSocket.subscribe('matchQuality', callback);

            const stats = metricsSocket.getConnectionStats();

            expect(stats).toEqual({
                connected: false,
                reconnectAttempts: 0,
                bufferedUpdates: 0,
                activeSubscriptions: 1
            });
        });
    });

    describe('Cleanup', () => {
        test('properly cleans up resources on disconnect', () => {
            const callback = jest.fn();
            metricsSocket.subscribe('matchQuality', callback);
            metricsSocket.disconnect();

            expect(mockSocket.removeAllListeners).toHaveBeenCalled();
            expect(mockSocket.close).toHaveBeenCalled();
            
            // Verify internal state is reset
            expect(metricsSocket.getConnectionStats().activeSubscriptions).toBe(0);
        });
    });
});
