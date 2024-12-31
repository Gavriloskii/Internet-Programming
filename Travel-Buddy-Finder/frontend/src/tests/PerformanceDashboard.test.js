import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import PerformanceDashboard from '../components/PerformanceDashboard';
import { api } from '../services/api';
import metricsSocket from '../services/metricsSocket';

// Mock dependencies
jest.mock('../services/api');
jest.mock('../services/metricsSocket');
jest.mock('react-chartjs-2', () => ({
    Line: () => null,
    Bar: () => null,
    Area: () => null,
    Gauge: () => null
}));

const mockPerformanceData = {
    systemMetrics: [
        {
            timestamp: Date.now(),
            cpu: 0.45,
            memory: {
                heapUsed: 500000000,
                heapTotal: 1000000000
            }
        }
    ],
    matchMetrics: [
        {
            timestamp: Date.now(),
            duration: 45,
            matchScore: 85
        }
    ],
    cacheMetrics: [
        {
            timestamp: Date.now(),
            hitRate: 0.85,
            hits: 850,
            misses: 150
        }
    ],
    apiMetrics: [
        {
            timestamp: Date.now(),
            path: '/api/matches',
            duration: 120,
            status: 200
        }
    ],
    systemHealth: {
        uptime: '99.9%',
        errorRate: '0.1%',
        loadAverage: '45%',
        memoryUsage: '50%'
    },
    matchQualityMetrics: [
        { label: 'Average Score', value: '85%' },
        { label: 'Success Rate', value: '92%' }
    ],
    cacheStats: [
        { label: 'Hit Rate', value: '85%' },
        { label: 'Memory Usage', value: '45%' }
    ],
    apiHealthMetrics: [
        { label: 'Response Time', value: '120ms' },
        { label: 'Error Rate', value: '0.1%' }
    ]
};

describe('PerformanceDashboard', () => {
    beforeEach(() => {
        api.get.mockResolvedValue({
            data: {
                status: 'success',
                data: mockPerformanceData
            }
        });

        metricsSocket.connect.mockImplementation(() => {});
        metricsSocket.subscribe.mockImplementation(() => () => {});
        metricsSocket.disconnect.mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initial Rendering', () => {
        test('renders loading state initially', () => {
            render(<PerformanceDashboard />);
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        test('renders dashboard after data loads', async () => {
            render(<PerformanceDashboard />);

            await waitFor(() => {
                expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
                expect(screen.getByText('System Performance')).toBeInTheDocument();
            });
        });

        test('renders all metric tabs', async () => {
            render(<PerformanceDashboard />);

            await waitFor(() => {
                expect(screen.getByText('System Resources')).toBeInTheDocument();
                expect(screen.getByText('Match Performance')).toBeInTheDocument();
                expect(screen.getByText('Cache Performance')).toBeInTheDocument();
                expect(screen.getByText('API Performance')).toBeInTheDocument();
            });
        });
    });

    describe('Data Fetching', () => {
        test('fetches initial performance data', async () => {
            render(<PerformanceDashboard />);

            await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith(
                    expect.stringContaining('/analytics/performance')
                );
            });
        });

        test('handles data fetch error gracefully', async () => {
            api.get.mockRejectedValueOnce(new Error('Failed to fetch'));
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

            render(<PerformanceDashboard />);

            await waitFor(() => {
                expect(consoleError).toHaveBeenCalled();
            });

            consoleError.mockRestore();
        });
    });

    describe('Real-time Updates', () => {
        test('subscribes to metrics updates', async () => {
            render(<PerformanceDashboard />);

            await waitFor(() => {
                expect(metricsSocket.connect).toHaveBeenCalled();
                expect(metricsSocket.subscribe).toHaveBeenCalledWith(
                    'performance',
                    expect.any(Function)
                );
            });
        });

        test('handles real-time metric updates', async () => {
            render(<PerformanceDashboard />);

            const updatedData = {
                systemMetrics: [{
                    timestamp: Date.now(),
                    cpu: 0.55,
                    memory: {
                        heapUsed: 600000000,
                        heapTotal: 1000000000
                    }
                }]
            };

            await waitFor(() => {
                const updateCallback = metricsSocket.subscribe.mock.calls[0][1];
                act(() => {
                    updateCallback(updatedData);
                });
            });

            // Verify the update was processed
            expect(screen.getByText('System Resources')).toBeInTheDocument();
        });

        test('handles performance alerts', async () => {
            render(<PerformanceDashboard />);

            const alert = {
                message: 'High CPU usage detected',
                timestamp: Date.now()
            };

            await waitFor(() => {
                const alertCallback = metricsSocket.subscribe.mock.calls.find(
                    call => call[0] === 'performanceAlert'
                )[1];
                act(() => {
                    alertCallback(alert);
                });
            });

            expect(screen.getByText('High CPU usage detected')).toBeInTheDocument();
        });
    });

    describe('Time Range Selection', () => {
        test('changes time range and refetches data', async () => {
            render(<PerformanceDashboard />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                fireEvent.change(select, { target: { value: '24h' } });
            });

            expect(api.get).toHaveBeenCalledWith(
                expect.stringContaining('timeRange=24h')
            );
        });
    });

    describe('Tab Navigation', () => {
        test('switches between metric tabs', async () => {
            render(<PerformanceDashboard />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Match Performance'));
                expect(screen.getByText('Match Calculation Times')).toBeInTheDocument();

                fireEvent.click(screen.getByText('Cache Performance'));
                expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument();

                fireEvent.click(screen.getByText('API Performance'));
                expect(screen.getByText('API Response Times')).toBeInTheDocument();
            });
        });
    });

    describe('Cleanup', () => {
        test('cleans up subscriptions on unmount', async () => {
            const { unmount } = render(<PerformanceDashboard />);

            await waitFor(() => {
                unmount();
                expect(metricsSocket.disconnect).toHaveBeenCalled();
            });
        });
    });

    describe('Accessibility', () => {
        test('renders with proper ARIA attributes', async () => {
            render(<PerformanceDashboard />);

            await waitFor(() => {
                expect(screen.getByRole('tablist')).toBeInTheDocument();
                expect(screen.getAllByRole('tab')).toHaveLength(4);
            });
        });

        test('handles keyboard navigation', async () => {
            render(<PerformanceDashboard />);

            await waitFor(() => {
                const tabs = screen.getAllByRole('tab');
                tabs[0].focus();
                fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
                expect(document.activeElement).toBe(tabs[1]);
            });
        });
    });

    describe('Chart Rendering', () => {
        test('provides correct data to charts', async () => {
            const { container } = render(<PerformanceDashboard />);

            await waitFor(() => {
                const charts = container.querySelectorAll('.recharts-wrapper');
                expect(charts.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Error Handling', () => {
        test('handles socket connection errors', async () => {
            metricsSocket.connect.mockImplementationOnce(() => {
                throw new Error('Connection failed');
            });

            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
            render(<PerformanceDashboard />);

            await waitFor(() => {
                expect(consoleError).toHaveBeenCalled();
            });

            consoleError.mockRestore();
        });
    });
});
