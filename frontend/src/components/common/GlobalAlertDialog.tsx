import * as React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import './GlobalAlertDialog.css';

export interface AlertAction {
    label: string;
    onClick?: () => void;
    variant?: 'cancel' | 'action' | 'danger';
}

export interface AlertDialogProps {
    open: boolean;
    title: string;
    description: string;
    cancelLabel?: string;
    actions: AlertAction[];
    onOpenChange: (open: boolean) => void;
}

export default function GlobalAlertDialog({
    open,
    title,
    description,
    cancelLabel,
    actions,
    onOpenChange
}: AlertDialogProps) {
    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="AlertDialogOverlay" />
                <AlertDialog.Content className="AlertDialogContent">
                    <AlertDialog.Title className="AlertDialogTitle">
                        {title}
                    </AlertDialog.Title>
                    <AlertDialog.Description className="AlertDialogDescription">
                        {description}
                    </AlertDialog.Description>
                    <div style={{ display: "flex", gap: 20, justifyContent: "flex-end", marginTop: 20 }}>
                        {cancelLabel && (
                            <AlertDialog.Cancel asChild>
                                <button className="Button mauve">
                                    {cancelLabel}
                                </button>
                            </AlertDialog.Cancel>
                        )}

                        {actions.map((action, index) => (
                            <AlertDialog.Action asChild key={index}>
                                <button
                                    className={`Button ${action.variant === 'danger' ? 'red' : 'violet'}`}
                                    onClick={action.onClick}
                                >
                                    {action.label}
                                </button>
                            </AlertDialog.Action>
                        ))}
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
