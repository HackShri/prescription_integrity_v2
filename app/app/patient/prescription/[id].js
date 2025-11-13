import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { api } from "../../../lib/api";

export default function PrescriptionDetails() {
    const { id } = useLocalSearchParams();
    const [prescription, setPrescription] = useState(null);

    useEffect(() => {
        const fetchPrescription = async () => {
            try {
                const res = await api.get(`/prescriptions/${id}`);
                console.log("RAW:", res.data);
                setPrescription(res.data);
            } catch (err) {
                console.log("Error:", err.message);
            }
        };

        fetchPrescription();
    }, []);

    if (!prescription) {
        return (
            <View style={styles.center}>
                <Text>Loading prescription details…</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Prescription Details</Text>

            {/* Doctor Info */}
            <Text style={styles.label}>Doctor:</Text>
            <Text style={styles.value}>
                {prescription.doctorName || "N/A"}
            </Text>

            {/* Patient Info */}
            <Text style={styles.label}>Patient:</Text>
            <Text style={styles.value}>
                {prescription.patientName || "N/A"}
            </Text>

            <Text style={styles.label}>Age:</Text>
            <Text style={styles.value}>{prescription.age} years</Text>

            {/* Instructions */}
            <Text style={styles.label}>General Instructions:</Text>
            <Text style={styles.value}>{prescription.instructions || "None"}</Text>

            {/* Medications */}
            <Text style={styles.sectionTitle}>Medications</Text>

            {Array.isArray(prescription.medications) &&
                prescription.medications.map((m, index) => (
                    <View key={index} style={styles.medBox}>
                        <Text style={styles.medName}>{m.name}</Text>

                        <Text style={styles.value}>Dosage: {m.dosage}</Text>
                        <Text style={styles.value}>Frequency: {m.frequency}</Text>
                        <Text style={styles.value}>Duration: {m.duration}</Text>
                        <Text style={styles.value}>Timing: {m.timing}</Text>
                        <Text style={styles.value}>Quantity: {m.quantity}</Text>

                        {m.instructions ? (
                            <Text style={styles.value}>Notes: {m.instructions}</Text>
                        ) : null}
                    </View>
                ))}

            {/* Signature */}
            <Text style={styles.sectionTitle}>Doctor Signature</Text>
            {prescription.doctorSignature ? (
                <Image
                    source={{ uri: prescription.doctorSignature }}
                    style={styles.signature}
                />
            ) : (
                <Text style={styles.value}>No signature available</Text>
            )}

            {/* QR Code */}
            <Text style={styles.sectionTitle}>QR Code</Text>
            {prescription.qrCode ? (
                <Image
                    source={{ uri: prescription.qrCode }}
                    style={styles.qr}
                />
            ) : (
                <Text style={styles.value}>No QR Code available</Text>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: "#fff",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 26,
        fontWeight: "700",
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        marginTop: 10,
        fontWeight: "600",
    },
    value: {
        fontSize: 15,
        color: "#475569",
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginTop: 20,
        marginBottom: 10,
    },
    medBox: {
        padding: 15,
        backgroundColor: "#f8fafc",
        borderRadius: 10,
        marginBottom: 10,
    },
    medName: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 5,
    },
    signature: {
        width: 200,
        height: 100,
        resizeMode: "contain",
        marginVertical: 10,
    },
    qr: {
        width: 200,
        height: 200,
        resizeMode: "contain",
        marginVertical: 10,
    },
});
