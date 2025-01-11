import React from 'react';
import { Routes, Route, Navigate, BrowserRouter } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Connections from './pages/Connections';
import Ideawall from './pages/Ideawall';

function App() {
  return (
    <BrowserRouter>
      <div className='flex flex-row h-screen'>
        <Sidebar />

        <div className='flex-1 bg-gray-100 p-4 overflow-auto'>
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/ideawall" element={<Ideawall />} />

            <Route path="/" element={<Navigate to="/home" replace />} />

            <Route path="/" element={<div>Page Not Found</div>} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
