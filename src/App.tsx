import React, { useRef, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Connections from './pages/Connections';
import Ideawall from './pages/Ideawall';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext'; // AuthContext 사용
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<{ id: number; title: string }[]>(() => {
    const stored = localStorage.getItem('sessions');
    return stored ? JSON.parse(stored) : [{ id: 1, title: 'Session #1' }];
  });
  const [currentSessionId, setCurrentSessionId] = useState<number>(() => {
    const stored = localStorage.getItem('currentSessionId');
    return stored ? JSON.parse(stored) : 1;
  });

  const homeRef = useRef<any>(null);

  // sessions 혹은 currentSessionId가 변경될 때마다 로컬 스토리지에 저장합니다.
  useEffect(() => {
    localStorage.setItem('sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('currentSessionId', JSON.stringify(currentSessionId));
  }, [currentSessionId]);

  const handleNewSession = () => {
    console.log("sessions: ", sessions);
    console.log("session.length: ", sessions.length);

    const newId = (sessions.length === 0) ? 1 : (sessions[sessions.length - 1].id + 1);
    setSessions((prev) => [...prev, { id: newId, title: `Session #${newId}` }]);
    setCurrentSessionId(newId);

    if (homeRef.current && typeof homeRef.current.handleNewSession === 'function') {
      homeRef.current.handleNewSession(newId);
    }
  };

  const handleSelectSession = (sessionId: number) => {
    console.log("handleSelectSession Called");
    if (homeRef.current && typeof homeRef.current.handleLoadSession === 'function') {
      console.log("handleLoadSession Calling...");
      homeRef.current.handleLoadSession(sessionId);
    }
    setCurrentSessionId(sessionId);
  };

  const onDeleteSession = async (sessionId: number) => {
    try {
      const response = await fetch(`http://13.209.75.24:3000/brainstorm/delete_session_and_node/${user?.id}/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('세션 삭제 실패');
      }

      setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));

      alert(`세션 #${sessionId} 삭제 완료`);
      // Optionally refresh the sessions list or redirect the user
    } catch (error) {
      console.error('Error deleting session:', error);
      alert("세션 삭제 중 오류 발생");
    }
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
                    onDeleteSession={onDeleteSession}
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
