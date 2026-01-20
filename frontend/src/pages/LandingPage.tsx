/**
 * Landing Page
 * Premium hero with BlurText animation
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import BlurText from '../components/animations/BlurText';
import './LandingPage.css';

// Premium SVG Icons
const Icons = {
    Music: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
        </svg>
    ),
    Analytics: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
        </svg>
    ),
    Moon: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    ),
    ArrowRight: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    ),
    Github: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
        </svg>
    )
};

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="landing-page">
            {/* Animated Background */}
            <div className="landing-page__bg">
                <div className="landing-page__orb landing-page__orb--1" />
                <div className="landing-page__orb landing-page__orb--2" />
                <div className="landing-page__orb landing-page__orb--3" />
                <div className="landing-page__grid" />
            </div>

            {/* Main Content */}
            <div className="landing-page__container">
                <div className="landing-page__content">
                    {/* Logo with Blur Animation */}
                    <div className="landing-page__logo">
                        <BlurText
                            text="SONIQ"
                            delay={150}
                            animateBy="characters"
                            direction="top"
                            className="landing-page__title"
                            stepDuration={0.4}
                        />
                    </div>

                    {/* Tagline */}
                    <div className="landing-page__tagline-wrapper">
                        <BlurText
                            text="Your Personal Listening Observatory"
                            delay={50}
                            animateBy="words"
                            direction="bottom"
                            className="landing-page__tagline"
                            threshold={0}
                        />
                    </div>

                    {/* Features */}
                    <motion.div
                        className="landing-page__features"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0, duration: 0.8 }}
                    >
                        <div className="landing-page__feature">
                            <span className="landing-page__feature-icon"><Icons.Music /></span>
                            <span>ML-Powered Genre Detection</span>
                        </div>
                        <div className="landing-page__feature-divider" />
                        <div className="landing-page__feature">
                            <span className="landing-page__feature-icon"><Icons.Analytics /></span>
                            <span>Listening Analytics</span>
                        </div>
                        <div className="landing-page__feature-divider" />
                        <div className="landing-page__feature">
                            <span className="landing-page__feature-icon"><Icons.Moon /></span>
                            <span>Dark Mode</span>
                        </div>
                    </motion.div>

                    {/* CTA Buttons */}
                    <motion.div
                        className="landing-page__actions"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.4, duration: 0.8 }}
                    >
                        <button
                            className="landing-page__btn landing-page__btn--primary"
                            onClick={() => navigate('/signin')}
                        >
                            <span>Enter Observatory</span>
                            <Icons.ArrowRight />
                        </button>
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="landing-page__btn landing-page__btn--secondary"
                        >
                            <Icons.Github />
                            <span>View on GitHub</span>
                        </a>
                    </motion.div>

                    {/* Footer */}
                    <motion.div
                        className="landing-page__footer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.8, duration: 1 }}
                    >
                        <p className="landing-page__footer-badge">Educational AIML Lab Project</p>
                        <p>Your listening patterns become research data</p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
