/**
 * InteractiveBackground Component
 * Cursor-following gradient spotlight and particle trail
 * Fixed to track mouse on entire viewport
 */

import { useEffect, useRef, useState } from 'react';
import './InteractiveBackground.css';

interface Point {
    x: number;
    y: number;
    opacity: number;
    scale: number;
}

export default function InteractiveBackground() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [trail, setTrail] = useState<Point[]>([]);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        // Track mouse on the whole document
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
            setIsHovering(true);

            // Add point to trail
            setTrail(prev => {
                const newTrail = [...prev, { x: e.clientX, y: e.clientY, opacity: 1, scale: 1 }];
                // Keep only last 15 points
                return newTrail.slice(-15);
            });
        };

        const handleMouseLeave = () => {
            setIsHovering(false);
        };

        // Attach to document for full page tracking
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        // Fade trail over time
        const fadeInterval = setInterval(() => {
            setTrail(prev =>
                prev
                    .map(p => ({ ...p, opacity: p.opacity - 0.1, scale: p.scale * 0.9 }))
                    .filter(p => p.opacity > 0)
            );
        }, 50);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
            clearInterval(fadeInterval);
        };
    }, []);

    return (
        <div ref={containerRef} className="interactive-bg">
            {/* Cursor Spotlight */}
            <div
                className={`interactive-bg__spotlight ${isHovering ? 'interactive-bg__spotlight--active' : ''}`}
                style={{
                    left: mousePos.x,
                    top: mousePos.y,
                }}
            />

            {/* Particle Trail */}
            {trail.map((point, i) => (
                <div
                    key={i}
                    className="interactive-bg__particle"
                    style={{
                        left: point.x,
                        top: point.y,
                        opacity: point.opacity,
                        transform: `translate(-50%, -50%) scale(${point.scale})`,
                    }}
                />
            ))}

            {/* Grid Pattern */}
            <div className="interactive-bg__grid" />

            {/* Ambient Orbs (static, subtle) */}
            <div className="interactive-bg__orb interactive-bg__orb--1" />
            <div className="interactive-bg__orb interactive-bg__orb--2" />
        </div>
    );
}
