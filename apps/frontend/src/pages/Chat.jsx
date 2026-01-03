import React, { useEffect } from 'react';
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
  const { data: channels, isLoading, error } = useChannels();
  const { activeChannelId, setChannels, isSidebarOpen, isMemberListOpen } = useChatStore();
  const { showToast } = useToast();

  // Update channels in store when data changes
  useEffect(() => {
    if (channels) {
      setChannels(channels);
    }
  }, [channels, setChannels]);

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
      <div style={containerStyle} className="flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-viperx-primary border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Se încarcă chat-ul...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle} className="flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <MessageSquare className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Eroare la încărcarea chat-ului</h3>
          <p className="mt-2 text-sm text-gray-500">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Reîncarcă pagina
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} className="flex bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
      {/* Sidebar */}
      {isSidebarOpen && <ChatSidebar />}

      {/* Main Chat View */}
      <div className="flex min-w-0 flex-1 flex-col">
        {activeChannelId ? (
          <ChatView />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <MessageSquare className="h-8 w-8 text-viperx-primary" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Selectează un canal</h3>
              <p className="mt-1 text-sm text-gray-500">
                Alege un canal din sidebar pentru a începe conversația
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Member List */}
      {isMemberListOpen && activeChannelId && <ChatMemberList />}
    </div>
  );
}
