'use client';

import { GPEDCForm } from '@/components/GPEDCForm';
import { GPEDCFormData } from '@/types/gpedc';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function GPEDCFormPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  
  // Mock current user - in real app this would come from authentication
  const currentUser = {
    id: 'user-123',
    name: 'John Doe',
    role: 'partner'
  };

  const handleSubmit = async (data: GPEDCFormData) => {
    console.log('Submitting GPEDC form data:', data);
    
    // Here you would implement the actual submission logic
    // For example:
    // const { error } = await supabase
    //   .from('gpedc_forms')
    //   .insert({
    //     ...data,
    //     project_id: projectId,
    //   });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('GPEDC form submitted successfully!');
  };

  return (
    <div className="container mx-auto py-8">
      <GPEDCForm
        projectId={projectId || undefined}
        currentUser={currentUser}
        onSubmit={handleSubmit}
      />
    </div>
  );
}