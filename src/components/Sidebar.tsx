import React from "react";
import { Link } from 'react-router-dom';

function Sidebar() {
    return (
        <div className="w-60 bg-gray-800 text-white flex-col">
            <div className="p-4 border-b border-gray-700 font-bold text-xl">
                My Sidebar
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
                ChatGPT Clone
            </div>
        </div>
    )
}

export default Sidebar