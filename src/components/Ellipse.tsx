import React, { useState } from 'react'

export interface EllipseNode {
    id: number;
    text: string;
    width: number;
    height: number;
    borderThickness: number;
    borderColor: string;
}

// 부모(Home.tsx)에서 전달받을 Prop 타입 정의
interface EllipseProps {
    node: EllipseNode;
    isSelected: boolean; // 현재 노드가 선택된 상태인지 여부
    onSelect: (id: number) => void; // 노드를 선택하는 콜백
    onRemove: (id: number) => void; // 노드를 삭제하는 콜백
    onChange: (id: number, updatedNode: Partial<EllipseNode>) => void; // 노드 정보 수정 콜백
}

function Ellipse({ node, isSelected, onSelect, onRemove, onChange }: EllipseProps) {
    const {
        id,
        text,
        width,
        height,
        borderThickness,
        borderColor
    } = node;

    const handleInputChange = (field: keyof EllipseNode, value: string | number) => {
        onChange(id, { [field]: value });
    }

    return (
        <div
            className={`border rounded-md p-4 m-2 shadow bg-white ${
                isSelected ? 'ring-2 ring-blue-400' : ''
            }`}
        >

            <div className='flex items-center justify-between mb-4'>
                <button
                    onClick={() => onSelect(id)}
                    className={`px-3 py-1 mr-2 rounded ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'
                    }`}
                >
                    {isSelected ? '선택됨' : '선택'}
                </button>
                <button
                    onClick={() => onRemove(id)}
                    className='px-3 py-3 rounded bg-red-500 text-white hover:bg-red-600'
                >
                    제거
                </button>
            </div>

            {/* 미리보기(타원) */}
            <div
                className="flex items-center justify-center text-center mb-4"
                style={{
                width: `${width}px`,
                height: `${height}px`,
                border: `${borderThickness}px solid ${borderColor}`,
                borderRadius: '9999px',
                overflow: 'hidden',
                }}
            >
                <span className="px-2 text-sm text-gray-700 break-all">
                    {text || '내용 없음'}
                </span>
            </div>

            {/* 노드(타원) 설정 */}
            <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col text-sm">
                    <span className="font-medium mb-1">Text</span>
                    <textarea
                        className="border border-gray-300 rounded px-2 py-1"
                        value={text}
                        onChange={(e) => handleInputChange('text', e.target.value)}
                    />
                </label>

                <label className="flex flex-col text-sm">
                    <span className="font-medium mb-1">너비(px)</span>
                    <input
                        type="number"
                        className="border border-gray-300 rounded px-2 py-1"
                        value={width}
                        onChange={(e) => handleInputChange('width', Number(e.target.value))}
                    />
                </label>

                <label className="flex flex-col text-sm">
                    <span className="font-medium mb-1">높이(px)</span>
                    <input
                        type="number"
                        className="border border-gray-300 rounded px-2 py-1"
                        value={height}
                        onChange={(e) => handleInputChange('height', Number(e.target.value))}
                    />
                </label>

                <label className="flex flex-col text-sm">
                    <span className="font-medium mb-1">테두리 두께(px)</span>
                    <input
                        type="number"
                        className="border border-gray-300 rounded px-2 py-1"
                        value={borderThickness}
                        onChange={(e) => handleInputChange('borderThickness', Number(e.target.value))}
                    />
                </label>

                <label className="flex flex-col text-sm">
                    <span className="font-medium mb-1">테두리 색상</span>
                    <input
                        type="color"
                        className="border border-gray-300 rounded w-10 h-10 p-0"
                        value={borderColor}
                        onChange={(e) => handleInputChange('borderColor', e.target.value)}
                    />
                </label>
            </div>        
        </div>
    );
}

export default Ellipse;
