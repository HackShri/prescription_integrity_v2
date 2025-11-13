import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = 'http://172.25.11.168:5000/api';

export const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
});

export const getMYPrescriptions = async () => api.get('/prescription/me');

export const createPrescription = async (payload) =>
    api.post('/prescriptions', payload);

export const transcribeAudio = async (FormData) =>
    api.post('/transcribe', FormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem("token");
    console.log("Token:", token)
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
