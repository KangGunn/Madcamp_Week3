import React, { useState, useEffect } from 'react';
import { NodeProps, Handle, Position } from 'reactflow';

// 전역 상태로, 우클릭 메뉴가 열려있는 노드의 ID를 저장
let globalContextMenuVisibleId: string | null = null;

function EllipseNode(props: NodeProps) {
  const { id, data, selected } = props;
  const {
    text,
    width,
    height,
    borderThickness,
    borderColor,
    backgroundColor,
    onRemove,
    onChange,
    setSelectedNode,
    parentId = null,
    depth = 0,
  } = data;

  const [isEditing, setIsEditing] = useState(false);

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // 우클릭(컨텍스트 메뉴)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (globalContextMenuVisibleId && globalContextMenuVisibleId !== id) {
      document.dispatchEvent(new CustomEvent('closeContextMenu'));
    }
    globalContextMenuVisibleId = id;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    setContextMenuPosition({ x: offsetX, y: offsetY });
    setContextMenuVisible(true);

    setSelectedNode(id);
  };

  // 외부 클릭 시 컨텍스트 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !(e.target as HTMLElement).closest('.context-menu') &&
        !(e.target as HTMLElement).closest('.button')
      ) {
        setContextMenuVisible(false);
        globalContextMenuVisibleId = null;
      }
    };
    const handleGlobalContextMenuClose = () => {
      setContextMenuVisible(false);
      globalContextMenuVisibleId = null;
    };

    if (contextMenuVisible) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('closeContextMenu', handleGlobalContextMenuClose);
    } else {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('closeContextMenu', handleGlobalContextMenuClose);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('closeContextMenu', handleGlobalContextMenuClose);
    };
  }, [contextMenuVisible]);

  // 클릭 -> 선택 + 텍스트 편집 모드
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(id);
    setIsEditing(true);
  };

  // 더블 클릭 -> 자식 노드 생성 (기존 기능)
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDoubleClickNode) {
      data.onDoubleClickNode(id);
    }
  };

  // 텍스트 변경
  const handleInputChange = (newVal: string) => {
    onChange(id, { text: newVal });
  };

  // 포커스 아웃 시 편집 종료
  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div
      className={`relative flex items-center justify-center border ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderWidth: `${borderThickness}px`,
        borderColor: borderColor,
        backgroundColor: backgroundColor,
        borderRadius: '9999px', // 타원(원형)
        cursor: 'pointer',
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          type="text"
          value={text}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          autoFocus
          className="w-full h-full text-center bg-transparent outline-none"
          style={{ border: 'none', fontSize: '14px', color: 'black' }}
        />
      ) : (
        <span
          className="text-center pointer-events-none"
          style={{ fontSize: '14px', color: 'black' }}
        >
          {text}
        </span>
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenuVisible && (
        <div
          className="absolute bg-white shadow-lg rounded-md p-2 text-sm z-50 context-menu"
          style={{
            top: `${contextMenuPosition.y}px`,
            left: `${contextMenuPosition.x}px`,
            width: '150px',
            color: 'black',
            fontSize: '14px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="flex flex-col space-y-1">
            <li
              className="cursor-pointer hover:bg-gray-200 px-2 py-1"
              onClick={() => {
                onRemove(id);
                setContextMenuVisible(false);
                globalContextMenuVisibleId = null;
              }}
            >
              삭제
            </li>
            {/* <li
              className="cursor-pointer hover:bg-gray-200 px-2 py-1"
              onClick={() => {
                setContextMenuVisible(false);
                globalContextMenuVisibleId = null;
              }}
            >
              취소
            </li> */}
          </ul>
        </div>
      )}

      {/* 연결 핸들 (필요하다면 사용) */}
      <Handle type="source" position={Position.Right} id="source" />
      <Handle type="target" position={Position.Left} id="target" />
    </div>
  );
}

export default EllipseNode;
