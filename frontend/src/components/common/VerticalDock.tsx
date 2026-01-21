'use client';

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';
import './VerticalDock.css';

interface DockItemProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    mouseY: any; // MotionValue
    spring: any;
    distance: number;
    magnification: number;
    baseItemSize: number;
}

function DockItem({ children, className = '', onClick, mouseY, spring, distance, magnification, baseItemSize }: DockItemProps) {
    const ref = useRef<HTMLDivElement>(null);
    const isHovered = useMotionValue(0);

    const mouseDistance = useTransform(mouseY, (val: number) => {
        const rect = ref.current?.getBoundingClientRect() ?? {
            y: 0,
            height: baseItemSize
        };
        return val - rect.y - baseItemSize / 2;
    });

    const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
    const size = useSpring(targetSize, spring);

    return (
        <motion.div
            ref={ref}
            style={{
                width: size,
                height: size
            }}
            onHoverStart={() => isHovered.set(1)}
            onHoverEnd={() => isHovered.set(0)}
            onFocus={() => isHovered.set(1)}
            onBlur={() => isHovered.set(0)}
            onClick={onClick}
            className={`dock-item ${className}`}
            tabIndex={0}
            role="button"
            aria-haspopup="true"
        >
            {Children.map(children, child => cloneElement(child as React.ReactElement, { isHovered }))}
        </motion.div>
    );
}

function DockLabel({ children, className = '', ...rest }: any) {
    const { isHovered } = rest;
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = isHovered.on('change', (latest: number) => {
            setIsVisible(latest === 1);
        });
        return () => unsubscribe();
    }, [isHovered]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 20 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className={`dock-label ${className}`}
                    role="tooltip"
                    style={{ position: 'absolute', left: '100%', top: '50%', y: '-50%', zIndex: 100 }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function DockIcon({ children, className = '' }: { children: React.ReactNode, className?: string }) {
    return <div className={`dock-icon ${className}`}>{children}</div>;
}

interface DockProps {
    items: { icon: React.ReactNode; label: string; onClick?: () => void; className?: string }[];
    className?: string;
    spring?: { mass: number; stiffness: number; damping: number };
    magnification?: number;
    distance?: number;
    panelWidth?: number;
    dockWidth?: number;
    baseItemSize?: number;
}

export default function VerticalDock({
    items,
    className = '',
    spring = { mass: 0.1, stiffness: 150, damping: 12 },
    magnification = 70,
    distance = 200,
    panelWidth = 68,
    dockWidth = 256, // Not strictly used for sizing container in same way, but kept for Logic
    baseItemSize = 50
}: DockProps) {
    const mouseY = useMotionValue(Infinity);
    const isHovered = useMotionValue(0);

    const maxWidth = useMemo(
        // Calculate max width based on magnification plus some padding/buffer.
        // Previously it was magnification + magnification/2 which was too wide.
        () => magnification + 24,
        [magnification]
    );

    // Animate width of the dock panel from base panelWidth to expanded maxWidth when hovered
    const widthRow = useTransform(isHovered, [0, 1], [panelWidth, maxWidth]);
    const width = useSpring(widthRow, spring);

    return (
        <motion.div style={{ width: panelWidth, scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="dock-outer">
            {/* Note: The outer div maintains space. The inner div animates? 
           Actually, usually the Dock floats. 
           Let's make the container animate width so it pushes content or overlaps?
           If it's floating, let's just animate the panel.
       */}
            <motion.div
                onMouseMove={({ pageY }) => {
                    isHovered.set(1);
                    mouseY.set(pageY);
                }}
                onMouseLeave={() => {
                    isHovered.set(0);
                    mouseY.set(Infinity);
                }}
                className={`dock-panel ${className}`}
                style={{ width: width }}
                role="toolbar"
                aria-label="Application dock"
            >
                {items.map((item, index) => (
                    <DockItem
                        key={index}
                        onClick={item.onClick}
                        className={item.className}
                        mouseY={mouseY}
                        spring={spring}
                        distance={distance}
                        magnification={magnification}
                        baseItemSize={baseItemSize}
                    >
                        <DockIcon>{item.icon}</DockIcon>
                        <DockLabel>{item.label}</DockLabel>
                    </DockItem>
                ))}
            </motion.div>
        </motion.div>
    );
}
