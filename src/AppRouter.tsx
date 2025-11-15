import { Routes, Route, Navigate } from 'react-router-dom';
import MainDashboard from './App';
import { WizardLayout } from './pages/wizard/WizardLayout';
import { ProjectInput } from './pages/wizard/ProjectInput';
import { EpicSelection } from './pages/wizard/EpicSelection';
import { EpicCreation } from './pages/wizard/EpicCreation';
import { EpicDetail } from './pages/wizard/EpicDetail';
import { TemplateSelection } from './pages/wizard/TemplateSelection';
import { TicketInput } from './pages/wizard/TicketInput';
import { TicketReview } from './pages/wizard/TicketReview';
import { MultiTicketInput } from './pages/wizard/MultiTicketInput';
import { MultiTicketOverview } from './pages/wizard/MultiTicketOverview';
import { MultiTicketEdit } from './pages/wizard/MultiTicketEdit';
import { MultiTicketConfirm } from './pages/wizard/MultiTicketConfirm';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<MainDashboard />} />
      <Route path="/wizard" element={<WizardLayout />}>
        <Route index element={<Navigate to="/wizard/project" replace />} />
        <Route path="project" element={<ProjectInput />} />
        <Route path="epic-select" element={<EpicSelection />} />
        <Route path="epic-create" element={<EpicCreation />} />
        <Route path="epic-detail" element={<EpicDetail />} />
        <Route path="template" element={<TemplateSelection />} />
        <Route path="ticket-input" element={<TicketInput />} />
        <Route path="ticket-review" element={<TicketReview />} />
        <Route path="multi-input" element={<MultiTicketInput />} />
        <Route path="multi-overview" element={<MultiTicketOverview />} />
        <Route path="multi-edit/:id" element={<MultiTicketEdit />} />
        <Route path="multi-confirm" element={<MultiTicketConfirm />} />
      </Route>
    </Routes>
  );
}

