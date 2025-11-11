import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

const Home = () => {
  // Auto slider data (from VTU Network style)
  const slides = useMemo(() => ([
    { title: 'Welcome to Prescription Integrity', subtitle: 'Secure, transparent, and intelligent prescription management' },
    { title: 'AI-Driven Verification', subtitle: 'Ensuring prescription accuracy and patient safety with cutting-edge AI' },
    { title: 'Empowering Healthcare Professionals', subtitle: 'Simplifying workflow and boosting prescription integrity' },
  ]), []);

  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((p) => (p + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, [slides.length]);

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Secure Prescription Management',
      description: 'Store and manage prescriptions securely with blockchain-powered data integrity.'
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Smart Reminders',
      description: 'Get intelligent dose reminders and medication alerts for efficient care.'
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Analytics & Insights',
      description: 'Visualize prescription patterns and adherence analytics effortlessly.'
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: 'Multi-User Access',
      description: 'Doctors, patients, and pharmacists each have tailored dashboards for their needs.'
    }
  ];

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Hero Section with Slider */}
      <section className="relative w-full h-[45vh] overflow-hidden bg-brand-100 flex items-center justify-center">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-700 ${active === i ? 'opacity-100' : 'opacity-0'}`}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-brand-700 mb-4">{slide.title}</h1>
            <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto">{slide.subtitle}</p>
          </div>
        ))}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className={`h-2 w-8 rounded-full ${active === i ? 'bg-brand-700' : 'bg-brand-300'}`} />
          ))}
        </div>
      </section>

      {/* CTA Buttons */}
      <div className="text-center py-12">
        <Link to="/dashboard">
          <Button className="text-lg px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white transition-colors duration-300">
            Go to Dashboard
          </Button>
        </Link>
      </div>

      {/* Existing Feature Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Why Choose Prescription Integrity?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Combining AI precision and blockchain security for next-gen prescription management.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="card-style">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-semibold text-slate-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600 leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border/60 bg-white/80">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-500">© 2025 Prescription Integrity. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
