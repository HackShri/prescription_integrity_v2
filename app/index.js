import { View, Text, Button, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function Home() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Prescription Integrity ⚕️</Text>

            <Link href="/doctor" asChild>
                <Button title="Doctor Dashboard" />
            </Link>

            <Link href="/patient" asChild>
                <Button title="Patient Dashboard" />
            </Link>

            <Link href="/pharmacist" asChild>
                <Button title="Pharmacist Dashboard" />
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 30 },
});
