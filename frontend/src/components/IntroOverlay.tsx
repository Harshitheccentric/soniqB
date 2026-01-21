import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FaPlay } from 'react-icons/fa';
import './IntroOverlay.css';

interface IntroOverlayProps {
    onComplete: () => void;
}

export default function IntroOverlay({ onComplete }: IntroOverlayProps) {
    const [isVisible, setIsVisible] = useState(true);

    const handlePlay = () => {
        setIsVisible(false);
        // Delay callback slightly to allow exit animation to start
        setTimeout(onComplete, 800);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="intro-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                >
                    <motion.div
                        className="intro-content"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                    >
                        <h1 className="intro-title">SoniqB</h1>
                        <p className="intro-subtitle">Intelligent Audio Experience</p>

                        <motion.button
                            className="intro-play-btn"
                            onClick={handlePlay}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <FaPlay className="play-icon" />
                        </motion.button>
                        <p className="intro-hint">Click to Enter</p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
