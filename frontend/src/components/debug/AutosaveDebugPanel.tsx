/**
 * AutosaveDebugPanel - Comprehensive debugging interface for autosave issues
 */
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bug, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Download,
  Trash2,
  Play,
  Settings,
  Activity,
  Info
} from 'lucide-react';
import { autosaveDebugger, diagnoseAutosave } from '@/utils/autosave-debugger';
import { useAutosaveContext } from '@/components/forms/AutosaveFormWrapper';

interface AutosaveDebugPanelProps {
  activityData: any;
  className?: string;
}

export function AutosaveDebugPanel({ activityData, className }: AutosaveDebugPanelProps) {
  const autosaveContext = useAutosaveContext();
  const [isVisible, setIsVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [diagnosis, setDiagnosis] = useState<any>(null);

  // Auto-refresh diagnosis every 5 seconds when panel is open
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      if (autosaveContext) {
        const newDiagnosis = diagnoseAutosave(activityData, {
          isAutoSaving: autosaveContext.isAutoSaving,
          hasUnsavedChanges: autosaveContext.hasUnsavedChanges,
          lastSaved: autosaveContext.lastSaved,
          lastError: autosaveContext.lastError,
          saveCount: 0, // These aren't exposed by the context
          errorCount: 0
        });
        setDiagnosis(newDiagnosis);
      }
      setRefreshKey(prev => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [isVisible, activityData, autosaveContext]);

  // Initial diagnosis
  useEffect(() => {
    if (autosaveContext && activityData) {
      const newDiagnosis = diagnoseAutosave(activityData, {
        isAutoSaving: autosaveContext.isAutoSaving,
        hasUnsavedChanges: autosaveContext.hasUnsavedChanges,
        lastSaved: autosaveContext.lastSaved,
        lastError: autosaveContext.lastError,
        saveCount: 0,
        errorCount: 0
      });
      setDiagnosis(newDiagnosis);
    }
  }, [activityData, autosaveContext]);

  const handleToggleDebug = () => {
    const newState = !(autosaveDebugger as any).config.enabled;
    autosaveDebugger.setDebugMode(newState);
    setRefreshKey(prev => prev + 1);
  };

  const handleForceSave = async () => {
    if (autosaveContext?.saveNow) {
      try {
        await autosaveContext.saveNow();
        autosaveDebugger.log('info', '🔧 Manual save triggered from debug panel');
      } catch (error) {
        autosaveDebugger.log('error', '❌ Manual save failed from debug panel', error);
      }
    }
  };

  const handleExportLogs = () => {
    const logs = autosaveDebugger.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autosave-debug-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-black text-green-400 border-green-400 hover:bg-green-900"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug Autosave
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 left-4 w-96 max-h-96 overflow-hidden z-50 ${className}`}>
      <Card className="bg-black text-green-400 border-green-400">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Bug className="h-5 w-5 mr-2" />
              Autosave Debugger
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleToggleDebug}
                variant="outline"
                size="sm"
                className="text-green-400 border-green-400"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                variant="outline"
                size="sm"
                className="text-green-400 border-green-400"
              >
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="status" className="text-green-400">Status</TabsTrigger>
              <TabsTrigger value="issues" className="text-green-400">Issues</TabsTrigger>
              <TabsTrigger value="actions" className="text-green-400">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-2 max-h-64 overflow-y-auto">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Debug Mode:</span>
                  <Badge variant={(autosaveDebugger as any).config.enabled ? 'default' : 'secondary'}>
                    {(autosaveDebugger as any).config.enabled ? 'ON' : 'OFF'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Auto-saving:</span>
                  <Badge variant={autosaveContext?.isAutoSaving ? 'default' : 'secondary'}>
                    {autosaveContext?.isAutoSaving ? 'YES' : 'NO'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Unsaved Changes:</span>
                  <Badge variant={autosaveContext?.hasUnsavedChanges ? 'destructive' : 'default'}>
                    {autosaveContext?.hasUnsavedChanges ? 'YES' : 'NO'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Last Saved:</span>
                  <span className="text-xs">
                    {autosaveContext?.lastSaved 
                      ? autosaveContext.lastSaved.toLocaleTimeString()
                      : 'Never'
                    }
                  </span>
                </div>
                {autosaveContext?.lastError && (
                  <div className="text-red-400 text-xs">
                    <strong>Error:</strong> {autosaveContext.lastError.message}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="issues" className="space-y-2 max-h-64 overflow-y-auto">
              {diagnosis?.issues?.length > 0 ? (
                <div className="space-y-2">
                  {diagnosis.issues.map((issue: any, index: number) => (
                    <Alert key={index} className={`text-xs ${getStatusColor(issue.type)} border`}>
                      <div className="flex items-start gap-2">
                        {getStatusIcon(issue.type)}
                        <div className="flex-1">
                          <AlertDescription className="text-xs">
                            <strong>{issue.type.toUpperCase()}:</strong> {issue.message}
                            {issue.fix && (
                              <div className="mt-1 text-xs italic">
                                Fix: {issue.fix}
                              </div>
                            )}
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center text-green-400 text-sm py-4">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  No issues detected
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleForceSave}
                  variant="outline"
                  size="sm"
                  className="text-green-400 border-green-400 text-xs"
                  disabled={autosaveContext?.isAutoSaving}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Force Save
                </Button>
                
                <Button
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  variant="outline"
                  size="sm"
                  className="text-green-400 border-green-400 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
                
                <Button
                  onClick={handleExportLogs}
                  variant="outline"
                  size="sm"
                  className="text-green-400 border-green-400 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export Logs
                </Button>
                
                <Button
                  onClick={() => autosaveDebugger.clearLogs()}
                  variant="outline"
                  size="sm"
                  className="text-green-400 border-green-400 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear Logs
                </Button>
              </div>

              {diagnosis?.recommendations?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold mb-2">Recommendations:</h4>
                  <ul className="text-xs space-y-1">
                    {diagnosis.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-green-300">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Quick access functions for browser console
if (typeof window !== 'undefined') {
  (window as any).debugAutosave = () => {
    console.log('🔧 Autosave Debug Mode Enabled');
    autosaveDebugger.setDebugMode(true);
  };
  
  (window as any).stopDebugAutosave = () => {
    console.log('🔧 Autosave Debug Mode Disabled');
    autosaveDebugger.setDebugMode(false);
  };
  
  (window as any).getAutosaveLogs = () => {
    console.log('📋 Autosave Logs:', autosaveDebugger.exportLogs());
    return autosaveDebugger.exportLogs();
  };
}