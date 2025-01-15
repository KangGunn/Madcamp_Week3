import React, { useRef, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Connections from './pages/Connections';
import Ideawall from './pages/Ideawall';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { user } = useAuth();

  // 세션 목록: [{id, title}] 형식
  const [sessions, setSessions] = useState<{ id: number; title: string }[]>([]);
  // 현재 세션 ID (0이면 미선택)
  const [currentSessionId, setCurrentSessionId] = useState<number>(0);

  // Home.tsx 함수들에 접근하기 위한 ref
  const homeRef = useRef<any>(null);

  // 로그인/로그아웃 시 세션 목록 로드
  useEffect(() => {
    if (!user) {
      // 로그아웃 or 미로그인 상태
      setSessions([]);
      setCurrentSessionId(0);
      localStorage.removeItem('sessions');
      localStorage.removeItem('currentSessionId');
      return;
    }

    const fetchSessions = async () => {
      try {
        const response = await fetch(`http://13.209.75.24:3000/brainstorm/get_my_session/${user.id}`, {
          method: 'GET',
        });
        if (!response.ok) {
          throw new Error('세션 목록 불러오기 실패');
        }
        const data = await response.json();
        // data.sessions 예: [ { session_id:1, session_title:"...", visibility:"..." }, ...]
        const loadedSessions = data.sessions.map((s: any) => ({
          id: Number(s.session_id),
          title: s.session_title?.trim() ? s.session_title : `Session #${s.session_id}`,
        }));

        if (loadedSessions.length === 0) {
          // 서버에 세션이 하나도 없는 신규 유저 -> Session #1 생성
          const defaultSession = { id: 1, title: 'Session #1' };
          setSessions([defaultSession]);
          setCurrentSessionId(1);
          localStorage.setItem('sessions', JSON.stringify([defaultSession]));
          localStorage.setItem('currentSessionId', JSON.stringify(1));
        } else {
          setSessions(loadedSessions);
          setCurrentSessionId(loadedSessions[0].id);
          localStorage.setItem('sessions', JSON.stringify(loadedSessions));
          localStorage.setItem('currentSessionId', JSON.stringify(loadedSessions[0].id));
        }
      } catch (error: any) {
        console.error(error);
        alert(`세션 목록 불러오기 오류: ${error.message}`);
      }
    };
    fetchSessions();
  }, [user]);

  // sessions 또는 currentSessionId 변경 시 localStorage에 반영
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (currentSessionId > 0) {
      localStorage.setItem('currentSessionId', JSON.stringify(currentSessionId));
    }
  }, [currentSessionId]);

  // 사이드바: 새 세션 클릭
  const handleNewSession = () => {
    // 새 세션 ID
    const newId = sessions.length === 0
      ? 1
      : Math.max(...sessions.map(s => s.id)) + 1;

    const newSession = { id: newId, title: `Session #${newId}` };
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newId);

    // Home의 handleNewSession 호출 -> 루트 노드 생성 + 서버 저장
    if (homeRef.current && typeof homeRef.current.handleNewSession === 'function') {
      homeRef.current.handleNewSession(newId);
    }
  };

  // 사이드바: 특정 세션 클릭
  const handleSelectSession = (sessionId: number) => {
    if (homeRef.current && typeof homeRef.current.handleLoadSession === 'function') {
      homeRef.current.handleLoadSession(sessionId);
    }
    setCurrentSessionId(sessionId);
  };

  // 사이드바: 세션 삭제
  const onDeleteSession = async (sessionId: number) => {
    if (!user) return;

    try {
      const response = await fetch(`http://13.209.75.24:3000/brainstorm/delete_session_and_node/${user.id}/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('세션 삭제 실패');
      }

      // 세션 목록에서 제거
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      alert(`세션 #${sessionId} 삭제 완료`);

      // 남은 세션 중 첫 번째로 이동 or 0
      // (원하는 로직에 맞게 수정 가능)
      if (sessions.length > 1) {
        const next = sessions.filter(s => s.id !== sessionId)[0];
        setCurrentSessionId(next.id);
        if (homeRef.current?.handleLoadSession) {
          homeRef.current.handleLoadSession(next.id);
        }
      } else {
        setCurrentSessionId(0);
        if (homeRef.current?.handleNewSession) {
          homeRef.current.handleNewSession(1);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert("세션 삭제 중 오류 발생");
    }
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
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
                      <Route
                        path="home"
                        element={
                          <Home
                            ref={homeRef}
                            sessionId={currentSessionId}
                            setSessionId={setCurrentSessionId}
                          />
                        }
                      />
                      <Route path="connections" element={<Connections />} />
                      <Route path="ideawall" element={<Ideawall />} />
                    </Routes>
                  </div>
                </div>
              }
            />
          </Route>
          <Route path="*" element={<div>Page Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
