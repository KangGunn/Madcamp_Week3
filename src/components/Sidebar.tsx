import React from "react";
import { Link } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";

function Sidebar({
    sessions,
    onNewSession,
    onSelectSession,
}: {
    sessions: { id: number; title: string }[];
    onNewSession: () => void;
    onSelectSession: (sessionId: number) => void;
}) {
    const { user } = useAuth();
    
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
                    className="block px-3 py-2 rounded hover:bg-gray-700 transition"
                >
                    Home
                </Link>
                <Link
                    to="/connections"
                    className="block px-3 py-2 rounded hover:bg-gray-700 transition"
                >
                    Connections
                </Link>
                <Link
                    to="/ideawall"
                    className="block px-3 py-2 rounded hover:bg-gray-700 transition"
                >
                    Idea Wall
                </Link>
            </nav>

            <div className="p-4 border-t border-gray-700 text-sm">
                <button
                    onClick={onNewSession}
                    className="mt-2 px-3 bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                    New Session
                </button>

                <div className="mt-2 space-y-1">
                    {sessions.map((sess) => (
                        <div
                            key={sess.id}
                            className="cursor-pointer px-2 py-1 hover:bg-gray-600 rounded"
                            onClick={() => onSelectSession(sess.id)}
                        >
                            {sess.title}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Sidebar;