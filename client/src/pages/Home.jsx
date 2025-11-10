import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

const Home = () => {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Secure Prescription Management",
      description: "Store and manage your prescriptions securely with blockchain technology ensuring data integrity and privacy."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Smart Reminders",
      description: "Never miss a dose with intelligent medication reminders and scheduling features."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Analytics & Insights",
      description: "Track your medication adherence and get detailed analytics to improve your health outcomes."
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Multi-User Support",
      description: "Support for patients, doctors, pharmacists, and administrators with role-based access control."
    }
  ];

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="pt-8 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-brand-700 leading-tight">
            Prescription
            <br />
            <span className="text-brand-500">Integrity</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Secure, transparent, and intelligent prescription management powered by blockchain technology
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button className="button-style text-lg px-8 py-4">
                Get Started
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="outline"
                className="text-lg px-8 py-4 border border-brand-300 text-brand-700 hover:bg-brand-600 hover:text-white transition-colors duration-200"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Why Choose Prescription Integrity?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Our platform combines cutting-edge technology with user-friendly design to revolutionize prescription management
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="card-style">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-semibold text-slate-900">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="glass p-12">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-slate-900 mb-4">
                Ready to Transform Your Prescription Management?
              </CardTitle>
              <CardDescription className="text-xl text-slate-600">
                Join thousands of users who trust our platform for secure and efficient prescription management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/signup">
                  <Button className="button-secondary text-lg px-8 py-4">
                    Start Your Free Trial
                  </Button>
                </Link>
                <Link to="/about">
                  <Button
                    variant="outline"
                    className="text-lg px-8 py-4 border border-teal-300 text-teal-700 hover:bg-teal-500 hover:text-white transition-colors duration-200"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border/60 bg-white/80">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-slate-500">
            © 2024 Prescription Integrity. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;