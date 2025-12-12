import React, {createContext, useContext, useState, useCallback} from 'react';
import {Toast} from './Toast';

type ToastType = 'error' | 'success' | 'info';

type ToastContextValue = {
	showToast: (message: string, type?: ToastType, duration?: number) => void;
	showError: (message: string) => void;
	showSuccess: (message: string) => void;
	showInfo: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * ToastProvider verwaltet globale Toast-Benachrichtigungen.
 * 
 * Ermöglicht das Anzeigen von Feedback-Meldungen aus beliebigen Komponenten.
 * 
 * HINWEIS: Aktuell wird nur ein Toast gleichzeitig angezeigt. Neue Toasts
 * überschreiben vorherige. Für eine Queue-basierte Implementierung mit
 * mehreren Toasts müsste die State-Struktur erweitert werden.
 */
export function ToastProvider({children}: {children: React.ReactNode}) {
	const [toast, setToast] = useState<{message: string; type: ToastType; duration: number} | null>(null);
	
	const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3000) => {
		setToast({message, type, duration});
	}, []);
	
	const showError = useCallback((message: string) => {
		showToast(message, 'error', 4000);
	}, [showToast]);
	
	const showSuccess = useCallback((message: string) => {
		showToast(message, 'success', 3000);
	}, [showToast]);
	
	const showInfo = useCallback((message: string) => {
		showToast(message, 'info', 3000);
	}, [showToast]);
	
	const handleDismiss = useCallback(() => {
		setToast(null);
	}, []);
	
	return (
		<ToastContext.Provider value={{showToast, showError, showSuccess, showInfo}}>
			{children}
			{toast && (
				<Toast
					message={toast.message}
					type={toast.type}
					duration={toast.duration}
					onDismiss={handleDismiss}
				/>
			)}
		</ToastContext.Provider>
	);
}

/**
 * Hook zum Anzeigen von Toast-Benachrichtigungen.
 * 
 * Muss innerhalb eines ToastProvider verwendet werden.
 */
export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error('useToast muss innerhalb eines ToastProvider verwendet werden');
	return ctx;
}
