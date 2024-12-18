import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import AdvancedMetrics from '../components/AdvancedMetrics';
import { api } from '../services/api';
import socketService from '../services/socketService';

// Mock the API and socket service
jest.mock('../services/api');
jest.mock('../services/socketService');
jest.mock('react-chartjs-2', () => ({
    Line: () => null,
    Bar: () => null,
    Radar: () => null,
    Scatter: () => null
}));

const mockMetricsData = {
    matchingPatterns: [
        { timeSlot: '00:00', successRate: 75 },
        { timeSlot: '06:00', successRate: 82 },
        { timeSlot: '12:00', successRate: 90 },
        { timeSlot: '18:00', successRate: 85 }
    ],
    personalityCompatibility: [85, 75, 90, 80, 70],
    personalityDistribution: [20, 25, 30, 15, 10],
    userEngagement: [
        { responseTime: 100, interactionRate: 0.8 },
        { responseTime: 200, interactionRate: 0.7 },
        { responseTime: 300, interactionRate: 0.6 }
    ],
    matchQualityTrend: [
        { date: '2023-01-01', score: 85 },
        { date: '2023-01-02', score: 87 },
        { date: '2023-01-03', score: 90 }
    ],
    successMetrics: [
        { label: 'Match Rate', value: '85%' },
        { label: 'Response Rate', value: '92%' },
        { label: 'Engagement Score', value: '88%' },
        { label: 'Retention Rate', value: '78%' }
    ]
};

describe('AdvancedMetrics Component', () => {
    beforeEach(() => {
        api.get.mockResolvedValue({
            data: { status: 'success', data: mockMetricsData }
        });
        socketService.on.mockImplementation((event, callback) => {
            if (event === 'metricsUpdate') {
                callback(mockMetricsData);
            }
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders all metric tabs', async () => {
        render(<AdvancedMetrics timeRange="24h" />);

        expect(screen.getByText('Matching Patterns')).toBeInTheDocument();
        expect(screen.getByText('Personality Analysis')).toBeInTheDocument();
        expect(screen.getByText('User Engagement')).toBeInTheDocument();
        expect(screen.getByText('Quality Trends')).toBeInTheDocument();
    });

    test('switches between tabs correctly', async () => {
        render(<AdvancedMetrics timeRange="24h" />);

        // Click personality tab
        fireEvent.click(screen.getByText('Personality Analysis'));
        expect(screen.getByText('Personality Compatibility')).toBeInTheDocument();

        // Click engagement tab
        fireEvent.click(screen.getByText('User Engagement'));
        expect(screen.getByText('User Engagement Analysis')).toBeInTheDocument();

        // Click trends tab
        fireEvent.click(screen.getByText('Quality Trends'));
        expect(screen.getByText('Match Quality Trends')).toBeInTheDocument();
    });

    test('fetches and displays initial metrics data', async () => {
        render(<AdvancedMetrics timeRange="24h" />);

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith(
                expect.stringContaining('/analytics/advanced-metrics')
            );
        });

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    test('handles real-time updates via WebSocket', async () => {
        render(<AdvancedMetrics timeRange="24h" />);

        await waitFor(() => {
            expect(socketService.on).toHaveBeenCalledWith(
                'metricsUpdate',
                expect.any(Function)
            );
        });

        // Simulate WebSocket update
        act(() => {
            socketService.emit('metricsUpdate', {
                ...mockMetricsData,
                matchingPatterns: [
                    { timeSlot: '00:00', successRate: 95 }
                ]
            });
        });

        await waitFor(() => {
            expect(screen.getByText('Success Metrics')).toBeInTheDocument();
        });
    });

    test('handles loading state correctly', async () => {
        api.get.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 1000)));
        
        render(<AdvancedMetrics timeRange="24h" />);
        
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });
    });

    test('handles error state gracefully', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        api.get.mockRejectedValueOnce(new Error('Failed to fetch metrics'));

        render(<AdvancedMetrics timeRange="24h" />);

        await waitFor(() => {
            expect(consoleError).toHaveBeenCalled();
        });

        consoleError.mockRestore();
    });

    test('updates metrics when timeRange prop changes', async () => {
        const { rerender } = render(<AdvancedMetrics timeRange="24h" />);

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith(
                expect.stringContaining('timeRange=24h')
            );
        });

        rerender(<AdvancedMetrics timeRange="7d" />);

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith(
                expect.stringContaining('timeRange=7d')
            );
        });
    });

    test('displays success metrics correctly', async () => {
        render(<AdvancedMetrics timeRange="24h" />);
        
        // Switch to trends tab to see success metrics
        fireEvent.click(screen.getByText('Quality Trends'));

        await waitFor(() => {
            mockMetricsData.successMetrics.forEach(metric => {
                expect(screen.getByText(metric.label)).toBeInTheDocument();
                expect(screen.getByText(metric.value)).toBeInTheDocument();
            });
        });
    });
});
