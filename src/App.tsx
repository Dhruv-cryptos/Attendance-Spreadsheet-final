import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AppProvider } from '@/store/appStore';
import Dashboard from '@/pages/Dashboard';
import UploadDataset from '@/pages/UploadDataset';
import Analyzer from '@/pages/Analyzer';
import IssueExplorer from '@/pages/IssueExplorer';
import CleaningStudio from '@/pages/CleaningStudio';
import Assistant from '@/pages/Assistant';
import Support, { HelpCenter } from '@/pages/Support';
import Reports from '@/pages/Reports';
import History from '@/pages/History';
import Settings from '@/pages/Settings';

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadDataset />} />
            <Route path="/analyzer" element={<Analyzer />} />
            <Route path="/issues" element={<IssueExplorer />} />
            <Route path="/cleaning" element={<CleaningStudio />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/support" element={<Support />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
}
