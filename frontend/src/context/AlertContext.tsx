import React, { createContext, useContext, useState, useCallback } from 'react';
import GlobalAlertDialog, { type AlertAction } from '../components/common/GlobalAlertDialog';

interface AlertOptions {
    title: string;
    description: string;
    cancelLabel?: string; // If undefined, no cancel button (info mode)
    actions?: AlertAction[]; // If undefined, defaults to one 'OK' button
}

interface AlertContextType {
    showAlert: (options: AlertOptions) => void;
    closeAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [config, setConfig] = useState<AlertOptions>({ title: '', description: '' });

    const showAlert = useCallback((options: AlertOptions) => {
        setConfig(options);
        setOpen(true);
    }, []);

    const closeAlert = useCallback(() => {
        setOpen(false);
    }, []);

    // Default actions if none provided (for info alerts)
    const activeActions = config.actions && config.actions.length > 0
        ? config.actions
        : [{ label: 'OK', onClick: closeAlert, variant: 'action' as const }];

    return (
        <AlertContext.Provider value={{ showAlert, closeAlert }}>
            {children}
            <GlobalAlertDialog
                open={open}
                onOpenChange={setOpen}
                title={config.title}
                description={config.description}
                cancelLabel={config.cancelLabel}
                actions={activeActions}
            />
        </AlertContext.Provider>
    );
}

export function useAlert() {
    const context = useContext(AlertContext);
    if (context === undefined) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
}
