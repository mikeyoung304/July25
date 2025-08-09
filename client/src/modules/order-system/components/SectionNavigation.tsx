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
      const yOffset = -180; // Account for larger sticky headers
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex items-center space-x-6 md:space-x-8 overflow-x-auto py-6 md:py-8 scrollbar-hide">
          {menuSections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`text-lg md:text-xl font-semibold whitespace-nowrap py-2 px-4 rounded-xl transition-all duration-200 min-h-[48px] ${
                activeSection === section.id
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

};