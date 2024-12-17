import React from 'react';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to an error reporting service
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
        this.setState({
            errorInfo,
            errorCount: this.state.errorCount + 1
        });

        // You could send this to your error reporting service here
        // Example: Sentry.captureException(error);
    }

    handleRetry = () => {
        // Reset the error state and attempt to re-render
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    handleReload = () => {
        // Force a page reload
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Check if we've tried to recover too many times
            if (this.state.errorCount >= 3) {
                return (
                    <div className="min-h-[50vh] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center max-w-md"
                        >
                            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                Something's Not Right
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                We've tried to recover but keep running into issues. Please try refreshing the page or contact support if the problem persists.
                            </p>
                            <div className="space-y-4">
                                <button
                                    onClick={this.handleReload}
                                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                                >
                                    <ArrowPathIcon className="h-5 w-5 mr-2" />
                                    Refresh Page
                                </button>
                                <a
                                    href="/support"
                                    className="block text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    Contact Support
                                </a>
                            </div>
                            {process.env.NODE_ENV === 'development' && (
                                <div className="mt-6 text-left">
                                    <details className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                                        <summary className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                                            Error Details
                                        </summary>
                                        <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                                            {this.state.error?.toString()}
                                            {'\n\n'}
                                            {this.state.errorInfo?.componentStack}
                                        </pre>
                                    </details>
                                </div>
                            )}
                        </motion.div>
                    </div>
                );
            }

            // Show a less severe error message for the first few attempts
            return (
                <div className="min-h-[50vh] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center max-w-md"
                    >
                        <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Oops! Something went wrong
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            We encountered an error but we can try to recover. Click below to try again.
                        </p>
                        <button
                            onClick={this.handleRetry}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center mx-auto"
                        >
                            <ArrowPathIcon className="h-5 w-5 mr-2" />
                            Try Again
                        </button>
                        {process.env.NODE_ENV === 'development' && (
                            <div className="mt-6 text-left">
                                <details className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                                    <summary className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                                        Error Details
                                    </summary>
                                    <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                                        {this.state.error?.toString()}
                                        {'\n\n'}
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </details>
                            </div>
                        )}
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
