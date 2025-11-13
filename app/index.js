import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { router } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
    const { user, loading } = useContext(AuthContext);

    useEffect(() => {
        if (!loading) {
            if (user?.role === "patient") router.replace("/patient");
            else if (user?.role === "pharmacist") router.replace("/pharmacist");
            else router.replace("/auth/login");
        }
    }, [user, loading]);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" />
        </View>
    );
}
