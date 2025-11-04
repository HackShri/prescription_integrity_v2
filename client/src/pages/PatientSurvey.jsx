import React, { useState } from 'react';
import { submitPatientSurvey } from '../api/authService';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const steps = ['Basics', 'Conditions', 'Lifestyle', 'Allergies & Meds', 'Emergency'];

export default function PatientSurvey() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [form, setForm] = useState({
    age: '',
    height: '',
    weight: '',
    bloodGroup: 'Unknown',
    diabetes: false,
    hypertension: false,
    asthma: false,
    smoking: 'unknown',
    alcohol: 'unknown',
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    priorSurgeries: [],
    emergencyContact: { name: '', phone: '', relation: '' }
  });

  const toggleArrayItem = (key, value) => {
    setForm(prev => {
      const arr = new Set(prev[key] || []);
      if (arr.has(value)) arr.delete(value); else arr.add(value);
      return { ...prev, [key]: Array.from(arr) };
    });
  };

  const next = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await submitPatientSurvey(form);
      navigate('/dashboard');
    } catch (e) {
      setError('Failed to save survey. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Patient Health Survey</h1>
          <p className="text-gray-600">Help us tailor your care by answering a few quick questions.</p>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((label, idx) => (
              <span key={label} className={`px-3 py-1 rounded-full text-sm ${idx === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{label}</span>
            ))}
          </div>
          <span className="text-sm text-gray-500">Step {step + 1} of {steps.length}</span>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Age</Label>
                <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input type="number" value={form.height} onChange={e => setForm({ ...form, height: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" value={form.weight} onChange={e => setForm({ ...form, weight: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Blood Group</Label>
                <select className="w-full border rounded px-3 py-2" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.diabetes} onChange={e => setForm({ ...form, diabetes: e.target.checked })} /> Diabetes</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.hypertension} onChange={e => setForm({ ...form, hypertension: e.target.checked })} /> Hypertension</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.asthma} onChange={e => setForm({ ...form, asthma: e.target.checked })} /> Asthma</label>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Smoking</Label>
                <select className="w-full border rounded px-3 py-2" value={form.smoking} onChange={e => setForm({ ...form, smoking: e.target.value })}>
                  {['never','former','current','unknown'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label>Alcohol</Label>
                <select className="w-full border rounded px-3 py-2" value={form.alcohol} onChange={e => setForm({ ...form, alcohol: e.target.value })}>
                  {['never','occasional','regular','unknown'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <Label>Allergies (select common)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Penicillin','Sulfa','Aspirin','Latex','Peanuts','Shellfish'].map(a => (
                    <button type="button" key={a} className={`px-3 py-1 rounded border ${form.allergies.includes(a) ? 'bg-blue-600 text-white' : 'bg-white'}`} onClick={() => toggleArrayItem('allergies', a)}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Chronic Conditions (quick add)</Label>
                <Input placeholder="Type and press Enter" onKeyDown={e => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    toggleArrayItem('chronicConditions', e.currentTarget.value.trim());
                    e.currentTarget.value = '';
                  }
                }} />
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.chronicConditions.map(c => (
                    <span key={c} className="px-2 py-1 bg-gray-100 rounded">{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <Label>Current Medications (quick add)</Label>
                <Input placeholder="Type and press Enter" onKeyDown={e => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    toggleArrayItem('currentMedications', e.currentTarget.value.trim());
                    e.currentTarget.value = '';
                  }
                }} />
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.currentMedications.map(m => (
                    <span key={m} className="px-2 py-1 bg-gray-100 rounded">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input value={form.emergencyContact.name} onChange={e => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.emergencyContact.phone} onChange={e => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })} />
              </div>
              <div>
                <Label>Relation</Label>
                <Input value={form.emergencyContact.relation} onChange={e => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relation: e.target.value } })} />
              </div>
            </div>
          )}

          {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}

          <div className="mt-6 flex items-center justify-between">
            <div />
            <div className="flex gap-2">
              <Button variant="outline" onClick={back} disabled={step === 0}>Back</Button>
              {step < steps.length - 1 ? (
                <Button onClick={next}>Next</Button>
              ) : (
                <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Finish'}</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
