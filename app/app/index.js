import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useContext, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { AuthContext } from "../context/AuthContext";

export default function Home() {
    const { user } = useContext(AuthContext);
    const [active, setActive] = useState(0);

    const slides = useMemo(
        () => [
            {
                title: "Prescription Integrity",
                subtitle: "Secure. Automated. Transparent.",
            },
            {
                title: "AI-Driven Verification",
                subtitle: "Detect errors & mismatches instantly",
            },
            {
                title: "Empowering Patients",
                subtitle: "Track meds, scan prescriptions, stay safe",
            },
        ],
        []
    );

    // auto slide
    useEffect(() => {
        const id = setInterval(
            () => setActive((prev) => (prev + 1) % slides.length),
            3000
        );
        return () => clearInterval(id);
    }, []);

    const goToDashboard = () => {
        if (!user) {
            return router.push("/auth/login");
        }

        if (user.role === "patient") router.push("/patient");
        else if (user.role === "pharmacist") router.push("/pharmacist");
        else if (user.role === "doctor") router.push("/doctor");
        else router.push("/auth/login");
    };

    return (
        <ScrollView style={styles.container}>
            {/* Slider */}
            <View style={styles.slider}>
                {slides.map((slide, index) => (
                    <View
                        key={index}
                        style={[
                            styles.slide,
                            active === index ? styles.activeSlide : styles.hiddenSlide,
                        ]}
                    >
                        <Text style={styles.title}>{slide.title}</Text>
                        <Text style={styles.subtitle}>{slide.subtitle}</Text>
                    </View>
                ))}
            </View>

            {/* Go to dashboard */}
            <TouchableOpacity style={styles.button} onPress={goToDashboard}>
                <Text style={styles.buttonText}>Go To Dashboard</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#eef2ff",
    },
    slider: {
        height: 250,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    slide: {
        position: "absolute",
        width: "100%",
        padding: 20,
        alignItems: "center",
    },
    activeSlide: {
        opacity: 1,
    },
    hiddenSlide: {
        opacity: 0,
    },
    title: {
        fontSize: 26,
        color: "#1e293b",
        fontWeight: "700",
        textAlign: "center",
    },
    subtitle: {
        fontSize: 16,
        marginTop: 10,
        color: "#475569",
        textAlign: "center",
        width: "80%",
    },
    button: {
        backgroundColor: "#4f46e5",
        padding: 15,
        marginHorizontal: 40,
        borderRadius: 10,
        marginTop: 30,
    },
    buttonText: {
        color: "white",
        fontSize: 18,
        textAlign: "center",
        fontWeight: "700",
    },
});
