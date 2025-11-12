import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = 'http://192.168.56.1:5000/api';

export const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
