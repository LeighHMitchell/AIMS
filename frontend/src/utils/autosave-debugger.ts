/**
 * Comprehensive Auto-save Debugger for AIMS
 * 
 * This utility provides detailed logging and debugging capabilities
 * to identify why auto-save isn't working properly.
 */

export interface DebugConfig {
  enabled: boolean;
  logPayload: boolean;
  logNetworkRequests: boolean;
  logStateChanges: boolean;
  logValidation: boolean;
  maxPayloadLogSize: number; // KB
}

export class AutosaveDebugger {
  private config: DebugConfig;
  private logs: Array<{
    timestamp: string;
    type: 'info' | 'warn' | 'error' | 'network' | 'validation' | 'state';
    message: string;
    data?: any;
  }> = [];

  constructor(config: Partial<DebugConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development' || !!localStorage.getItem('DEBUG_AUTOSAVE'),
      logPayload: true,
      logNetworkRequests: true,
      logStateChanges: true,
      logValidation: true,
      maxPayloadLogSize: 50, // 50KB max for logging
      ...config
    };

    if (this.config.enabled) {
      console.log('🔧 AutosaveDebugger enabled');
      console.log('💡 Use localStorage.setItem("DEBUG_AUTOSAVE", "true") to enable in production');
    }
  }

  log(type: string, message: string, data?: any) {
    if (!this.config.enabled) return;

    const entry = {
      timestamp: new Date().toISOString(),
      type: type as any,
      message,
      data
    };

    this.logs.push(entry);
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }

    // Console output with emojis for easy identification
    const emoji = {
      info: '📝',
      warn: '⚠️',
      error: '❌',
      network: '🌐',
      validation: '✅',
      state: '🔄'
    }[type] || '📝';

    console.log(`${emoji} [AutosaveDebugger] ${message}`, data || '');
  }

  // Validate activity data before save attempt
  validateActivityData(data: any): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.config.logValidation) return { isValid: true, errors, warnings };

    this.log('validation', '🔍 Starting activity data validation');

    // Core validation checks
    if (!data) {
      errors.push('Activity data is null or undefined');
      return { isValid: false, errors, warnings };
    }

    if (!data.general) {
      errors.push('Missing general section');
    } else {
      if (!data.general.title?.trim()) {
        errors.push('Activity title is required');
      }
      if (data.general.title && data.general.title.length > 1000) {
        warnings.push('Activity title is very long (>1000 chars)');
      }
      if (!data.general.id && data.general.id !== null) {
        warnings.push('Activity ID is missing (new activity)');
      }
    }

    // Check for required user context
    if (!data.user && !data.general?.created_by_org_name) {
      warnings.push('No user context or created_by_org_name found');
    }

    // Check array sizes that might cause payload issues
    const arrays = [
      { name: 'sectors', data: data.sectors },
      { name: 'transactions', data: data.transactions },
      { name: 'contacts', data: data.contacts },
      { name: 'extendingPartners', data: data.extendingPartners },
      { name: 'implementingPartners', data: data.implementingPartners },
      { name: 'governmentPartners', data: data.governmentPartners }
    ];

    arrays.forEach(({ name, data: arrayData }) => {
      if (Array.isArray(arrayData)) {
        if (arrayData.length > 100) {
          warnings.push(`Large ${name} array: ${arrayData.length} items`);
        }
        // Check for malformed objects
        arrayData.forEach((item, index) => {
          if (typeof item !== 'object' || item === null) {
            errors.push(`Invalid ${name} item at index ${index}`);
          }
        });
      }
    });

    // Check for circular references
    try {
      JSON.stringify(data);
    } catch (error) {
      errors.push('Data contains circular references');
    }

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    this.log('validation', `Validation complete: ${result.isValid ? '✅ Valid' : '❌ Invalid'}`, {
      errors: result.errors,
      warnings: result.warnings
    });

    return result;
  }

  // Analyze payload size and content
  analyzePayload(payload: any): {
    sizeBytes: number;
    sizeKB: number;
    sizeMB: number;
    isLarge: boolean;
    breakdown: Record<string, number>;
    recommendations: string[];
  } {
    if (!this.config.logPayload) {
      return {
        sizeBytes: 0,
        sizeKB: 0,
        sizeMB: 0,
        isLarge: false,
        breakdown: {},
        recommendations: []
      };
    }

    this.log('info', '📊 Analyzing payload size and structure');

    const payloadString = JSON.stringify(payload);
    const sizeBytes = new TextEncoder().encode(payloadString).length;
    const sizeKB = sizeBytes / 1024;
    const sizeMB = sizeKB / 1024;

    // Analyze breakdown by section
    const breakdown: Record<string, number> = {};
    const recommendations: string[] = [];

    Object.keys(payload).forEach(key => {
      try {
        const sectionString = JSON.stringify(payload[key]);
        const sectionBytes = new TextEncoder().encode(sectionString).length;
        breakdown[key] = sectionBytes;

        // Specific recommendations
        if (key === 'sectors' && sectionBytes > 50000) {
          recommendations.push('Consider reducing sector data or implementing pagination');
        }
        if (key === 'transactions' && sectionBytes > 100000) {
          recommendations.push('Large transaction dataset - consider separate transaction API');
        }
        if (key === 'description' && sectionBytes > 10000) {
          recommendations.push('Very long description - consider trimming for autosave');
        }
      } catch (error) {
        breakdown[key] = 0;
      }
    });

    const isLarge = sizeKB > 1024; // >1MB is large

    if (isLarge) {
      recommendations.push('Payload exceeds 1MB - consider using minimal autosave payload');
    }

    if (sizeKB > 4000) { // >4MB approaching Vercel limit
      recommendations.push('⚠️ Payload approaching Vercel 4.5MB limit');
    }

    const analysis = {
      sizeBytes,
      sizeKB,
      sizeMB,
      isLarge,
      breakdown,
      recommendations
    };

    this.log('info', `📦 Payload analysis complete: ${sizeKB.toFixed(2)}KB`, {
      analysis,
      topSections: Object.entries(breakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([key, bytes]) => ({ section: key, sizeKB: (bytes / 1024).toFixed(2) }))
    });

    return analysis;
  }

  // Log network request details
  logNetworkRequest(url: string, method: string, payload?: any, response?: any, error?: any) {
    if (!this.config.logNetworkRequests) return;

    const requestData: any = {
      url,
      method,
      timestamp: new Date().toISOString()
    };

    if (payload) {
      const payloadSize = new TextEncoder().encode(JSON.stringify(payload)).length / 1024;
      requestData.payloadSizeKB = payloadSize.toFixed(2);
      
      if (payloadSize < this.config.maxPayloadLogSize) {
        requestData.payload = payload;
      } else {
        requestData.payloadTruncated = true;
        requestData.payloadSample = {
          id: payload.id,
          title: payload.title,
          sectorsCount: payload.sectors?.length || 0,
          transactionsCount: payload.transactions?.length || 0
        };
      }
    }

    if (response) {
      requestData.response = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      };
    }

    if (error) {
      requestData.error = {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3) // First 3 lines only
      };
    }

    this.log('network', `${method} ${url} ${error ? '❌' : '✅'}`, requestData);
  }

  // Log state changes
  logStateChange(component: string, oldState: any, newState: any) {
    if (!this.config.logStateChanges) return;

    const changes: Record<string, any> = {};
    
    // Find what actually changed
    Object.keys(newState).forEach(key => {
      if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
        changes[key] = {
          from: oldState[key],
          to: newState[key]
        };
      }
    });

    if (Object.keys(changes).length > 0) {
      this.log('state', `🔄 ${component} state changed`, changes);
    }
  }

  // Check for common autosave issues
  diagnoseAutosaveIssues(activityData: any, autosaveState: any): {
    issues: Array<{ type: 'critical' | 'warning' | 'info'; message: string; fix?: string }>;
    recommendations: string[];
  } {
    this.log('info', '🩺 Running autosave diagnostic');

    const issues: Array<{ type: 'critical' | 'warning' | 'info'; message: string; fix?: string }> = [];
    const recommendations: string[] = [];

    // Check if autosave is enabled
    if (!autosaveState) {
      issues.push({
        type: 'critical',
        message: 'Autosave state not found',
        fix: 'Ensure AutosaveFormWrapper is properly wrapping the form'
      });
      return { issues, recommendations };
    }

    // Check for title requirement
    if (!activityData?.general?.title?.trim()) {
      issues.push({
        type: 'critical',
        message: 'Activity title is required for autosave',
        fix: 'Add a title to the activity'
      });
    }

    // Check if stuck in saving state
    if (autosaveState.isAutoSaving) {
      issues.push({
        type: 'warning',
        message: 'Autosave is currently in progress',
        fix: 'Wait for current save to complete or force a manual save'
      });
    }

    // Check for repeated errors
    if (autosaveState.errorCount > 3) {
      issues.push({
        type: 'critical',
        message: `High error count: ${autosaveState.errorCount}`,
        fix: 'Check network connection and server status'
      });
    }

    // Check for save success but still showing unsaved
    if (autosaveState.saveCount > 0 && autosaveState.hasUnsavedChanges) {
      issues.push({
        type: 'warning',
        message: 'Saves recorded but changes still marked as unsaved',
        fix: 'Check if data comparison logic is working correctly'
      });
    }

    // Check payload size
    const validation = this.validateActivityData(activityData);
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        issues.push({
          type: 'critical',
          message: `Validation error: ${error}`,
          fix: 'Fix data validation issues before saving'
        });
      });
    }

    validation.warnings.forEach(warning => {
      issues.push({
        type: 'warning',
        message: `Validation warning: ${warning}`
      });
    });

    // Generate recommendations
    if (issues.some(i => i.message.includes('payload') || i.message.includes('Large'))) {
      recommendations.push('Consider implementing incremental saves for large datasets');
    }

    if (autosaveState.errorCount > 0) {
      recommendations.push('Enable network request logging to debug API errors');
    }

    if (!autosaveState.lastSaved) {
      recommendations.push('Try forcing a manual save to test API connectivity');
    }

    this.log('info', `🩺 Diagnostic complete: ${issues.length} issues found`, {
      criticalIssues: issues.filter(i => i.type === 'critical').length,
      warnings: issues.filter(i => i.type === 'warning').length,
      recommendations: recommendations.length
    });

    return { issues, recommendations };
  }

  // Force debug mode on/off
  setDebugMode(enabled: boolean) {
    this.config.enabled = enabled;
    if (enabled) {
      localStorage.setItem('DEBUG_AUTOSAVE', 'true');
      console.log('🔧 AutosaveDebugger enabled');
    } else {
      localStorage.removeItem('DEBUG_AUTOSAVE');
      console.log('🔧 AutosaveDebugger disabled');
    }
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.log('info', '🧹 Debug logs cleared');
  }

  // Get current status summary
  getStatusSummary(autosaveState: any) {
    if (!this.config.enabled) {
      return 'Debug mode disabled';
    }

    const summary = {
      debugEnabled: this.config.enabled,
      logsCount: this.logs.length,
      autosaveEnabled: !!autosaveState,
      lastActivity: this.logs[this.logs.length - 1]?.timestamp || 'No activity',
      currentStatus: autosaveState ? {
        isAutoSaving: autosaveState.isAutoSaving,
        hasUnsavedChanges: autosaveState.hasUnsavedChanges,
        saveCount: autosaveState.saveCount,
        errorCount: autosaveState.errorCount,
        lastSaved: autosaveState.lastSaved?.toISOString() || 'Never',
        lastError: autosaveState.lastError?.message || 'None'
      } : 'Not available'
    };

    this.log('info', '📊 Status summary generated', summary);
    return summary;
  }
}

// Global debugger instance
export const autosaveDebugger = new AutosaveDebugger();

// Helper functions for easy access
export const enableAutosaveDebug = () => autosaveDebugger.setDebugMode(true);
export const disableAutosaveDebug = () => autosaveDebugger.setDebugMode(false);
export const getAutosaveStatus = (autosaveState: any) => autosaveDebugger.getStatusSummary(autosaveState);
export const diagnoseAutosave = (activityData: any, autosaveState: any) => 
  autosaveDebugger.diagnoseAutosaveIssues(activityData, autosaveState);

// Make debugger available globally for console access
if (typeof window !== 'undefined') {
  (window as any).autosaveDebugger = autosaveDebugger;
  (window as any).enableAutosaveDebug = enableAutosaveDebug;
  (window as any).disableAutosaveDebug = disableAutosaveDebug;
}