import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ABTestMonitor from '../components/ABTestMonitor';
import { api } from '../services/api';
import metricsSocket from '../services/metricsSocket';

// Mock dependencies
jest.mock('../services/api');
jest.mock('../services/metricsSocket');
jest.mock('react-chartjs-2', () => ({
    Line: () => null,
    Bar: () => null,
    Radar: () => null,
    Scatter: () => null
}));

const mockActiveTests = [
    {
        id: 'test1',
        name: 'Performance Test A',
        modelA: 'v1.0',
        modelB: 'v1.1',
        status: 'running',
        startTime: Date.now() - 3600000,
        sampleSize: 1000,
        trafficSplit: 0.5,
        metrics: ['accuracy', 'latency', 'errorRate'],
        results: {
            modelA: {
                samples: 450,
                metrics: {
                    accuracy: { mean: 0.85, sum: 382.5, sumSquares: 325.125, min: 0.8, max: 0.9 },
                    latency: { mean: 100, sum: 45000, sumSquares: 4500000, min: 80, max: 120 },
                    errorRate: { mean: 0.02, sum: 9, sumSquares: 0.18, min: 0.01, max: 0.03 }
                }
            },
            modelB: {
                samples: 450,
                metrics: {
                    accuracy: { mean: 0.88, sum: 396, sumSquares: 348.48, min: 0.82, max: 0.94 },
                    latency: { mean: 90, sum: 40500, sumSquares: 3645000, min: 75, max: 110 },
                    errorRate: { mean: 0.015, sum: 6.75, sumSquares: 0.101, min: 0.01, max: 0.02 }
                }
            }
        }
    }
];

const mockTestHistory = [
    {
        id: 'test2',
        name: 'Completed Test',
        modelA: 'v0.9',
        modelB: 'v1.0',
        status: 'completed',
        startTime: Date.now() - 86400000,
        endTime: Date.now() - 3600000,
        sampleSize: 1000,
        trafficSplit: 0.5,
        metrics: ['accuracy', 'latency'],
        results: {
            modelA: { samples: 1000, metrics: {} },
            modelB: { samples: 1000, metrics: {} }
        },
        conclusion: {
            winner: 'B',
            improvements: {
                accuracy: 3.5,
                latency: -10
            },
            confidence: {
                accuracy: 0.98,
                latency: 0.95
            },
            recommendations: [
                {
                    metric: 'accuracy',
                    improvement: 3.5,
                    confidence: 0.98,
                    message: 'Model B shows significant improvement in accuracy'
                }
            ]
        }
    }
];

describe('ABTestMonitor', () => {
    beforeEach(() => {
        api.get.mockImplementation((url) => {
            if (url.includes('active')) {
                return Promise.resolve({ data: { status: 'success', data: mockActiveTests } });
            }
            if (url.includes('history')) {
                return Promise.resolve({ data: { status: 'success', data: mockTestHistory } });
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
            render(<ABTestMonitor />);
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        test('renders test monitor after data loads', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
                expect(screen.getByText('A/B Test Monitor')).toBeInTheDocument();
            });
        });

        test('auto-selects first active test', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                expect(select.value).toBe('test1');
            });
        });
    });

    describe('Data Fetching', () => {
        test('fetches active tests and history', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith('/analytics/ab/active');
                expect(api.get).toHaveBeenCalledWith('/analytics/ab/history');
            });
        });

        test('handles data fetch error gracefully', async () => {
            api.get.mockRejectedValueOnce(new Error('Failed to fetch'));
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

            render(<ABTestMonitor />);

            await waitFor(() => {
                expect(consoleError).toHaveBeenCalled();
            });

            consoleError.mockRestore();
        });
    });

    describe('Test Selection', () => {
        test('allows switching between tests', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                fireEvent.change(select, { target: { value: 'test2' } });
                expect(screen.getByText('Completed Test')).toBeInTheDocument();
            });
        });

        test('displays test status correctly', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                
                // Check active test
                expect(screen.getByText('Running')).toBeInTheDocument();
                
                // Switch to completed test
                fireEvent.change(select, { target: { value: 'test2' } });
                expect(screen.getByText('Completed')).toBeInTheDocument();
            });
        });
    });

    describe('Metrics Display', () => {
        test('displays test overview metrics', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                expect(screen.getByText('Sample Size')).toBeInTheDocument();
                expect(screen.getByText('Traffic Split')).toBeInTheDocument();
                expect(screen.getByText('Duration')).toBeInTheDocument();
            });
        });

        test('shows correct sample counts', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                expect(screen.getByText('900 / 2000')).toBeInTheDocument();
            });
        });

        test('displays traffic split correctly', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                expect(screen.getByText('50% / 50%')).toBeInTheDocument();
            });
        });
    });

    describe('Tab Navigation', () => {
        test('switches between metric views', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Test Progress'));
                expect(screen.getByText('Sample Collection Progress')).toBeInTheDocument();

                fireEvent.click(screen.getByText('Statistical Significance'));
                expect(screen.getByText('Significance Analysis')).toBeInTheDocument();

                fireEvent.click(screen.getByText('Metrics Overview'));
                expect(screen.getByText('Metrics Comparison')).toBeInTheDocument();
            });
        });
    });

    describe('Real-time Updates', () => {
        test('subscribes to test updates', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                expect(metricsSocket.connect).toHaveBeenCalled();
                expect(metricsSocket.subscribe).toHaveBeenCalledWith(
                    'abTestUpdates',
                    expect.any(Function)
                );
            });
        });

        test('handles test updates', async () => {
            render(<ABTestMonitor />);

            const updatedTest = {
                ...mockActiveTests[0],
                results: {
                    ...mockActiveTests[0].results,
                    modelA: {
                        ...mockActiveTests[0].results.modelA,
                        samples: 500
                    }
                }
            };

            await waitFor(() => {
                const updateCallback = metricsSocket.subscribe.mock.calls[0][1];
                updateCallback({ testId: 'test1', ...updatedTest });
            });

            expect(screen.getByText('1000 / 2000')).toBeInTheDocument();
        });
    });

    describe('Chart Rendering', () => {
        test('provides correct data to charts', async () => {
            const { container } = render(<ABTestMonitor />);

            await waitFor(() => {
                const charts = container.querySelectorAll('.recharts-wrapper');
                expect(charts.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Significance Analysis', () => {
        test('displays significance indicators correctly', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Statistical Significance'));
                
                const confidenceElements = screen.getAllByText(/\d+\.\d+%/);
                expect(confidenceElements.length).toBeGreaterThan(0);
            });
        });

        test('shows improvement percentages', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                const select = screen.getByRole('combobox');
                fireEvent.change(select, { target: { value: 'test2' } });
                
                expect(screen.getByText('+3.5%')).toBeInTheDocument();
            });
        });
    });

    describe('Accessibility', () => {
        test('renders with proper ARIA labels', async () => {
            render(<ABTestMonitor />);

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'Select test');
            });
        });

        test('handles keyboard navigation', async () => {
            render(<ABTestMonitor />);

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
            const { unmount } = render(<ABTestMonitor />);

            await waitFor(() => {
                unmount();
                expect(metricsSocket.disconnect).toHaveBeenCalled();
            });
        });
    });
});
