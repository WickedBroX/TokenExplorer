import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { TransfersPage } from './pages/TransfersPage';
import { HoldersPage } from './pages/HoldersPage';
import { InfoPage } from './pages/InfoPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<TransfersPage />} />
        <Route path="holders" element={<HoldersPage />} />
        <Route path="info" element={<InfoPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
