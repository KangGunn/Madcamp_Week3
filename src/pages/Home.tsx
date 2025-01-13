import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  NodeDragStopParams,
  NodeDragEvent,
} from 'reactflow';
import 'reactflow/dist/style.css'; // React Flow 기본 스타일
import EllipseNode from '../components/EllipseNode'; // 우리가 만든 Custom Node
import { v4 as uuidv4 } from 'uuid'; // 고유 ID 생성용

/**
 * 각 노드의 data 구조 예시:
 * {
 *   text: string;
 *   width: number;
 *   height: number;
 *   borderThickness: number;
 *   borderColor: string;
 *   backgroundColor: string;
 *   onRemove: (id: string) => void;
 *   onChange: (id: string, data: Partial<...>) => void;
 *   setSelectedNode: (id: string) => void;
 *   parentId: string | null; // 루트 노드의 경우 null
 *   depth: number;
 * }
 */

// --------------------- 노드 타입 등록 ---------------------
const nodeTypes = {
  ellipse: EllipseNode,
};

// --------------------- 유틸리티 함수들 ---------------------
function getDescendants(parentId: string, nodes: Node[]): string[] {
  let childIds: string[] = [];
  nodes.forEach((n) => {
    if (n.data.parentId === parentId) {
      childIds.push(n.id);
      childIds = childIds.concat(getDescendants(n.id, nodes));
    }
  });
  return childIds;
}

function checkOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  const aLeft = ax - aw / 2;
  const aRight = ax + aw / 2;
  const aTop = ay - ah / 2;
  const aBottom = ay + ah / 2;

  const bLeft = bx - bw / 2;
  const bRight = bx + bw / 2;
  const bTop = by - bh / 2;
  const bBottom = by + bh / 2;

  return !(aRight < bLeft || aLeft > bRight || aBottom < bTop || aTop > bBottom);
}

// 드래그 그룹(드래그한 노드+후손)과 고정 노드 간 충돌 해소
function resolveDragGroupCollisions(dragGroupIds: string[], nodes: Node[]): Node[] {
  let newNodes = nodes.map((n) => ({ ...n, position: { ...n.position } }));
  const fixedNodes = newNodes.filter((n) => !dragGroupIds.includes(n.id));

  const maxIterations = 20;
  for (let iter = 0; iter < maxIterations; iter++) {
    let collisionFound = false;
    newNodes.forEach((dragNode) => {
      if (!dragGroupIds.includes(dragNode.id)) return;
      fixedNodes.forEach((fixedNode) => {
        if (
          checkOverlap(
            dragNode.position.x, dragNode.position.y,
            dragNode.data.width, dragNode.data.height,
            fixedNode.position.x, fixedNode.position.y,
            fixedNode.data.width, fixedNode.data.height
          )
        ) {
          let dx = dragNode.position.x - fixedNode.position.x;
          let dy = dragNode.position.y - fixedNode.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const shift = 10;
          dragNode.position.x += (dx / dist) * shift;
          dragNode.position.y += (dy / dist) * shift;
          collisionFound = true;
        }
      });
    });
    if (!collisionFound) break;
  }
  return newNodes;
}

// 자식 노드의 x좌표를 부모의 오른쪽 끝 + OFFSET보다 왼쪽으로 못 가도록
function applyXConstraint(nodes: Node[], groupIds: string[], OFFSET: number): Node[] {
  const newNodes = nodes.map((n) => ({ ...n }));
  groupIds.forEach((id) => {
    const childNode = newNodes.find((x) => x.id === id);
    if (!childNode) return;
    if (childNode.data.parentId) {
      const parent = newNodes.find((p) => p.id === childNode.data.parentId);
      if (parent) {
        const parentRightEdge = parent.position.x + parent.data.width / 2;
        const minX = parentRightEdge + OFFSET + childNode.data.width / 2;
        if (childNode.position.x < minX) {
          childNode.position.x = minX;
        }
      }
    }
  });
  return newNodes;
}

/* 
  형제(같은 parentId)의 노드들이 서로 겹치지 않게 간단 충돌 해소
  - dragStop 시 해당 노드와 같은 부모인 노드들끼리만 검사
*/
function resolveSiblingCollisions(nodes: Node[], parentId: string | null): Node[] {
  if (!parentId) return nodes; // 루트면 패스
  const siblings = nodes.filter((n) => n.data.parentId === parentId);
  if (siblings.length < 2) return nodes;

  const newNodes = nodes.map((n) => ({ ...n, position: { ...n.position } }));
  const maxIter = 10;
  for (let i = 0; i < maxIter; i++) {
    let moved = false;
    for (let a = 0; a < siblings.length; a++) {
      for (let b = a + 1; b < siblings.length; b++) {
        const nodeA = newNodes.find((x) => x.id === siblings[a].id)!;
        const nodeB = newNodes.find((x) => x.id === siblings[b].id)!;
        if (checkOverlap(
          nodeA.position.x, nodeA.position.y, nodeA.data.width, nodeA.data.height,
          nodeB.position.x, nodeB.position.y, nodeB.data.width, nodeB.data.height
        )) {
          // 겹침 발생 -> 서로 반대 방향으로 조금씩 밀어낸다
          const dx = nodeB.position.x - nodeA.position.x;
          const dy = nodeB.position.y - nodeA.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const shift = 5;
          nodeA.position.x -= (dx / dist) * shift;
          nodeA.position.y -= (dy / dist) * shift;
          nodeB.position.x += (dx / dist) * shift;
          nodeB.position.y += (dy / dist) * shift;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return newNodes;
}

// --------------------- Home 컴포넌트 ---------------------
function Home() {
  // --------------------- 상태 관련 ---------------------
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [direction, setDirection] = useState('');
  const [ideas, setIdeas] = useState('');

  const OFFSET = 50;
  const VERTICAL_GAP = 20;

  // --------------------- Undo(History) ---------------------
  // 매번 상태가 바뀔 때 이전 상태를 저장해 두고, Ctrl+Z 시 이전 상태로 복원
  const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [undoIndex, setUndoIndex] = useState(-1);

  const pushHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    // 현재 undoIndex 이후의 기록은 버림
    undoStackRef.current = undoStackRef.current.slice(0, undoIndex + 1);

    // 새로운 상태를 push
    undoStackRef.current.push({
      nodes: JSON.parse(JSON.stringify(newNodes)),
      edges: JSON.parse(JSON.stringify(newEdges)),
    });
    setUndoIndex(undoStackRef.current.length - 1);
  }, [undoIndex]);

  const undoAction = useCallback(() => {
    if (undoIndex <= 0) return; // 더 이상 undo 불가
    const newIndex = undoIndex - 1;
    setUndoIndex(newIndex);
    const hist = undoStackRef.current[newIndex];
    setNodes(hist.nodes);
    setEdges(hist.edges);
  }, [undoIndex, setNodes, setEdges]);

  // any 상태 변화 시마다 pushHistory
  // (노드 추가/삭제/드래그/Edges 변동 등)
  useEffect(() => {
    // 맨 처음에는 루트 노드 생성 완료 직후 push
    if (nodes.length > 0 && edges) {
      pushHistory(nodes, edges);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // Ctrl+Z 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undoAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoAction]);

  // --------------------- 초기 루트 노드 생성 ---------------------
  useEffect(() => {
    if (nodes.length === 0) {
      const rootId = uuidv4();
      const newNodeWidth = 200;
      const newNodeHeight = 100;
      const rootNode: Node = {
        id: rootId,
        type: 'ellipse',
        position: { x: 50, y: 400 },
        data: {
          text: '',
          width: newNodeWidth,
          height: newNodeHeight,
          borderThickness: 2,
          borderColor: 'black',
          backgroundColor: 'white',
          onRemove: handleRemoveNode,
          onChange: handleChangeNode,
          setSelectedNode: (nodeId: string) => setSelectedNodeId(nodeId),
          parentId: null,
          depth: 0,
        },
      };
      setNodes([rootNode]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------- 노드 생성 ---------------------
  const handleAddNode = useCallback(() => {
    if (!selectedNodeId) {
      alert('부모 노드를 선택하세요.');
      return;
    }
    const parentNode = nodes.find((n) => n.id === selectedNodeId);
    if (!parentNode) return;

    const newNodeWidth = 200;
    const newNodeHeight = 100;
    // 자식 노드 x = 부모 오른쪽 + OFFSET
    const parentRightEdge = parentNode.position.x + parentNode.data.width / 2;
    const defaultX = parentRightEdge + OFFSET + newNodeWidth / 2;

    // 기존 자식들(형제들)을 약간 위로 올림
    const siblings = nodes.filter((n) => n.data.parentId === selectedNodeId);
    const shiftUp = 10; // 이전 자식들을 조금씩 위로
    const updatedSiblings = nodes.map((sib) => {
      if (siblings.find((x) => x.id === sib.id)) {
        return {
          ...sib,
          position: {
            ...sib.position,
            y: sib.position.y - shiftUp,
          },
        };
      }
      return sib;
    });
    setNodes(updatedSiblings);

    // 새 자식 노드: 맨 아래
    // (기존 자식들 y를 약간 올렸으므로, 부모의 y + siblings.length*(height+gap) 정도로 계산)
    const defaultY = parentNode.position.y + siblings.length * (newNodeHeight + VERTICAL_GAP);

    const childId = uuidv4();
    const childNode: Node = {
      id: childId,
      type: 'ellipse',
      position: { x: defaultX, y: defaultY },
      data: {
        text: '',
        width: newNodeWidth,
        height: newNodeHeight,
        borderThickness: 2,
        borderColor: 'black',
        backgroundColor: 'white',
        onRemove: handleRemoveNode,
        onChange: handleChangeNode,
        setSelectedNode: (nodeId: string) => setSelectedNodeId(nodeId),
        parentId: selectedNodeId,
        depth: (parentNode.data.depth || 0) + 1,
      },
    };

    const newEdge: Edge = {
      id: `e${parentNode.id}-${childId}`,
      source: parentNode.id,
      target: childId,
      sourceHandle: 'source',
      targetHandle: 'target',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#000', strokeWidth: 2 },
    };

    setNodes((prev) => [...prev, childNode]);
    setEdges((prev) => [...prev, newEdge]);
  }, [nodes, selectedNodeId, setNodes, setEdges]);

  // --------------------- 노드 삭제 ---------------------
  const handleRemoveNode = (id: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  };

  // --------------------- 노드 텍스트/데이터 변경 ---------------------
  const handleChangeNode = (id: string, updatedData: Partial<Node['data']>) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updatedData } } : node
      )
    );
  };

  // --------------------- 드래그 그룹 단위 이동 ---------------------
  const dragStartPositionsRef = useRef<{ [key: string]: { x: number; y: number } }>({});

  const handleNodeDragStart = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const groupIds = [node.id, ...getDescendants(node.id, nodes)];
      groupIds.forEach((id) => {
        const found = nodes.find((n) => n.id === id);
        if (found) {
          dragStartPositionsRef.current[id] = { ...found.position };
        }
      });
    },
    [nodes]
  );

  // 드래그 중: 실시간으로 그룹 전체 이동
  const handleNodeDrag = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const groupIds = [node.id, ...getDescendants(node.id, nodes)];
      const stored = dragStartPositionsRef.current;
      if (!stored[node.id]) return;
      const deltaX = node.position.x - stored[node.id].x;
      const deltaY = node.position.y - stored[node.id].y;
      setNodes((nds) =>
        nds.map((n) => {
          if (groupIds.includes(n.id) && stored[n.id]) {
            return {
              ...n,
              position: {
                x: stored[n.id].x + deltaX,
                y: stored[n.id].y + deltaY,
              },
            };
          }
          return n;
        })
      );
    },
    [nodes]
  );

  // 드래그 끝: x 제약 + 그룹/형제 충돌 해소
  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const groupIds = [node.id, ...getDescendants(node.id, nodes)];
      // 1) x 제약
      setNodes((nds) => applyXConstraint(nds, groupIds, OFFSET));
      // 2) 드래그 그룹 vs 고정 노드 충돌
      setNodes((nds) => resolveDragGroupCollisions(groupIds, nds));
      // 3) 형제 노드 충돌 해소
      setNodes((nds) => resolveSiblingCollisions(nds, node.data.parentId));
    },
    [nodes]
  );

  // --------------------- 브레인스토밍 요청 ---------------------
  const handleBrainstorm = async () => {
    if (!selectedNodeId) {
      alert('노드를 먼저 선택하세요.');
      return;
    }
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (!selectedNode) return;
    try {
      const response = await fetch('http://13.209.75.24:3000/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: selectedNode.data.text || '',
          direction,
        }),
      });
      if (!response.ok) {
        throw new Error('브레인스토밍 요청에 실패했습니다.');
      }
      const data = await response.json();
      setIdeas(data.ideas || '');
    } catch (error: any) {
      console.error('Error:', error);
      setIdeas(`오류: ${error.message}`);
    }
  };

  // --------------------- 바깥 영역 클릭: 선택 해제 ---------------------
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <div className="w-full h-full bg-gray-100 relative">
      <h1 className="absolute top-4 left-1/2 transform -translate-x-1/2 text-2xl font-bold text-black">
        브레인스토밍 시스템
      </h1>

      <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
        <button onClick={handleAddNode} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-green-600 button">
          노드 생성
        </button>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 button" onClick={handleBrainstorm}>
          브레인스토밍 요청
        </button>
        <input
          className="px-3 py-2 border rounded w-64"
          type="text"
          placeholder="주제를 입력하세요"
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
        />
      </div>

      {/* 
        수정: minZoom, maxZoom 등을 넓게 설정하여 확대/축소에 제한이 없게 
      */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onPaneClick={handlePaneClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        minZoom={0.01} 
        maxZoom={10} 
      />

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-1/2 z-10">
        <pre className="bg-white p-4 rounded shadow text-sm text-black h-40 overflow-auto">
          {ideas}
        </pre>
      </div>
    </div>
  );
}

export default Home;
