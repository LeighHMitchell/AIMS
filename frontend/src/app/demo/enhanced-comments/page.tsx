'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedActivityComments } from '@/components/activities/EnhancedActivityComments';
import { ContextAwareCommentTrigger, useCommentContext } from '@/components/activities/ContextAwareCommentTrigger';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Archive, 
  AtSign, 
  Paperclip,
  Eye,
  CheckCircle,
  Star,
  Heart,
  Zap
} from 'lucide-react';

export default function EnhancedCommentsDemo() {
  const [activeDemo, setActiveDemo] = useState('features');
  const { context, openComments, closeComments } = useCommentContext();
  
  // Mock activity ID for demo
  const demoActivityId = "85b03f24-217e-4cbf-b8e4-79dca60dee1f";

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Enhanced Comments System Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience the complete advanced commenting system with reactions, mentions, 
            attachments, context linking, archiving, and real-time notifications.
          </p>
        </div>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <ThumbsUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Reactions</h3>
              <p className="text-sm text-muted-foreground">👍 👎 ❤️ 🎉 😕</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <AtSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Mentions</h3>
              <p className="text-sm text-muted-foreground">@users #organizations</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Paperclip className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Attachments</h3>
              <p className="text-sm text-muted-foreground">Files & Images</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Archive className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <h3 className="font-semibent mb-1">Archive & Resolve</h3>
              <p className="text-sm text-muted-foreground">Organize comments</p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Tabs */}
        <Tabs value={activeDemo} onValueChange={setActiveDemo}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="features">Feature Showcase</TabsTrigger>
            <TabsTrigger value="context">Context-Aware Comments</TabsTrigger>
            <TabsTrigger value="editor">Enhanced Activity Editor</TabsTrigger>
          </TabsList>

          {/* Feature Showcase Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Advanced Features Demo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Features List */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-3">✨ What You Can Do:</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <ThumbsUp className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">React to Comments</h4>
                          <p className="text-sm text-muted-foreground">Give thumbs up/down, hearts, celebrate, or show confusion</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <AtSign className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">Mention Users & Organizations</h4>
                          <p className="text-sm text-muted-foreground">Type @ for users or # for organizations with autocomplete</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                        <Paperclip className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">Attach Files</h4>
                          <p className="text-sm text-muted-foreground">Add documents, images, and other files to comments</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                        <Archive className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium">Archive & Resolve</h4>
                          <p className="text-sm text-muted-foreground">Mark comments as resolved or archive for later</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <Eye className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h4 className="font-medium">Advanced Filtering</h4>
                          <p className="text-sm text-muted-foreground">Search, filter by type, status, and context</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Live Demo */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">🚀 Try It Live:</h3>
                    <EnhancedActivityComments
                      activityId={demoActivityId}
                      contextSection="demo"
                      allowContextSwitch={true}
                      showInline={true}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Context-Aware Comments Tab */}
          <TabsContent value="context" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Context-Aware Commenting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Context Demo Fields */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold mb-3">📍 Comment on Specific Fields:</h3>
                    
                    {/* Activity Title Field */}
                    <div className="p-4 border border-border rounded-lg group relative">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Activity Title
                      </label>
                      <input
                        type="text"
                        placeholder="Enter activity title..."
                        className="w-full px-3 py-2 border border-border rounded-md"
                      />
                      <div className="absolute top-2 right-2">
                        <ContextAwareCommentTrigger
                          section="basic_info"
                          field="title"
                          onTrigger={openComments}
                          variant="icon"
                          size="sm"
                        />
                      </div>
                    </div>
                    
                    {/* Activity Description Field */}
                    <div className="p-4 border border-border rounded-lg group relative">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Activity Description
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Describe the activity..."
                        className="w-full px-3 py-2 border border-border rounded-md"
                      />
                      <div className="absolute top-2 right-2">
                        <ContextAwareCommentTrigger
                          section="basic_info"
                          field="description"
                          onTrigger={openComments}
                          variant="icon"
                          size="sm"
                        />
                      </div>
                    </div>
                    
                    {/* Date Fields */}
                    <div className="p-4 border border-border rounded-lg group relative">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Project Dates
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="date" className="px-3 py-2 border border-border rounded-md" />
                        <input type="date" className="px-3 py-2 border border-border rounded-md" />
                      </div>
                      <div className="absolute top-2 right-2">
                        <ContextAwareCommentTrigger
                          section="dates"
                          field="project_timeline"
                          onTrigger={openComments}
                          variant="icon"
                          size="sm"
                        />
                      </div>
                    </div>
                    
                    {/* Budget Field */}
                    <div className="p-4 border border-border rounded-lg group relative">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Budget Information
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          className="flex-1 px-3 py-2 border border-border rounded-md"
                        />
                        <select className="px-3 py-2 border border-border rounded-md">
                          <option>USD</option>
                          <option>EUR</option>
                          <option>GBP</option>
                        </select>
                      </div>
                      <div className="absolute top-2 right-2">
                        <ContextAwareCommentTrigger
                          section="finances"
                          field="budget"
                          onTrigger={openComments}
                          variant="icon"
                          size="sm"
                        />
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <Badge variant="outline" className="text-sm">
                        💡 Click the comment icons to add contextual comments
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Context Comments Display */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">💬 Context Comments:</h3>
                    {context.isOpen ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline">
                            {context.section}
                            {context.field && ` → ${context.field}`}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={closeComments}
                          >
                            ✕
                          </Button>
                        </div>
                        <EnhancedActivityComments
                          activityId={demoActivityId}
                          contextSection={context.section}
                          contextField={context.field}
                          allowContextSwitch={false}
                          showInline={true}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border border-border rounded-lg">
                        Click a comment button on the left to see context-aware comments
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Activity Editor Tab */}
          <TabsContent value="editor" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Complete Activity Editor with Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">🎯 Full Integration Demo</h4>
                    <p className="text-blue-800 text-sm">
                      This demonstrates the complete enhanced activity editor with integrated 
                      context-aware comments, auto-save, and all advanced features.
                    </p>
                  </div>
                  
                  <EnhancedActivityComments 
                    activityId={demoActivityId}
                    contextSection="demo"
                    contextField="demo"
                    allowContextSwitch={false}
                    showInline={true}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Feature Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Advanced Features Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-green-700">✅ Reactions & Engagement</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Thumbs up/down voting</li>
                  <li>• Heart, celebrate, confused reactions</li>
                  <li>• Real-time reaction counts</li>
                  <li>• User attribution for reactions</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-blue-700">🎯 Smart Features</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• @user and #organization mentions</li>
                  <li>• File and image attachments</li>
                  <li>• Context linking to specific fields</li>
                  <li>• Advanced search and filtering</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-purple-700">🔧 Organization Tools</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Comment resolution workflow</li>
                  <li>• Archive/unarchive functionality</li>
                  <li>• Real-time notifications</li>
                  <li>• Status tracking (Open/Resolved/Archived)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}