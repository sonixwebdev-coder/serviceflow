import { Routes, Route } from 'react-router-dom';
import WebsiteLayout from './components/Layout';
import DynamicPage from './pages/DynamicPage';
import BookingPage from './pages/BookingPage';
import NotFound from './pages/NotFound';

function App() {
  return (
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
  );
}

export default App;
