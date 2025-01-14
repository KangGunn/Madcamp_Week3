import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  NodeDragStopParams,
  NodeDragEvent,
  applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css'; // React Flow 기본 스타일
import EllipseNode from '../components/EllipseNode'; // 우리가 만든 Custom Node
import { v4 as uuidv4 } from 'uuid'; // 고유 ID 생성용
import { useAuth } from "../context/AuthContext";
import { useNavigate } from 'react-router-dom';

// let globalSessionId = 1;

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

// --------------------- Node[] -> 세션 JSON 변환 ---------------------
function nodesToSessionJSON({
  sessionId,
  userId,
  visibility,
  nodes,
}: {
  sessionId: number,
  userId: number,
  visibility: string,
  nodes: Node[]
}) {
  // 노드 정보를 session JSON format에 맞게 변환
  const nodeData = nodes.map((n) => ({
  // "node_id"는 서버가 int로 쓰든 말든 프론트쪽은 문자열로만 관리
  // 서버에서 "node_id"를 무시한다고 했지만, 혹시나 쓰게 된다면
  // 이렇게 문자열로 저장해도 문제없이 인식할 수 있음
  node_id: String(n.id),

  // parentId도 문자열로
  parent_id: n.data.parentId != null ? String(n.data.parentId) : null,

  depth: n.data.depth || 0,
  text: n.data.text || '',
  position_x: n.position.x,
  position_y: n.position.y,
  }));

  return {
    session_id: sessionId,
    user_id: userId,
    visibility: visibility,
    nodes: nodeData,
  };
}

// --------------------- JSON -> Node[] 변환 함수 ---------------------
function sessionJSONToNodes(sessionJson: any): Node[] {
  return sessionJson.nodes.map((item: any) => {
    const nodeId = item.id !== undefined ? String(item.id) : uuidv4();

    let parentStr = null;
    if (item.parent_id !== undefined && item.parent_id !== null && item.parent_id !== 0) {
      parentStr = String(item.parent_id);
    }

    return {
      id: nodeId,
      type: 'ellipse',
      position: { x: item.position_x, y: item.position_y },
      data: {
        text: item.text || '',
        width: 200,
        height: 100,
        borderThickness: 2,
        borderColor: 'black',
        backgroundColor: 'white',
        onRemove: () => {},
        onChange: () => {},
        setSelectedNode: () => {},
        parentId: parentStr,
        depth: item.depth || 0,
      },
    };
  });
}

// --------------------- Home 컴포넌트 ---------------------
interface HomeProps {
  sessionId: number;
  setSessionId: (id: number) => void;
}

const Home = forwardRef((props: HomeProps, ref) => {
  useImperativeHandle(ref, () => ({
    handleLoadSession,
    handleNewSession,
  }));

  // --------------------- 상태 관련 ---------------------
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [direction, setDirection] = useState('');
  const [ideas, setIdeas] = useState('');
  const [brainstormParentId, setBrainstormParentId] = useState<string | null>(null);
  // const [sessionId, setSessionId] = useState(globalSessionId); // **세션 ID 상태 추가**
  const { sessionId, setSessionId } = props;
  const [sessionTitle, setSessionTitle] = useState('New Session');
  const [visibility, setVisibility] = useState('private'); // **공개 범위 상태 추가**
  const { user } = useAuth();
  const navigate = useNavigate(); // 리다이렉트 기능 추가

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

  const handleNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);
        return updatedNodes;
      });
    },
    [setNodes]
  );

  // --------------------- 초기 루트 노드 생성 ---------------------
  useEffect(() => {
    if (nodes.length === 0) {
      const rootId = uuidv4();
      const newNodeWidth = 200;
      const newNodeHeight = 100;
      const rootNode: Node = {
        id: rootId,
        type: 'ellipse',
        position: { x: 50, y: 200 },
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

      // 초기 세션 저장
      const saveInitialSession = async () => {
        const userId = user!.id;

        const sessionJson = nodesToSessionJSON({
          sessionId,
          userId,
          visibility,
          nodes: [rootNode],
        });

        try {
          await handleSaveSessionWithJson(sessionJson); // 세션 저장
          alert(`초기 세션 #${sessionId} 자동 저장 완료!`);
        } catch (err: any) {
          console.error(err);
          alert('초기 세션 저장 오류: ' + err.message);
        }
      };

      saveInitialSession(); // 저장 함수 호출
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------- 노드 생성 ---------------------
  const handleAddChildNode = useCallback((parentId: string, text: string) => {
    const parentNode = nodes.find((n) => n.id === parentId);
    if (!parentNode) return;

    const newNodeWidth = 200;
    const newNodeHeight = 100;
    
    // 자식 노드 x = 부모의 오른쪽 + OFFSET
    const parentRightEdge = parentNode.position.x + parentNode.data.width / 2;
    const defaultX = parentRightEdge + OFFSET + newNodeWidth / 2;

    // 기존 자식들(형제들)을 약간 위로 올림
    const siblings = nodes.filter((n) => n.data.parentId === parentId);
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
    const defaultY = parentNode.position.y + siblings.length * (newNodeHeight + VERTICAL_GAP);

    const childId = uuidv4();
    const childNode: Node = {
      id: childId,
      type: 'ellipse',
      position: { x: defaultX, y: defaultY },
      data: {
        text,
        width: newNodeWidth,
        height: newNodeHeight,
        borderThickness: 2,
        borderColor: 'black',
        backgroundColor: 'white',
        onRemove: handleRemoveNode,
        onChange: handleChangeNode,
        setSelectedNode: (nodeId: string) => setSelectedNodeId(nodeId),
        parentId: parentId,
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
  }, [nodes, setNodes, setEdges]);

  // --------------------- (기존) 자식 노드 생성(빈 텍스트) ---------------------
  const handleAddNode = useCallback(() => {
    if (!selectedNodeId) {
      alert('부모 노드를 선택하세요.');
      return;
    }
    // 간단히, 위에서 만든 handleAddChildNode 재사용
    handleAddChildNode(selectedNodeId, '');
    console.log(nodes);
  }, [handleAddChildNode, selectedNodeId]);

  // --------------------- 노드 삭제 ---------------------
  const handleRemoveNode = useCallback((id: string) => {
    setNodes((prevNodes) => {
      // 이전 상태(prevNodes)에서 내가 삭제하려는 노드 + 그 하위 노드들의 ID를 전부 찾음
      const descendantIds = [id, ...getDescendants(id, prevNodes)];
  
      // 노드 상태 업데이트: descendantIds에 포함되지 않은 노드만 남김
      const updatedNodes = prevNodes.filter(
        (node) => !descendantIds.includes(node.id)
      );
  
      // Edge 상태도 업데이트(화살표 연결)
      // 삭제 대상 노드를 소스나 타겟으로 갖는 Edge는 모두 제거
      setEdges((prevEdges) =>
        prevEdges.filter(
          (edge) =>
            !descendantIds.includes(edge.source) &&
            !descendantIds.includes(edge.target)
        )
      );
  
      // 혹시 선택된 노드가 삭제될 경우 선택 해제
      if (selectedNodeId && descendantIds.includes(selectedNodeId)) {
        setSelectedNodeId(null);
      }
  
      return updatedNodes;
    });
  }, [setNodes, setEdges, selectedNodeId]);

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
      setBrainstormParentId(selectedNodeId);

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

  const handleIdeaClick = useCallback((ideaText: string) => {
    if (!brainstormParentId) return;
    handleAddChildNode(brainstormParentId, ideaText);
  }, [brainstormParentId, handleAddChildNode]);

  const handleSaveSessionWithJson = async (sessionJson: any) => {
    try {
      const response = await fetch('http://13.209.75.24:3000/brainstorm/save_session_with_nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionJson),
      });
      if (!response.ok) {
        throw new Error('세션 저장 실패');
      }
      const data = await response.json();
      const newSessionId = data.session_id; // 서버가 생성한 세션 id
      alert(`세션 #${newSessionId} 저장 완료!`);
    } catch (err: any) {
      console.error(err);
      alert(`세션 저장 오류: ${err.message}`);
    }
  }

  // ----------- 세션 저장 -----------
  // 서버에 JSON 형태로 POST -> session_id는 서버에서 생성한다고 가정
  const handleSaveSession = async () => {
    const userId = user!.id;
    // console.log(userId);
    // const userId = 2;

    // Node[] -> JSON 변환
    const sessionJson = nodesToSessionJSON({
      sessionId,
      userId,
      visibility,
      nodes,
    });

    try {
      await handleSaveSessionWithJson(sessionJson); // 공통 로직 호출
      // alert(`세션 #${sessionId} 저장 완료!`);
    } catch (err: any) {
      console.error(err);
      alert('세션 저장 오류: ' + err.message);
    }
  };

  const handleLoadSession = async (loadSessionId: number) => {
    // console.log("handleLoadSession Called");

    try {
      const response = await fetch(`http://13.209.75.24:3000/brainstorm/get_my_node_by_session/${user?.id}/${loadSessionId}`, {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error('세션 불러오기 실패');
      }
      const data = await response.json();
  
      // JSON -> Node[] 변환
      let loadedNodes = sessionJSONToNodes(data);
      console.log(loadedNodes);

      loadedNodes = loadedNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onRemove: handleRemoveNode,
          onChange: handleChangeNode,
          setSelectedNode: (nodeId: string) => setSelectedNodeId(nodeId)
        }
      }));

      // Edge 복원 로직
      const restoredEdges = loadedNodes
        .filter((node) => node.data.parentId !== null) // 부모 노드가 있는 경우만
        .map((node) => ({
          id: `e${node.data.parentId}-${node.id}`, // Edge ID를 고유하게
          source: String(node.data.parentId), // 부모 노드 ID
          target: String(node.id), // 현재 노드 ID
          type: 'smoothstep', // Edge 스타일 (ReactFlow 기본 제공)
          animated: true, // 애니메이션
          style: { stroke: '#000', strokeWidth: 2 }, // Edge 스타일
      }));
      
      // 기존 Mindmap 지우고 새로 로드
      setNodes(loadedNodes);
      setEdges(restoredEdges);
  
      // 세션 ID도 갱신
      setSessionId(loadSessionId);
  
      alert(`세션 #${loadSessionId} 불러오기 완료!`);
    } catch (err: any) {
      console.error(err);
      alert(`세션 불러오기 오류: ${err.message}`);
    }
  }

  const handleNewSession = async (newSessionId: number) => {
    setNodes([]);
    setEdges([]);

    const rootId = uuidv4();
    const newNode: Node = {
      id: rootId,
      type: 'ellipse',
      position: { x: 50, y: 200 },
      data: {
        text: '',
        width: 200,
        height: 100,
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
    setNodes([newNode]);

    const userId = user!.id;
    // console.log(userId);
    // const userId = 2;

    // Node[] -> JSON 변환
    const sessionJson = nodesToSessionJSON({
      sessionId: newSessionId,
      userId,
      visibility,
      nodes: [newNode],
    });

    try {
      await handleSaveSessionWithJson(sessionJson); // 공통 로직 호출
      alert(`새 세션 #${newSessionId} 저장 완료!`);
    } catch (err: any) {
      console.error(err);
      alert('새 세션 저장 오류: ' + err.message);
    }
  }

  const parsedIdeas = ideas
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <div className="w-full h-full bg-gray-100 relative">
      <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
        <button onClick={handleAddNode} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-green-600 button">
          노드 생성
        </button>
        <button onClick={handleSaveSession} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 button">
          세션 저장
        </button>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="px-2 py-1 border rounded"
        >
          <option value="private">Private</option>
          <option value="friends">Friends</option>
          <option value="public">Public</option>
        </select>
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
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onPaneClick={handlePaneClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        minZoom={0.1} 
        maxZoom={10} 
      />

      {/* 브레인스토밍 결과: 각 줄이 클릭되면 자식 노드 생성 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-1/2 z-10">
        <div className="bg-white p-4 rounded shadow text-sm text-black h-40 overflow-auto">
          {parsedIdeas.map((idea, idx) => (
            <div
              key={idx}
              onClick={() => handleIdeaClick(idea.replace(/^\d+\.\s*/, ''))} 
              // "1. A" -> "A" 로
              className="cursor-pointer hover:bg-gray-100 p-1"
            >
              {idea}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default Home;
