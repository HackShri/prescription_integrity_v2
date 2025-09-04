import React, { useState, useEffect, useRef } from 'react';
import { QRCode } from 'react-qr-code';
import SignatureCanvas from 'react-signature-canvas';
import { createPrescription, transcribeAudio } from '../../api/prescriptionService';
import {
  Mic,
  Plus,
  ArrowLeft,
  Download,
  Phone,
  User,
  Pill,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  PenTool,
  Send
} from 'lucide-react';
import io from 'socket.io-client';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { AlertDescription } from '../../components/ui/alert';
import MedicationForm from '../../components/shared/MedicationForm';
import Header from '../../components/layout/Header';

const socket = io('http://localhost:5000');

const DoctorDashboard = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [prescription, setPrescription] = useState({
    patientEmail: '',
    patientMobile: '',
    instructions: '',
    medications: [],
    age: '',
    weight: '',
    height: '',
    usageLimit: 1,
    expiresAt: '',
  });
  const [generatedPrescription, setGeneratedPrescription] = useState(null);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sigCanvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const ocrData = localStorage.getItem('ocrPrescriptionData');
    if (ocrData) {
      try {
        const parsedData = JSON.parse(ocrData);
        setPrescription(parsedData);
        setIsCreating(true);
        localStorage.removeItem('ocrPrescriptionData');
      } catch (err) {
        console.error('Error parsing OCR data:', err);
      }
    }
  }, []);

  const handleVoiceInput = async () => {
    if (isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        try {
          const { data } = await transcribeAudio(formData);
          setPrescription((prev) => ({ ...prev, instructions: data.transcription }));
        } catch (err) {
          console.error(err);
          setError('Transcription failed');
        }
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error(err);
      setError('Mic access denied or not supported');
    }
  };

  const handleMedicationsChange = (medications) => {
    setPrescription(prev => ({ ...prev, medications }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPrescription(prev => ({ ...prev, [name]: value }));
  };

  const handleClearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setSignature('');
    }
  };

  const handleEndSignature = () => {
    if (sigCanvasRef.current) {
      setSignature(sigCanvasRef.current.toDataURL());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!signature) {
      setError('Please provide a digital signature');
      setIsSubmitting(false);
      return;
    }
    if (prescription.medications.length === 0) {
      setError('Please add at least one medication');
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(atob(token.split('.')[1]));
      const payload = {
        ...prescription,
        age: parseInt(prescription.age) || 0,
        weight: parseFloat(prescription.weight) || 0,
        height: parseFloat(prescription.height) || 0,
        usageLimit: parseInt(prescription.usageLimit) || 1,
        doctorId: user.userId,
        doctorSignature: signature,
      };
      const { data } = await createPrescription(payload);
      socket.emit('sendPrescription', {
        patientId: data.patientId,
        prescription: { ...payload, _id: data._id },
      });
      setGeneratedPrescription({ ...payload, _id: data._id });
      setIsCreating(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate prescription');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const generateQRValue = (presc) => {
    const shortId = presc._id.slice(-8);
    return `RX:${shortId}`;
  };

  const resetForm = () => {
    setPrescription({
      patientEmail: '', patientMobile: '', instructions: '', medications: [], age: '', weight: '', height: '', usageLimit: 1, expiresAt: '',
    });
    setGeneratedPrescription(null);
    setSignature('');
    setError('');
    if(sigCanvasRef.current) sigCanvasRef.current.clear();
  };

  return (
    <div className="min-h-screen gradient-secondary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-green-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      <Header />
      <main className="p-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8 slide-in-top">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent mb-2">
            Doctor Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Create and manage digital prescriptions for your patients
          </p>
        </div>

        {error && (
          <div className="alert-error slide-in-top mb-6">
            <AlertDescription className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {error}
            </AlertDescription>
          </div>
        )}

        {!isCreating && !generatedPrescription && (
          <Card className="card-style w-full max-w-2xl mx-auto slide-in-bottom">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-secondary to-primary rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="card-header-style">Create Prescription</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreating(true)} className="w-full button-secondary h-12 text-lg">
                Start New Prescription
              </Button>
            </CardContent>
          </Card>
        )}

        {isCreating && (
          <Card className="card-style w-full max-w-4xl mx-auto slide-in-bottom">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="card-header-style">New Prescription</CardTitle>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <Label htmlFor="patientEmail"><User className="w-4 h-4 inline mr-2" />Patient Email</Label>
                    <Input id="patientEmail" name="patientEmail" type="email" placeholder="patient@example.com" value={prescription.patientEmail} onChange={handleChange} className="form-input" />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="patientMobile"><Phone className="w-4 h-4 inline mr-2" />Patient Mobile</Label>
                    <Input id="patientMobile" name="patientMobile" type="tel" placeholder="+1234567890" value={prescription.patientMobile} onChange={handleChange} className="form-input" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <Label htmlFor="expiresAt"><Calendar className="w-4 h-4 inline mr-2" />Expiration Date</Label>
                    <Input id="expiresAt" name="expiresAt" type="date" value={prescription.expiresAt} onChange={handleChange} className="form-input" required />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="usageLimit"><Clock className="w-4 h-4 inline mr-2" />Usage Limit</Label>
                    <Input id="usageLimit" name="usageLimit" type="number" placeholder="1" value={prescription.usageLimit} onChange={handleChange} className="form-input" min="1" />
                  </div>
                </div>
                <div className="form-group">
                  <Label htmlFor="instructions"><FileText className="w-4 h-4 inline mr-2" />General Instructions</Label>
                  <div className="flex space-x-2">
                    <Input id="instructions" name="instructions" placeholder="Enter instructions..." value={prescription.instructions} onChange={handleChange} className="form-input flex-1" />
                    <Button type="button" variant="outline" size="icon" onClick={handleVoiceInput} className="w-12 h-12">
                        {isListening ? <Mic className="h-4 w-4 animate-pulse text-red-500" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <MedicationForm medications={prescription.medications} onMedicationsChange={handleMedicationsChange} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group"><Label htmlFor="age">Age</Label><Input id="age" name="age" type="number" placeholder="Age" value={prescription.age} onChange={handleChange} className="form-input"/></div>
                  <div className="form-group"><Label htmlFor="weight">Weight (kg)</Label><Input id="weight" name="weight" type="number" placeholder="Weight" value={prescription.weight} onChange={handleChange} className="form-input"/></div>
                  <div className="form-group"><Label htmlFor="height">Height (cm)</Label><Input id="height" name="height" type="number" placeholder="Height" value={prescription.height} onChange={handleChange} className="form-input"/></div>
                </div>
                <div className="form-group">
                  <Label><PenTool className="w-4 h-4 inline mr-2" />Digital Signature</Label>
                  <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                    <SignatureCanvas ref={sigCanvasRef} canvasProps={{ className: 'w-full h-32 border border-gray-300 rounded' }} onEnd={handleEndSignature}/>
                    <Button type="button" onClick={handleClearSignature} variant="outline" size="sm" className="mt-2">Clear</Button>
                  </div>
                </div>
                <Button type="submit" className="w-full button-secondary h-12 text-lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : <><Send className="w-5 h-5 mr-2" />Generate Prescription</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {generatedPrescription && (
          <Card className="card-style w-full max-w-4xl mx-auto slide-in-bottom">
            <CardHeader className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <CardTitle className="card-header-style">Prescription Generated!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <p>Patient Email: {generatedPrescription.patientEmail}</p>
                    <p>Medications:</p>
                    {generatedPrescription.medications.map((med, index) => <div key={index}><p>{med.name} - {med.dosage}</p></div>)}
                </div>
                <div className="flex flex-col items-center">
                    <p>QR Code</p>
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <QRCode value={generateQRValue(generatedPrescription)} size={150}/>
                    </div>
                </div>
              </div>
              <div className="flex space-x-4">
                <Button onClick={resetForm} className="flex-1 button-style">Create Another</Button>
                <Button variant="outline" className="flex-1" onClick={() => window.print()}><Download className="w-4 h-4 mr-2" />Print</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;