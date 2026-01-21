import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './ContextMenu.css';

interface ContextMenuProps {
    x: number;
    y: number;
    visible: boolean;
    onClose: () => void;
    items: { label: string; onClick: () => void; icon?: React.ReactNode; divider?: boolean }[];
}

export default function ContextMenu({ x, y, visible, onClose, items }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (visible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    // Adjust position if it goes off screen
    const style: React.CSSProperties = {
        top: y,
        left: x,
    };

    // Simple boundary check (can be improved)
    if (x + 200 > window.innerWidth) {
        style.left = x - 200;
    }
    if (y + items.length * 40 > window.innerHeight) {
        style.top = y - items.length * 40;
    }

    return ReactDOM.createPortal(
        <div
            ref={menuRef}
            className="context-menu"
            style={style}
        >
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {item.divider && <div className="context-menu-divider" />}
                    <div className="context-menu-item" onClick={() => { item.onClick(); onClose(); }}>
                        {item.icon && <span className="context-menu-icon">{item.icon}</span>}
                        {item.label}
                    </div>
                </React.Fragment>
            ))}
        </div>,
        document.body
    );
}
