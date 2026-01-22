'use client';

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';
import './VerticalDock.css';

interface DockItemProps {
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
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
            {Children.map(children, child => cloneElement(child as React.ReactElement<any>, { isHovered }))}
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
    baseItemSize?: number;
    // Gooey Props
    particleCount?: number;
    particleDistances?: number[];
    particleR?: number;
    animationTime?: number;
    timeVariance?: number;
    colors?: number[];
}

export default function VerticalDock({
    items,
    className = '',
    spring = { mass: 0.1, stiffness: 150, damping: 12 },
    magnification = 70,
    distance = 200,
    panelWidth = 68,
    baseItemSize = 50,
    // Gooey defaults
    particleCount = 12,
    particleDistances = [50, 10],
    particleR = 40, // Slightly reduced radius
    animationTime = 600,
    timeVariance = 200
}: DockProps) {
    const mouseY = useMotionValue(Infinity);
    const isHovered = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const particleLayerRef = useRef<HTMLDivElement>(null); // Dedicated layer

    const maxWidth = useMemo(
        () => magnification + 24,
        [magnification]
    );

    const widthRow = useTransform(isHovered, [0, 1], [panelWidth, maxWidth]);
    const width = useSpring(widthRow, spring);

    // --- Gooey Particle Logic ---
    const colors = [1, 2, 3];

    const noise = (n = 1) => n / 2 - Math.random() * n;

    const getXY = (distance: number, pointIndex: number, totalPoints: number) => {
        const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
        return [distance * Math.cos(angle), distance * Math.sin(angle)];
    };

    const createParticle = (i: number, t: number, d: number[], r: number) => {
        let rotate = noise(r / 10);
        return {
            start: getXY(d[0], particleCount - i, particleCount),
            end: getXY(d[1] + noise(7), particleCount - i, particleCount),
            time: t,
            scale: 1 + noise(0.2),
            color: colors[Math.floor(Math.random() * colors.length)],
            rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
        };
    };

    const spawnParticles = (target: HTMLElement) => {
        if (!particleLayerRef.current || !containerRef.current) return;

        // Calculate positions relative to the container
        const containerRect = containerRef.current.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        // Center of the clicked item relative to container
        const centerX = (targetRect.left - containerRect.left) + targetRect.width / 2;
        const centerY = (targetRect.top - containerRect.top) + targetRect.height / 2;

        const d = particleDistances;
        const r = particleR;

        for (let i = 0; i < particleCount; i++) {
            const t = animationTime * 2 + noise(timeVariance * 2);
            const p = createParticle(i, t, d, r);

            setTimeout(() => {
                const particle = document.createElement('span');
                const point = document.createElement('span');
                particle.classList.add('particle');

                // Adjust coordinates to be relative to the center of the clicked item
                particle.style.setProperty('--start-x', `${centerX + p.start[0]}px`);
                particle.style.setProperty('--start-y', `${centerY + p.start[1]}px`);
                particle.style.setProperty('--end-x', `${centerX + p.end[0]}px`);
                particle.style.setProperty('--end-y', `${centerY + p.end[1]}px`);
                particle.style.setProperty('--time', `${p.time}ms`);
                particle.style.setProperty('--scale', `${p.scale}`);
                particle.style.setProperty('--color', i % 2 === 0 ? '#6366f1' : '#a5b4fc');

                point.classList.add('point');
                particle.appendChild(point);

                // Append to the dedicated layer
                if (particleLayerRef.current) {
                    particleLayerRef.current.appendChild(particle);
                }

                // Cleanup
                setTimeout(() => {
                    try {
                        if (particleLayerRef.current?.contains(particle)) {
                            particleLayerRef.current.removeChild(particle);
                        }
                    } catch (e) {/* ignore */ }
                }, t);
            }, i * 15); // Faster stagger
        }
    };

    const handleItemClick = (e: React.MouseEvent, originalClick?: () => void) => {
        // ALWAYS execute the navigation logic first - don't catch errors here
        if (originalClick) {
            originalClick();
        }

        // Then do visuals - catch errors only for particle animation
        try {
            const target = e.currentTarget as HTMLElement;
            spawnParticles(target);
        } catch (err) {
            console.error("Particle error:", err);
        }
    };

    return (
        <motion.div
            ref={containerRef}
            style={{ width: panelWidth, scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            className="dock-outer"
        >
            {/* SVG Filter Definition */}
            <svg className="goo-filter-svg">
                <defs>
                    <filter id="goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>

            {/* Particle Layer - Filter applied HERE, not on the buttons */}
            <div ref={particleLayerRef} className="particle-layer" style={{ filter: "url('#goo')" }}></div>

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
                        onClick={(e) => handleItemClick(e, item.onClick)}
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
