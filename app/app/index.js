import { View, Text, Button, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function Home() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Prescription Integrity ⚕️</Text>
            <Link href="/auth/login" asChild>
                <Button title="Login" />
            </Link>
            <Link href="/auth/register" asChild>
                <Button title="Register" />
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 22, fontWeight: "bold", marginBottom: 30 },
});
