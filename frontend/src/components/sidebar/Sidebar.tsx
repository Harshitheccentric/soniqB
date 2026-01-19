/**
 * Sidebar Component - Premium Edition
 * Navigation panel with proper SVG icons
 */

import './Sidebar.css';

export type ViewType = 'nowPlaying' | 'metrics' | 'playlists';

interface SidebarProps {
    activeView: ViewType;
    onViewChange: (view: ViewType) => void;
}

// Premium SVG Icons
const icons = {
    nowPlaying: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
        </svg>
    ),
    metrics: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
        </svg>
    ),
    playlists: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15V6" />
            <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path d="M12 12H3" />
            <path d="M16 6H3" />
            <path d="M12 18H3" />
        </svg>
    ),
};

interface NavItem {
    id: ViewType;
    icon: React.ReactNode;
    label: string;
}

const navItems: NavItem[] = [
    { id: 'nowPlaying', icon: icons.nowPlaying, label: 'Now Playing' },
    { id: 'metrics', icon: icons.metrics, label: 'Analytics' },
    { id: 'playlists', icon: icons.playlists, label: 'Library' },
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
    return (
        <aside className="sidebar">
            <div className="sidebar__brand">
                <div className="sidebar__brand-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 8C8 8 10 12 12 12C14 12 16 8 16 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M8 12C8 12 10 16 12 16C14 16 16 12 16 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
                <span className="sidebar__brand-text">SoniqB</span>
            </div>

            <nav className="sidebar__nav">
                <div className="sidebar__nav-label">Menu</div>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        className={`sidebar__item ${activeView === item.id ? 'sidebar__item--active' : ''}`}
                        onClick={() => onViewChange(item.id)}
                        aria-current={activeView === item.id ? 'page' : undefined}
                    >
                        <span className="sidebar__icon">{item.icon}</span>
                        <span className="sidebar__label">{item.label}</span>
                        {activeView === item.id && <span className="sidebar__active-dot" />}
                    </button>
                ))}
            </nav>

            <div className="sidebar__footer">
                <div className="sidebar__version">v2.0</div>
            </div>
        </aside>
    );
}
