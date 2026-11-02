'use client';

import React, { useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface EditableBulletProps {
  bullet: string;
  isHighlighted?: boolean;
  onChange: (newText: string) => void;
  onAddBelow?: () => void;
  onDelete?: () => void;
}

export function EditableBullet({
  bullet,
  isHighlighted = false,
  onChange,
  onAddBelow,
  onDelete,
}: EditableBulletProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [bullet]);

  // Scroll into view if highlighted by suggestion application
  useEffect(() => {
    if (isHighlighted && textareaRef.current) {
      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      textareaRef.current.focus();
    }
  }, [isHighlighted]);

  return (
    <div
      className={`group relative flex items-start gap-2 rounded-md p-1 transition-all duration-500 ${
        isHighlighted
          ? 'ring-2 ring-[#4FD1C5] bg-[#4FD1C5]/15 shadow-sm'
          : 'hover:bg-neutral-50/80'
      }`}
    >
      <span className="text-neutral-500 font-bold select-none leading-relaxed shrink-0">
        •
      </span>

      <textarea
        ref={textareaRef}
        rows={1}
        value={bullet}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none overflow-hidden bg-transparent text-sm leading-relaxed text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#0A1B5C] rounded px-1"
        placeholder="Describe your achievement using the Google XYZ formula..."
      />

      {/* Quick Action Controls on Hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 pt-0.5">
        {onAddBelow && (
          <button
            type="button"
            onClick={onAddBelow}
            title="Add bullet below"
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete bullet"
            className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
