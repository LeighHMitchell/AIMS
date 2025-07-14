'use client';

import React, { useState, useEffect } from 'react';
import { X, Bug, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  details?: any;
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    // Flag to prevent infinite loops
    let isLogging = false;

    // Helper to add log entry safely
    const addLog = (type: LogEntry['type'], args: any[]) => {
      if (isLogging) return; // Prevent recursion
      
      try {
        isLogging = true;
        
        const message = args.map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return '[Object]';
            }
          }
          return String(arg);
        }).join(' ');
        
        // Filter out repetitive currency converter and GoTrueClient logs
        if (
          message.includes('[FixedConverter]') || 
          message.includes('Multiple GoTrueClient instances') ||
          message.includes('[PreCache] Cache hit')
        ) {
          return; // Skip these noisy logs
        }
        
        const entry: LogEntry = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          type,
          message: message.slice(0, 1000), // Limit message length
          details: args.length > 1 ? args : undefined
        };
        
        setLogs(prev => {
          const newLogs = [...prev.slice(-49), entry]; // Keep last 49 + 1 new = 50
          return newLogs;
        });
      } catch (error) {
        // Silently fail to prevent cascading errors
      } finally {
        isLogging = false;
      }
    };

    // Override console methods with safety checks
    console.log = (...args) => {
      originalLog(...args);
      if (!isLogging) addLog('log', args);
    };
    
    console.error = (...args) => {
      originalError(...args);
      if (!isLogging) addLog('error', args);
    };
    
    console.warn = (...args) => {
      originalWarn(...args);
      if (!isLogging) addLog('warn', args);
    };
    
    console.info = (...args) => {
      originalInfo(...args);
      if (!isLogging) addLog('info', args);
    };

    // Cleanup
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, []);

  const copyLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-orange-500 text-white rounded-full p-3 shadow-lg hover:bg-orange-600 transition-colors z-50"
        title="Open Debug Console"
      >
        <Bug className="w-6 h-6" />
        {logs.filter(l => l.type === 'error').length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {logs.filter(l => l.type === 'error').length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-white border-l border-t border-gray-300 shadow-xl rounded-tl-lg z-50">
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <h3 className="font-semibold text-sm">Debug Console</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={clearLogs}
            className="text-xs"
          >
            Clear
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyLogs}
            className="text-xs"
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="overflow-y-auto h-[calc(100%-48px)] p-2 font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center mt-8">No logs yet</p>
        ) : (
          logs.map(log => (
            <div
              key={log.id}
              className={`mb-2 p-2 rounded ${
                log.type === 'error' ? 'bg-red-50 text-red-900' :
                log.type === 'warn' ? 'bg-yellow-50 text-yellow-900' :
                log.type === 'info' ? 'bg-blue-50 text-blue-900' :
                'bg-gray-50 text-gray-900'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-500">[{log.timestamp}]</span>
                <span className={`font-semibold ${
                  log.type === 'error' ? 'text-red-600' :
                  log.type === 'warn' ? 'text-yellow-600' :
                  log.type === 'info' ? 'text-blue-600' :
                  'text-gray-600'
                }`}>
                  {log.type.toUpperCase()}:
                </span>
              </div>
              <pre className="mt-1 whitespace-pre-wrap break-words">{log.message}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}