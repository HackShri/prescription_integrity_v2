import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { api } from "../../lib/api.js";
import { Picker } from "@react-native-picker/picker";

export default function Register() {
    const [form, setForm] = useState({
        name: "",
        emailOrMobile: "",
        password: "",
        confirmPassword: "",
        role: "patient",
        age: "",
        height: "",
        weight: "",
    });
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    // const [role, setRole] = useState("patient")

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled) setPhoto(result.assets[0]);
    };

    const handleRegister = async () => {
        if (form.password !== form.confirmPassword)
            return Alert.alert("Error", "Passwords do not match");

        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => formData.append(key, value));
            if (photo) {
                formData.append("photo", {
                    uri: photo.uri,
                    type: "image/jpeg",
                    name: "patient_photo.jpg",
                });
            }

            await api.post("/auth/signup", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            Alert.alert("Success", "Account created successfully!");
            router.push("/auth/login");
        } catch (err) {
            console.log(err.response?.data || err.message);
            setError(err.response?.data?.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.header}>Create Account</Text>
                <Text style={styles.sub}>Join us to manage your prescriptions securely</Text>

                <TextInput
                    placeholder="Full Name"
                    value={form.name}
                    onChangeText={(v) => setForm({ ...form, name: v })}
                    style={styles.input}
                />

                <TextInput
                    placeholder="Email or Mobile"
                    value={form.emailOrMobile}
                    onChangeText={(v) => setForm({ ...form, emailOrMobile: v })}
                    style={styles.input}
                />

                <TextInput
                    placeholder="Password"
                    secureTextEntry
                    value={form.password}
                    onChangeText={(v) => setForm({ ...form, password: v })}
                    style={styles.input}
                />

                <TextInput
                    placeholder="Confirm Password"
                    secureTextEntry
                    value={form.confirmPassword}
                    onChangeText={(v) => setForm({ ...form, confirmPassword: v })}
                    style={styles.input}
                />


                {/* 🔥 ROLE DROPDOWN */}
                <Text style={{ marginTop: 10, fontWeight: "600" }}>Select Role</Text>

                <Picker
                    selectedValue={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v })}
                    style={[styles.input, { paddingVertical: 0 }]}
                >
                    <Picker.Item label="Patient" value="patient" />
                    <Picker.Item label="Pharmacist" value="pharmacist" />
                    <Picker.Item label="Doctor" value="doctor" />
                </Picker>


                {/* Patient-specific fields */}
                {form.role === "patient" && (
                    <>
                        <TextInput
                            placeholder="Age"
                            keyboardType="numeric"
                            value={form.age}
                            onChangeText={(v) => setForm({ ...form, age: v })}
                            style={styles.input}
                        />

                        <TextInput
                            placeholder="Height (cm)"
                            keyboardType="numeric"
                            value={form.height}
                            onChangeText={(v) => setForm({ ...form, height: v })}
                            style={styles.input}
                        />

                        <TextInput
                            placeholder="Weight (kg)"
                            keyboardType="numeric"
                            value={form.weight}
                            onChangeText={(v) => setForm({ ...form, weight: v })}
                            style={styles.input}
                        />

                        <TouchableOpacity onPress={handlePickImage} style={styles.uploadBox}>
                            {photo ? (
                                <Image source={{ uri: photo.uri }} style={styles.image} />
                            ) : (
                                <Text style={styles.uploadText}>📸 Upload Passport Photo</Text>
                            )}
                        </TouchableOpacity>
                    </>
                )}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Create Account</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/auth/login")}>
                    <Text style={styles.linkText}>Already have an account? Sign In</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc", padding: 16 },
    card: { backgroundColor: "#fff", borderRadius: 16, width: "90%", padding: 25, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 6 },
    header: { fontSize: 26, fontWeight: "700", color: "#0f172a", textAlign: "center" },
    sub: { color: "#475569", textAlign: "center", marginVertical: 10 },
    input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 12, marginVertical: 8 },
    uploadBox: { borderWidth: 1, borderColor: "#94a3b8", borderRadius: 10, padding: 12, alignItems: "center", marginTop: 10 },
    uploadText: { color: "#475569" },
    image: { width: 120, height: 120, borderRadius: 60, marginTop: 10 },
    button: { backgroundColor: "#0d9488", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 12 },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    linkText: { color: "#0284c7", textAlign: "center", marginTop: 12 },
    error: { color: "red", textAlign: "center", marginTop: 8 },
});
