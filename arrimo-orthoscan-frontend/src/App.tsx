import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './app/ProtectedRoute'
import { ToastProvider } from './app/ToastProvider'
import CaseDetailPage from './pages/CaseDetailPage'
import CasesPage from './pages/CasesPage'
import DashboardPage from './pages/DashboardPage'
import DentistDetailPage from './pages/DentistDetailPage'
import DentistsPage from './pages/DentistsPage'
import ClinicDetailPage from './pages/ClinicDetailPage'
import ClinicsPage from './pages/ClinicsPage'
import DiagnosticsPage from './pages/DiagnosticsPage'
import MigrationPage from './pages/MigrationPage'
import LabPage from './pages/LabPage'
import LoginPage from './pages/LoginPage'
import OnboardingInvitePage from './pages/OnboardingInvitePage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PatientDetailPage from './pages/PatientDetailPage'
import PatientsPage from './pages/PatientsPage'
import ScansPage from './pages/ScansPage'
import SettingsPage from './pages/SettingsPage'
import { useEffect, useState } from 'react'
import { getAuthProvider } from './auth/authProvider'
import { applyStoredTheme } from './lib/systemSettings'

function RootRedirect() {
  const [loading, setLoading] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    let active = true
    getAuthProvider()
      .getCurrentUser()
      .then((user) => {
        if (!active) return
        setHasSession(Boolean(user))
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={hasSession ? '/app/dashboard' : '/login'} replace />
}

export default function App() {
  useEffect(() => {
    applyStoredTheme()
  }, [])

  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/complete-signup" element={<OnboardingInvitePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute permission="dashboard.read" />}>
            <Route path="/app/dashboard" element={<DashboardPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="scans.read" />}>
            <Route path="/app/scans" element={<ScansPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="cases.read" />}>
            <Route path="/app/cases" element={<CasesPage />} />
            <Route path="/app/cases/:id" element={<CaseDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="dentists.read" />}>
            <Route path="/app/dentists" element={<DentistsPage />} />
            <Route path="/app/dentists/:id" element={<DentistDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="clinics.read" />}>
            <Route path="/app/clinics" element={<ClinicsPage />} />
            <Route path="/app/clinics/:id" element={<ClinicDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="patients.read" />}>
            <Route path="/app/patients" element={<PatientsPage />} />
            <Route path="/app/patients/:id" element={<PatientDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="lab.read" />}>
            <Route path="/app/lab" element={<LabPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="settings.read" />}>
            <Route path="/app/settings" element={<SettingsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="settings.read" />}>
            <Route path="/app/settings/diagnostics" element={<DiagnosticsPage />} />
          </Route>
          <Route element={<ProtectedRoute permission="settings.write" />}>
            <Route path="/app/settings/migration" element={<MigrationPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  )
}
