import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle
} from 'react';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import EllipseNode from '../components/EllipseNode';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from "../context/AuthContext";
import { useNavigate } from 'react-router-dom';

// ----- 노드 타입 등록 -----
const nodeTypes = {
  ellipse: EllipseNode,
};

// ----- 유틸 함수 -----
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

function checkOverlap(ax: number, ay: number, aw: number, ah: number,
                      bx: number, by: number, bw: number, bh: number): boolean {
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

function resolveSiblingCollisions(nodes: Node[], parentId: string | null): Node[] {
  if (!parentId) return nodes;
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
          const dx = nodeB.position.x - nodeA.position.x;
          const dy = nodeB.position.y - nodeA.position.y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 0.01;
          const shift = 5;
          nodeA.position.x -= (dx/dist)*shift;
          nodeA.position.y -= (dy/dist)*shift;
          nodeB.position.x += (dx/dist)*shift;
          nodeB.position.y += (dy/dist)*shift;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return newNodes;
}

// Node[] -> JSON
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
  const nodeData = nodes.map((n) => ({
    node_id: String(n.id),
    parent_id: n.data.parentId != null ? String(n.data.parentId) : null,
    depth: n.data.depth || 0,
    text: n.data.text || '',
    position_x: n.position.x,
    position_y: n.position.y,
  }));

  return {
    session_id: sessionId,
    user_id: userId,
    visibility,
    nodes: nodeData,
  };
}

// JSON -> Node[]
function sessionJSONToNodes(sessionJson: any): Node[] {
  return sessionJson.nodes.map((item: any) => {
    const nodeId = String(item.node_id);
    const parentStr = (item.parent_id !== undefined && item.parent_id !== null && item.parent_id !== 'null')
      ? String(item.parent_id)
      : null;

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

interface HomeProps {
  sessionId: number;
  setSessionId: (id: number) => void;
}

const Home = forwardRef((props: HomeProps, ref) => {
  const { sessionId, setSessionId } = props;

  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [direction, setDirection] = useState('');
  const [ideas, setIdeas] = useState('');
  const [brainstormParentId, setBrainstormParentId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState('private');

  const { user } = useAuth();
  const navigate = useNavigate();

  // --- Undo ---
  const undoStackRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [undoIndex, setUndoIndex] = useState(-1);

  const pushHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    undoStackRef.current = undoStackRef.current.slice(0, undoIndex + 1);
    undoStackRef.current.push({
      nodes: JSON.parse(JSON.stringify(newNodes)),
      edges: JSON.parse(JSON.stringify(newEdges)),
    });
    setUndoIndex(undoStackRef.current.length - 1);
  }, [undoIndex]);

  const undoAction = useCallback(() => {
    if (undoIndex <= 0) return;
    const newIndex = undoIndex - 1;
    setUndoIndex(newIndex);
    const hist = undoStackRef.current[newIndex];
    setNodes(hist.nodes);
    setEdges(hist.edges);
  }, [undoIndex, setNodes, setEdges]);

  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      pushHistory(nodes, edges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

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
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  // (수정) childId should be consistent. Let's define it outside the setEdges call:

  // 노드 삭제
  const handleRemoveNode = useCallback((id: string) => {
    setNodes((prevNodes) => {
      const descendantIds = [id, ...getDescendants(id, prevNodes)];
      const updatedNodes = prevNodes.filter((node) => !descendantIds.includes(node.id));
      setEdges((prevEdges) =>
        prevEdges.filter(
          (edge) =>
            !descendantIds.includes(edge.source) &&
            !descendantIds.includes(edge.target)
        )
      );
      if (selectedNodeId && descendantIds.includes(selectedNodeId)) {
        setSelectedNodeId(null);
      }
      return updatedNodes;
    });
  }, [selectedNodeId]);

  // 노드 수정
  const handleChangeNode = useCallback((id: string, updatedData: Partial<Node['data']>) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updatedData } } : node
      )
    );
  }, []);

  // ----- 초기 루트 노드 생성 (계정 당 최초 1회만) [수정된 부분] -----
  const [alreadyInit, setAlreadyInit] = useState(false);
  useEffect(() => {
    const flagKey = `initialSessionCreated_${user?.id}`;
    const alreadyCreated = localStorage.getItem(flagKey);
    if (alreadyCreated) return; // 이미 초기 생성되었다면 중단
    if (nodes.length === 0) {
      setAlreadyInit(true);
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
      const saveInitialSession = async () => {
        if (!user) return;
        const userId = user.id;
        const sessionJson = nodesToSessionJSON({
          sessionId,
          userId,
          visibility,
          nodes: [rootNode],
        });
        try {
          await handleSaveSessionWithJson(sessionJson);
          // console.log(`초기 세션 #${sessionId} 자동 저장 완료!`);
          localStorage.setItem(flagKey, 'true');
        } catch (err: any) {
          console.error(err);
          // alert('초기 세션 저장 오류: ' + err.message);
        }
      };
      saveInitialSession();
    }
  }, [user, nodes, sessionId, visibility, handleRemoveNode, handleChangeNode]);

  // ----- 자식 노드 생성 (텍스트 지정 가능) [수정된 부분] -----
  const handleAddChildNode = useCallback((parentId: string, text: string) => {
    // declare childId variable outside
    let generatedChildId = '';
    setNodes((prevNodes) => {
      const parentNode = prevNodes.find((n) => n.id === parentId);
      if (!parentNode) return prevNodes;
      const newNodeWidth = 200;
      const newNodeHeight = 100;
      const OFFSET = 50;
      const parentRightEdge = parentNode.position.x + parentNode.data.width / 2;
      const defaultX = parentRightEdge + OFFSET + newNodeWidth / 2;
      const siblings = prevNodes.filter((n) => n.data.parentId === parentId);
      const shiftUp = 10;
      const updated = prevNodes.map((sib) => {
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
      const defaultY = parentNode.position.y + siblings.length * (newNodeHeight + 20);
      generatedChildId = uuidv4();
      const childNode: Node = {
        id: generatedChildId,
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
          parentId,
          depth: (parentNode.data.depth || 0) + 1,
        },
      };
      return [...updated, childNode];
    });
    // 이제 같은 generatedChildId 를 사용하여 edge 업데이트 (부모 → 자식)
    setEdges((prevEdges) => {
      if (generatedChildId) {
        const newEdge: Edge = {
          id: `e${parentId}-${generatedChildId}`,
          source: parentId,
          target: generatedChildId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#000', strokeWidth: 2 },
        };
        return [...prevEdges, newEdge];
      }
      return prevEdges;
    });
  }, [handleRemoveNode, handleChangeNode]);


  // ----- 자식 노드 생성(빈 텍스트)
  const handleAddNode = useCallback(() => {
    if (!selectedNodeId) {
      alert('부모 노드를 선택하세요.');
      return;
    }
    handleAddChildNode(selectedNodeId, '');
  }, [selectedNodeId, handleAddChildNode]);

  // 드래그
  const dragStartPositionsRef = useRef<{ [key: string]: { x: number; y: number } }>({});
  const handleNodeDragStart = useCallback((_, node) => {
    setSelectedNodeId(node.id); // (수정) 드래그 시작 시 현재 노드를 선택 상태로
    setNodes((prevNodes) => {
      const groupIds = [node.id, ...getDescendants(node.id, prevNodes)];
      groupIds.forEach((id) => {
        const found = prevNodes.find((n) => n.id === id);
        if (found) {
          dragStartPositionsRef.current[id] = { ...found.position };
        }
      });
      return prevNodes;
    });
  }, []);

  const handleNodeDrag = useCallback((_, node) => {
    setNodes((prevNodes) => {
      const groupIds = [node.id, ...getDescendants(node.id, prevNodes)];
      const stored = dragStartPositionsRef.current;
      if (!stored[node.id]) return prevNodes;
      const deltaX = node.position.x - stored[node.id].x;
      const deltaY = node.position.y - stored[node.id].y;

      const newNodes = prevNodes.map((n) => {
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
      });
      return newNodes;
    });
  }, []);

  const handleNodeDragStop = useCallback((_, node) => {
    setNodes((prevNodes) => {
      const groupIds = [node.id, ...getDescendants(node.id, prevNodes)];
      let newNodes = applyXConstraint(prevNodes, groupIds, 50);
      newNodes = resolveDragGroupCollisions(groupIds, newNodes);
      newNodes = resolveSiblingCollisions(newNodes, node.data.parentId);
      return newNodes;
    });
  }, []);

  // 브레인스토밍
  const handleBrainstormClick = useCallback(async () => {
    if (!selectedNodeId) {
      alert('노드를 먼저 선택하세요.');
      return;
    }
    const parentNode = nodes.find((n) => n.id === selectedNodeId);
    if (!parentNode) return;
    try {
      setBrainstormParentId(selectedNodeId);
      const response = await fetch('http://13.209.75.24:3000/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: parentNode.data.text || '',
          direction,
        }),
      });
      if (!response.ok) throw new Error('브레인스토밍 요청에 실패했습니다.');
      const data = await response.json();
      setIdeas(data.ideas || '');
    } catch (error: any) {
      console.error(error);
      setIdeas(`오류: ${error.message}`);
    }
  }, [selectedNodeId, direction, nodes]);

  const handleIdeaClick = useCallback((ideaText: string) => {
    if (!brainstormParentId) return;
    handleAddChildNode(brainstormParentId, ideaText);
  }, [brainstormParentId, handleAddChildNode]);

  // 배경 클릭 -> 선택 해제
  const handlePaneClick = useCallback(() => {
    // (수정) 자식 노드 생성 이후에도 선택이 풀리지 않도록
    // 다만, 여기서는 배경을 클릭하면 의도적으로 선택 해제를 유지
    setSelectedNodeId(null);
  }, []);

  // 세션 저장
  const handleSaveSessionWithJson = useCallback(async (sessionJson: any) => {
    const response = await fetch('http://13.209.75.24:3000/brainstorm/save_session_with_nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionJson),
    });
    if (!response.ok) {
      // throw new Error('세션 저장 실패');
    }
    const data = await response.json();
    // alert(`세션 #${data.session_id} 저장 완료!`);
  }, []);

  const handleSaveSession = useCallback(async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    const userId = user.id;
    const sessionJson = nodesToSessionJSON({
      sessionId,
      userId,
      visibility,
      nodes,
    });
    try {
      await handleSaveSessionWithJson(sessionJson);
    } catch (err: any) {
      console.error(err);
      // alert(`세션 저장 오류: ${err.message}`);
    }
  }, [user, sessionId, visibility, nodes]);

  // 세션 불러오기
  const handleLoadSession = useCallback(async (loadSessionId: number) => {
    if (!user) return;
    try {
      const response = await fetch(`http://13.209.75.24:3000/brainstorm/get_my_node_by_session/${user.id}/${loadSessionId}`, {
        method: 'GET',
      });
      if (!response.ok) {
        // throw new Error('세션 불러오기 실패');
      }
      const data = await response.json();

      setVisibility(data.session.visibility);

      let loadedNodes = sessionJSONToNodes(data);

      // Edge 복원
      const restoredEdges: Edge[] = [];
      loadedNodes.forEach((node) => {
        const pId = node.data.parentId;
        if (pId) {
          restoredEdges.push({
            id: `e${pId}-${node.id}`,
            source: pId,
            target: node.id,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#000', strokeWidth: 2 },
          });
        }
      });

      // onRemove/onChange 등 콜백 주입
      loadedNodes = loadedNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onRemove: handleRemoveNode,
          onChange: handleChangeNode,
          setSelectedNode: (nodeId: string) => setSelectedNodeId(nodeId),
        }
      }));

      setNodes(loadedNodes);
      setEdges(restoredEdges);

      setSessionId(loadSessionId);
      // alert(`세션 #${loadSessionId} 불러오기 완료!`);
    } catch (err: any) {
      console.error(err);
      // alert(`세션 불러오기 오류: ${err.message}`);
    }
  }, [user, handleRemoveNode, handleChangeNode]);

  // 새 세션
  const handleNewSession = useCallback(async (newSessionId: number) => {
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

    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    const userId = user.id;
    const sessionJson = nodesToSessionJSON({
      sessionId: newSessionId,
      userId,
      visibility,
      nodes: [newNode],
    });
    try {
      await handleSaveSessionWithJson(sessionJson);
      setSessionId(newSessionId);
      // alert(`새 세션 #${newSessionId} 저장 완료!`);
    } catch (err: any) {
      console.error(err);
      // alert(`새 세션 저장 오류: ${err.message}`);
    }
  }, [handleRemoveNode, handleChangeNode, user, navigate, visibility]);

  useImperativeHandle(ref, () => ({
    handleLoadSession,
    handleNewSession
  }));

  const parsedIdeas = ideas
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

    return (
      <div className="w-full h-full bg-gray-100 relative">
        {/* 상단 왼쪽 */}
        <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
          <input
            className="px-3 py-2 bg-customGray text-white placeholder-white border rounded w-64"
            type="text"
            placeholder="상황을 입력하세요"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          />
          <button
            className="px-4 py-2 shadow-md bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleBrainstormClick}
          >
            브레인스토밍
          </button>
          <button
            onClick={handleAddNode}
            className="px-4 py-2 shadow-md bg-customGray text-white rounded hover:bg-green-600"
          >
            자식 노드 생성
          </button>
        </div>
    
        {/* 상단 오른쪽 */}
        <div className="absolute top-4 right-4 flex flex-col items-end space-y-2 z-10">
          {/* 버튼 그룹 */}
          <div className="flex items-center space-x-2">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="px-4 py-2 bg-customGray border rounded"
            >
              <option value="private">나만 보기</option>
              <option value="friends">친구 공개</option>
              <option value="public">전체 공개</option>
            </select>
            <button
              onClick={handleSaveSession}
              className="px-4 py-2 shadow-md bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              저장
            </button>
          </div>
    
          {/* 브레인스토밍 아이디어 목록 */}
          <div className="w-72 mt-2">
            <div className="bg-transparent p-4 rounded text-sm text-black max-h-100 overflow-auto">
              {parsedIdeas.map((idea, idx) => (
                <div
                  key={idx}
                  className="cursor-pointer hover:bg-gray-100 p-1"
                  onClick={() => handleIdeaClick(idea.replace(/^\d+\.\s*/, ''))}
                >
                  {idea}
                </div>
              ))}
            </div>
          </div>
        </div>
    
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          nodeTypes={nodeTypes}
          onPaneClick={handlePaneClick}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          minZoom={0.1}
          maxZoom={10}
        />
      </div>
    );    
});

export default Home;
