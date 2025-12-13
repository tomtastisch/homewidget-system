import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {ActivityIndicator, Alert, Button, FlatList, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';

import type {UseQueryResult} from '@tanstack/react-query';

import {useAuth} from '../auth/AuthContext';
import type {BackendWidget} from '../api/homeApi';
import {useHomeFeedQuery} from '../query/hooks/useHomeFeedQuery';
import {parseBackendWidget, type ParsedWidget} from '../types/widgets';
import {useToast} from '../ui/ToastContext';
import {OfflineIndicator} from '../ui/OfflineIndicator';

/**
 * HomeScreen (Screen-Komponente)
 *
 * Anforderungen / Invarianten
 * - Muss im unauthenticated Zustand einen stabilen Login-Link (testID: `home.loginLink`) rendern.
 * - Muss Widgets deterministisch rendern (mindestens Name, testID: `feed.widget.name`).
 * - Muss Loading/Empty deterministisch abbilden (testIDs: `loading.spinner`, `feed.empty`).
 *
 * Hinweis zur Typisierung:
 * - `useHomeFeedQuery` kann je nach Hook-Signatur/Overloads in TS auf `never` fallen.
 * - Deshalb wird der Return hier lokal auf `UseQueryResult<BackendWidget[], unknown>` festgelegt.
 */
export default function HomeScreen({navigation}: { navigation: any }) {
    const {status, role, user} = useAuth();
    const {showError} = useToast();

    const isAuthed = status === 'authenticated';
    const userId = user?.id ?? null;

    const queryArgs = useMemo(
        () => ({
            status,
            role,
            userId,
        }),
        [status, role, userId],
    );

    const feedQuery: UseQueryResult<BackendWidget[], unknown> =
        (useHomeFeedQuery as unknown as (args: unknown) => UseQueryResult<BackendWidget[], unknown>)(queryArgs);

    const widgets: BackendWidget[] = feedQuery.data ?? [];

    const parsed: ParsedWidget[] = useMemo(
        () => widgets.map(parseBackendWidget),
        [widgets],
    );

    const errorMsg = useMemo(() => {
        const e = feedQuery.error;
        if (!e) return null;
        if (e instanceof Error) return e.message;
        if (typeof e === 'string') return e;
        try {
            return JSON.stringify(e);
        } catch {
            return String(e);
        }
    }, [feedQuery.error]);

    const lastToastRef = useRef<string | null>(null);
    useEffect(() => {
        if (!errorMsg) {
            lastToastRef.current = null;
            return;
        }
        if (lastToastRef.current === errorMsg) {
            return;
        }
        lastToastRef.current = errorMsg;
        showError(errorMsg);
    }, [errorMsg, showError]);

    const load = useCallback(async () => {
        await feedQuery.refetch();
    }, [feedQuery]);

    const onPressCta = useCallback((target?: string) => {
        if (!target) {
            Alert.alert('Aktion', 'Keine Aktion konfiguriert.');
            return;
        }
        Alert.alert('CTA', `Ziel: ${target}`);
    }, []);

    const showSpinner = feedQuery.isFetching && !errorMsg && parsed.length === 0;

    const renderWidgetName = (w: ParsedWidget): string => {
        // Es wird minimal und robust gerendert, was der ParsedWidget hergibt.
        const anyW = w as unknown as { name?: unknown; title?: unknown };
        if (typeof anyW.name === 'string' && anyW.name.length > 0) return anyW.name;
        if (typeof anyW.title === 'string' && anyW.title.length > 0) return anyW.title;
        return 'Widget';
    };

    const renderWidgetCta = (w: ParsedWidget): { label?: string; target?: string } => {
        // Optional: CTA nur, wenn der ParsedWidget das tatsächlich hergibt.
        const anyW = w as unknown as { ctaLabel?: unknown; ctaTarget?: unknown };
        const label = typeof anyW.ctaLabel === 'string' ? anyW.ctaLabel : undefined;
        const target = typeof anyW.ctaTarget === 'string' ? anyW.ctaTarget : undefined;
        return {label, target};
    };

    return (
        <View style={styles.container}>
            <OfflineIndicator/>

            <View style={styles.headerRow}>
                <Text style={styles.title}>Home-Feed</Text>
                <Button title="Reload" onPress={load}/>
            </View>

            {!isAuthed ? (
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Login')}
                        testID="home.loginLink"
                    >
                        <Text style={styles.link}>Einloggen oder Registrieren</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                // Absichtlich kein Login-Link im Authed-State.
                // Tests prüfen "nicht sichtbar"; Playwright akzeptiert auch "nicht attached".
                <View style={styles.header}/>
            )}

            {!!errorMsg && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}

            {showSpinner && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" testID="loading.spinner"/>
                    <Text style={styles.loadingText}>Laden...</Text>
                </View>
            )}

            <FlatList
                data={parsed}
                keyExtractor={(_, idx) => String(idx)}
                renderItem={({item}) => {
                    const name = renderWidgetName(item);
                    const {label, target} = renderWidgetCta(item);

                    return (
                        <View style={styles.widgetCard}>
                            <Text style={styles.widgetName} testID="feed.widget.name">
                                {name}
                            </Text>

                            {label ? (
                                <View style={styles.widgetCtaRow}>
                                    <Button title={label} onPress={() => onPressCta(target)}/>
                                </View>
                            ) : null}
                        </View>
                    );
                }}
                ListEmptyComponent={
                    !feedQuery.isFetching && !errorMsg ? (
                        <Text testID="feed.empty">Aktuell keine Widgets verfügbar.</Text>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, padding: 16},
    headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
    title: {fontSize: 22, fontWeight: '600'},
    header: {marginBottom: 8},
    link: {color: '#0066cc', textDecorationLine: 'underline'},
    errorBox: {padding: 12, borderWidth: 1, borderColor: '#ffaaaa', backgroundColor: '#ffeeee', marginBottom: 12},
    errorText: {color: '#aa0000'},
    loadingContainer: {alignItems: 'center', marginTop: 24},
    loadingText: {marginTop: 8},
    widgetCard: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
        marginBottom: 12
    },
    widgetName: {fontSize: 16, fontWeight: '600'},
    widgetCtaRow: {marginTop: 8},
});
