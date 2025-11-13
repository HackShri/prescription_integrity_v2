import React, { useContext, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { api } from "../../lib/api.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import jwtDecode from "jwt-decode";
import { AuthContext } from "../../context/AuthContext.js";

export default function Login() {
    const [emailOrMobile, setEmailOrMobile] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { setUser } = useContext(AuthContext);
    const handleLogin = async () => {
        console.log("Attempting login…");

        if (!emailOrMobile || !password) {
            return Alert.alert("Error", "Please fill all fields.");
        }



        // Auto-detect email or mobile
        const payload = {
            emailOrMobile,
            password,
        };


        console.log("PAYLOAD:", payload);

        try {
            const res = await api.post("/auth/login", payload);
            const { token } = res.data;

            console.log("TOKEN RECEIVED:", token);

            const decoded = jwtDecode(token);
            console.log("decoded login:", decoded);

            await AsyncStorage.setItem("token", token);
            setUser(decoded);

            if (decoded.role === "patient") router.replace("/patient");
            else if (decoded.role === "pharmacist") router.replace("/pharmacist");

        } catch (err) {
            console.log("LOGIN ERROR:", err.response?.data || err.message);
            setError(err.response?.data?.message || "Login failed");
        }
    };



    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.header}>Welcome Back 👋</Text>
                <Text style={styles.sub}>Login to access your prescriptions</Text>

                <TextInput
                    placeholder="Email or Mobile"
                    value={emailOrMobile}
                    onChangeText={setEmailOrMobile}
                    style={styles.input}
                />
                <TextInput
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/auth/register")}>
                    <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc", padding: 16 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        width: "90%",
        padding: 25,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
    },
    header: { fontSize: 26, fontWeight: "700", color: "#0f172a", textAlign: "center" },
    sub: { color: "#475569", textAlign: "center", marginVertical: 10 },
    input: {
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 8,
        padding: 12,
        marginVertical: 8,
    },
    button: {
        backgroundColor: "#0891b2",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 12,
    },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    linkText: { color: "#0284c7", textAlign: "center", marginTop: 12 },
    error: { color: "red", textAlign: "center", marginTop: 8 },
});
