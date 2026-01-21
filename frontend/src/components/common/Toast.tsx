import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    onClose: (id: string) => void;
}

export default function Toast({ id, message, type, duration = 3000, onClose }: ToastProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    useEffect(() => {
        if (isExiting) {
            const timer = setTimeout(() => {
                onClose(id);
            }, 300); // Match CSS animation duration
            return () => clearTimeout(timer);
        }
    }, [isExiting, onClose, id]);

    return (
        <div className={`toast toast--${type} ${isExiting ? 'toast--exit' : 'toast--enter'}`}>
            <div className="toast__icon">
                {type === 'success' && '✅'}
                {type === 'error' && '❌'}
                {type === 'info' && 'ℹ️'}
            </div>
            <div className="toast__message">{message}</div>
            <button className="toast__close" onClick={() => setIsExiting(true)}>×</button>
        </div>
    );
}

export const ToastContainer = ({ children }: { children: React.ReactNode }) => {
    return ReactDOM.createPortal(
        <div className="toast-container">
            {children}
        </div>,
        document.body
    );
};
