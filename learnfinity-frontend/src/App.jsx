import React from 'react';
import { useLocation, Routes, Route, BrowserRouter as Router } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import Aurora from './components/Aurora.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import DashboardLayout from './pages/DashboardLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import StudyPlannerPage from './pages/StudyPlannerPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import AllQuizzesPage from './pages/AllQuizzesPage.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

const AppRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/quiz/:topic/:difficulty" element={<QuizPage />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/planner" element={<StudyPlannerPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/quizzes" element={<AllQuizzesPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <div className="min-h-screen w-full text-white relative">
      {/* Solid dark base */}
      <div className="fixed inset-0 z-[-2] bg-[#0a0a0f]" />

      {/* Aurora waves on top of dark base */}
      <div className="fixed inset-0 z-[-1] opacity-70">
        <Aurora
          colorStops={["#7CFF67", "#B19EEF", "#5227FF"]}
          blend={0.5}      // keep it subtle
          amplitude={0.7}  // gentle waves
          speed={1}     // slow movement
        />
      </div>

      {/* Foreground content */}
      <div className="relative z-10">
        <Router>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </Router>
      </div>
    </div>
  );
}

export default App;
