import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {ActivityIndicator, Alert, Button, FlatList, StyleSheet, Text, TouchableOpacity, View,} from 'react-native';

import type {UseQueryResult} from '@tanstack/react-query';

import {useAuth} from '../auth/AuthContext';
import type {BackendWidget} from '../api/homeApi';
import {WidgetBanner, WidgetCard} from '../components/widgets';
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

    const renderWidget = (w: ParsedWidget): React.ReactElement => {
        const cfg = w.config as unknown as {
            type?: unknown;
            title?: unknown;
            description?: unknown;
            image_url?: unknown;
            cta_label?: unknown;
            cta_target?: unknown;
        };

        const type = typeof cfg.type === 'string' ? cfg.type : 'card';
        const title = typeof cfg.title === 'string' && cfg.title.length > 0 ? cfg.title : w.name;
        const description = typeof cfg.description === 'string' ? cfg.description : undefined;
        const imageUrl = typeof cfg.image_url === 'string' ? cfg.image_url : undefined;
        const ctaLabel = typeof cfg.cta_label === 'string' ? cfg.cta_label : undefined;
        const ctaTarget = typeof cfg.cta_target === 'string' ? cfg.cta_target : undefined;

        const onPress = ctaLabel ? () => onPressCta(ctaTarget) : undefined;

        switch (type) {
            case 'banner':
                return (
                    <WidgetBanner
                        title={title}
                        description={description}
                        imageUrl={imageUrl}
                        ctaLabel={ctaLabel}
                        onPress={onPress}
                    />
                );
            case 'card':
            default:
                return (
                    <WidgetCard
                        title={title}
                        description={description}
                        imageUrl={imageUrl}
                        ctaLabel={ctaLabel}
                        onPress={onPress}
                    />
                );
        }
    };

    return (
        <View style={styles.container}>
            <OfflineIndicator/>

            <View style={styles.headerRow}>
                <Text style={styles.title}>Home-Feed</Text>
                <Button title="Reload" onPress={load}/>
            </View>

            <View style={styles.badgeRow}>
                <Text style={styles.badgeText}>
                    {isAuthed ? (role ? String(role).toUpperCase() : '') : 'DEMO'}
                </Text>
                {!isAuthed ? (
                    <Text style={styles.badgeHint}>Demonstrationsmodus – Beispiel-Widgets</Text>
                ) : null}
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
                renderItem={({item}) => renderWidget(item)}
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
    badgeRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
    badgeText: {
        fontSize: 14,
        fontWeight: '700',
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: '#eee',
        borderRadius: 4,
        marginRight: 8,
    },
    badgeHint: {fontSize: 14, color: '#666'},
    header: {marginBottom: 8},
    link: {color: '#0066cc', textDecorationLine: 'underline'},
    errorBox: {padding: 12, borderWidth: 1, borderColor: '#ffaaaa', backgroundColor: '#ffeeee', marginBottom: 12},
    errorText: {color: '#aa0000'},
    loadingContainer: {alignItems: 'center', marginTop: 24},
    loadingText: {marginTop: 8},
});
