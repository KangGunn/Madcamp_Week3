import React, { useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Connections from './pages/Connections';
import Ideawall from './pages/Ideawall';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext'; // AuthContext 사용
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [sessions, setSessions] = useState<{ id: number; title: string }[]>([
    { id: 1, title: 'Session #1' },
  ]);

  const [currentSessionId, setCurrentSessionId] = useState(1);

  const homeRef = useRef<any>(null);

  const handleNewSession = () => {
    if (homeRef.current && typeof homeRef.current.handleNewSession === 'function') {
      homeRef.current.handleNewSession();
    }

    const newId = (sessions.length === 0) ? 1 : (sessions[sessions.length - 1].id + 1);
    setSessions((prev) => [...prev, { id: newId, title: `Session #${newId}` }]);
    setCurrentSessionId(newId);
  };

  const handleSelectSession = (sessionId: number) => {
    console.log("handleSelectSession Called");
    if (homeRef.current && typeof homeRef.current.handleLoadSession === 'function') {
      console.log("handleLoadSession Calling...");
      homeRef.current.handleLoadSession(sessionId);
    }
    setCurrentSessionId(sessionId);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 기본 경로에서 /login으로 리다이렉트 */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 로그인 화면 */}
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute />}>
            {/* 사이드바 포함된 레이아웃 */}
            <Route
              path="/*"
              element={
                <div className="flex flex-row h-screen">
                  <Sidebar 
                    sessions={sessions}
                    onNewSession={handleNewSession}
                    onSelectSession={handleSelectSession}
                    currentSessionId={currentSessionId}
                  />
                  <div className="flex-1 bg-gray-100 p-4 overflow-auto">
                    <Routes>
                      <Route path="home" element={
                        <Home
                          ref={homeRef}
                          sessionId={currentSessionId}
                          setSessionId={setCurrentSessionId}
                        />
                      }/>
                      <Route path="connections" element={<Connections />} />
                      <Route path="ideawall" element={<Ideawall />} />
                      {/* <Route path="/" element={<Navigate to="home" replace />} /> */}
                    </Routes>
                  </div>
                </div>
              }
            />
          </Route>
          {/* 404 페이지 */}
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
