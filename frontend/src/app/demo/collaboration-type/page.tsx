import { CollaborationTypeDemo } from "@/components/demo/CollaborationTypeDemo";

export const dynamic = "force-dynamic";

export default function CollaborationTypeDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <CollaborationTypeDemo />
      </div>
    </div>
  );
} 