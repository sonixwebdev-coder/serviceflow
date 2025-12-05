import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const defaultOptions = {
  queries: {
    refetchOnWindowFocus: false,
    retry: 1,
  },
};

export function QueryProvider({ children }) {
  const [client] = useState(() => new QueryClient({ defaultOptions }));

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
