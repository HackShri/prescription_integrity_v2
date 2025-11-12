import { View, Text, StyleSheet } from 'react-native';

export default function PatientDashboard() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>🧍‍♂️ Patient Dashboard</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 22, fontWeight: 'bold' },
});
