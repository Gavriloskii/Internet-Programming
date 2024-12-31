import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ModelComparison from '../components/ModelComparison';
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

const mockModels = [
    {
        id: 'model1',
        name: 'Model A',
        version: '1.0',
        trainedAt: '2023-01-01T00:00:00Z',
        metrics: {
            accuracy: 92,
            trainingSpeed: 85,
            memoryEfficiency: 88,
            cacheEfficiency: 90,
            errorRecovery: 95
        }
    },
    {
        id: 'model2',
        name: 'Model B',
        version: '1.1',
        trainedAt: '2023-02-01T00:00:00Z',
        metrics: {
            accuracy: 94,
            trainingSpeed: 87,
            memoryEfficiency: 90,
            cacheEfficiency: 92,
            errorRecovery: 96
        }
    }
];

const mockComparisonData = {
    timestamps: [
        '2023-01-01T00:00:00Z',
        '2023-01-02T00:00:00Z',
        '2023-01-03T00:00:00Z'
    ],
    performance: {
        model1: [90, 91, 92],
        model2: [92, 93, 94]
    },
    predictions: {
        model1: [
            { actual: 0.8, predicted: 0.82 },
            { actual: 0.9, predicted: 0.88 }
        ],
        model2: [
            { actual: 0.8, predicted: 0.83 },
            { actual: 0.9, predicted: 0.91 }
        ]
    },
    differences: [
        {
            metric: 'Accuracy',
            description: 'Overall prediction accuracy',
            improvement: 2.5
        },
        {
            metric: 'Training Speed',
            description: 'Time per epoch',
            improvement: 1.8
        }
    ]
};

describe('ModelComparison', () => {
    beforeEach(() => {
        api.get.mockImplementation((url) => {
            if (url.includes('versions')) {
                return Promise.resolve({ data: { status: 'success', data: mockModels } });
            }
        });

        api.post.mockImplementation((url) => {
            if (url.includes('compare')) {
                return Promise.resolve({ data: { status: 'success', data: mockComparisonData } });
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
            render(<ModelComparison />);
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        test('renders comparison dashboard after data loads', async () => {
            render(<ModelComparison />);

            await waitFor(() => {
                expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
                expect(screen.getByText('Model Comparison')).toBeInTheDocument();
            });
        });

        test('auto-selects two most recent models', async () => {
            render(<ModelComparison />);

            await waitFor(() => {
                const selects = screen.getAllByRole('combobox');
                expect(selects[0].value).toBe('model1');
                expect(selects[1].value).toBe('model2');
            });
        });
    });

    describe('Data Fetching', () => {
        test('fetches model list and comparison data', async () => {
            render(<ModelComparison />);

            await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith('/analytics/model/versions');
                expect(api.post).toHaveBeenCalledWith(
                    '/analytics/model/compare',
                    expect.any(Object)
                );
            });
        });

        test('handles data fetch error gracefully', async () => {
            api.get.mockRejectedValueOnce(new Error('Failed to fetch'));
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

            render(<ModelComparison />);

            await waitFor(() => {
                expect(consoleError).toHaveBeenCalled();
            });

            consoleError.mockRestore();
        });
    });

    describe('Model Selection', () => {
        test('allows selecting different models', async () => {
            render(<ModelComparison />);

            await waitFor(() => {
                const selects = screen.getAllByRole('combobox');
                fireEvent.change(selects[0], { target: { value: 'model2' } });
                fireEvent.change(selects[1], { target: { value: 'model1' } });
            });

            expect(api.post).toHaveBeenCalledWith(
                '/analytics/model/compare',
                expect.objectContaining({
                    modelIds: ['model2', 'model1']
                })
            );
        });

        test('prevents selecting same model twice', async () => {
            render(<ModelComparison />);

            await waitFor(() => {
                const selects = screen.getAllByRole('combobox');
                const options = selects[1].querySelectorAll('option');
                const disabledOption = Array.from(options).find(
                    option => option.disabled && option.value === selects[0].value
                );
                expect(disabledOption).toBeTruthy();
            });
        });
    });

    describe('Metric Selection', () => {
        test('changes active metric and refetches data', async () => {
            render(<ModelComparison />);

            await waitFor(() => {
                const metricSelect = screen.getByRole('combobox', { name: /metric/i });
                fireEvent.change(metricSelect, { target: { value: 'loss' } });
            });

            expect(api.post).toHaveBeenCalledWith(
                '/analytics/model/compare',
                expect.objectContaining({
                    metric: 'loss'
                })
            );
        });
    });

    describe('Time Range Selection', () => {
        test('changes time range and refetches data', async () => {
            render(<ModelComparison />);

            await waitFor(() => {
                const rangeSelect = screen.getByRole('combobox', { name: /time range/i });
                fireEvent.change(rangeSelect, { target: { value: '30d' } });
            });

            expect(api.post).toHaveBeenCalledWith(
                '/analytics/model/compare',
                expect.objectContaining({
                    timeRange: '30d'
                })
            );
        });
    });

    describe('Real-time Updates', () => {
        test('subscribes to model updates', async () => {
            render(<ModelComparison />);

            await waitFor(() => {
                expect(metricsSocket.connect).toHaveBeenCalled();
                expect(metricsSocket.subscribe).toHaveBeenCalledWith(
                    'modelUpdates',
                    expect.any(Function)
                );
            });
        });

        test('handles model updates', async () => {
            render(<ModelComparison />);

            const updatedModel = {
                id: 'model1',
                name: 'Model A',
                version: '1.0.1',
                metrics: {
                    accuracy: 95
                }
            };

            await waitFor(() => {
                const updateCallback = metricsSocket.subscribe.mock.calls[0][1];
                updateCallback(updatedModel);
            });

            expect(screen.getByText('1.0.1')).toBeInTheDocument();
        });
    });

    describe('Chart Rendering', () => {
        test('provides correct data to performance chart', async () => {
            const { container } = render(<ModelComparison />);

            await waitFor(() => {
                const charts = container.querySelectorAll('.recharts-wrapper');
                expect(charts.length).toBeGreaterThan(0);
            });
        });

        test('displays key differences', async () => {
            render(<ModelComparison />);

            await waitFor(() => {
                mockComparisonData.differences.forEach(diff => {
                    expect(screen.getByText(diff.metric)).toBeInTheDocument();
                    expect(screen.getByText(diff.description)).toBeInTheDocument();
                    expect(screen.getByText(`+${diff.improvement}%`)).toBeInTheDocument();
                });
            });
        });
    });

    describe('Accessibility', () => {
        test('renders with proper ARIA labels', async () => {
            render(<ModelComparison />);

            await waitFor(() => {
                expect(screen.getByLabelText('Model 1')).toBeInTheDocument();
                expect(screen.getByLabelText('Model 2')).toBeInTheDocument();
            });
        });

        test('handles keyboard navigation', async () => {
            render(<ModelComparison />);

            await waitFor(() => {
                const selects = screen.getAllByRole('combobox');
                selects[0].focus();
                fireEvent.keyDown(selects[0], { key: 'ArrowDown' });
                expect(document.activeElement).toBe(selects[0]);
            });
        });
    });

    describe('Cleanup', () => {
        test('cleans up subscriptions on unmount', async () => {
            const { unmount } = render(<ModelComparison />);

            await waitFor(() => {
                unmount();
                expect(metricsSocket.disconnect).toHaveBeenCalled();
            });
        });
    });
});
