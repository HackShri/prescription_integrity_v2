import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { FileText, Camera, Upload, RotateCcw, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useNavigate } from 'react-router-dom';

const OCRScanner = () => {
  const [image, setImage] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [prescriptionData, setPrescriptionData] = useState({
    patientEmail: '',
    patientMobile: '',
    instructions: '',
    medications: [],
    age: '',
    weight: '',
    height: '',
    usageLimit: 1,
    expiresAt: ''
  });
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        setExtractedText('');
        setError('');
        setSuccess('');
      };
      reader.readAsDataURL(file);
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setImage(imageData);
      setExtractedText('');
      setError('');
      setSuccess('');
      stopCamera();
    }
  };

  const startCamera = async () => {
    try {
      setError('');
      stopCamera();
      
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsCameraActive(true);
        };
        videoRef.current.onerror = (err) => {
          console.error('Video error:', err);
          setError('Failed to start camera video feed');
          setIsCameraActive(false);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please grant permission or try another device.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const extractText = async () => {
    if (!image) {
      setError('Please upload or capture an image first.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const worker = await createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,;:()[]{}@#$%&*+-=/\\|<>?!"\'`~ ',
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
      });

      const { data: { text } } = await worker.recognize(image);
      await worker.terminate();

      setExtractedText(text);
      setSuccess('Text extracted successfully! Review and edit the extracted information.');
      parsePrescriptionText(text);
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to extract text from image. Please try again with a clearer image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const parsePrescriptionText = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const lowerText = text.toLowerCase();
    
    const parsedData = {
      patientEmail: '',
      patientMobile: '',
      instructions: '',
      medications: [],
      age: '',
      weight: '',
      height: '',
      usageLimit: 1,
      expiresAt: ''
    };

    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex);
    if (emails && emails.length > 0) {
      parsedData.patientEmail = emails[0];
    }

    const mobileRegex = /(\+?[\d\s\-\(\)]{10,})/g;
    const mobiles = text.match(mobileRegex);
    if (mobiles && mobiles.length > 0) {
      parsedData.patientMobile = mobiles[0].replace(/\s+/g, '');
    }

    const ageRegex = /(\d+)\s*(?:years?|yrs?|y)/i;
    const ageMatch = lowerText.match(ageRegex);
    if (ageMatch) parsedData.age = ageMatch[1];

    const weightRegex = /(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilograms?)/i;
    const weightMatch = lowerText.match(weightRegex);
    if (weightMatch) parsedData.weight = weightMatch[1];

    const heightRegex = /(\d+(?:\.\d+)?)\s*(?:cm|cms|centimeters?)/i;
    const heightMatch = lowerText.match(heightRegex);
    if (heightMatch) parsedData.height = heightMatch[1];

    const medications = [];
    const medicationPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(\d+(?:\.\d+)?\s*(?:mg|ml|g|tablets?|capsules?|syrup))/gi,
      /(\d+(?:\.\d+)?\s*(?:mg|ml|g))\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];

    medicationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const medication = {
          name: match[1] || match[2],
          dosage: match[2] || match[1],
          quantity: '',
          frequency: '',
          timing: '',
          duration: '',
          instructions: ''
        };
        medications.push(medication);
      }
    });

    parsedData.medications = medications;
    setPrescriptionData(parsedData);
  };

  const handleInputChange = (field, value) => {
    setPrescriptionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMedicationChange = (index, field, value) => {
    setPrescriptionData(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const addMedication = () => {
    setPrescriptionData(prev => ({
      ...prev,
      medications: [...prev.medications, {
        name: '', dosage: '', quantity: '', frequency: '', timing: '', duration: '', instructions: ''
      }]
    }));
  };

  const removeMedication = (index) => {
    setPrescriptionData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const copyToDoctorDashboard = () => {
    localStorage.setItem('ocrPrescriptionData', JSON.stringify(prescriptionData));
    navigate('/doctor-dashboard');
  };

  const resetScanner = () => {
    setImage(null);
    setExtractedText('');
    setError('');
    setSuccess('');
    setPrescriptionData({
      patientEmail: '', patientMobile: '', instructions: '', medications: [], age: '', weight: '', height: '', usageLimit: 1, expiresAt: ''
    });
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">OCR Prescription Scanner</h2>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
            <AlertDescription className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-6 h-6" />
                <span>Capture or Upload Image</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Camera Capture</Label>
                <div className="space-y-2">
                  <Button 
                    onClick={isCameraActive ? stopCamera : startCamera} 
                    className="w-full button-style"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isCameraActive ? 'Stop Camera' : 'Start Camera'}
                  </Button>
                  
                  {isCameraActive && (
                    <div className="space-y-2">
                      <video 
                        ref={videoRef} 
                        className="w-full rounded-lg border-2 border-blue-200" 
                        autoPlay 
                        playsInline 
                        muted
                      />
                      <Button onClick={captureImage} className="w-full button-secondary">
                        Capture Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Or Upload Image</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full"
                />
              </div>

              {image && (
                <div className="space-y-2">
                  <Label>Captured Image</Label>
                  <img 
                    src={image} 
                    alt="Prescription" 
                    className="w-full rounded-lg border-2 border-gray-200" 
                  />
                  <Button 
                    onClick={extractText} 
                    disabled={isProcessing}
                    className="w-full button-style"
                  >
                    {isProcessing ? 'Processing...' : 'Extract Text'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-6 h-6" />
                <span>Extracted Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {extractedText && (
                <div className="space-y-2">
                  <Label>Raw Extracted Text</Label>
                  <div className="p-3 bg-gray-50 rounded-lg border text-sm max-h-32 overflow-y-auto">
                    {extractedText}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Patient Email</Label>
                    <Input
                      value={prescriptionData.patientEmail}
                      onChange={(e) => handleInputChange('patientEmail', e.target.value)}
                      placeholder="patient@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Patient Mobile</Label>
                    <Input
                      value={prescriptionData.patientMobile}
                      onChange={(e) => handleInputChange('patientMobile', e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>General Instructions</Label>
                  <Input
                    value={prescriptionData.instructions}
                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                    placeholder="Enter general instructions..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Medications</Label>
                    <Button onClick={addMedication} size="sm" className="button-secondary">
                      Add Medication
                    </Button>
                  </div>
                  
                  {prescriptionData.medications.map((med, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Medication {index + 1}</span>
                        <Button 
                          onClick={() => removeMedication(index)} 
                          size="sm" 
                          variant="outline"
                          className="text-red-500"
                        >
                          Remove
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          placeholder="Medicine name"
                          value={med.name}
                          onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                        />
                        <Input
                          placeholder="Dosage (e.g., 500mg)"
                          value={med.dosage}
                          onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input
                      value={prescriptionData.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      placeholder="Age"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input
                      value={prescriptionData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      placeholder="Weight"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (cm)</Label>
                    <Input
                      value={prescriptionData.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      placeholder="Height"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Usage Limit</Label>
                    <Input
                      value={prescriptionData.usageLimit}
                      onChange={(e) => handleInputChange('usageLimit', e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Expiration Date</Label>
                  <Input
                    type="date"
                    value={prescriptionData.expiresAt}
                    onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button 
                    onClick={copyToDoctorDashboard}
                    disabled={prescriptionData.medications.length === 0}
                    className="button-style flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send to Doctor Dashboard
                  </Button>
                  <Button 
                    onClick={resetScanner}
                    className="button-secondary"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OCRScanner;