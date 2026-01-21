import { useNavigate } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';
import VerticalDock from '../common/VerticalDock';
import {
    VscHome,
    VscLibrary,
    VscCloudUpload,
    VscGraph,
    VscAccount,
    VscSignIn,
    VscSignOut
} from 'react-icons/vsc';
import './Sidebar.css';

// Define types for Home views
export type ViewType = 'nowPlaying' | 'metrics' | 'analysis' | 'playlists';

interface SidebarProps {
    activeView: ViewType;
    onViewChange: (view: ViewType) => void;
    onUploadClick: () => void;
}

export default function Sidebar({ activeView, onViewChange, onUploadClick }: SidebarProps) {
    const navigate = useNavigate();
    const { session, clearSession } = useSession();

    // Helper to determine active state (either via prop or route)
    // We prioritize the prop for the SPA-like Home views
    const isItemActive = (viewName: ViewType) => activeView === viewName;

    const items = [
        {
            icon: <VscHome />,
            label: 'Home',
            onClick: () => onViewChange('nowPlaying'),
            className: isItemActive('nowPlaying') ? 'dock-item--active' : ''
        },
        {
            icon: <VscGraph />,
            label: 'Analysis',
            onClick: () => onViewChange('analysis'),
            className: isItemActive('analysis') ? 'dock-item--active' : ''
        },
        {
            icon: <VscLibrary />,
            label: 'Library',
            onClick: () => onViewChange('playlists'),
            className: isItemActive('playlists') ? 'dock-item--active' : ''
        },
        {
            icon: <VscCloudUpload />,
            label: 'Upload',
            onClick: onUploadClick,
            className: ''
        },
    ];

    // Auth items
    if (session.user) {
        items.push({
            icon: <VscAccount />,
            label: 'Profile',
            onClick: () => onViewChange('metrics'),
            className: isItemActive('metrics') ? 'dock-item--active' : ''
        });
        items.push({
            icon: <VscSignOut />,
            label: 'Logout',
            onClick: () => {
                clearSession();
                navigate('/login');
            },
            className: ''
        });
    } else {
        items.push({
            icon: <VscSignIn />,
            label: 'Login',
            onClick: () => navigate('/login'),
            className: '' // Login doesn't map to a ViewType easily unless we add it
        });
    }

    return (
        <div className="sidebar-container">
            <VerticalDock
                items={items}
                panelWidth={68}
                baseItemSize={48}
                magnification={70} // Adjusted to 70
                distance={140}
            />
        </div>
    );
}
