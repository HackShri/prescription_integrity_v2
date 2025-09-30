import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AlertDescription } from '../ui/alert';
import { 
  Phone, 
  User, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  AlertTriangle,
  CheckCircle,
  Heart
} from 'lucide-react';
import Header from '../layout/Header';

const EmergencyContact = () => {
  const [contacts, setContacts] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
    isPrimary: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load contacts from localStorage on component mount
  useEffect(() => {
    const savedContacts = localStorage.getItem('emergencyContacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  }, []);

  // Save contacts to localStorage whenever contacts change
  useEffect(() => {
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
  }, [contacts]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.relationship.trim()) {
      setError('Relationship is required');
      return false;
    }
    
    // Basic phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      setError('Please enter a valid phone number');
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    if (editingId) {
      // Update existing contact
      setContacts(prev => prev.map(contact => 
        contact.id === editingId 
          ? { ...formData, id: editingId }
          : contact.isPrimary && formData.isPrimary ? { ...contact, isPrimary: false } : contact
      ));
      setSuccess('Contact updated successfully');
    } else {
      // Add new contact
      const newContact = {
        ...formData,
        id: Date.now().toString()
      };
      
      // If this is set as primary, remove primary from others
      if (formData.isPrimary) {
        setContacts(prev => prev.map(contact => ({ ...contact, isPrimary: false })));
      }
      
      setContacts(prev => [...prev, newContact]);
      setSuccess('Contact added successfully');
    }

    resetForm();
  };

  const handleEdit = (contact) => {
    setFormData(contact);
    setEditingId(contact.id);
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    setContacts(prev => prev.filter(contact => contact.id !== id));
    setSuccess('Contact deleted successfully');
  };

  const handleCall = (phone) => {
    window.open(`tel:${phone}`, '_self');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      relationship: '',
      isPrimary: false
    });
    setIsAdding(false);
    setEditingId(null);
    setError('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const primaryContact = contacts.find(contact => contact.isPrimary);
  const otherContacts = contacts.filter(contact => !contact.isPrimary);

  return (
    <div className="min-h-screen gradient-primary relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <Header />
      
      <main className="p-6 max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-8 slide-in-top">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-2">
            Emergency Contacts
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your emergency contacts for quick access during emergencies
          </p>
        </div>

        {error && (
          <div className="alert-error mb-6 slide-in-top">
            <AlertDescription className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {error}
            </AlertDescription>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg slide-in-top">
            <div className="flex items-center text-green-800">
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </div>
          </div>
        )}

        {/* Primary Contact Section */}
        {primaryContact && (
          <Card className="card-style mb-6 border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <Heart className="w-5 h-5 mr-2" />
                Primary Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{primaryContact.name}</h3>
                  <p className="text-gray-600">{primaryContact.relationship}</p>
                  <p className="text-gray-500">{primaryContact.phone}</p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => handleCall(primaryContact.phone)}
                    className="bg-red-500 hover:bg-red-600 text-white"
                    size="lg"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Call Now
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleEdit(primaryContact)}
                    size="sm"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Contact Form */}
        {isAdding && (
          <Card className="card-style mb-6 slide-in-bottom">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingId ? 'Edit Contact' : 'Add Emergency Contact'}
                </CardTitle>
                <Button variant="ghost" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <Label htmlFor="name">
                      <User className="w-4 h-4 inline mr-2" />
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <Label htmlFor="phone">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleInputChange}
                    placeholder="e.g., Spouse, Parent, Sibling, Friend"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    name="isPrimary"
                    checked={formData.isPrimary}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <Label htmlFor="isPrimary" className="text-sm">
                    Set as primary emergency contact
                  </Label>
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" className="button-secondary">
                    <Save className="w-4 h-4 mr-2" />
                    {editingId ? 'Update Contact' : 'Add Contact'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Other Contacts */}
        {otherContacts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Other Emergency Contacts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherContacts.map((contact) => (
                <Card key={contact.id} className="card-style hover:scale-105 transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{contact.name}</h3>
                        <p className="text-gray-600 text-sm">{contact.relationship}</p>
                        <p className="text-gray-500 text-sm">{contact.phone}</p>
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          onClick={() => handleCall(contact.phone)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(contact)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(contact.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Add Contact Button */}
        {!isAdding && (
          <div className="text-center">
            <Button 
              onClick={() => setIsAdding(true)}
              className="button-secondary h-12 text-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Emergency Contact
            </Button>
          </div>
        )}

        {/* Emergency Instructions */}
        <Card className="card-style mt-8 bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-700">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Emergency Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-yellow-800">
              <p>• In case of emergency, call your primary contact immediately</p>
              <p>• Keep your emergency contacts updated with current information</p>
              <p>• Ensure your contacts are aware they are listed as emergency contacts</p>
              <p>• Consider adding medical information to your emergency contacts</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EmergencyContact;
