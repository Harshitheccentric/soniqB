import { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import api from '../../api/musicApi';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import WormholeCreator from '../wormhole/WormholeCreator';
import './SonicUniverse.css';

// Define the shape of our universe data
interface UniverseNode {
    id: number;
    title: string;
    artist: string;
    genre: string;
    position: [number, number, number];
    color: string;
}

// Individual Star Component
function StarNode({
    node,
    onHover,
    onClick,
    highlighted
}: {
    node: UniverseNode;
    onHover: (node: UniverseNode | null) => void;
    onClick: (node: UniverseNode) => void;
    highlighted?: boolean;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame(() => {
        if (meshRef.current) {
            // Gentle pulsing animation
            const targetScale = hovered || highlighted ? 1.8 : 1.0;
            const currentScale = meshRef.current.scale.x;
            const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
            meshRef.current.scale.set(newScale, newScale, newScale);

            // Rotate slightly
            meshRef.current.rotation.x += 0.01;
            meshRef.current.rotation.y += 0.01;
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={node.position}
            onClick={(e) => {
                e.stopPropagation();
                onClick(node);
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                onHover(node);
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                setHovered(false);
                onHover(null);
                document.body.style.cursor = 'auto';
            }}
        >
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial
                color={highlighted ? '#ffffff' : node.color}
                emissive={highlighted ? '#ffffff' : node.color}
                emissiveIntensity={hovered || highlighted ? 2 : 0.5}
                roughness={0.2}
                metalness={0.8}
            />
        </mesh>
    );
}

// Path Visualization Component - Smooth Curve
function WormholePath({ points }: { points: [number, number, number][] }) {
    const curvePoints = useMemo(() => {
        if (points.length < 2) return [];

        // Create a smooth curve through all points
        const curve = new THREE.CatmullRomCurve3(
            points.map(p => new THREE.Vector3(...p)),
            false, // closed
            'catmullrom',
            0.5 // tension
        );

        // Get 50 points along the curve for smooth rendering
        return curve.getPoints(50).map(p => [p.x, p.y, p.z] as [number, number, number]);
    }, [points]);

    if (curvePoints.length < 2) return null;

    return (
        <Line
            points={curvePoints}
            color="#6fffb0"
            lineWidth={3}
            transparent
            opacity={0.8}
            dashed={false}
        />
    );
}

// Scene Component
function UniverseScene({
    data,
    onHover,
    onClick,
    startNode,
    endNode,
    path
}: {
    data: UniverseNode[];
    onHover: (node: UniverseNode | null) => void;
    onClick: (node: UniverseNode) => void;
    startNode: UniverseNode | null;
    endNode: UniverseNode | null;
    path: UniverseNode[];
}) {
    // Generate path points
    const pathPoints = useMemo(() => {
        return path.map(node => node.position);
    }, [path]);

    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            {/* Render Wormhole Path */}
            <WormholePath points={pathPoints} />

            {data.map((node) => (
                <StarNode
                    key={node.id}
                    node={node}
                    onHover={onHover}
                    onClick={onClick}
                    highlighted={node.id === startNode?.id || node.id === endNode?.id}
                />
            ))}

            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                autoRotate={!startNode && !endNode} // Stop rotation when interacting
                autoRotateSpeed={0.5}
                minDistance={5}
                maxDistance={50}
                target={[0, 5, 0]}
            />
        </>
    );
}

export default function SonicUniverse() {
    const [data, setData] = useState<UniverseNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredNode, setHoveredNode] = useState<UniverseNode | null>(null);
    const { play, setQueue } = useAudioPlayer();

    // Wormhole State
    const [wormholeMode, setWormholeMode] = useState(false);
    const [selectionMode, setSelectionMode] = useState<'start' | 'end' | null>(null);
    const [startNode, setStartNode] = useState<UniverseNode | null>(null);
    const [endNode, setEndNode] = useState<UniverseNode | null>(null);
    const [path, setPath] = useState<UniverseNode[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await api.get('/universe');
                setData(response.data);
            } catch (error) {
                console.error('Failed to fetch universe data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleNodeClick = (node: UniverseNode) => {
        if (wormholeMode && selectionMode) {
            // Selection Logic
            if (selectionMode === 'start') {
                setStartNode(node);
                setSelectionMode(null); // Auto deselect after picking
            } else if (selectionMode === 'end') {
                setEndNode(node);
                setSelectionMode(null);
            }
        } else {
            // Default Play Logic
            api.get(`/tracks/${node.id}`).then(res => {
                const track = res.data;

                // If we have a path, play the path!
                if (path.length > 0) {
                    // Convert path nodes to tracks (pseudo)
                    // In reality, we'd need to fetch full track data or assumes props match
                    // For now, just play the clicked one
                    setQueue([track], 0);
                    play(track);
                } else {
                    setQueue([track], 0);
                    play(track);
                }
            });
        }
    };

    const handleWormholeGenerate = (generatedPathTracks: any[]) => {
        // Map generated tracks back to UniverseNodes to get positions
        // We need to find the node in 'data' that matches the track ID
        const mappedPath = generatedPathTracks.map(track => {
            return data.find(n => n.id === track.id);
        }).filter(n => n !== undefined) as UniverseNode[];

        setPath(mappedPath);

        // Also queue up the playlist!
        setQueue(generatedPathTracks, 0);
        play(generatedPathTracks[0]);
    };

    const closeWormhole = () => {
        setWormholeMode(false);
        setSelectionMode(null);
        setStartNode(null);
        setEndNode(null);
        setPath([]);
    };

    return (
        <div className="sonic-universe">
            {loading && <div className="sonic-universe__loading">Loading Universe...</div>}

            {!loading && (
                <>
                    <Canvas
                        camera={{ position: [0, 5, 35], fov: 60 }}
                        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                    >
                        <UniverseScene
                            data={data}
                            onHover={setHoveredNode}
                            onClick={handleNodeClick}
                            startNode={startNode}
                            endNode={endNode}
                            path={path}
                        />
                    </Canvas>

                    {/* Wormhole Creator Overlay */}
                    {wormholeMode ? (
                        <WormholeCreator
                            startNode={startNode}
                            endNode={endNode}
                            selectionMode={selectionMode}
                            onSetSelectionMode={setSelectionMode}
                            onGenerate={handleWormholeGenerate}
                            onClose={closeWormhole}
                            path={path}
                        />
                    ) : (
                        <button
                            className="wormhole-toggle-btn"
                            onClick={() => setWormholeMode(true)}
                        >
                            Open Wormhole
                        </button>
                    )}
                </>
            )}

            {hoveredNode && (
                <div className="sonic-universe__tooltip">
                    <h3>{hoveredNode.title}</h3>
                    <p>{hoveredNode.artist}</p>
                    <div style={{ marginTop: '8px', fontSize: '10px', color: hoveredNode.color }}>
                        {hoveredNode.genre} Cluster
                    </div>
                    {wormholeMode && selectionMode && (
                        <div style={{ marginTop: 8, color: '#6fffb0', fontWeight: 'bold' }}>
                            Click to set {selectionMode}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

