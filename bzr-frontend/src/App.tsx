import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { TransfersPage } from './pages/TransfersPage';

// Lazy-load non-landing pages to trim the initial bundle.
const HoldersPage = lazy(() =>
  import('./pages/HoldersPage').then((m) => ({ default: m.HoldersPage }))
);
const InfoPage = lazy(() =>
  import('./pages/InfoPage').then((m) => ({ default: m.InfoPage }))
);
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage }))
);

const RouteFallback = () => (
  <div className="p-6 text-center text-gray-500 text-sm">Loading…</div>
);

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<TransfersPage />} />
          <Route path="holders" element={<HoldersPage />} />
          <Route path="info" element={<InfoPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
