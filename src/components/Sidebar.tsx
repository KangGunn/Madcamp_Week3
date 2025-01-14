import React from "react";
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  sessions: { id: number; title: string }[];
  onNewSession: () => void;
  onSelectSession: (sessionId: number) => void;
  currentSessionId: number;
}

function Sidebar({ sessions, onNewSession, onSelectSession, currentSessionId }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();

  // 현재 경로에 따라 활성 페이지 이름 결정
  let activePage = "";
  if (location.pathname.startsWith("/home")) activePage = "Home";
  else if (location.pathname.startsWith("/connections")) activePage = "Connections";
  else if (location.pathname.startsWith("/ideawall")) activePage = "Idea Wall";

  return (
    <div className="w-60 bg-main text-white flex-col">
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
                className="mt-4 w-full px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
            >
                New Session
            </button>

            <div className="space-y-1">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`cursor-pointer px-2 py-1 rounded transition hover:bg-gray-600 ${currentSessionId === sess.id ? 'text-blue-500' : 'text-white'}`}
                  onClick={() => onSelectSession(sess.id)}
                >
                  {sess.title}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
