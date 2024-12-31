import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ModelTrainingDashboard from '../components/ModelTrainingDashboard';
import { api } from '../services/api';
import metricsSocket from '../services/metricsSocket';

// Mock dependencies
jest.mock('../services/api');
jest.mock('../services/metricsSocket');
jest.mock('react-chartjs-2', () => ({
    Line: () => null,
    Bar: () => null,
    Scatter: () => null,
    Radar: () => null
}));

const mockMetricsData = {
    performance: {
        'Model Accuracy': '92.5%',
        'Training Speed': '1.2s/epoch',
        'Memory Usage': '2.1GB',
        'Cache Hit Rate': '85%'
    },
    health: {
        'Model Status': 'Healthy',
        'Last Training': '2 hours ago',
        'Training Success Rate': '98%',
        'Error Rate': '0.2%'
    }
};

const mockPerformanceData = {
    timestamps: [
        Date.now() - 3600000,
        Date.now() - 1800000,
        Date.now()
    ],
    anomalyAccuracy: [88, 90, 92],
    mlAccuracy: [85, 87, 89]
};

const mockTrainingHistory = {
    epochs: [1, 2, 3, 4, 5],
    loss: [0.5, 0.4, 0.3, 0.25, 0.2],
    valLoss: [0.55, 0.45, 0.35, 0.3, 0.25],
    stats: [
        {
            name: 'Training Time',
            description: 'Total time spent training',
            value: '45 minutes'
        },
        {
            name: 'Convergence Rate',
            description: 'Speed of model convergence',
            value: '0.95'
        }
    ]
};

describe('ModelTrainingDashboard', () => {
    beforeEach(() => {
        api.get.mockImplementation((url) => {
            if (url.includes('metrics')) {
                return Promise.resolve({ data: { status: 'success', data: mockMetricsData } });
            }
            if (url.includes('performance')) {
                return Promise.resolve({ data: { status: 'success', data: mockPerformanceData } });
            }
            if (url.includes('history')) {
                return Promise.resolve({ data: { status: 'success', data: mockTrainingHistory } });
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
            render(<ModelTrainingDashboard />);
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        test('renders dashboard after data loads', async () => {
            render(<ModelTrainingDashboard />);

            await waitFor(() => {
                expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
                expect(screen.getByText('Model Training Analytics')).toBeInTheDocument();
            });
        });

        test('renders all tabs', async () => {
            render(<ModelTrainingDashboard />);

            await waitFor(() => {
                expect(screen.getByText('Model Performance')).toBeInTheDocument();
                expect(screen.getByText('Training Progress')).toBeInTheDocument();
                expect(screen.getByText('Model Metrics')).toBeInTheDocument();
            });
        });
    });

    describe('Data Fetching', () => {
        test('fetches all required data on mount', async () => {
            render(<ModelTrainingDashboard />);

            await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith('/analytics/model/metrics');
                expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/analytics/model/performance'));
                expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/analytics/model/history'));
            });
        });

        test('handles data fetch error gracefully', async () => {
            api.get.mockRejectedValueOnce(new Error('Failed to fetch'));
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

            render(<ModelTrainingDashboard />);

            await waitFor(() => {
                expect(consoleError).toHaveBeenCalled();
            });

            consoleError.mockRestore();
        });
    });

    describe('Real-time Updates', () => {
        test('subscribes to metrics updates', async () => {
            render(<ModelTrainingDashboard />);

            await waitFor(() => {
                expect(metricsSocket.connect).toHaveBeenCalled();
                expect(metricsSocket.subscribe).toHaveBeenCalledWith(
                    'modelMetrics',
                    expect.any(Function)
                );
            });
        });

        test('handles metrics updates', async () => {
            render(<ModelTrainingDashboard />);

            const newMetrics = {
                performance: {
                    'Model Accuracy': '94.5%'
                }
            };

            await waitFor(() => {
                const updateCallback = metricsSocket.subscribe.mock.calls[0][1];
                updateCallback(newMetrics);
            });

            expect(screen.getByText('94.5%')).toBeInTheDocument();
        });
    });

    describe('Time Range Selection', () => {
        test('changes time range and refetches data', async () => {
            render(<ModelTrainingDashboard />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                fireEvent.change(select, { target: { value: '30d' } });
            });

            expect(api.get).toHaveBeenCalledWith(
                expect.stringContaining('timeRange=30d')
            );
        });
    });

    describe('Tab Navigation', () => {
        test('switches between tabs correctly', async () => {
            render(<ModelTrainingDashboard />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Training Progress'));
                expect(screen.getByText('Training Statistics')).toBeInTheDocument();

                fireEvent.click(screen.getByText('Model Metrics'));
                expect(screen.getByText('Model Metrics Overview')).toBeInTheDocument();

                fireEvent.click(screen.getByText('Model Performance'));
                expect(screen.getByText('Model Accuracy Over Time')).toBeInTheDocument();
            });
        });
    });

    describe('Performance Metrics Display', () => {
        test('displays performance metrics correctly', async () => {
            render(<ModelTrainingDashboard />);

            await waitFor(() => {
                Object.entries(mockMetricsData.performance).forEach(([key, value]) => {
                    expect(screen.getByText(key)).toBeInTheDocument();
                    expect(screen.getByText(value)).toBeInTheDocument();
                });
            });
        });

        test('displays model health metrics', async () => {
            render(<ModelTrainingDashboard />);

            await waitFor(() => {
                Object.entries(mockMetricsData.health).forEach(([key, value]) => {
                    expect(screen.getByText(key)).toBeInTheDocument();
                    expect(screen.getByText(value)).toBeInTheDocument();
                });
            });
        });
    });

    describe('Training History Display', () => {
        test('displays training statistics', async () => {
            render(<ModelTrainingDashboard />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Training Progress'));
            });

            mockTrainingHistory.stats.forEach(stat => {
                expect(screen.getByText(stat.name)).toBeInTheDocument();
                expect(screen.getByText(stat.description)).toBeInTheDocument();
                expect(screen.getByText(stat.value)).toBeInTheDocument();
            });
        });
    });

    describe('Chart Rendering', () => {
        test('provides correct data to charts', async () => {
            const { container } = render(<ModelTrainingDashboard />);

            await waitFor(() => {
                const charts = container.querySelectorAll('.recharts-wrapper');
                expect(charts.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Accessibility', () => {
        test('renders with proper ARIA attributes', async () => {
            render(<ModelTrainingDashboard />);

            await waitFor(() => {
                expect(screen.getByRole('tablist')).toBeInTheDocument();
                expect(screen.getAllByRole('tab')).toHaveLength(3);
            });
        });

        test('handles keyboard navigation', async () => {
            render(<ModelTrainingDashboard />);

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
            const { unmount } = render(<ModelTrainingDashboard />);

            await waitFor(() => {
                unmount();
                expect(metricsSocket.disconnect).toHaveBeenCalled();
            });
        });
    });
});
