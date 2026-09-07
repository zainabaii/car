import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import VinDecoder from './components/VinDecoder';
import AgentOrchestratorVisual from './components/AgentOrchestratorVisual';
import AiChatSection from './components/AiChatSection';
import DigitalGarage from './components/DigitalGarage';
import MaintenanceHub from './components/MaintenanceHub';
import WorkshopFinder from './components/WorkshopFinder';
import ServiceReminders from './components/ServiceReminders';
import FeatureGrid from './components/FeatureGrid';
import Footer from './components/Footer';

export default function App() {
  const [activeSection, setActiveSection] = useState('hero');
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [chatInitialPrompt, setChatInitialPrompt] = useState(null);

  const handleNavigate = (sectionId) => {
    setActiveSection(sectionId);
    if (sectionId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleVehicleDecoded = (vehicle) => {
    setActiveVehicle(vehicle);
  };

  const handleAskVayraAboutCar = (vehicle) => {
    setActiveVehicle(vehicle);
    setChatInitialPrompt(`Please give me a comprehensive overview and maintenance tips for my ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.engine}).`);
    handleNavigate('ai-care');
  };

  const handleStartChatWithPrompt = (promptText) => {
    setChatInitialPrompt(promptText);
    handleNavigate('ai-care');
  };

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-100 font-sans selection:bg-[#00F0FF] selection:text-black">
      
      {/* Navbar */}
      <Navbar 
        onNavigate={handleNavigate}
        activeSection={activeSection}
        activeVehicle={activeVehicle}
      />

      {/* Hero Section */}
      <Hero 
        onStartChat={() => handleNavigate('ai-care')}
        onScrollToVin={() => handleNavigate('vehicle')}
        onSelectPrompt={handleStartChatWithPrompt}
      />

      {/* VIN Decoder Section */}
      <VinDecoder 
        onVehicleDecoded={handleVehicleDecoded}
        onAskVayraAboutCar={handleAskVayraAboutCar}
      />

      {/* Agentic Orchestrator Architecture Visualization */}
      <AgentOrchestratorVisual 
        onSelectAgentPrompt={handleStartChatWithPrompt}
      />

      {/* Main AI Co-Pilot Experience Section */}
      <AiChatSection 
        activeVehicle={activeVehicle}
        initialPrompt={chatInitialPrompt}
      />

      {/* VAYRA Digital Garage OS */}
      <DigitalGarage 
        activeVehicle={activeVehicle}
        onOpenChat={handleStartChatWithPrompt}
      />

      {/* Smart Maintenance Section */}
      <MaintenanceHub 
        activeVehicle={activeVehicle}
        onAskMaintenanceQuestion={handleStartChatWithPrompt}
      />

      {/* Workshop Discovery Section */}
      <WorkshopFinder 
        onAskWorkshopQuestion={handleStartChatWithPrompt}
      />

      {/* Service Reminders Milestone Section */}
      <ServiceReminders 
        onAskReminderQuestion={handleStartChatWithPrompt}
      />

      {/* Feature Storytelling Cards Grid */}
      <FeatureGrid 
        onNavigate={handleNavigate}
      />

      {/* Footer */}
      <Footer 
        onNavigate={handleNavigate}
      />

    </div>
  );
}
