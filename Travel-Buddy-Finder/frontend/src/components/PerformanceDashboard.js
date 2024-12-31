import React, { useState, useEffect } from 'react';
import {
    Line,
    Bar,
    Gauge,
    Area
} from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { api } from '../services/api';
import metricsSocket from '../services/metricsSocket';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler
);

const PerformanceDashboard = () => {
    const [performanceData, setPerformanceData] = useState(null);
    const [timeRange, setTimeRange] = useState('1h');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('system');
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        fetchPerformanceData();
        const interval = setInterval(fetchPerformanceData, 60000); // Refresh every minute

        // Subscribe to real-time updates
        metricsSocket.connect();
        const unsubscribe = metricsSocket.subscribe('performance', handleMetricsUpdate);

        // Subscribe to alerts
        metricsSocket.subscribe('performanceAlert', handleAlert);

        return () => {
            clearInterval(interval);
            unsubscribe();
            metricsSocket.disconnect();
        };
    }, [timeRange]);

    const fetchPerformanceData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/analytics/performance?timeRange=${timeRange}`);
            if (response.data.status === 'success') {
                setPerformanceData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching performance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMetricsUpdate = (data) => {
        setPerformanceData(prev => ({
            ...prev,
            ...data
        }));
    };

    const handleAlert = (alert) => {
        setAlerts(prev => [alert, ...prev].slice(0, 10)); // Keep last 10 alerts
    };

    const systemMetricsData = {
        labels: performanceData?.systemMetrics?.map(m => new Date(m.timestamp).toLocaleTimeString()) || [],
        datasets: [
            {
                label: 'CPU Usage',
                data: performanceData?.systemMetrics?.map(m => m.cpu * 100) || [],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true
            },
            {
                label: 'Memory Usage',
                data: performanceData?.systemMetrics?.map(m => 
                    (m.memory.heapUsed / m.memory.heapTotal) * 100
                ) || [],
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true
            }
        ]
    };

    const matchPerformanceData = {
        labels: performanceData?.matchMetrics?.map(m => new Date(m.timestamp).toLocaleTimeString()) || [],
        datasets: [{
            label: 'Match Calculation Time (ms)',
            data: performanceData?.matchMetrics?.map(m => m.duration) || [],
            backgroundColor: 'rgba(75, 192, 192, 0.5)'
        }]
    };

    const cachePerformanceData = {
        labels: performanceData?.cacheMetrics?.map(m => new Date(m.timestamp).toLocaleTimeString()) || [],
        datasets: [{
            label: 'Cache Hit Rate',
            data: performanceData?.cacheMetrics?.map(m => m.hitRate * 100) || [],
            borderColor: 'rgba(153, 102, 255, 1)',
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            fill: true
        }]
    };

    const apiPerformanceData = {
        labels: performanceData?.apiMetrics?.map(m => m.path) || [],
        datasets: [{
            label: 'Average Response Time (ms)',
            data: performanceData?.apiMetrics?.map(m => m.duration) || [],
            backgroundColor: 'rgba(255, 159, 64, 0.5)'
        }]
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            {/* Time Range Selector */}
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    System Performance
                </h2>
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="1h">Last Hour</option>
                    <option value="6h">Last 6 Hours</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                </select>
            </div>

            {/* Performance Alerts */}
            {alerts.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
                        Recent Alerts
                    </h3>
                    <div className="space-y-2">
                        {alerts.map((alert, index) => (
                            <div
                                key={index}
                                className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg"
                            >
                                <p className="font-medium">{alert.message}</p>
                                <p className="text-sm mt-1">
                                    {new Date(alert.timestamp).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Metrics Tabs */}
            <div className="mb-6">
                <div className="flex space-x-4 border-b dark:border-gray-700">
                    <button
                        className={`px-4 py-2 ${activeTab === 'system' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('system')}
                    >
                        System Resources
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'match' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('match')}
                    >
                        Match Performance
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'cache' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('cache')}
                    >
                        Cache Performance
                    </button>
                    <button
                        className={`px-4 py-2 ${activeTab === 'api' ? 
                            'border-b-2 border-blue-500 text-blue-500' : 
                            'text-gray-500 dark:text-gray-400'}`}
                        onClick={() => setActiveTab('api')}
                    >
                        API Performance
                    </button>
                </div>
            </div>

            {/* Metrics Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTab === 'system' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Resource Usage
                            </h3>
                            <Line
                                data={systemMetricsData}
                                options={{
                                    responsive: true,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            max: 100,
                                            title: {
                                                display: true,
                                                text: 'Usage %'
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                System Health
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(performanceData?.systemHealth || {}).map(([key, value]) => (
                                    <div key={key} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {key}
                                        </p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                            {typeof value === 'number' ? `${value.toFixed(2)}%` : value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'match' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Match Calculation Times
                            </h3>
                            <Bar
                                data={matchPerformanceData}
                                options={{
                                    responsive: true,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            title: {
                                                display: true,
                                                text: 'Time (ms)'
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Match Quality Metrics
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {performanceData?.matchQualityMetrics?.map((metric, index) => (
                                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {metric.label}
                                        </p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                            {metric.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'cache' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Cache Hit Rate
                            </h3>
                            <Area
                                data={cachePerformanceData}
                                options={{
                                    responsive: true,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            max: 100,
                                            title: {
                                                display: true,
                                                text: 'Hit Rate %'
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                Cache Statistics
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {performanceData?.cacheStats?.map((stat, index) => (
                                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {stat.label}
                                        </p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                            {stat.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'api' && (
                    <>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                API Response Times
                            </h3>
                            <Bar
                                data={apiPerformanceData}
                                options={{
                                    responsive: true,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            title: {
                                                display: true,
                                                text: 'Time (ms)'
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                                API Health Metrics
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {performanceData?.apiHealthMetrics?.map((metric, index) => (
                                    <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {metric.label}
                                        </p>
                                        <p className="text-2xl font-bold text-gray-800 dark:text-white">
                                            {metric.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PerformanceDashboard;
