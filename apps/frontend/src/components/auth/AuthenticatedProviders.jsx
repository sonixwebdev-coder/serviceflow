import { lazy, Suspense } from 'react';
import { useAuthStore } from '../../state/useAuthStore';

const RealtimeBridge = lazy(() => import('../realtime/RealtimeBridge.jsx'));
const GlobalSearch = lazy(() => import('../search/GlobalSearch.jsx'));

const AuthenticatedProviders = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return null;

  return (
    <Suspense fallback={null}>
      <RealtimeBridge />
      <GlobalSearch />
    </Suspense>
  );
};

export default AuthenticatedProviders;
