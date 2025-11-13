import React, { createContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import jwtDecode from "jwt-decode";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const token = await AsyncStorage.getItem("token");
                console.log("TOKEN:", token)
                if (token) {
                    const decoded = jwtDecode(token);
                    console.log("Decoded context:", decoded)
                    setUser(decoded);
                }
            } catch (err) {
                console.log("Auth load error:", err.message);
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

    const logout = async () => {
        await AsyncStorage.removeItem("token");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
