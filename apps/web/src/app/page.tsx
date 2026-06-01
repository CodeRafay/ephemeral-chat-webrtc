import { CreateRoomButton } from '@/components/home/CreateRoomButton';
import { JoinRoomForm } from '@/components/home/JoinRoomForm';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">EphemeralChat</h1>
          <p className="mt-2 text-sm text-gray-500">
            Private 1-to-1 chat. No accounts. Nothing stored.
          </p>
        </header>

        <section>
          <CreateRoomButton />
        </section>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-sm text-gray-500">or</span>
          </div>
        </div>

        <section>
          <JoinRoomForm />
        </section>

        <p className="text-center text-xs text-gray-400">
          Messages are never stored. No account needed. Powered by WebRTC.
        </p>
      </div>
    </main>
  );
}
