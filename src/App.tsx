import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Shell from '@/components/Shell'
import { ToastProvider } from '@/components/ToastProvider'
import Dashboard from '@/pages/Dashboard'
import Home from '@/pages/Home'
import PetHub from '@/pages/PetHub'
import BehaviorAnalysis from '@/pages/BehaviorAnalysis'
import DietConsulting from '@/pages/DietConsulting'
import Notifications from '@/pages/Notifications'
import Game from '@/pages/Game'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/prototype" element={<Home />} />
            <Route path="/pet" element={<PetHub />} />
            <Route path="/analysis" element={<BehaviorAnalysis />} />
            <Route path="/diet" element={<DietConsulting />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/game" element={<Game />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  )
}
