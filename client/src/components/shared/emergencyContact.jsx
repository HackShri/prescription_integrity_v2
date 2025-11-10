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

  // --- CORRECTED CallButton COMPONENT ---
  // This component now correctly handles both mobile and desktop devices.
  const CallButton = ({ phone, isPrimary = false }) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // On mobile, use the 'tel:' link to open the native phone dialer.
    if (isMobile) {
      return (
        <Button
          onClick={() => window.open(`tel:${phone}`, '_self')}
          className={isPrimary ? "bg-destructive hover:bg-destructive/90 text-white" : "bg-teal-500 hover:bg-teal-600 text-white"}
          size={isPrimary ? "lg" : "sm"}
        >
          <Phone className={isPrimary ? "w-5 h-5 mr-2" : "w-4 h-4"} />
          {isPrimary && 'Call Now'}
        </Button>
      );
    }

    // On desktop, open a WhatsApp chat link in a new tab.
    return (
      <Button
        onClick={() => window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank')}
        title="Open WhatsApp Chat"
        className={isPrimary ? "bg-destructive hover:bg-destructive/90 text-white" : "bg-teal-500 hover:bg-teal-600 text-white"}
        size={isPrimary ? "lg" : "sm"}
      >
        <Phone className={isPrimary ? "w-5 h-5 mr-2" : "w-4 h-4"} />
        {isPrimary ? 'Chat on WhatsApp' : ''}
      </Button>
    );
  };

  const primaryContact = contacts.find(contact => contact.isPrimary);
  const otherContacts = contacts.filter(contact => !contact.isPrimary);

  return (
    <div className="min-h-screen bg-brand-50">
      <Header />

      <main className="p-6 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-brand-700 mb-2">
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
          <div className="alert-success mb-6">
            <div className="flex items-center text-teal-700">
              <CheckCircle className="w-5 h-5 mr-2 text-teal-600" />
              {success}
            </div>
          </div>
        )}

        {/* Primary Contact Section */}
        {primaryContact && (
          <Card className="card-style mb-6 bg-brand-50 border border-brand-100">
            <CardHeader>
              <CardTitle className="flex items-center text-brand-700">
                <Heart className="w-5 h-5 mr-2 text-destructive" />
                Primary Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{primaryContact.name}</h3>
                  <p className="text-slate-600">{primaryContact.relationship}</p>
                  <p className="text-slate-500">{primaryContact.phone}</p>
                </div>
                <div className="flex space-x-2">
                  <CallButton phone={primaryContact.phone} isPrimary={true} />
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
                      placeholder="+911234567890"
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
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Other Emergency Contacts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherContacts.map((contact) => (
                <Card key={contact.id} className="card-style transition-all duration-200 hover:-translate-y-1">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{contact.name}</h3>
                        <p className="text-slate-600 text-sm">{contact.relationship}</p>
                        <p className="text-slate-500 text-sm">{contact.phone}</p>
                      </div>
                      <div className="flex space-x-1">
                        <CallButton phone={contact.phone} />
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
                          className="text-destructive hover:text-destructive/80 border-destructive/30"
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
        <Card className="card-style mt-8 bg-warning/10 border border-warning/40">
          <CardHeader>
            <CardTitle className="flex items-center text-warning">
              <AlertTriangle className="w-5 h-5 mr-2 text-warning" />
              Emergency Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-warning">
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