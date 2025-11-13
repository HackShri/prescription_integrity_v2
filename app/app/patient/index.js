import React, { useContext, useEffect, useState } from "react";
import { View, Text, FlatList, Button, Image, StyleSheet, Alert } from "react-native";
import { api } from "../../lib/api.js";
import { useAuthGuard } from "../../hooks/useAuthGuard"
import { AuthContext } from "../../context/AuthContext.js";
import { router } from "expo-router";

export default function PatientDashboard() {

    useAuthGuard(["patient"])

    const [prescriptions, setPrescriptions] = useState([]);
    //const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user, setUser, logout } = useContext(AuthContext);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userRes = await api.get("/auth/me");
                setUser(userRes.data);

                const presRes = await api.get("/prescriptions/patient");
                setPrescriptions(presRes.data || []);
            } catch (err) {
                console.log(err.message);
                Alert.alert("Error", "Failed to load dashboard data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <Text style={styles.loading}>Loading...</Text>;

    return (
        <View style={styles.container}>
            {user && (
                <View style={styles.profile}>
                    <Image
                        source={{ uri: user.photoUrl ? `${user.photoUrl}` : "https://via.placeholder.com/100" }}
                        style={styles.image}
                    />
                    <Text style={styles.name}>{user.name}</Text>
                    <Text>{user.age} yrs | {user.height} cm | {user.weight} kg</Text>
                </View>
            )}

            <Text style={styles.heading}>My Prescriptions</Text>

            {prescriptions.length === 0 ? (
                <Text>No prescriptions found.</Text>
            ) : (
                <FlatList
                    data={prescriptions}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.rx}>RX #{item._id.slice(-6)}</Text>
                            <Text>Expires: {new Date(item.expiresAt).toLocaleDateString()}</Text>
                            <Button
                                title="View"
                                onPress={() => router.push(`/patient/prescription/${item._id}`)} />
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    loading: { textAlign: "center", marginTop: 50 },
    profile: { alignItems: "center", marginBottom: 20 },
    image: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
    name: { fontSize: 20, fontWeight: "bold" },
    heading: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
    card: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 10 },
    rx: { fontWeight: "bold", marginBottom: 5 },
});
