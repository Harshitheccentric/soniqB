import { useNavigate, useLocation } from 'react-router-dom';
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

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { session, clearSession } = useSession();

    // Helper to determine if a route is active
    const isActive = (path: string) => location.pathname === path;

    const items = [
        {
            icon: <VscHome />,
            label: 'Home',
            onClick: () => navigate('/home'),
            className: isActive('/home') ? 'dock-item--active' : ''
        },
        {
            icon: <VscGraph />,
            label: 'Analysis',
            onClick: () => navigate('/analysis'),
            className: isActive('/analysis') ? 'dock-item--active' : ''
        },
        {
            icon: <VscLibrary />,
            label: 'Library',
            onClick: () => navigate('/library'),
            className: isActive('/library') ? 'dock-item--active' : ''
        },
        {
            icon: <VscCloudUpload />,
            label: 'Upload',
            onClick: () => navigate('/upload'),
            className: isActive('/upload') ? 'dock-item--active' : ''
        },
    ];

    // Auth items
    if (session.user) {
        items.push({
            icon: <VscAccount />,
            label: 'Profile',
            onClick: () => navigate('/profile'),
            className: isActive('/profile') ? 'dock-item--active' : ''
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
            className: isActive('/login') ? 'dock-item--active' : ''
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
