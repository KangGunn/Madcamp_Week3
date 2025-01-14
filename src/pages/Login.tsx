import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import characterImage from '../assets/images/yame.png'

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate(); // 리다이렉트 기능 추가

  const handleRegister = async () => {
    try {
      const response = await fetch('http://13.209.75.24:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const data = await response.json();
      alert('Registration successful!');
    } catch (error) {
      console.error('Registration Error:', error);
      setErrorMessage('Registration failed. Please try again.');
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch('http://13.209.75.24:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setUser(data);
      alert('Login successful!');
      navigate('/home'); // 로그인 성공 시 Home 페이지로 이동
    } catch (error) {
      console.error('Login Error:', error);
      setErrorMessage('Login failed. Please check your credentials and try again.');
    }
  };

  return (
    <div className="w-full h-screen bg-main flex flex-col items-center justify-center">
      {/* Title & Image Container */}
      <div className="flex items-center space-x-8 mb-12">
        
        {/* 캐릭터 이미지 */}
        <img
          src={characterImage} // 이미지 경로
          alt="Character"
          style={{ width: '500px', height: '400px' }}
          className="w-200 h-80"
        />
      </div>
  
      {/* Input Fields */}
      <div className="flex flex-col items-center space-y-4 mb-8">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-64 px-3 py-2 border-b bg-transparent text-white placeholder-gray-400 focus:outline-none focus:ring-0"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-64 px-3 py-2 border-b bg-transparent text-white placeholder-gray-400 focus:outline-none focus:ring-0"
        />
      </div>
  
      {/* Buttons */}
      <div className="flex space-x-8">
        <button
          onClick={handleRegister}
          className="text-white border border-white px-4 py-2 rounded hover:bg-white hover:text-black"
        >
          Register
        </button>
        <button
          onClick={handleLogin}
          className="text-white border border-white px-4 py-2 rounded hover:bg-white hover:text-black"
        >
          Login
        </button>
      </div>
  
      {/* Error Message */}
      {errorMessage && (
        <p className="text-red-400 mt-6">
          {errorMessage}
        </p>
      )}
    </div>
  );  
}

export default Login;
