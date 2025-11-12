import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwtDecode from "jwt-decode";
import { api } from '../lib/api'

export default function Login() {
    const [emailOrMobile, setEmailOrMobile] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        try {
            const res = await api.post("/auth/login", { emailOrMobile, password });
            const { token } = res.data;

            await AsyncStorage.setItem("token", token);

            const decoded = jwtDecode(token);
            const role = decoded.role;

            if (role == "doctor") router.push("/doctor");
            else if (role == "patient") router.push("/patient")
            else if (role == "pharmacist") router.push("/pharmacist")
            else Alert.alert("Unknown role", "Cannot determine dashboard.");
        } catch (err) {
            console.log(err.response?.data || err.message);
            Alert.alert("Login failed", err.response?.data?.message || "Server error");
        }
    };

    return (
        <View style={style.container}>
            <Text style={style.title}> Prescription Integrity ⚕️</Text>
            <TextInput
                placeholder="Email or Mobile"
                value={emailOrMobile}
                onChange={setEmailOrMobile}
                style={style.input}
            />
            <TextInput
                placeholder="Password"
                secureTextEntry
                value={password}
                onChange={setPassword}
                style={style.input}
            />
            <Button title="Login" onPress={handleLogin} />
            <Button title="Register" onPress={() => router.push("/auth/register")} />
        </View>
    );
}

const style = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 25 },
    input: { borderWidth: 1, width: "80%", padding: 10, marginBottom: 15, borderRadius: 5 },
});
