import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const WebsiteLayout = lazy(() => import('./components/Layout'));
const DynamicPage = lazy(() => import('./pages/DynamicPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
    <span className="sr-only">Se incarca pagina</span>
  </div>
);

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Dynamic website routes - subdomain will be extracted from hostname or path */}
        <Route path="/:subdomain" element={<WebsiteLayout />}>
          <Route index element={<DynamicPage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path=":slug" element={<DynamicPage />} />
        </Route>

        {/* Local development without subdomain - uses path-based routing */}
        <Route path="/" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
