import React, { useState } from "react";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  sessions: { id: number; title: string }[];
  onNewSession: () => void;
  onSelectSession: (sessionId: number) => void;
  onDeleteSession: (sessionId: number) => void;
  currentSessionId: number;
}

function Sidebar({ sessions, onNewSession, onSelectSession, onDeleteSession, currentSessionId }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredSessionId, setHoveredSessionId] = useState<number | null>(null);

  // 현재 경로에 따라 활성 페이지 이름 결정
  let activePage = "";
  if (location.pathname.startsWith("/home")) activePage = "Home";
  else if (location.pathname.startsWith("/connections")) activePage = "Connections";
  else if (location.pathname.startsWith("/ideawall")) activePage = "Idea Wall";

  const handleDeleteSession = (sessionId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const confirmDelete = window.confirm("정말 삭제하시겠습니까?");
    if (confirmDelete) {
      onDeleteSession(sessionId);
    }
  };

  const handleLogout = async () => { // 잘못 만듦.. 회원 탈퇴 기능에 사용
    try {
      const response = await fetch(`http://13.209.75.24:3000/auth/withdraw/${user?.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      alert("You have been logged out.");
      logout(); // AuthContext의 상태 초기화
      navigate('/login');
    } catch (error) {
      console.error("Error during logout:", error);
      alert("An error occurred while logging out.");
    }
  };

  return (
    <div className="relative w-60 bg-main text-white flex-col">
      <div className="p-4 border-b border-main font-bold text-xl">
        { user && (
          <>
            {user.username} 영감님
          </>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-2 mt-4">
        <Link
          to="/home"
          className={`block px-3 py-2 rounded transition hover:bg-gray-700 ${activePage === 'Home' ? 'text-blue-500' : 'text-white'}`}
        >
          Home
        </Link>
        <Link
          to="/connections"
          className={`block px-3 py-2 rounded transition hover:bg-gray-700 ${activePage === 'Connections' ? 'text-blue-500' : 'text-white'}`}
        >
          Connections
        </Link>
        <Link
          to="/ideawall"
          className={`block px-3 py-2 rounded transition hover:bg-gray-700 ${activePage === 'Idea Wall' ? 'text-blue-500' : 'text-white'}`}
        >
          Idea Wall
        </Link>
      </nav>

      <div className="p-4 border-t border-gray-700 text-sm">
        {/* Home 페이지일 때만 세션 목록 표시 */}
        {activePage === "Home" && (
          <>
            <div className="mb-2 font-bold text-center">
              Mindmaps
            </div>

            <button
                onClick={onNewSession}
                className="mt-2 mb-2 w-full px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
            >
                New Session
            </button>

            <div className="space-y-1">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`relative cursor-pointer flex justify-between items-center px-2 py-1 rounded transition hover:bg-gray-600 ${currentSessionId === sess.id ? 'text-blue-500' : 'text-white'}`}
                  onClick={() => onSelectSession(sess.id)}
                  onMouseEnter={() => setHoveredSessionId(sess.id)}
                  onMouseLeave={() => setHoveredSessionId(null)}
                >
                  <span>{sess.title}</span>
                  {hoveredSessionId === sess.id && (<button
                    onClick={(e) => {
                        handleDeleteSession(sess.id, e);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    &#x2715;
                  </button>)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 로그아웃 버튼 */}
      <div className="p-4">
        <button
          onClick={logout}
          className="absolute bottom-4 w-[86%] px-3 py-2 bg-red-500 rounded hover:bg-red-700 transition"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
