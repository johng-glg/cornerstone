import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { useStaff } from '@/hooks/useStaff';
import { cn } from '@/lib/utils';

interface NoteInputProps {
  onSubmit: (content: string) => Promise<void>;
  isPending?: boolean;
  placeholder?: string;
}

export function NoteInput({ onSubmit, isPending, placeholder = 'Write a note... Use @ to mention someone' }: NoteInputProps) {
  const [content, setContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: staff } = useStaff();

  const filteredStaff = staff?.filter(s => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    return fullName.includes(mentionFilter.toLowerCase());
  }).slice(0, 8) || [];

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart || 0;
    setContent(value);
    setCursorPosition(pos);

    // Check for @ trigger
    const textBeforeCursor = value.slice(0, pos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Only show if no space before @ (or start of line) and no closing bracket
      if ((atIndex === 0 || value[atIndex - 1] === ' ' || value[atIndex - 1] === '\n') && !textAfterAt.includes(']')) {
        setMentionFilter(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  }, []);

  const insertMention = useCallback((staffMember: { id: string; first_name: string; last_name: string }) => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const before = content.slice(0, atIndex);
    const after = content.slice(cursorPosition);
    const mention = `@[${staffMember.first_name} ${staffMember.last_name}](${staffMember.id})`;
    const newContent = `${before}${mention} ${after}`;
    setContent(newContent);
    setShowMentions(false);
    setMentionFilter('');
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPos = before.length + mention.length + 1;
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  }, [content, cursorPosition]);

  const handleSubmit = async () => {
    if (!content.trim() || isPending) return;
    await onSubmit(content.trim());
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && showMentions) {
      setShowMentions(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={2}
            className="resize-none pr-2 text-sm"
          />
          
          {/* Mention dropdown */}
          {showMentions && filteredStaff.length > 0 && (
            <div className="absolute bottom-full left-0 w-full mb-1 bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {filteredStaff.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                    "flex items-center gap-2"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(s);
                  }}
                >
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {s.first_name[0]}{s.last_name[0]}
                  </div>
                  <span>{s.first_name} {s.last_name}</span>
                  {s.job_title && (
                    <span className="text-xs text-muted-foreground ml-auto">{s.job_title}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!content.trim() || isPending}
          className="h-9 w-9 flex-shrink-0"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Press ⌘+Enter to submit • Type @ to mention
      </p>
    </div>
  );
}
