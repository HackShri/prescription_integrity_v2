import { useContext, useEffect } from "react";
import { router } from "expo-router";
import { AuthContext } from "../context/AuthContext";

export const useAuthGuard = (allowedRoles = []) => {
    const { user, loading } = useContext(AuthContext);

    useEffect(() => {
        if (!loading) {
            if (!user) router.replace("/auth/login");
            else if (allowedRoles.length && !allowedRoles.includes(user.role)) {
                router.replace("/auth/login");
            }
        }
    }, [user, loading]);
};
