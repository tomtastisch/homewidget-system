import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, RefreshControl, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getFeed, ApiError } from '../api/client';
import { clearTokens } from '../storage/tokens';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type Widget = {
  id: number;
  name: string;
  config_json: string;
};

export default function HomeScreen({ navigation }: Props) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getFeed();
      setWidgets(data);
    } catch (e: any) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        // Token ungültig oder Zugriff verboten -> Logout und zurück zum Login
        await clearTokens();
        navigation.replace('Login');
      } else {
        Alert.alert('Fehler', e?.message || 'Unbekannter Fehler beim Laden.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home‑Feed</Text>
        <Button title="Neu laden" onPress={load} />
      </View>
      <FlatList
        data={widgets}
        keyExtractor={(w) => String(w.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text numberOfLines={3} style={styles.cardText}>{item.config_json}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text>Keine Widgets vorhanden.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#fff' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  cardText: { color: '#333' },
});
