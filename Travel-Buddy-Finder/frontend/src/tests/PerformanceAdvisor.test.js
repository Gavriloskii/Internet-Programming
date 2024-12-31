import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PerformanceAdvisor from '../components/PerformanceAdvisor';

// Mock performance data with various issues
const mockPerformanceData = {
    systemMetrics: [
        {
            timestamp: Date.now(),
            cpu: 0.85, // High CPU usage
            memory: {
                heapUsed: 900000000,
                heapTotal: 1000000000 // High memory usage
            }
        }
    ],
    matchMetrics: [
        {
            timestamp: Date.now(),
            duration: 250, // Slow match calculation
            matchScore: 75
        }
    ],
    cacheMetrics: [
        {
            timestamp: Date.now(),
            hitRate: 0.45, // Low cache hit rate
            hits: 450,
            misses: 550
        }
    ],
    apiMetrics: [
        {
            timestamp: Date.now(),
            path: '/api/matches',
            duration: 300, // Slow API response
            status: 200
        }
    ],
    matchQualityMetrics: [
        { value: '75%' } // Low match quality
    ]
};

// Mock performance data with no issues
const mockHealthyPerformanceData = {
    systemMetrics: [
        {
            timestamp: Date.now(),
            cpu: 0.3,
            memory: {
                heapUsed: 300000000,
                heapTotal: 1000000000
            }
        }
    ],
    matchMetrics: [
        {
            timestamp: Date.now(),
            duration: 50,
            matchScore: 95
        }
    ],
    cacheMetrics: [
        {
            timestamp: Date.now(),
            hitRate: 0.95,
            hits: 950,
            misses: 50
        }
    ],
    apiMetrics: [
        {
            timestamp: Date.now(),
            path: '/api/matches',
            duration: 80,
            status: 200
        }
    ],
    matchQualityMetrics: [
        { value: '95%' }
    ]
};

describe('PerformanceAdvisor', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initial Rendering', () => {
        test('renders loading state initially', () => {
            render(<PerformanceAdvisor performanceData={null} />);
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        test('renders title and category selector', () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            expect(screen.getByText('Performance Advisor')).toBeInTheDocument();
            expect(screen.getByRole('combobox')).toBeInTheDocument();
        });
    });

    describe('Performance Analysis', () => {
        test('identifies high CPU usage', async () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            
            await waitFor(() => {
                expect(screen.getByText('High CPU Usage Detected')).toBeInTheDocument();
                expect(screen.getByText(/Current CPU usage: 85/)).toBeInTheDocument();
            });
        });

        test('identifies memory issues', async () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            
            await waitFor(() => {
                expect(screen.getByText('Memory Usage Near Capacity')).toBeInTheDocument();
                expect(screen.getByText(/Memory usage: 90/)).toBeInTheDocument();
            });
        });

        test('identifies slow match calculations', async () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            
            await waitFor(() => {
                expect(screen.getByText('Slow Match Calculations')).toBeInTheDocument();
                expect(screen.getByText(/Average duration: 250/)).toBeInTheDocument();
            });
        });

        test('identifies cache performance issues', async () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            
            await waitFor(() => {
                expect(screen.getByText('Low Cache Hit Rate')).toBeInTheDocument();
                expect(screen.getByText(/Current hit rate: 45/)).toBeInTheDocument();
            });
        });

        test('identifies API performance issues', async () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            
            await waitFor(() => {
                expect(screen.getByText('Slow API Endpoints Detected')).toBeInTheDocument();
            });
        });

        test('shows no issues message for healthy system', async () => {
            render(<PerformanceAdvisor performanceData={mockHealthyPerformanceData} />);
            
            await waitFor(() => {
                expect(screen.getByText('No performance issues detected')).toBeInTheDocument();
            });
        });
    });

    describe('Category Filtering', () => {
        test('filters suggestions by category', async () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            
            await waitFor(() => {
                const categorySelect = screen.getByRole('combobox');
                fireEvent.change(categorySelect, { target: { value: 'system' } });
                
                // Should show system issues
                expect(screen.getByText('High CPU Usage Detected')).toBeInTheDocument();
                // Should not show cache issues
                expect(screen.queryByText('Low Cache Hit Rate')).not.toBeInTheDocument();
            });
        });

        test('shows all suggestions when "all" category selected', async () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            
            await waitFor(() => {
                const categorySelect = screen.getByRole('combobox');
                fireEvent.change(categorySelect, { target: { value: 'all' } });
                
                // Should show all issues
                expect(screen.getByText('High CPU Usage Detected')).toBeInTheDocument();
                expect(screen.getByText('Low Cache Hit Rate')).toBeInTheDocument();
            });
        });
    });

    describe('Action Handling', () => {
        test('handles action button clicks', async () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            
            await waitFor(() => {
                const actionButton = screen.getByText('Scale Resources');
                fireEvent.click(actionButton);
                expect(console.log).toHaveBeenCalledWith('Implementing: Scale Resources');
            });
        });
    });

    describe('Priority Visualization', () => {
        test('displays correct priority indicators', async () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            
            await waitFor(() => {
                const highPriorityIssue = screen.getByText('Critical Impact');
                const mediumPriorityIssue = screen.getByText('Moderate Impact');
                
                expect(highPriorityIssue).toHaveClass('text-red-500');
                expect(mediumPriorityIssue).toHaveClass('text-yellow-500');
            });
        });
    });

    describe('Performance Updates', () => {
        test('updates suggestions when performance data changes', async () => {
            const { rerender } = render(
                <PerformanceAdvisor performanceData={mockPerformanceData} />
            );

            await waitFor(() => {
                expect(screen.getByText('High CPU Usage Detected')).toBeInTheDocument();
            });

            rerender(
                <PerformanceAdvisor performanceData={mockHealthyPerformanceData} />
            );

            await waitFor(() => {
                expect(screen.getByText('No performance issues detected')).toBeInTheDocument();
            });
        });
    });

    describe('Accessibility', () => {
        test('renders with proper ARIA attributes', async () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            
            await waitFor(() => {
                expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'Filter by category');
                expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Performance suggestions');
            });
        });

        test('maintains focus management', async () => {
            render(<PerformanceAdvisor performanceData={mockPerformanceData} />);
            
            await waitFor(() => {
                const categorySelect = screen.getByRole('combobox');
                const actionButton = screen.getByText('Scale Resources');
                
                categorySelect.focus();
                expect(document.activeElement).toBe(categorySelect);
                
                actionButton.focus();
                expect(document.activeElement).toBe(actionButton);
            });
        });
    });
});
