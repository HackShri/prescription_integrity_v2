import React, { useState, useRef, useEffect } from 'react';
import { FileText, Camera, Upload, RotateCcw, CheckCircle, AlertTriangle, Send } from 'lucide-react';

const OCRScanner = () => {
  const [image, setImage] = useState(null);
  const [searchId, setSearchId] = useState("");
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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image file too large. Please select an image under 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target.result);
        setExtractedText('');
        setError('');
        setSuccess('Image uploaded successfully! Click "Extract Text" to process.');
      };
      reader.onerror = () => {
        setError('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setImage(imageData);
      setExtractedText('');
      setError('');
      setSuccess('Image captured! Click "Extract Text" to process.');
      stopCamera();
    }
  };

  const startCamera = async () => {
    try {
      setError('');
      stopCamera();

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this browser.');
      }

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setIsCameraActive(true);
            setSuccess('Camera started successfully!');
          }).catch(err => {
            console.error('Video play error:', err);
            setError('Failed to start camera video feed');
            setIsCameraActive(false);
          });
        };
        videoRef.current.onerror = (err) => {
          console.error('Video error:', err);
          setError('Failed to start camera video feed');
          setIsCameraActive(false);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError(`Failed to access camera: ${err.message}. Please grant permission or try another device.`);
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
      // Import Tesseract.js dynamically
      const { createWorker } = await import('tesseract.js');

      const worker = await createWorker('eng');
      
      // Optimized parameters for prescription reading
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,;:()[]{}@#$%&*+-=/\\|<>?!"\'`~ ',
        tessedit_pageseg_mode: '6', // Uniform block of text
        preserve_interword_spaces: '1',
      });

      const { data: { text, confidence } } = await worker.recognize(image);
      await worker.terminate();

      if (confidence < 30) {
        setError('Text recognition confidence is low. Please try with a clearer image.');
        return;
      }

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
    if (!text) return;
    
    console.log('Starting entity extraction from:', text);
    
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

    // Enhanced email extraction with multiple patterns
    const emailPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      /email:?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi,
      /e-?mail:?\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/gi
    ];
    
    for (const pattern of emailPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        parsedData.patientEmail = matches[0].replace(/^email:?\s*/i, '').replace(/^e-?mail:?\s*/i, '');
        break;
      }
    }

    // Enhanced mobile number extraction with international and Indian formats
    const mobilePatterns = [
      /(?:phone|mobile|mob|contact|ph):?\s*([+]?[\d\s\-\(\)]{10,15})/gi,
      /(?:\+91|91)?[\s\-]?[6789]\d{9}/g,
      /(?:\+1)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{4}/g,
      /[+]?[\d\s\-\(\)]{10,15}/g
    ];

    for (const pattern of mobilePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        let mobile = matches[0].replace(/(?:phone|mobile|mob|contact|ph):?\s*/gi, '');
        mobile = mobile.replace(/[\s\-\(\)]/g, '');
        if (mobile.length >= 10) {
          parsedData.patientMobile = mobile;
          break;
        }
      }
    }

    // Enhanced age extraction with multiple patterns
    const agePatterns = [
      /age:?\s*(\d+)\s*(?:years?|yrs?|y\b)/gi,
      /(\d+)\s*(?:years?|yrs?|y\b)(?:\s*old)?/gi,
      /age\s*[:\-]\s*(\d+)/gi,
      /(\d+)\s*y\.?o\.?/gi // 35 y.o.
    ];

    for (const pattern of agePatterns) {
      const match = text.match(pattern);
      if (match) {
        const ageMatch = match[0].match(/(\d+)/);
        if (ageMatch && parseInt(ageMatch[1]) > 0 && parseInt(ageMatch[1]) < 150) {
          parsedData.age = ageMatch[1];
          break;
        }
      }
    }

    // Enhanced weight extraction
    const weightPatterns = [
      /weight:?\s*(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilograms?)/gi,
      /wt:?\s*(\d+(?:\.\d+)?)\s*(?:kg|kgs)/gi,
      /(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilograms?)/gi
    ];

    for (const pattern of weightPatterns) {
      const match = text.match(pattern);
      if (match) {
        const weightMatch = match[0].match(/(\d+(?:\.\d+)?)/);
        if (weightMatch && parseFloat(weightMatch[1]) > 0 && parseFloat(weightMatch[1]) < 500) {
          parsedData.weight = weightMatch[1];
          break;
        }
      }
    }

    // Enhanced height extraction
    const heightPatterns = [
      /height:?\s*(\d+(?:\.\d+)?)\s*(?:cm|cms|centimeters?)/gi,
      /ht:?\s*(\d+(?:\.\d+)?)\s*(?:cm|cms)/gi,
      /(\d+(?:\.\d+)?)\s*(?:cm|cms|centimeters?)/gi,
      /(\d+)'\s*(\d+)"/g, // 5'8" format
      /(\d+)\s*feet?\s*(\d+)?\s*inch/gi
    ];

    for (const pattern of heightPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (pattern.source.includes("'")) {
          // Handle feet'inches" format
          const feetInchMatch = match[0].match(/(\d+)'\s*(\d+)"/);
          if (feetInchMatch) {
            const feet = parseInt(feetInchMatch[1]);
            const inches = parseInt(feetInchMatch[2] || 0);
            const totalCm = Math.round((feet * 12 + inches) * 2.54);
            parsedData.height = totalCm.toString();
            break;
          }
        } else {
          const heightMatch = match[0].match(/(\d+(?:\.\d+)?)/);
          if (heightMatch && parseFloat(heightMatch[1]) > 50 && parseFloat(heightMatch[1]) < 300) {
            parsedData.height = heightMatch[1];
            break;
          }
        }
      }
    }

    // Advanced medication extraction with multiple patterns
    const medications = [];
    
    // Pattern 1: Numbered list format (1. Medicine name dosage)
    const numberedMedPattern = /^(\d+\.?\s*)(.*?)(\d+(?:\.\d+)?\s*(?:mg|ml|g|iu|mcg|units?).*?)$/gmi;
    let match;
    while ((match = numberedMedPattern.exec(text)) !== null) {
      const medName = match[2].trim();
      const dosageInfo = match[3].trim();
      
      if (medName && dosageInfo) {
        medications.push(extractMedicationDetails(medName, dosageInfo, match[0]));
      }
    }

    // Pattern 2: Medicine name followed by dosage on same line
    if (medications.length === 0) {
      const medDosagePattern = /([A-Za-z][A-Za-z\s]{2,30}?)\s+(\d+(?:\.\d+)?\s*(?:mg|ml|g|iu|mcg|units?).*?)(?:\n|$)/gi;
      while ((match = medDosagePattern.exec(text)) !== null) {
        const medName = match[1].trim();
        const dosageInfo = match[2].trim();
        
        if (isValidMedicineName(medName) && dosageInfo) {
          medications.push(extractMedicationDetails(medName, dosageInfo, match[0]));
        }
      }
    }

    // Pattern 3: Rx: or Prescription: section parsing
    const rxSectionMatch = text.match(/(?:rx|prescription|medicines?):?\s*([\s\S]*?)(?:\n\n|instructions?:|note:|$)/i);
    if (rxSectionMatch && medications.length === 0) {
      const rxSection = rxSectionMatch[1];
      const rxLines = rxSection.split('\n').filter(line => line.trim());
      
      rxLines.forEach(line => {
        const medMatch = line.match(/^(\d+\.?\s*)?(.*?)(\d+(?:\.\d+)?\s*(?:mg|ml|g|iu|mcg|units?).*?)$/i);
        if (medMatch) {
          const medName = medMatch[2].trim();
          const dosageInfo = medMatch[3].trim();
          
          if (medName && dosageInfo) {
            medications.push(extractMedicationDetails(medName, dosageInfo, line));
          }
        }
      });
    }

    // Helper function to extract detailed medication information
    function extractMedicationDetails(name, dosageInfo, fullLine) {
      const medication = {
        name: name.replace(/^[\d\.\s]+/, '').trim(),
        dosage: '',
        quantity: '',
        frequency: '',
        timing: '',
        duration: '',
        instructions: fullLine.trim()
      };

      // Extract dosage
      const dosageMatch = dosageInfo.match(/(\d+(?:\.\d+)?\s*(?:mg|ml|g|iu|mcg|units?))/i);
      if (dosageMatch) {
        medication.dosage = dosageMatch[1];
      }

      // Extract frequency patterns
      const frequencyPatterns = {
        'OD|once daily|one daily|1 daily|once a day': 'Once daily',
        'BD|twice daily|two daily|2 daily|twice a day|bid': 'Twice daily',
        'TDS|thrice daily|three daily|3 daily|three times|tid': 'Three times daily',
        'QDS|four times|4 daily|four daily|qid': 'Four times daily',
        'Q4H|every 4 hours': 'Every 4 hours',
        'Q6H|every 6 hours': 'Every 6 hours',
        'Q8H|every 8 hours': 'Every 8 hours',
        'Q12H|every 12 hours': 'Every 12 hours',
        'PRN|as needed|if needed|when required': 'As needed',
        'HS|at bedtime|before sleep|night time': 'At bedtime'
      };

      for (const [pattern, frequency] of Object.entries(frequencyPatterns)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(fullLine)) {
          medication.frequency = frequency;
          break;
        }
      }

      // Extract timing
      const timingPatterns = {
        'after food|after meal|pc|post meal': 'After meals',
        'before food|before meal|ac|pre meal|empty stomach': 'Before meals',
        'with food|with meal|during meal': 'With meals',
        'morning|am': 'Morning',
        'evening|pm|night(?!\\s*time)': 'Evening',
        'bedtime|hs|before sleep': 'At bedtime'
      };

      for (const [pattern, timing] of Object.entries(timingPatterns)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(fullLine)) {
          medication.timing = timing;
          break;
        }
      }

      // Extract duration
      const durationMatch = fullLine.match(/(?:for|x)\s*(\d+)\s*(days?|weeks?|months?)/i);
      if (durationMatch) {
        medication.duration = `${durationMatch[1]} ${durationMatch[2]}`;
      }

      // Extract quantity
      const quantityMatch = fullLine.match(/(\d+)\s*(?:tab|tablet|cap|capsule|ml|drops?)/i);
      if (quantityMatch) {
        medication.quantity = quantityMatch[1];
      }

      return medication;
    }

    // Helper function to validate medicine names
    function isValidMedicineName(name) {
      if (!name || name.length < 3 || name.length > 50) return false;
      if (/^\d+$/.test(name)) return false; // Just numbers
      if (!/[a-zA-Z]/.test(name)) return false; // Must contain letters
      
      const excludeWords = ['patient', 'doctor', 'date', 'prescription', 'instructions', 'note', 'age', 'weight', 'height'];
      return !excludeWords.some(word => name.toLowerCase().includes(word));
    }

    parsedData.medications = medications;

    // Enhanced instructions extraction
    const instructionPatterns = [
      /instructions?:?\s*(.*?)(?:\n\n|$)/gi,
      /notes?:?\s*(.*?)(?:\n\n|$)/gi,
      /directions?:?\s*(.*?)(?:\n\n|$)/gi,
      /advice:?\s*(.*?)(?:\n\n|$)/gi
    ];

    for (const pattern of instructionPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 10) {
        parsedData.instructions = match[1].trim();
        break;
      }
    }

    // Extract expiry/validity date with multiple formats
    const datePatterns = [
      /(?:expir[ye]|valid|until):?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/gi,
      /(?:expir[ye]|valid|until):?\s*(\d{2,4}[-/]\d{1,2}[-/]\d{1,2})/gi,
      /(?:next visit|follow.?up):?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/gi
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let dateStr = match[1];
        // Convert to YYYY-MM-DD format
        const parts = dateStr.split(/[-/]/);
        if (parts.length === 3) {
          let year = parts[2];
          if (year.length === 2) {
            year = '20' + year; // Assume 20xx for 2-digit years
          }
          
          // Assume DD/MM/YYYY or DD-MM-YYYY format
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          
          parsedData.expiresAt = `${year}-${month}-${day}`;
          break;
        }
      }
    }

    console.log('Extracted data:', parsedData);
    setPrescriptionData(parsedData);
    
    // Show extraction summary
    const extractedCount = [
      parsedData.patientEmail ? 'Email' : null,
      parsedData.patientMobile ? 'Phone' : null,
      parsedData.age ? 'Age' : null,
      parsedData.weight ? 'Weight' : null,
      parsedData.height ? 'Height' : null,
      parsedData.medications.length > 0 ? `${parsedData.medications.length} Medications` : null,
      parsedData.instructions ? 'Instructions' : null,
      parsedData.expiresAt ? 'Expiry Date' : null
    ].filter(Boolean);

    if (extractedCount.length > 0) {
      setSuccess(`Successfully extracted: ${extractedCount.join(', ')}. Please review and edit as needed.`);
    } else {
      setSuccess('Text extracted but automatic parsing found limited structured data. Please fill in the fields manually.');
    }
  };

  // Debounce effect for patient search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchId && searchId.length > 3) {
        fetchPatientDetails(searchId);
      }
    }, 800); // Increased delay to 800ms

    return () => clearTimeout(timer);
  }, [searchId]);

  const fetchPatientDetails = async (id) => {
    try {
      setError("");
      const token = localStorage.getItem('authToken'); // Get your actual token

      const response = await fetch(`http://localhost:5000/api/users/find/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPrescriptionData(prev => ({
        ...prev,
        patientEmail: data.email || prev.patientEmail,
        patientMobile: data.mobile || prev.patientMobile,
        age: data.age || prev.age,
        weight: data.weight || prev.weight,
        height: data.height || prev.height
      }));

      setSuccess("Patient details fetched successfully!");
    } catch (err) {
      console.error("Fetch error:", err);
      setError(`Failed to fetch patient data: ${err.message}`);
    }
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
    const dataToStore = {
      ...prescriptionData,
      timestamp: new Date().toISOString(),
      extractedText: extractedText
    };

    // Store in memory instead of localStorage
    window.ocrPrescriptionData = dataToStore;
    setSuccess("Prescription data prepared for doctor dashboard!");

    // In a real app, you would navigate to the dashboard
    console.log('Data prepared for dashboard:', dataToStore);
  };

  const resetScanner = () => {
    setImage(null);
    setExtractedText('');
    setError('');
    setSuccess('');
    setSearchId('');
    setPrescriptionData({
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
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-600">Enhanced OCR Prescription Scanner</h2>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start text-blue-800">
            <AlertTriangle className="w-5 h-5 mr-2 mt-0.5" />
            <div>
              <p className="font-medium">Advanced Entity Extraction</p>
              <p className="text-sm mt-1">This scanner automatically identifies and populates prescription fields including patient info, medications, dosages, frequencies, and medical instructions from OCR text.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-800">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-800">
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Capture/Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Camera className="w-6 h-6 mr-2" />
              Capture or Upload Image
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Camera Capture</label>
                <div className="space-y-2">
                  <button
                    onClick={isCameraActive ? stopCamera : startCamera}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {isCameraActive ? 'Stop Camera' : 'Start Camera'}
                  </button>

                  {isCameraActive && (
                    <div className="space-y-2">
                      <video
                        ref={videoRef}
                        className="w-full rounded-lg border-2 border-blue-200"
                        autoPlay
                        playsInline
                        muted
                      />
                      <button
                        onClick={captureImage}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Capture Image
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Or Upload Image</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {image && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Captured/Uploaded Image</label>
                  <img
                    src={image}
                    alt="Prescription"
                    className="w-full rounded-lg border-2 border-gray-200"
                  />
                  <button
                    onClick={extractText}
                    disabled={isProcessing}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Extracting & Processing...' : 'Extract Text & Auto-Fill'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Information Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-2" />
              Auto-Extracted Information
            </h3>

            <div className="space-y-4">
              {extractedText && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Raw Extracted Text</label>
                  <div className="p-3 bg-gray-50 rounded-lg border text-sm max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {extractedText}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Patient Email/ID</label>
                    <input
                      type="text"
                      value={prescriptionData.patientEmail}
                      onChange={(e) => {
                        handleInputChange("patientEmail", e.target.value);
                        setSearchId(e.target.value);
                      }}
                      placeholder="patient@example.com or ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Patient Mobile</label>
                    <input
                      type="text"
                      value={prescriptionData.patientMobile}
                      onChange={(e) => {
                        handleInputChange('patientMobile', e.target.value);
                        setSearchId(e.target.value);
                      }}
                      placeholder="+1234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">General Instructions</label>
                  <input
                    type="text"
                    value={prescriptionData.instructions}
                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                    placeholder="Enter general instructions..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">Medications</label>
                    <button
                      onClick={addMedication}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      Add Medication
                    </button>
                  </div>

                  {prescriptionData.medications.map((med, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-2 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Medication {index + 1}</span>
                        <button
                          onClick={() => removeMedication(index)}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Medicine name"
                          value={med.name}
                          onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Dosage (e.g., 500mg)"
                          value={med.dosage}
                          onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Frequency (e.g., twice daily)"
                          value={med.frequency}
                          onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Timing (e.g., after meals)"
                          value={med.timing}
                          onChange={(e) => handleMedicationChange(index, 'timing', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Duration (e.g., 7 days)"
                          value={med.duration}
                          onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Quantity (e.g., 1 tablet)"
                          value={med.quantity}
                          onChange={(e) => handleMedicationChange(index, 'quantity', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Age</label>
                    <input
                      type="number"
                      value={prescriptionData.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      placeholder="Age"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                    <input
                      type="number"
                      value={prescriptionData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      placeholder="Weight"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
                    <input
                      type="number"
                      value={prescriptionData.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      placeholder="Height"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Usage Limit</label>
                    <input
                      type="number"
                      value={prescriptionData.usageLimit}
                      onChange={(e) => handleInputChange('usageLimit', e.target.value)}
                      placeholder="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                  <input
                    type="date"
                    value={prescriptionData.expiresAt}
                    onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={copyToDoctorDashboard}
                    disabled={prescriptionData.medications.length === 0}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send to Doctor Dashboard
                  </button>
                  <button
                    onClick={resetScanner}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCRScanner;