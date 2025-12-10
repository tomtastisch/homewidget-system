import {Alert} from 'react-native';

export function notifySessionExpired() {
	Alert.alert('Sitzung abgelaufen', 'Bitte melde dich erneut an.');
}

export function notifyRateLimited() {
	Alert.alert('Zu viele Anfragen', 'Bitte versuche es später erneut und melde dich erneut an.');
}

export function notifyForbidden(message: string = 'Keine Berechtigung für diese Aktion.') {
	Alert.alert('Keine Berechtigung', message);
}

export function notifyInfo(title: string, message: string) {
	Alert.alert(title, message);
}
