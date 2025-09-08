"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FEEDBACK_TYPES, FeedbackType } from '@/data/feedback-types';
import { useUser } from '@/hooks/useUser';
import { MessageSquareIcon, SendIcon, Loader2Icon, HelpCircle, MessageCircle, Lightbulb, Bug, Zap, Upload, X, Image, FileText, Minus, CircleDot, AlertTriangle, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppFeatureSearchableSelect } from '@/components/forms/AppFeatureSearchableSelect';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to get the correct Lucide icon component
const getIconComponent = (iconName: string) => {
  const iconMap = {
    HelpCircle,
    MessageCircle,
    Lightbulb,
    Bug,
    Zap
  };
  return iconMap[iconName as keyof typeof iconMap] || HelpCircle;
};

// Helper function to get priority icon and color
const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'low':
      return { icon: Minus, color: 'text-gray-400' };
    case 'medium':
      return { icon: CircleDot, color: 'text-blue-500' };
    case 'high':
      return { icon: AlertTriangle, color: 'text-orange-500' };
    case 'urgent':
      return { icon: Flame, color: 'text-red-600' };
    default:
      return { icon: Minus, color: 'text-gray-400' };
  }
};

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('comment');
  const [selectedFeature, setSelectedFeature] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const selectedType = FEEDBACK_TYPES.find(type => type.code === selectedCategory);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload images, PDFs, or text documents only.");
        return;
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("File size must be less than 10MB.");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload images, PDFs, or text documents only.");
        return;
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("File size must be less than 10MB.");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory || !message.trim()) {
      toast.error("Please select a category and enter your feedback.");
      return;
    }

    if (!user?.id) {
      toast.error("Please log in to submit feedback.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      let attachmentData: any = null;

      // Upload file first if one is selected
      if (selectedFile) {
        setIsUploading(true);
        console.log('[FeedbackModal] Uploading attachment...');
        
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        uploadFormData.append('userId', user.id);

        const uploadResponse = await fetch('/api/feedback/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (uploadResponse.ok) {
          attachmentData = await uploadResponse.json();
          console.log('[FeedbackModal] File uploaded successfully:', attachmentData);
        } else {
          const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown upload error' }));
          console.error('[FeedbackModal] Upload failed:', errorData);
          throw new Error(`Failed to upload attachment: ${errorData.error || 'Unknown error'}`);
        }
        
        setIsUploading(false);
      }

      // Submit feedback with attachment data
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          category: selectedCategory,
          feature: selectedFeature || null,
          subject: subject.trim() || null,
          message: message.trim(),
          priority: selectedPriority,
          attachment_url: attachmentData?.url || null,
          attachment_filename: attachmentData?.filename || null,
          attachment_type: attachmentData?.type || null,
          attachment_size: attachmentData?.size || null,
        }),
      });

      if (response.ok) {
        toast.success("Thank you for your feedback! We'll review it and get back to you if needed.");
        
        // Reset form
        setSelectedCategory('comment');
        setSelectedFeature('');
        setSelectedPriority('medium');
        setSubject('');
        setMessage('');
        setSelectedFile(null);
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown submission error' }));
        console.error('[FeedbackModal] Submission failed:', errorData);
        throw new Error(`Failed to submit feedback: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[FeedbackModal] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`There was an error submitting your feedback: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedCategory('comment');
    setSelectedFeature('');
    setSelectedPriority('medium');
    setSubject('');
    setMessage('');
    setSelectedFile(null);
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    return FileText;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareIcon className="h-5 w-5" />
            Share Your Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve the system by sharing your questions, suggestions, or reporting issues.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">What type of feedback is this?</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_TYPES.map((type) => {
                    const IconComponent = getIconComponent(type.icon);
                    return (
                      <SelectItem key={type.code} value={type.code}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <div className="font-medium">{type.name}</div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const { icon: PriorityIcon, color } = getPriorityIcon('low');
                        return <PriorityIcon className={`h-4 w-4 ${color}`} />;
                      })()}
                      <span>Low</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const { icon: PriorityIcon, color } = getPriorityIcon('medium');
                        return <PriorityIcon className={`h-4 w-4 ${color}`} />;
                      })()}
                      <span>Medium</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const { icon: PriorityIcon, color } = getPriorityIcon('high');
                        return <PriorityIcon className={`h-4 w-4 ${color}`} />;
                      })()}
                      <span>High</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const { icon: PriorityIcon, color } = getPriorityIcon('urgent');
                        return <PriorityIcon className={`h-4 w-4 ${color}`} />;
                      })()}
                      <span>Urgent</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feature">Which feature/functionality is this about?</Label>
            <AppFeatureSearchableSelect
              value={selectedFeature}
              onValueChange={setSelectedFeature}
              placeholder="Select the specific feature or area..."
              dropdownId="feedback-feature-select"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your feedback"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Your feedback</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={selectedType?.placeholder || "Please describe your feedback in detail..."}
              required
              rows={5}
              className="resize-none"
            />
          </div>

          {/* File Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="attachment">Attachment</Label>
            <div className="space-y-3">
              {!selectedFile ? (
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOver 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="space-y-2">
                    <Upload className={`mx-auto h-8 w-8 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                    <div>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-sm font-medium text-blue-600 hover:text-blue-500">
                          Click to upload
                        </span>
                        <span className="text-sm text-gray-500"> or drag and drop</span>
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.txt,.doc,.docx"
                        onChange={handleFileSelect}
                        disabled={isSubmitting || isUploading}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Images, PDFs, or documents up to 10MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const IconComponent = getFileIcon(selectedFile.type);
                        return <IconComponent className="h-5 w-5 text-gray-500" />;
                      })()}
                      <div>
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      disabled={isSubmitting || isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedCategory || !message.trim()}
            >
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                  Uploading attachment...
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <SendIcon className="mr-2 h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
