import React, { useState } from 'react';
import Ellipse, { EllipseNode } from '../components/Ellipse';

function Home() {
  const [nodes, setNodes] = useState<EllipseNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);


  // 입력받을 키워드 (예: "바다", "산" 등)
  const [keyword, setKeyword] = useState('');
  // 입력받을 브레인스토밍 디렉션 (예: 바다로 여행을 가려고 해)
  const [direction, setDirection] = useState('');
  // 백엔드에서 받아온 아이디어 문자열
  const [ideas, setIdeas] = useState('');


  const handleAddNode = () => {
    const newNode: EllipseNode = {
      id: Date.now(),
      text: '',
      width: 200,
      height: 100,
      borderThickness: 2,
      borderColor: 'black',
      backgroundColor: 'white',
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const handleRemoveNode = (id: number) => {
    setNodes((prev) => prev.filter((node) => node.id !== id))

    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  const handleSelectNode = (id: number) => {
    setSelectedNodeId(id);
  };

  const handleDeselectAll = () => {
    setSelectedNodeId(null);
  }

  const handleChangeNode = (id: number, updatedNode: Partial<EllipseNode>) => {
    setNodes((prev) =>
      prev.map((node) => 
        node.id ===id ? {...node, ...updatedNode } : node
      )
    );
  };


  // /brainstorm로 POST 요청 보내는 함수
  const handleBrainstorm = async () => {
    if (selectedNodeId === null) return alert('노드를 먼저 선택하세요.');
    
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (!selectedNode) return alert('노드가 존재하지 않습니다.');

    try {
      // 실제 서버 주소로 변경하세요
      const response = await fetch('http://43.201.75.253:3000/brainstorm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          keyword: selectedNode.text,
          direction: direction
        }),
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
    <div 
      className="relative w-full h-full bg-gray-100 flex flex-col items-center justify-center"
      onClick={handleDeselectAll}
    >
      <h1 className='absolute top-4 text-2xl font-bold text-black mb-4'>브레인스토밍 시스템</h1>

      <div className='absolute top-4 left-4 space-x-2'>
        <button
          onClick={handleAddNode}
          className='px-4 py-2 bg-gray-500 text-white rounded hover:bg-green-600'
        >
          노드 생성
        </button>
        {/* 브레인스토밍 버튼 */}
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            handleBrainstorm();
          }}
        >
          브레인스토밍 요청
        </button>
        {/* 디렉션 입력창 */}
        <input
          className="mb-4 px-3 py-2 border rounded w-64"
          type="text"
          placeholder="주제를 입력하세요"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        />
      </div>

      <div className='relative flex flex-wrap justify-center max-w-5xl'>
        {nodes.map((node) => (
          <Ellipse 
            key={node.id}
            node={node}
            isSelected={node.id === selectedNodeId}
            onSelect={handleSelectNode}
            onRemove={handleRemoveNode}
            onChange={handleChangeNode}
            onDeselectAll={handleDeselectAll}
          />
        ))}
      </div>      

      {/* 결과 표시 */}
      <pre className="bg-white p-4 rounded shadow text-sm text-black w-1/2 h-64 overflow-auto">
        {ideas}
      </pre>
    </div>
  );
}

export default Home;
