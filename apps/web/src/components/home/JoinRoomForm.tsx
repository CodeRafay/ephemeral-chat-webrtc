'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { isValidRoomCode, normalizeRoomCode } from '@/lib/roomId';

export function JoinRoomForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleChange = (value: string) => {
    setCode(normalizeRoomCode(value).slice(0, 10));
    setError('');
  };

  const handleSubmit = () => {
    if (!isValidRoomCode(code)) {
      setError('Enter a valid room code (6–10 letters or numbers).');
      return;
    }
    router.push(`/room/${code}`);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex-1">
        <Input
          label="Room code"
          placeholder="e.g. X7K9P2AB"
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          error={error}
          autoComplete="off"
        />
      </div>
      <Button type="submit" variant="secondary" size="lg" className="md:shrink-0">
        Join Room
      </Button>
    </form>
  );
}
