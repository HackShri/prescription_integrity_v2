import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { api } from "../lib/api";

export default function Register() {
    const [name, setName] = useState("");
    const [emailOrMobile, setEmailOrMobile] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("patient");

    const handleRegister = async () => {
        try {
            const res = await api.post("/auth/signup", {
                name,
                emailOrMobile,
                password,
                role,
            });

            Alert.alert("Success", "Account created successfully!");
            router.push("/auth/login");
        } catch (err) {
            console.log(err.response?.data || err.message);
            Alert.alert("Signup failed", err.response?.data?.message || "Server error");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Register</Text>
            <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
            <TextInput placeholder="Email or Mobile" value={emailOrMobile} onChangeText={setEmailOrMobile} style={styles.input} />
            <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
            <TextInput placeholder="Role (doctor/patient/pharmacist)" value={role} onChangeText={setRole} style={styles.input} />
            <Button title="Register" onPress={handleRegister} />
            <Button title="Back to Login" onPress={() => router.push("/auth/login")} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
    title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
    input: { borderWidth: 1, width: "80%", padding: 10, marginBottom: 10, borderRadius: 5 },
});
