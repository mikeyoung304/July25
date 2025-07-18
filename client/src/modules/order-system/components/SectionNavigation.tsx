import React from 'react';
import { menuSections } from '../types/menu-sections';

interface SectionNavigationProps {
  activeSection?: string;
  onSectionClick: (sectionId: string) => void;
}

export const SectionNavigation: React.FC<SectionNavigationProps> = ({ 
  activeSection,
  onSectionClick 
}) => {
  const scrollToSection = (sectionId: string) => {
    onSectionClick(sectionId);
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      const yOffset = -140; // Account for sticky headers
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="px-6 py-3">
        <div className="flex items-center space-x-6 overflow-x-auto scrollbar-hide">
          {menuSections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 transition-colors whitespace-nowrap ${
                activeSection === section.id
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="text-lg">{section.icon}</span>
              <span className="font-medium">{section.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};