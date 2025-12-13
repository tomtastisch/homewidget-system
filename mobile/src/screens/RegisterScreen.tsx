import React, {useState} from 'react';
import {Alert, Button, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../App';
import {useAuth} from '../auth/AuthContext';

/**
 * Props für RegisterScreen.
 *
 * @see RootStackParamList
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

/**
 * RegisterScreen (Screen-Komponente)
 *
 * Ablauf
 * - Verwaltet lokale Eingaben (E-Mail/Passwort) inkl. Pflichtfeld-Validierung.
 * - Triggert `register(email, password)` aus dem Auth-Kontext.
 * - Zeigt bei Erfolg einen Dialog und navigiert anschließend zum Login.
 * - Rendert Formular sowie Fehlerzustände (lokal + aus Context).
 *
 * Zusätzliche IO-Punkte:
 * - `register(...)` (Auth/Netzwerk über Context).
 * - `Alert.alert(...)` (UI-Dialog) + `navigation.replace('Login')`.
 */
export default function RegisterScreen({navigation}: Props) {
    // Context / State
	const {register, error} = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);

    /**
     * Führt die Registrierung aus.
     * - Reset lokaler Fehlerzustände.
     * - Validiert Pflichtfelder.
     * - Setzt Loading-Status und leitet Fehler in UI-taugliche Meldungen ab.
     */
    const onSubmit = async () => {
        setLocalError(null);

        if (!email || !password) {
            setLocalError('Bitte E-Mail und Passwort eingeben.');
            return;
        }

        setLoading(true);
        try {
            await register(email, password);
            Alert.alert('Erfolg', 'Registrierung abgeschlossen. Bitte jetzt einloggen.', [
                {text: 'OK', onPress: () => navigation.replace('Login')},
            ]);
        } catch (e: unknown) {
            // Fehler kann bereits im Context gesetzt sein – aber lokale Meldung hilft deterministisch.
            const msg = e instanceof Error ? e.message : String(e);
            setLocalError(msg);
        } finally {
            setLoading(false);
        }
    };

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Konto erstellen</Text>
			{!!(localError || error) && <Text style={styles.error}>{localError || error}</Text>}
			<TextInput
				style={styles.input}
				placeholder="E‑Mail"
				autoCapitalize="none"
				keyboardType="email-address"
				value={email}
				onChangeText={setEmail}
			/>
			<TextInput
				style={styles.input}
				placeholder="Passwort"
				secureTextEntry
				value={password}
				onChangeText={setPassword}
			/>
			<Button title={loading ? 'Bitte warten…' : 'Registrieren'} onPress={onSubmit} disabled={loading}/>
			<View style={styles.switchRow}>
				<Text>Bereits ein Konto?</Text>
				<TouchableOpacity onPress={() => navigation.replace('Login')}>
					<Text style={styles.link}> Zum Login</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

// =============================================================
// Styles
// =============================================================
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
