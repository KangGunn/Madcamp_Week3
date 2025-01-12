import React, { useState, useEffect } from 'react';

export interface EllipseNode {
    id: number;
    text: string;
    width: number;
    height: number;
    borderThickness: number;
    borderColor: string;
    backgroundColor: string;
}

// 부모(Home.tsx)에서 전달받을 Prop 타입 정의
interface EllipseProps {
    node: EllipseNode;
    isSelected: boolean; // 현재 노드가 선택된 상태인지 여부
    onSelect: (id: number) => void; // 노드를 선택하는 콜백
    onRemove: (id: number) => void; // 노드를 삭제하는 콜백
    onChange: (id: number, updatedNode: Partial<EllipseNode>) => void; // 노드 정보 수정 콜백
    onDeselectAll: () => void; //모든 선택 해제 콜백
}

let globalContextMenuVisibleId: number | null = null; // 전역 상태로 메뉴 표시 ID 관리

function Ellipse({ node, isSelected, onSelect, onRemove, onChange }: EllipseProps) {
    const {
        id,
        text,
        width = 120,
        height = 60,
        borderThickness = 2,
        borderColor = 'black',
        backgroundColor = 'white',
    } = node;

    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [isEditing, setIsEditing] = useState(false);

    const handleInputChange = (value: string) => {
        onChange(id, { text: value });
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();

        onSelect(id);

        // 다른 메뉴 닫기
        if (globalContextMenuVisibleId !== null && globalContextMenuVisibleId !== id) {
            const event = new CustomEvent('closeContextMenu');
            document.dispatchEvent(event);
        }

        globalContextMenuVisibleId = id; // 현재 메뉴 ID 설정

        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = 10;
        const offsetY = 10;
        setContextMenuPosition({ x: e.clientX - rect.left + offsetX, y: e.clientY - rect.top + offsetY });
        setContextMenuVisible(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.context-menu') && !(e.target as HTMLElement).closest('.button')) {
                setContextMenuVisible(false); // 클릭 시 컨텍스트 메뉴 닫기
                globalContextMenuVisibleId = null; // 전역 메뉴 ID 초기화
            }
        };

        const handleGlobalContextMenuClose = () => {
            setContextMenuVisible(false); // 전역 이벤트로 메뉴 닫기
            globalContextMenuVisibleId = null; // 전역 메뉴 ID 초기화
        };

        if (contextMenuVisible) {
            document.addEventListener('click', handleClickOutside);
            document.addEventListener('closeContextMenu', handleGlobalContextMenuClose); // 전역 닫기 이벤트 추가
        } else {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('closeContextMenu', handleGlobalContextMenuClose); // 전역 닫기 이벤트 제거
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('closeContextMenu', handleGlobalContextMenuClose);
        };
    }, [contextMenuVisible]);

    return (
        <div
            className={`relative flex items-center justify-center border ${
                isSelected ? 'ring-2 ring-blue-500' : ''
            }`}
            style={{
                width: `${width}px`,
                height: `${height}px`,
                borderWidth: `${borderThickness}px`,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                borderRadius: '50%',
                cursor: 'pointer',
            }}
            onClick={(e) => {
                e.stopPropagation(); // 수정: 이벤트 전파 방지
                onSelect(id);
                setIsEditing(true);
            }}
            onContextMenu={(e) => {
                e.stopPropagation(); // 수정: 이벤트 전파 방지
                handleContextMenu(e);
            }}
        >
            {isEditing ? (
                <input
                    type="text"
                    value={text}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onBlur={handleBlur}
                    autoFocus
                    className="w-full h-full text-center bg-transparent outline-none"
                    style={{
                        border: 'none',
                        fontSize: '14px',
                        color: 'black',
                    }}
                />
            ) : (
                <span
                    className="text-center"
                    style={{
                        fontSize: '14px',
                        color: 'black',
                        pointerEvents: 'none',
                    }}
                >
                    {text}
                </span>
            )}

            {/* 우클릭 메뉴 */}
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
                                globalContextMenuVisibleId = null; // 수정: 메뉴 ID 초기화
                            }}
                        >
                            삭제
                        </li>
                        <li
                            className="cursor-pointer hover:bg-gray-200 px-2 py-1"
                            onClick={() => {
                                setContextMenuVisible(false);
                                globalContextMenuVisibleId = null; // 수정: 메뉴 ID 초기화
                            }}
                        >
                            취소
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
}

export default Ellipse;
