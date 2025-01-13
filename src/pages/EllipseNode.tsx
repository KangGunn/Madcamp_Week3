import React, { useState } from 'react';

const EllipseNode = ({ id, data }: any) => {
  const { text, width, height, borderThickness, borderColor, backgroundColor } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
  };

  const handleBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    data.text = e.target.value;
    setIsEditing(false);
  };

  return (
    <div
      className="relative flex items-center justify-center border"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderWidth: `${borderThickness}px`,
        borderColor,
        backgroundColor,
        borderRadius: '50%',
        cursor: 'pointer',
      }}
      onContextMenu={handleContextMenu}
    >
      {isEditing ? (
        <input
          type="text"
          defaultValue={text}
          onBlur={handleBlur}
          autoFocus
          className="w-full h-full text-center bg-transparent outline-none"
        />
      ) : (
        <span onDoubleClick={() => setIsEditing(true)}>{text || '노드'}</span>
      )}

      {contextMenuVisible && (
        <div
          className="absolute bg-white shadow-lg rounded-md p-2 z-50"
          style={{
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
          }}
        >
          <button
            onClick={() => console.log('삭제')}
            className="block w-full text-left px-2 py-1 hover:bg-gray-200"
          >
            삭제
          </button>
          <button
            onClick={() => setContextMenuVisible(false)}
            className="block w-full text-left px-2 py-1 hover:bg-gray-200"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
};

export default EllipseNode;
