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

  const handleLogout = async () => {
    try {
      alert("You have been logged out.");
      logout();
      localStorage.removeItem('sessions');
      localStorage.removeItem('currentSessionId');
      if (user) {
        localStorage.removeItem(`initialSessionCreated_${user.id}`);
      }
      navigate('/login');
    } catch (error) {
      console.error("Error during logout:", error);
      alert("An error occurred while logging out.");
    }
  };

  return (
    <div className="relative w-60 bg-main text-white flex-col">
      <div className="p-4 border-b border-main flex items-baseline justify-center space-x-2">
        {user && (
          <>
            <span className="font-title text-4xl leading-none">{user.username}</span>
            <span className="font-title text-xl leading-none">영감님</span>
          </>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-2">
        <Link
          to="/home"
          className={`font-title text-xl block px-3 py-2 rounded transition hover:bg-gray-700 ${activePage === 'Home' ? 'text-blue-500' : 'text-white'}`}
        >
          홈
        </Link>
        <Link
          to="/connections"
          className={`font-title text-xl block px-3 py-2 rounded transition hover:bg-gray-700 ${activePage === 'Connections' ? 'text-blue-500' : 'text-white'}`}
        >
          친구
        </Link>
        <Link
          to="/ideawall"
          className={`font-title text-xl block px-3 py-2 rounded transition hover:bg-gray-700 ${activePage === 'Idea Wall' ? 'text-blue-500' : 'text-white'}`}
        >
          게시판
        </Link>
      </nav>

      <div className="p-4 border-t border-gray-700 text-sm">
        {activePage === "Home" && (
          <>
            <div className="mb-2 font-bold text-lg text-center">나의 마인드맵</div>

            <button
              onClick={onNewSession}
              className="mt-2 mb-2 w-full px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
            >
              새로 만들기
            </button>

            <div className="space-y-1">
              {sessions.map((sess) => {
                const displayTitle = sess.title?.trim().length
                  ? sess.title
                  : `마인드맵 #${sess.id}`;

                return (
                  <div
                    key={sess.id}
                    className={`relative cursor-pointer flex justify-between items-center px-2 py-1 rounded transition hover:bg-gray-600 
                      ${currentSessionId === sess.id ? 'text-blue-500' : 'text-white'}`}
                    onClick={() => onSelectSession(sess.id)}
                    onMouseEnter={() => setHoveredSessionId(sess.id)}
                    onMouseLeave={() => setHoveredSessionId(null)}
                  >
                    <span>{displayTitle}</span>
                    {hoveredSessionId === sess.id && (
                      <button
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        className="text-red-500 hover:text-red-700"
                      >
                        &#x2715;
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="p-4">
        <button
          onClick={handleLogout}
          className="absolute bottom-4 w-[86%] px-3 py-2 bg-red-500 rounded hover:bg-red-700 transition"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
