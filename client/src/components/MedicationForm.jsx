import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Plus, 
  X, 
  Pill, 
  Clock, 
  Calendar,
  Package,
  Info
} from 'lucide-react';

const MedicationForm = ({ medications, onMedicationsChange }) => {
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    quantity: '',
    frequency: '',
    timing: '',
    duration: '',
    instructions: ''
  });

  const frequencyOptions = [
    'once daily',
    'twice daily', 
    'thrice daily',
    'four times daily',
    'as needed',
    'every 4 hours',
    'every 6 hours',
    'every 8 hours',
    'every 12 hours'
  ];

  const timingOptions = [
    'before breakfast',
    'after breakfast',
    'before lunch',
    'after lunch',
    'before dinner',
    'after dinner',
    'at bedtime',
    'on empty stomach',
    'with meals',
    'as directed'
  ];

  const durationOptions = [
    '3 days',
    '5 days',
    '7 days',
    '10 days',
    '2 weeks',
    '3 weeks',
    '1 month',
    'until finished',
    'as needed'
  ];

  const handleAddMedication = () => {
    if (newMedication.name && newMedication.dosage && newMedication.quantity) {
      onMedicationsChange([...medications, { ...newMedication }]);
      setNewMedication({
        name: '',
        dosage: '',
        quantity: '',
        frequency: '',
        timing: '',
        duration: '',
        instructions: ''
      });
    }
  };

  const handleRemoveMedication = (index) => {
    const updatedMedications = medications.filter((_, i) => i !== index);
    onMedicationsChange(updatedMedications);
  };

  const handleInputChange = (field, value) => {
    setNewMedication(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Pill className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Medications</h3>
      </div>

      {/* Add New Medication Form */}
      <Card className="border-2 border-dashed border-gray-300">
        <CardHeader>
          <CardTitle className="text-sm text-gray-600">Add New Medication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="medName">Medicine Name *</Label>
              <Input
                id="medName"
                placeholder="e.g., Paracetamol, Amoxicillin"
                value={newMedication.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dosage">Dosage *</Label>
              <Input
                id="dosage"
                placeholder="e.g., 500mg, 10ml, 1 tablet"
                value={newMedication.dosage}
                onChange={(e) => handleInputChange('dosage', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity to Buy *</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="e.g., 20 tablets"
                value={newMedication.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <select
                id="frequency"
                value={newMedication.frequency}
                onChange={(e) => handleInputChange('frequency', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select frequency</option>
                {frequencyOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="timing">Timing</Label>
              <select
                id="timing"
                value={newMedication.timing}
                onChange={(e) => handleInputChange('timing', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select timing</option>
                {timingOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration</Label>
              <select
                id="duration"
                value={newMedication.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select duration</option>
                {durationOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="instructions">Additional Instructions</Label>
              <Input
                id="instructions"
                placeholder="e.g., Take with plenty of water"
                value={newMedication.instructions}
                onChange={(e) => handleInputChange('instructions', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={handleAddMedication}
            disabled={!newMedication.name || !newMedication.dosage || !newMedication.quantity}
            className="w-full button-secondary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Medication
          </Button>
        </CardContent>
      </Card>

      {/* Display Added Medications */}
      {medications.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Added Medications ({medications.length})</h4>
          {medications.map((med, index) => (
            <Card key={index} className="border-l-4 border-l-primary">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Pill className="w-4 h-4 text-primary" />
                      <h5 className="font-semibold text-lg">{med.name}</h5>
                      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {med.dosage}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Package className="w-3 h-3" />
                        <span>Buy: {med.quantity}</span>
                      </div>
                      {med.frequency && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{med.frequency}</span>
                        </div>
                      )}
                      {med.timing && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{med.timing}</span>
                        </div>
                      )}
                      {med.duration && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{med.duration}</span>
                        </div>
                      )}
                    </div>
                    
                    {med.instructions && (
                      <div className="mt-2 flex items-start space-x-1">
                        <Info className="w-3 h-3 mt-0.5 text-gray-500" />
                        <span className="text-sm text-gray-600">{med.instructions}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveMedication(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicationForm; 