import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChatStore } from '../state/useChatStore';
import { useChannels } from '../hooks/useChat';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatView from '../components/chat/ChatView';
import ChatMemberList from '../components/chat/ChatMemberList';
import { MessageSquare } from 'lucide-react';
import useToast from '../context/useToast';

/**
 * Main Chat Page Component
 * Layout: Sidebar | Chat View | Member List
 */
export default function Chat() {
  const [searchParams] = useSearchParams();
  const { data: channels, isLoading, error } = useChannels();
  const {
    activeChannelId,
    setChannels,
    setActiveChannel,
    isSidebarOpen,
    isMemberListOpen,
    channels: storeChannels,
  } = useChatStore();
  const { showToast } = useToast();

  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get the active channel to check its type
  const activeChannel = storeChannels.find((ch) => ch.id === activeChannelId);
  const shouldShowMemberList =
    isMemberListOpen && activeChannelId && activeChannel?.type !== 'DIRECT';

  // Update channels in store when data changes
  useEffect(() => {
    if (channels) {
      setChannels(channels);
    }
  }, [channels, setChannels]);

  // Deep-link: open channel from ?channel= query param
  useEffect(() => {
    const channelId = searchParams.get('channel');
    if (channelId && storeChannels.length > 0) {
      const exists = storeChannels.some((ch) => ch.id === channelId);
      if (exists) {
        setActiveChannel(channelId);
      }
    }
  }, [searchParams, storeChannels, setActiveChannel]);

  // Show error toast if loading fails
  useEffect(() => {
    if (error) {
      showToast({
        title: 'Eroare',
        description: error?.message || 'Nu s-au putut încărca canalele chat.',
        type: 'error',
      });
    }
  }, [error, showToast]);

  // Calculate height: viewport height minus header (h-16 = 64px) minus main padding (py-6 = 48px)
  const containerStyle = {
    height: 'calc(100vh - 64px - 48px)',
    margin: '-24px -16px', // Counteract the main padding (py-6 = 24px, px-4 = 16px)
    width: 'calc(100% + 32px)', // Expand to fill the padding space
  };

  if (isLoading) {
    return (
      <div
        style={containerStyle}
        className="flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden"
      >
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Se încarcă chat-ul...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={containerStyle}
        className="flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <MessageSquare className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Eroare la încărcarea chat-ului</h3>
          <p className="mt-2 text-sm text-gray-500">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Reîncarcă pagina
          </button>
        </div>
      </div>
    );
  }

  // On mobile, show sidebar when no channel selected, chat view when channel selected
  const showSidebar = isMobile ? !activeChannelId : isSidebarOpen;
  const showChatArea = isMobile ? !!activeChannelId : true;

  return (
    <div
      style={containerStyle}
      className="flex bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200"
    >
      {/* Sidebar */}
      {showSidebar && <ChatSidebar isMobile={isMobile} />}

      {/* Main Chat View */}
      {showChatArea && (
        <div className="flex min-w-0 flex-1 flex-col">
          {activeChannelId ? (
            <ChatView isMobile={isMobile} />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Selectează un canal</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Alege un canal din sidebar pentru a începe conversația
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Member List - hidden for DM channels and on mobile */}
      {!isMobile && shouldShowMemberList && <ChatMemberList />}
    </div>
  );
}
