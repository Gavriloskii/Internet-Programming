// Analytics service for tracking user interactions and app metrics

class Analytics {
    constructor() {
        this.enabled = process.env.REACT_APP_ANALYTICS_ENABLED === 'true';
        this.events = [];
        this.MAX_EVENTS = 1000; // Maximum number of events to store locally
    }

    track(eventName, data = {}) {
        if (!this.enabled) return;

        const event = {
            eventName,
            data,
            timestamp: new Date().toISOString(),
            sessionId: this.getSessionId()
        };

        // Store event locally
        this.events.push(event);
        if (this.events.length > this.MAX_EVENTS) {
            this.events.shift(); // Remove oldest event if limit reached
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.debug('Analytics Event:', event);
        }

        // Send to backend analytics service
        this.sendToBackend(event);
    }

    getSessionId() {
        if (!this._sessionId) {
            this._sessionId = localStorage.getItem('analytics_session_id');
            if (!this._sessionId) {
                this._sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem('analytics_session_id', this._sessionId);
            }
        }
        return this._sessionId;
    }

    async sendToBackend(event) {
        try {
            const response = await fetch('/api/analytics/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event),
            });

            if (!response.ok) {
                throw new Error(`Analytics API error: ${response.status}`);
            }
        } catch (error) {
            console.warn('Failed to send analytics event:', error);
            // Store failed events for retry
            this.storeFailedEvent(event);
        }
    }

    storeFailedEvent(event) {
        const failedEvents = JSON.parse(localStorage.getItem('failed_analytics_events') || '[]');
        failedEvents.push(event);
        localStorage.setItem('failed_analytics_events', JSON.stringify(failedEvents));
    }

    // Retry sending failed events
    async retryFailedEvents() {
        const failedEvents = JSON.parse(localStorage.getItem('failed_analytics_events') || '[]');
        if (failedEvents.length === 0) return;

        const successfulEvents = [];
        
        for (const event of failedEvents) {
            try {
                await this.sendToBackend(event);
                successfulEvents.push(event);
            } catch (error) {
                console.warn('Failed to retry analytics event:', error);
            }
        }

        // Remove successful events from storage
        const remainingEvents = failedEvents.filter(
            event => !successfulEvents.includes(event)
        );
        localStorage.setItem('failed_analytics_events', JSON.stringify(remainingEvents));
    }

    // Get analytics data for the current session
    getSessionData() {
        const sessionId = this.getSessionId();
        return this.events.filter(event => event.sessionId === sessionId);
    }

    // Clear all stored analytics data
    clearData() {
        this.events = [];
        localStorage.removeItem('failed_analytics_events');
        localStorage.removeItem('analytics_session_id');
    }
}

export const analytics = new Analytics();
