'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { generateRoomCode } from '@/lib/roomId';

export function CreateRoomButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    setLoading(true);
    const code = generateRoomCode();
    router.push(`/room/${code}`);
  };

  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full"
      onClick={handleCreate}
      disabled={loading}
    >
      {loading ? 'Creating…' : 'Create New Room'}
    </Button>
  );
}
