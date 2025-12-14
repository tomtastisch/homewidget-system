import React, {useState} from 'react';
import {Button, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../App';
import {useAuth} from '../auth/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({navigation}: Props) {
	const {register, error} = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);
	
	const onSubmit = async () => {
		setLocalError(null);
		if (!email || !password) {
			setLocalError('Bitte E‑Mail und Passwort ausfüllen.');
			return;
		}
		try {
			setLoading(true);
			await register(email.trim(), password);
			// Nach erfolgreicher Registrierung zur Login-Screen navigieren
			navigation.replace('Login');
		} catch (e: any) {
			// Fehler bereits im Context erfasst
			if (e?.message) setLocalError(e.message);
		} finally {
			setLoading(false);
		}
	};
	
	return (
		<View style={styles.container} testID="register.screen">
			<Text style={styles.title}>Konto erstellen</Text>
			{!!(localError || error) && <Text style={styles.error}>{localError || error}</Text>}
			<TextInput
				style={styles.input}
				placeholder="E‑Mail"
				autoCapitalize="none"
				keyboardType="email-address"
				value={email}
				onChangeText={setEmail}
				testID="register.email"
			/>
			<TextInput
				style={styles.input}
				placeholder="Passwort"
				secureTextEntry
				value={password}
				onChangeText={setPassword}
				testID="register.password"
			/>
			<Button title={loading ? 'Bitte warten…' : 'Registrieren'} onPress={onSubmit} disabled={loading}
			        testID="register.submit"/>
			<View style={styles.switchRow}>
				<Text>Bereits ein Konto?</Text>
				<TouchableOpacity onPress={() => navigation.replace('Login')} testID="register.loginLink">
					<Text style={styles.link}> Zum Login</Text>
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
