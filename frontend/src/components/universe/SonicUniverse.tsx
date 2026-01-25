import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import axios from 'axios';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
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
    onClick
}: {
    node: UniverseNode;
    onHover: (node: UniverseNode | null) => void;
    onClick: (node: UniverseNode) => void;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    useFrame(() => {
        if (meshRef.current) {
            // Gentle pulsing animation
            const scale = hovered ? 1.5 : 1.0;
            meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);

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
            onPointerOut={(e) => {
                setHovered(false);
                onHover(null);
                document.body.style.cursor = 'auto';
            }}
        >
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial
                color={node.color}
                emissive={node.color}
                emissiveIntensity={hovered ? 2 : 0.5}
                roughness={0.2}
                metalness={0.8}
            />
        </mesh>
    );
}

// Scene Component
function UniverseScene({
    data,
    onHover,
    onPlay
}: {
    data: UniverseNode[];
    onHover: (node: UniverseNode | null) => void;
    onPlay: (node: UniverseNode) => void;
}) {
    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1.5} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            {data.map((node) => (
                <StarNode
                    key={node.id}
                    node={node}
                    onHover={onHover}
                    onClick={onPlay}
                />
            ))}

            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                autoRotate={true}
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

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await axios.get('http://localhost:8000/universe');
                setData(response.data);
            } catch (error) {
                console.error('Failed to fetch universe data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const handlePlayNode = (node: UniverseNode) => {
        // In a real app, you might want to find the full track object from the main library
        // For now, we'll optimistically construct a Track object or fetch it
        // Assuming we can just play by ID if the library is loaded, 
        // but the AudioPlayer expects a full Track object.

        // We need to fetch the full track details or find it in a global store.
        // OPTION: Just hit the tracks endpoint to find it, or pass enough info.
        // Let's do a quick fetch for specific track to ensure playability
        axios.get(`http://localhost:8000/tracks/${node.id}`).then(res => {
            const track = res.data;
            // Create a queue of 1 for now, or maybe queue neighbors?
            setQueue([track], 0);
            play(track);
        });
    };

    return (
        <div className="sonic-universe">
            {loading && <div className="sonic-universe__loading">Loading Universe...</div>}

            {!loading && (
                <Canvas
                    camera={{ position: [0, 5, 35], fov: 60 }}
                    style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                >
                    <UniverseScene
                        data={data}
                        onHover={setHoveredNode}
                        onPlay={handlePlayNode}
                    />
                </Canvas>
            )}

            {hoveredNode && (
                <div className="sonic-universe__tooltip">
                    <h3>{hoveredNode.title}</h3>
                    <p>{hoveredNode.artist}</p>
                    <div style={{ marginTop: '8px', fontSize: '10px', color: hoveredNode.color }}>
                        {hoveredNode.genre} Cluster
                    </div>
                </div>
            )}
        </div>
    );
}
