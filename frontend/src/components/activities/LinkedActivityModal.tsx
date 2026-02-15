'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface LinkedActivityModalProps {
  activity: {
    id: string;
    title: string;
    iati_id: string;
  };
  onConfirm: (relationshipType: string) => void;
  onCancel: () => void;
}

const RELATIONSHIP_TYPES = [
  { value: '1', label: 'Parent', description: 'This activity is a parent of the selected activity' },
  { value: '2', label: 'Child', description: 'This activity is a child of the selected activity' },
  { value: '3', label: 'Sibling', description: 'This activity is a sibling of the selected activity' },
  { value: '4', label: 'Co-funded', description: 'This activity is co-funded with the selected activity' },
  { value: '5', label: 'Third-party report', description: 'Third-party report for the selected activity' }
];

const LinkedActivityModal: React.FC<LinkedActivityModalProps> = ({ 
  activity, 
  onConfirm, 
  onCancel 
}) => {
  const [selectedType, setSelectedType] = useState('');

  const handleConfirm = () => {
    if (selectedType) {
      onConfirm(selectedType);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Link Activity</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            You are linking to:
          </p>
          <div className="p-3 bg-gray-50 rounded border">
            <h4 className="font-medium text-sm">{activity.title}</h4>
            <p className="text-xs text-gray-600 mt-1">
              IATI ID: {activity.iati_id || 'N/A'}
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Relationship Type <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />
          </label>
          <div className="space-y-2">
            {RELATIONSHIP_TYPES.map((type) => (
              <label
                key={type.value}
                className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="relationshipType"
                  value={type.value}
                  checked={selectedType === type.value}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="sr-only"
                />
                <div>
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{type.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={!selectedType}
            className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
              selectedType
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Create Link
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkedActivityModal; 