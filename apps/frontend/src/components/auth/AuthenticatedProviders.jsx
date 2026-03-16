import { useAuthStore } from '../../state/useAuthStore';
import RealtimeBridge from '../realtime/RealtimeBridge.jsx';
import GlobalSearch from '../search/GlobalSearch.jsx';

const AuthenticatedProviders = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return null;

  return (
    <>
      <RealtimeBridge />
      <GlobalSearch />
    </>
  );
};

export default AuthenticatedProviders;
