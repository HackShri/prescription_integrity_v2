import React, { useEffect, useState } from 'react';
import { View, Text, Button, TextInput, FlatList, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { getMyPrescriptions, createPrescription, transcribeAudio } from '../../lib/api';

export default function DoctorDashboard() {
    const [prescriptions, setPrescriptions] = useState([]);
    const [patientName, setPatientName] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [audioFile, setAudioFile] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await getMyPrescriptions();
                setPrescriptions(data || []);
            } catch (err) {
                console.log('Fetch error', err.message);
            }
        })();
    }, []);

    const handleCreate = async () => {
        try {
            const { data } = await createPrescription({ patientName, diagnosis });
            Alert.alert('Success', 'Prescription created.');
            setPrescriptions([...prescriptions, data]);
        } catch (err) {
            console.log(err.message);
            Alert.alert('Error creating prescription');
        }
    };

    const handlePickAudio = async () => {
        const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
        if (!result.canceled) setAudioFile(result.assets[0]);
    };

    const handleTranscribe = async () => {
        if (!audioFile) return Alert.alert('Pick an audio file first');
        const formData = new FormData();
        formData.append('file', {
            uri: audioFile.uri,
            type: 'audio/m4a',
            name: 'prescription.m4a',
        });
        try {
            const { data } = await transcribeAudio(formData);
            Alert.alert('Transcribed', data.text || 'Success!');
        } catch (err) {
            console.log(err.message);
            Alert.alert('Transcription failed');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>👨‍⚕️ Doctor Dashboard</Text>

            <TextInput
                placeholder="Patient Name"
                value={patientName}
                onChangeText={setPatientName}
                style={styles.input}
            />
            <TextInput
                placeholder="Diagnosis / Notes"
                value={diagnosis}
                onChangeText={setDiagnosis}
                style={styles.input}
            />

            <Button title="Create Prescription" onPress={handleCreate} />
            <Button title="Pick Audio" onPress={handlePickAudio} />
            <Button title="Transcribe Audio" onPress={handleTranscribe} />

            <Text style={styles.subtitle}>My Prescriptions</Text>
            <FlatList
                data={prescriptions}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{item.patientName}</Text>
                        <Text>{item.diagnosis}</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    input: { borderWidth: 1, borderRadius: 5, padding: 10, marginBottom: 10 },
    subtitle: { fontSize: 18, marginTop: 25, marginBottom: 10, fontWeight: 'bold' },
    card: { padding: 10, borderWidth: 1, borderRadius: 6, marginBottom: 8 },
    cardTitle: { fontWeight: 'bold', fontSize: 16 },
});
