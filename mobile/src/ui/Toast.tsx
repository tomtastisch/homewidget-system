import React, {useEffect, useState} from 'react';
import {Animated, StyleSheet, Text} from 'react-native';

type ToastType = 'error' | 'success' | 'info';

type ToastProps = {
	message: string;
	type?: ToastType;
	duration?: number;
	onDismiss?: () => void;
};

/**
 * Toast-Komponente für Feedback-Meldungen (Error, Success, Info).
 * 
 * Zeigt eine temporäre Nachricht am oberen Bildschirmrand an.
 */
export function Toast({message, type = 'info', duration = 3000, onDismiss}: ToastProps) {
	const [fadeAnim] = useState(new Animated.Value(0));
	
	useEffect(() => {
		// Fade in
		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 300,
			useNativeDriver: true,
		}).start();
		
		// Auto-dismiss nach duration
		const timer = setTimeout(() => {
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}).start(() => {
				if (onDismiss) onDismiss();
			});
		}, duration);
		
		return () => clearTimeout(timer);
	}, [duration, fadeAnim, onDismiss]);
	
	const getBackgroundColor = () => {
		switch (type) {
			case 'error':
				return '#fdecea';
			case 'success':
				return '#d4edda';
			case 'info':
			default:
				return '#d1ecf1';
		}
	};
	
	const getBorderColor = () => {
		switch (type) {
			case 'error':
				return '#f5c6cb';
			case 'success':
				return '#c3e6cb';
			case 'info':
			default:
				return '#bee5eb';
		}
	};
	
	const getTextColor = () => {
		switch (type) {
			case 'error':
				return '#b00020';
			case 'success':
				return '#155724';
			case 'info':
			default:
				return '#0c5460';
		}
	};
	
	return (
		<Animated.View
			style={[
				styles.toast,
				{
					backgroundColor: getBackgroundColor(),
					borderColor: getBorderColor(),
					opacity: fadeAnim,
				},
			]}
			testID={type === 'error' ? 'error.toast' : `toast.${type}`}
		>
			<Text style={[styles.text, {color: getTextColor()}]}>{message}</Text>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	toast: {
		position: 'absolute',
		top: 50,
		left: 16,
		right: 16,
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		zIndex: 1000,
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 2},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
	},
	text: {
		fontSize: 14,
		fontWeight: '500',
	},
});
