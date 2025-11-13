import { View, Text, StyleSheet } from 'react-native';
import { useAuthGuard } from "../../hooks/useAuthGuard"

export default function PharmacistDashboard() {
    useAuthGuard(["pharmacist"])
    return (
        <View style={styles.container}>
            <Text style={styles.text}>💊 Pharmacist Dashboard</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    text: { fontSize: 22, fontWeight: 'bold' },
});
