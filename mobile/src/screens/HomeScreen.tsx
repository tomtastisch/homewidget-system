import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import type {RootStackParamList} from '../App';
import {useAuth} from '../auth/AuthContext';
import {WidgetBanner, WidgetCard} from '../components/widgets';
import {useHomeFeedQuery} from '../query/hooks/useHomeFeedQuery';
import {parseBackendWidget, type ParsedWidget} from '../types/widgets';
import {useToast} from '../ui/ToastContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({navigation}: Props) {
    const {status, role, user} = useAuth();
    const {showError} = useToast();

    const isAuthed = status === 'authenticated';
    const userId = user?.id ?? null;

    const feedQuery = useHomeFeedQuery({status, role, userId});
    const widgets = feedQuery.data ?? [];

    const parsed: ParsedWidget[] = useMemo(() => widgets.map(parseBackendWidget), [widgets]);

    const errorMsg =
        feedQuery.error instanceof Error
            ? feedQuery.error.message
            : feedQuery.error
                ? String(feedQuery.error)
                : null;

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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Home-Feed</Text>
                    <View
                        style={[
                            styles.badge,
                            !isAuthed ? styles.badgeDemo : role === 'premium' ? styles.badgePremium : styles.badgeCommon,
                        ]}
                    >
                        <Text style={styles.badgeText}>{!isAuthed ? 'DEMO' : (role || 'user').toUpperCase()}</Text>
                    </View>
                </View>
                <Button title="Neu laden" onPress={load}/>
            </View>

            {!isAuthed && (
                <View style={styles.demoBanner}>
                    <Text style={styles.demoBannerText}>Demonstrations-Ansicht – Inhalte sind Beispiele</Text>
                </View>
            )}

            <View style={styles.header}>
                {isAuthed ? (
                    <Button title="Account" onPress={() => navigation.navigate('Account')}/>
                ) : (
                    <TouchableOpacity onPress={() => navigation.navigate('Login')} testID="home.loginLink">
                        <Text style={styles.link}>Einloggen oder Registrieren</Text>
                    </TouchableOpacity>
                )}
            </View>

            {!!errorMsg && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                    <View style={styles.retryBox}>
                        <Button title="Erneut versuchen" onPress={load}/>
                    </View>
                </View>
            )}

            {showSpinner && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0066cc" testID="loading.spinner"/>
                    <Text style={styles.loadingText}>Laden...</Text>
                </View>
            )}

            <FlatList
                data={parsed}
                keyExtractor={(w) => String(w.id)}
                refreshControl={<RefreshControl refreshing={feedQuery.isFetching} onRefresh={load}/>}
                renderItem={({item}) => {
                    const cfg = item.config;
                    switch (cfg.type) {
                        case 'banner':
                            return (
                                <WidgetBanner
                                    title={cfg.title || item.name}
                                    description={cfg.description}
                                    imageUrl={cfg.image_url}
                                    ctaLabel={cfg.cta_label}
                                    onPress={() => onPressCta(cfg.cta_target)}
                                />
                            );
                        case 'card':
                        case 'teaser':
                        default:
                            return (
                                <WidgetCard
                                    title={cfg.title || item.name}
                                    description={cfg.description}
                                    imageUrl={cfg.image_url}
                                    ctaLabel={cfg.cta_label}
                                    onPress={() => onPressCta(cfg.cta_target)}
                                />
                            );
                    }
                }}
                ListEmptyComponent={
                    !feedQuery.isFetching && !errorMsg ?
                        <Text testID="feed.empty">Aktuell keine Widgets verfügbar.</Text> : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, padding: 16},
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
    headerRow: {flexDirection: 'row', alignItems: 'center'},
    title: {fontSize: 20, fontWeight: '600'},
    link: {color: '#0066cc'},
    badge: {marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12},
    badgeText: {color: '#fff', fontSize: 12, fontWeight: '700'},
    badgeDemo: {backgroundColor: '#666'},
    badgeCommon: {backgroundColor: '#4a90e2'},
    badgePremium: {backgroundColor: '#8a2be2'},
    demoBanner: {
        backgroundColor: '#eef6ff',
        borderColor: '#cfe3ff',
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
    },
    demoBannerText: {color: '#1d4ed8'},
    errorBox: {
        backgroundColor: '#fdecea',
        borderColor: '#f5c6cb',
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    errorText: {color: '#b00020'},
    retryBox: {marginTop: 8},
    loadingContainer: {
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 8,
        color: '#666',
    },
});
