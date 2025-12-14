import React, {useState} from 'react';
import {Button, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../App';
import {useAuth} from '../auth/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
	const {login, error} = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);
	const [isRateLimited, setIsRateLimited] = useState(false);
	
	const onLogin = async () => {
		setLocalError(null);
		setIsRateLimited(false);
		if (!email || !password) {
			setLocalError('Bitte E‑Mail und Passwort ausfüllen.');
			return;
		}
		try {
			setLoading(true);
			await login(email.trim(), password);
			// Navigation wird durch Router/Status gesteuert
		} catch (e: any) {
			if (e?.status === 429) {
				setLocalError('Zu viele Anmeldeversuche. Bitte versuche es später erneut.');
				setIsRateLimited(true);
			} else if (e?.message) {
				setLocalError(e.message);
			}
		} finally {
			setLoading(false);
		}
	};
	
	return (
		<View style={styles.container} testID="login.screen">
			<Text style={styles.title}>HomeWidget Login</Text>
			{!!(localError || error) && (
				<View testID={isRateLimited ? 'login.error.rateLimit' : undefined}>
					<Text 
						style={styles.error} 
						testID="login.error"
					>
						{localError || error}
					</Text>
				</View>
			)}
			<TextInput
				style={styles.input}
				placeholder="E‑Mail"
				autoCapitalize="none"
				keyboardType="email-address"
				value={email}
				onChangeText={setEmail}
				testID="login.email"
			/>
			<TextInput
				style={styles.input}
				placeholder="Passwort"
				secureTextEntry
				value={password}
				onChangeText={setPassword}
				testID="login.password"
			/>
			<Button
				title={loading ? 'Bitte warten…' : 'Login'}
				onPress={onLogin}
				disabled={loading}
				testID="login.submit"
			/>
			<View style={styles.switchRow}>
				<Text>Noch kein Konto?</Text>
				<TouchableOpacity onPress={() => navigation.replace('Register')} testID="login.registerLink">
					<Text style={styles.link}> Jetzt registrieren</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {flex: 1, padding: 24, justifyContent: 'center'},
	title: {fontSize: 22, fontWeight: '600', marginBottom: 16},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
	},
	error: {color: '#b00020', marginBottom: 12},
	switchRow: {flexDirection: 'row', justifyContent: 'center', marginTop: 12},
	link: {color: '#0066cc'},
});
