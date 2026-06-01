import { ChatBox } from '@/components/room/ChatBox';

export default function RoomPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  return (
    <main className="flex h-screen flex-col">
      <ChatBox code={code} />
    </main>
  );
}
