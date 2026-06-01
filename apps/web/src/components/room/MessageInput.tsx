'use client';

import { useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { LIMITS } from '@/lib/constants';

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > LIMITS.MAX_MESSAGE_LENGTH) {
      return;
    }
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleInput = (event: React.FormEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    target.style.height = 'auto';
    const lineHeight = 24;
    const maxHeight = lineHeight * 3;
    target.style.height = `${Math.min(target.scrollHeight, maxHeight)}px`;
  };

  const sendDisabled =
    text.trim().length === 0 || text.length > LIMITS.MAX_MESSAGE_LENGTH || disabled;

  return (
    <div className="border-t border-gray-200 px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          aria-label="Message input"
          placeholder="Type a message…"
          className="max-h-[72px] min-h-[40px] flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
        />
        <Button
          variant="primary"
          size="md"
          onClick={handleSend}
          disabled={sendDisabled}
          aria-label="Send message"
        >
          Send
        </Button>
      </div>
      {text.length >= LIMITS.CHAR_COUNTER_THRESHOLD ? (
        <span
          className={`mt-1 block text-right text-xs ${
            text.length >= LIMITS.MAX_MESSAGE_LENGTH ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          {text.length} / {LIMITS.MAX_MESSAGE_LENGTH}
        </span>
      ) : null}
    </div>
  );
}
