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

  // (수정) 세션 목록 초기값은 빈 배열
  const [sessions, setSessions] = useState<{ id: number; title: string }[]>([]);
  // (수정) 아직 세션을 하나도 선택 안 했다는 의미로 0
  const [currentSessionId, setCurrentSessionId] = useState<number>(0);

  const homeRef = useRef<any>(null);

  // (수정) user가 바뀔 때(로그인/로그아웃) -> 서버에서 세션 목록 로드
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

        // data.sessions 예: [ { session_id:1, session_title:"...", visibility:"...", ... }, ...]
        const loadedSessions = data.sessions.map((s: any) => ({
          id: Number(s.session_id),
          // 제목이 없으면 "Session #id" 사용
          title: s.session_title && s.session_title.trim() ? s.session_title : `Session #${s.session_id}`,
        }));

        if (loadedSessions.length === 0) {
          // 최초 로그인 -> 서버에 세션이 하나도 없음
          const defaultSession = { id: 1, title: 'Session #1' };
          setSessions([defaultSession]);
          setCurrentSessionId(1);
          localStorage.setItem('sessions', JSON.stringify([defaultSession]));
          localStorage.setItem('currentSessionId', JSON.stringify(1));
        } else {
          // 서버 세션 목록
          setSessions(loadedSessions);
          // 첫 세션으로 선택
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

  // (수정) 세션 목록, 현재 세션 ID가 바뀌면 로컬스토리지 반영
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

  // (수정) "New Session" -> 새 세션 ID 만들고 Sidebar, Home 동기화
  const handleNewSession = () => {
    // 새 세션 ID 계산
    const newId = sessions.length === 0
      ? 1
      : Math.max(...sessions.map(s => s.id)) + 1;

    const newSession = { id: newId, title: `Session #${newId}` };
    setSessions((prev) => [...prev, newSession]);
    setCurrentSessionId(newId);

    if (homeRef.current && typeof homeRef.current.handleNewSession === 'function') {
      homeRef.current.handleNewSession(newId);
    }
  };

  // (수정) 세션 클릭 시 Home에서 로드
  const handleSelectSession = (sessionId: number) => {
    if (homeRef.current && typeof homeRef.current.handleLoadSession === 'function') {
      homeRef.current.handleLoadSession(sessionId);
    }
    setCurrentSessionId(sessionId);
  };

  const onDeleteSession = async (sessionId: number) => {
    if (!user) return;

    try {
      const response = await fetch(`http://13.209.75.24:3000/brainstorm/delete_session_and_node/${user.id}/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('세션 삭제 실패');
      }

      setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));

      alert(`세션 #${sessionId} 삭제 완료`);
      // 세션 목록 중 첫 번째로 이동 or 0
      if (sessions.length > 1) {
        const next = sessions.filter(s => s.id !== sessionId)[0];
        setCurrentSessionId(next.id);
        // Home에 로드
        homeRef.current.handleLoadSession(next.id);
      } else {
        setCurrentSessionId(0);
        // Home에 초기화
        if (homeRef.current && typeof homeRef.current.handleNewSession === 'function') {
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
