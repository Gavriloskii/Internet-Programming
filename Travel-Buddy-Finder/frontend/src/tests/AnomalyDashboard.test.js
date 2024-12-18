import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnomalyDashboard from '../components/AnomalyDashboard';
import { api } from '../services/api';
import metricsSocket from '../services/metricsSocket';

// Mock dependencies
jest.mock('../services/api');
jest.mock('../services/metricsSocket');
jest.mock('react-chartjs-2', () => ({
    Line: () => null,
    Bar: () => null,
    Scatter: () => null,
    HeatMap: () => null
}));

const mockAnomalies = [
    {
        metric: 'cpu',
        value: 0.95,
        baseline: 0.5,
        severity: 'critical',
        type: 'high',
        timestamp: Date.now(),
        title: 'High CPU Usage',
        description: 'CPU usage is abnormally high',
        recommendation: ['Scale horizontally', 'Optimize resource usage']
    },
    {
        metric: 'memory',
        value: 0.88,
        baseline: 0.6,
        severity: 'high',
        type: 'high',
        timestamp: Date.now() - 1000,
        title: 'High Memory Usage',
        description: 'Memory usage is approaching capacity',
        recommendation: ['Implement caching', 'Optimize memory usage']
    }
];

const mockMetrics = {
    timestamps: [Date.now() - 2000, Date.now() - 1000, Date.now()],
    cpu: [0.5, 0.6, 0.95],
    memory: [0.6, 0.7, 0.88],
    cache: [0.8, 0.75, 0.7]
};

describe('AnomalyDashboard', () => {
    beforeEach(() => {
        api.get.mockImplementation((url) => {
            if (url.includes('anomalies')) {
                return Promise.resolve({ data: { status: 'success', data: mockAnomalies } });
            }
            if (url.includes('metrics')) {
                return Promise.resolve({ data: { status: 'success', data: mockMetrics } });
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
            render(<AnomalyDashboard />);
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        test('renders dashboard after data loads', async () => {
            render(<AnomalyDashboard />);

            await waitFor(() => {
                expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
                expect(screen.getByText('Anomaly Detection')).toBeInTheDocument();
            });
        });

        test('renders all tabs', async () => {
            render(<AnomalyDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Real-time Monitoring')).toBeInTheDocument();
                expect(screen.getByText('Anomaly Distribution')).toBeInTheDocument();
                expect(screen.getByText('Anomaly History')).toBeInTheDocument();
            });
        });
    });

    describe('Data Fetching', () => {
        test('fetches initial anomaly and metrics data', async () => {
            render(<AnomalyDashboard />);

            await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/analytics/anomalies'));
                expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/analytics/metrics'));
            });
        });

        test('handles data fetch error gracefully', async () => {
            api.get.mockRejectedValueOnce(new Error('Failed to fetch'));
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

            render(<AnomalyDashboard />);

            await waitFor(() => {
                expect(consoleError).toHaveBeenCalled();
            });

            consoleError.mockRestore();
        });
    });

    describe('Real-time Updates', () => {
        test('subscribes to anomaly updates', async () => {
            render(<AnomalyDashboard />);

            await waitFor(() => {
                expect(metricsSocket.connect).toHaveBeenCalled();
                expect(metricsSocket.subscribe).toHaveBeenCalledWith(
                    'anomalyDetected',
                    expect.any(Function)
                );
            });
        });

        test('handles new anomalies', async () => {
            render(<AnomalyDashboard />);

            const newAnomaly = {
                metric: 'cache',
                value: 0.3,
                severity: 'high',
                type: 'low',
                timestamp: Date.now(),
                title: 'Low Cache Hit Rate',
                description: 'Cache performance has degraded'
            };

            await waitFor(() => {
                const updateCallback = metricsSocket.subscribe.mock.calls[0][1];
                updateCallback(newAnomaly);
            });

            expect(screen.getByText('Low Cache Hit Rate')).toBeInTheDocument();
        });
    });

    describe('Time Range Selection', () => {
        test('changes time range and refetches data', async () => {
            render(<AnomalyDashboard />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                fireEvent.change(select, { target: { value: '24h' } });
            });

            expect(api.get).toHaveBeenCalledWith(expect.stringContaining('timeRange=24h'));
        });
    });

    describe('Tab Navigation', () => {
        test('switches between tabs correctly', async () => {
            render(<AnomalyDashboard />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Anomaly Distribution'));
                expect(screen.getByText('Anomalies by Type')).toBeInTheDocument();

                fireEvent.click(screen.getByText('Anomaly History'));
                expect(screen.getByText('Timestamp')).toBeInTheDocument();

                fireEvent.click(screen.getByText('Real-time Monitoring'));
                expect(screen.getByText('System Metrics')).toBeInTheDocument();
            });
        });
    });

    describe('Anomaly Display', () => {
        test('displays anomalies with correct severity colors', async () => {
            render(<AnomalyDashboard />);

            await waitFor(() => {
                const criticalAnomaly = screen.getByText('High CPU Usage')
                    .closest('div');
                expect(criticalAnomaly).toHaveClass('bg-red-100');

                const highAnomaly = screen.getByText('High Memory Usage')
                    .closest('div');
                expect(highAnomaly).toHaveClass('bg-orange-100');
            });
        });

        test('displays recommendations for anomalies', async () => {
            render(<AnomalyDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Scale horizontally')).toBeInTheDocument();
                expect(screen.getByText('Optimize resource usage')).toBeInTheDocument();
            });
        });
    });

    describe('Chart Rendering', () => {
        test('provides correct data to charts', async () => {
            const { container } = render(<AnomalyDashboard />);

            await waitFor(() => {
                const charts = container.querySelectorAll('.recharts-wrapper');
                expect(charts.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Accessibility', () => {
        test('renders with proper ARIA attributes', async () => {
            render(<AnomalyDashboard />);

            await waitFor(() => {
                expect(screen.getByRole('tablist')).toBeInTheDocument();
                expect(screen.getAllByRole('tab')).toHaveLength(3);
            });
        });

        test('handles keyboard navigation', async () => {
            render(<AnomalyDashboard />);

            await waitFor(() => {
                const tabs = screen.getAllByRole('tab');
                tabs[0].focus();
                fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
                expect(document.activeElement).toBe(tabs[1]);
            });
        });
    });

    describe('Cleanup', () => {
        test('cleans up subscriptions on unmount', async () => {
            const { unmount } = render(<AnomalyDashboard />);

            await waitFor(() => {
                unmount();
                expect(metricsSocket.disconnect).toHaveBeenCalled();
            });
        });
    });
});
