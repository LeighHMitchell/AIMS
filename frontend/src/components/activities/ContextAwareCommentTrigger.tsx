import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, Plus } from 'lucide-react';

interface ContextAwareCommentTriggerProps {
  section: string;
  field?: string;
  label?: string;
  onTrigger: (section: string, field?: string) => void;
  variant?: 'button' | 'icon' | 'inline';
  size?: 'sm' | 'default' | 'lg';
  showCount?: boolean;
  commentCount?: number;
  className?: string;
}

export function ContextAwareCommentTrigger({
  section,
  field,
  label,
  onTrigger,
  variant = 'icon',
  size = 'sm',
  showCount = false,
  commentCount = 0,
  className = ''
}: ContextAwareCommentTriggerProps) {
  
  const handleClick = () => {
    onTrigger(section, field);
  };

  const getTooltipText = () => {
    let text = `Add comment`;
    if (field) {
      text += ` for ${field}`;
    }
    if (section) {
      text += ` in ${section} section`;
    }
    return text;
  };

  const getButtonContent = () => {
    switch (variant) {
      case 'button':
        return (
          <>
            <MessageSquare className="h-4 w-4 mr-2" />
            {label || 'Comment'}
            {showCount && commentCount > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {commentCount}
              </span>
            )}
          </>
        );
      
      case 'inline':
        return (
          <>
            <Plus className="h-3 w-3 mr-1" />
            Comment
            {showCount && commentCount > 0 && (
              <span className="ml-1 text-blue-600">({commentCount})</span>
            )}
          </>
        );
      
      case 'icon':
      default:
        return (
          <>
            <MessageSquare className="h-4 w-4" />
            {showCount && commentCount > 0 && (
              <span className="ml-1 text-xs">{commentCount}</span>
            )}
          </>
        );
    }
  };

  const getButtonProps = () => {
    const baseProps = {
      onClick: handleClick,
      className: `${className} ${variant === 'inline' ? 'h-6 px-2 text-xs' : ''}`,
    };

    switch (variant) {
      case 'button':
        return {
          ...baseProps,
          variant: 'outline' as const,
          size: size as 'sm' | 'default' | 'lg',
        };
      
      case 'inline':
        return {
          ...baseProps,
          variant: 'ghost' as const,
          size: 'sm' as const,
        };
      
      case 'icon':
      default:
        return {
          ...baseProps,
          variant: 'ghost' as const,
          size: size as 'sm' | 'default' | 'lg',
        };
    }
  };

  const TriggerButton = (
    <Button {...getButtonProps()}>
      {getButtonContent()}
    </Button>
  );

  // Only wrap with tooltip for icon and inline variants
  if (variant === 'button') {
    return TriggerButton;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {TriggerButton}
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Hook for managing comment context state
export function useCommentContext() {
  const [context, setContext] = React.useState<{
    section: string;
    field?: string;
    isOpen: boolean;
  }>({
    section: '',
    field: undefined,
    isOpen: false,
  });

  const openComments = (section: string, field?: string) => {
    setContext({
      section,
      field,
      isOpen: true,
    });
  };

  const closeComments = () => {
    setContext(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  const clearContext = () => {
    setContext({
      section: '',
      field: undefined,
      isOpen: false,
    });
  };

  return {
    context,
    openComments,
    closeComments,
    clearContext,
  };
}

// Higher-order component to add comment functionality to any field
export function withCommentTrigger<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  defaultSection: string
) {
  return function CommentEnabledComponent(
    props: T & {
      onCommentTrigger?: (section: string, field?: string) => void;
      fieldName?: string;
      showCommentButton?: boolean;
      commentCount?: number;
    }
  ) {
    const {
      onCommentTrigger,
      fieldName,
      showCommentButton = true,
      commentCount = 0,
      ...wrappedProps
    } = props;

    const handleCommentTrigger = (section: string, field?: string) => {
      if (onCommentTrigger) {
        onCommentTrigger(section, field);
      }
    };

    return (
      <div className="relative group">
        <WrappedComponent {...(wrappedProps as T)} />
        
        {showCommentButton && onCommentTrigger && (
          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ContextAwareCommentTrigger
              section={defaultSection}
              field={fieldName}
              onTrigger={handleCommentTrigger}
              variant="icon"
              size="sm"
              showCount={commentCount > 0}
              commentCount={commentCount}
              className="bg-white border shadow-sm"
            />
          </div>
        )}
      </div>
    );
  };
}

// Predefined comment triggers for common activity sections
export const CommentTriggers = {
  BasicInfo: {
    Title: (props: { onTrigger: (section: string, field?: string) => void }) => (
      <ContextAwareCommentTrigger
        section="basic_info"
        field="title"
        onTrigger={props.onTrigger}
        variant="inline"
      />
    ),
    Description: (props: { onTrigger: (section: string, field?: string) => void }) => (
      <ContextAwareCommentTrigger
        section="basic_info"
        field="description"
        onTrigger={props.onTrigger}
        variant="inline"
      />
    ),
    Status: (props: { onTrigger: (section: string, field?: string) => void }) => (
      <ContextAwareCommentTrigger
        section="basic_info"
        field="status"
        onTrigger={props.onTrigger}
        variant="inline"
      />
    ),
  },
  
  Dates: {
    Planned: (props: { onTrigger: (section: string, field?: string) => void }) => (
      <ContextAwareCommentTrigger
        section="dates"
        field="planned_dates"
        onTrigger={props.onTrigger}
        variant="inline"
      />
    ),
    Actual: (props: { onTrigger: (section: string, field?: string) => void }) => (
      <ContextAwareCommentTrigger
        section="dates"
        field="actual_dates"
        onTrigger={props.onTrigger}
        variant="inline"
      />
    ),
  },
  
  Finances: {
    Budget: (props: { onTrigger: (section: string, field?: string) => void }) => (
      <ContextAwareCommentTrigger
        section="finances"
        field="budget"
        onTrigger={props.onTrigger}
        variant="inline"
      />
    ),
    Transactions: (props: { onTrigger: (section: string, field?: string) => void }) => (
      <ContextAwareCommentTrigger
        section="finances"
        field="transactions"
        onTrigger={props.onTrigger}
        variant="inline"
      />
    ),
  },
  
  Results: {
    Framework: (props: { onTrigger: (section: string, field?: string) => void }) => (
      <ContextAwareCommentTrigger
        section="results"
        field="framework"
        onTrigger={props.onTrigger}
        variant="inline"
      />
    ),
    Indicators: (props: { onTrigger: (section: string, field?: string) => void }) => (
      <ContextAwareCommentTrigger
        section="results"
        field="indicators"
        onTrigger={props.onTrigger}
        variant="inline"
      />
    ),
  },
};