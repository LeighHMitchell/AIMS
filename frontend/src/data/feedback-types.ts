// Feedback categories and types for user feedback system
export interface FeedbackType {
  code: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  placeholder: string;
}

export const FEEDBACK_TYPES: FeedbackType[] = [
  {
    code: 'question',
    name: 'Question',
    description: 'Ask a question about how something works',
    icon: 'HelpCircle',
    placeholder: 'What would you like to know about the system?'
  },
  {
    code: 'comment',
    name: 'General Comment',
    description: 'Share your thoughts or general feedback',
    icon: 'MessageCircle',
    placeholder: 'Share your thoughts or general feedback about the system...'
  },
  {
    code: 'feature_request',
    name: 'Feature Request',
    description: 'Suggest a new feature or enhancement',
    icon: 'Lightbulb',
    placeholder: 'Describe the feature you would like to see added...'
  },
  {
    code: 'bug_report',
    name: 'Bug Report',
    description: 'Report a problem or error you encountered',
    icon: 'Bug',
    placeholder: 'Describe the bug you encountered, including steps to reproduce if possible...'
  },
  {
    code: 'suggestion',
    name: 'Suggestion',
    description: 'Suggest an improvement to existing functionality',
    icon: 'Zap',
    placeholder: 'Describe your suggestion for improving existing functionality...'
  }
];

export const FEEDBACK_STATUS_TYPES = [
  { code: 'open', name: 'Open', color: 'blue' },
  { code: 'in_progress', name: 'In Progress', color: 'yellow' },
  { code: 'resolved', name: 'Resolved', color: 'green' },
  { code: 'closed', name: 'Closed', color: 'gray' },
  { code: 'archived', name: 'Archived', color: 'gray' }
];

export const FEEDBACK_PRIORITY_TYPES = [
  { code: 'low', name: 'Low', color: 'gray' },
  { code: 'medium', name: 'Medium', color: 'blue' },
  { code: 'high', name: 'High', color: 'orange' },
  { code: 'urgent', name: 'Urgent', color: 'red' }
];
