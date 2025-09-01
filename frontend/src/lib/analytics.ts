/**
 * Analytics tracking utility for IATI import events
 * This is a simple implementation that can be extended with actual analytics providers
 */

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Track an analytics event
 * @param event - Event name (e.g., 'iati_import.parsed')
 * @param properties - Additional event properties
 */
export function track(event: string, properties?: Record<string, any>): void {
  try {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: properties || {},
      timestamp: new Date().toISOString(),
      sessionId: getSessionId()
    };

    // In production, you would send this to your analytics service
    // For now, we'll log to console in development and store locally
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', analyticsEvent);
    }

    // Store in localStorage for potential batch sending
    storeEventLocally(analyticsEvent);

    // Send to audit log endpoint if available
    sendToAuditLog(analyticsEvent);

  } catch (error) {
    // Never let analytics break the main flow
    console.warn('Failed to track analytics event:', error);
  }
}

/**
 * Get or create a session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Store event locally for potential batch sending
 */
function storeEventLocally(event: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;
  
  try {
    const existingEvents = JSON.parse(localStorage.getItem('pending_analytics') || '[]');
    existingEvents.push(event);
    
    // Keep only last 100 events to prevent storage overflow
    const recentEvents = existingEvents.slice(-100);
    localStorage.setItem('pending_analytics', JSON.stringify(recentEvents));
  } catch (error) {
    // Ignore localStorage errors
  }
}

/**
 * Send event to audit log endpoint
 */
async function sendToAuditLog(event: AnalyticsEvent): Promise<void> {
  try {
    // Only send specific IATI events to audit log
    if (!event.event.startsWith('iati_import.')) {
      return;
    }

    await fetch('/api/audit/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: event.event,
        details: event.properties,
        timestamp: event.timestamp
      })
    });
  } catch (error) {
    // Silently fail - audit logging shouldn't break the main flow
    console.debug('Failed to send to audit log:', error);
  }
}

/**
 * Track IATI import specific events with standardised properties
 */
export const iatiAnalytics = {
  parsed: (fileSize: number, fileName: string) => track('iati_import.parsed', {
    file_size: fileSize,
    file_name: fileName
  }),

  externalDetected: (reportingOrgRef: string, userRefs: string[]) => track('iati_import.external_detected', {
    reporting_org_ref: reportingOrgRef,
    user_publisher_refs: userRefs,
    mismatch: true
  }),

  optionSelected: (option: 'reference' | 'fork' | 'merge' | 'cancel', iatiId: string, reportingOrgRef: string) => track('iati_import.option_selected', {
    option,
    iati_id: iatiId,
    reporting_org_ref: reportingOrgRef
  }),

  importCompleted: (option: 'reference' | 'fork' | 'merge', activityId: string) => track('iati_import.completed', {
    import_type: option,
    activity_id: activityId
  }),

  importFailed: (error: string, step: string) => track('iati_import.failed', {
    error,
    step
  })
};

/**
 * Get pending analytics events (for batch sending)
 */
export function getPendingEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  
  try {
    return JSON.parse(localStorage.getItem('pending_analytics') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear pending analytics events (after successful batch send)
 */
export function clearPendingEvents(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('pending_analytics');
}