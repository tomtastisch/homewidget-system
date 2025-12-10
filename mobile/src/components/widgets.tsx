import React from 'react';
import {View, Text, StyleSheet, Image, Button} from 'react-native';

type CommonProps = {
	title?: string;
	description?: string;
	imageUrl?: string;
	ctaLabel?: string;
	onPress?: () => void;
};

export function WidgetCard({title, description, imageUrl, ctaLabel, onPress}: CommonProps) {
	return (
		<View style={styles.card}>
			{!!imageUrl && <Image source={{uri: imageUrl}} style={styles.cardImage} resizeMode="cover"/>}
			{!!title && <Text style={styles.cardTitle}>{title}</Text>}
			{!!description && <Text style={styles.cardText}>{description}</Text>}
			{!!ctaLabel && <View style={{marginTop: 8}}><Button title={ctaLabel} onPress={onPress}/></View>}
		</View>
	);
}

export function WidgetBanner({title, description, imageUrl, ctaLabel, onPress}: CommonProps) {
	return (
		<View style={styles.banner}>
			<View style={{flexDirection: 'row', alignItems: 'center'}}>
				{!!imageUrl && <Image source={{uri: imageUrl}} style={styles.bannerImage} resizeMode="cover"/>}
				<View style={{flex: 1}}>
					{!!title && <Text style={styles.bannerTitle}>{title}</Text>}
					{!!description && <Text style={styles.bannerText}>{description}</Text>}
				</View>
			</View>
			{!!ctaLabel &&
                <View style={{marginTop: 8}}><Button title={ctaLabel} color="#1d4ed8" onPress={onPress}/></View>}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		backgroundColor: '#fff',
	},
	cardImage: {width: '100%', height: 140, borderRadius: 6, marginBottom: 8},
	cardTitle: {fontSize: 16, fontWeight: '600', marginBottom: 6},
	cardText: {color: '#333'},
	banner: {
		borderRadius: 10,
		padding: 12,
		marginBottom: 12,
		backgroundColor: '#f0f7ff',
		borderWidth: 1,
		borderColor: '#cfe3ff',
	},
	bannerImage: {width: 56, height: 56, borderRadius: 6, marginRight: 10, backgroundColor: '#e6f0ff'},
	bannerTitle: {fontSize: 18, fontWeight: '700'},
	bannerText: {color: '#234'},
});

export default {WidgetCard, WidgetBanner};
