import React, { useState } from 'react';

function Home() {
  // 입력받을 키워드 (예: "바다", "산" 등)
  const [keyword, setKeyword] = useState('');
  // 백엔드에서 받아온 아이디어 문자열
  const [ideas, setIdeas] = useState('');

  // /brainstorm로 POST 요청 보내는 함수
  const handleBrainstorm = async () => {
    try {
      // 실제 서버 주소로 변경하세요
      const response = await fetch('http://13.125.30.205:3000/brainstorm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword }),
      });

      if (!response.ok) {
        throw new Error('브레인스토밍 요청에 실패했습니다.');
      }

      const data = await response.json();
      // 백엔드에서는 { ideas: "...", keyword: "..." } 형태로 응답
      setIdeas(data.ideas || '');
    } catch (error) {
      console.error('Error:', error);
      setIdeas(`오류: ${error.message}`);
    }
  };

  return (
    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
      {/* 키워드 입력창 */}
      <input
        className="mb-4 px-3 py-2 border rounded w-64"
        type="text"
        placeholder="키워드를 입력하세요"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      {/* 브레인스토밍 버튼 */}
      <button
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={handleBrainstorm}
      >
        브레인스토밍 요청
      </button>

      {/* 결과 표시 */}
      <pre className="bg-white p-4 rounded shadow text-sm text-black w-1/2 h-64 overflow-auto">
        {ideas}
      </pre>
    </div>
  );
}

export default Home;
