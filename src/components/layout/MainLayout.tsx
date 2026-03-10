/**
 * Main Layout Component
 * TitleBar at top, then sidebar + content below.
 */
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
import { Loader2 } from 'lucide-react';
import { useGatewayStore } from '@/stores/gateway';
import { useMemo } from 'react';

export function MainLayout() {
  const gatewayStatus = useGatewayStore((state) => state.status);

  const isReady = useMemo(() => {
    return gatewayStatus.state === 'running' || gatewayStatus.state === 'error';
  }, [gatewayStatus.state]);

  if (!isReady) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Initializing services...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Title bar: drag region on macOS, icon + controls on Windows */}
      <TitleBar />

      {/* Below the title bar: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
