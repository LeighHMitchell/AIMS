"use client"

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AppraisalStage } from '@/types/project-bank';
import { cn } from '@/lib/utils';

interface ContextualHelpButtonProps {
  stage: AppraisalStage;
}

/** Glossary definitions grouped by stage relevance */
const GLOSSARY: Record<string, { term: string; definition: string; stages: AppraisalStage[] }[]> = {
  general: [
    { term: 'MSDP', definition: 'Myanmar Sustainable Development Plan — the national development framework guiding investment priorities.', stages: ['intake', 'msdp_screening'] },
    { term: 'NDP', definition: 'National Development Plan — strategic goals that projects should align with for state support.', stages: ['intake', 'msdp_screening'] },
    { term: 'SDG', definition: 'Sustainable Development Goals — 17 global goals adopted by the United Nations for sustainable development by 2030.', stages: ['intake'] },
  ],
  financial: [
    { term: 'FIRR', definition: 'Financial Internal Rate of Return — the discount rate at which the net present value of all project cash flows equals zero. A FIRR ≥ 10% indicates the project is commercially viable.', stages: ['firr_assessment', 'dp_consultation'] },
    { term: 'NPV', definition: 'Net Present Value — the difference between the present value of cash inflows and outflows. Positive NPV means the project adds value.', stages: ['firr_assessment', 'eirr_assessment'] },
    { term: 'CAPEX', definition: 'Capital Expenditure — one-time construction and setup costs incurred during the construction phase.', stages: ['preliminary_fs', 'firr_assessment'] },
    { term: 'OPEX', definition: 'Operating Expenditure — recurring annual costs to operate and maintain the project.', stages: ['preliminary_fs', 'firr_assessment'] },
    { term: 'Payback Period', definition: 'The number of years it takes for cumulative net cash flows to become positive.', stages: ['firr_assessment'] },
  ],
  economic: [
    { term: 'EIRR', definition: 'Economic Internal Rate of Return — measures the project\'s value to society using shadow prices. An EIRR ≥ 15% qualifies for PPP mechanism.', stages: ['eirr_assessment', 'dp_consultation'] },
    { term: 'ENPV', definition: 'Economic Net Present Value — the net present value calculated using economic (shadow) prices rather than market prices.', stages: ['eirr_assessment'] },
    { term: 'BCR', definition: 'Benefit-Cost Ratio — the ratio of present value of benefits to present value of costs. A BCR > 1.0 means benefits exceed costs.', stages: ['eirr_assessment'] },
    { term: 'Shadow Prices', definition: 'Adjusted prices that reflect the true economic value of goods and services, correcting for market distortions like subsidies, taxes, and wage premiums.', stages: ['eirr_assessment'] },
    { term: 'Social Discount Rate', definition: 'The rate used to discount future economic benefits and costs to present value. Typically lower than private discount rates.', stages: ['eirr_assessment'] },
  ],
  ppp: [
    { term: 'VGF', definition: 'Viability Gap Funding — a government subsidy (grant, annuity, or in-kind) to bridge the gap between a project\'s financial returns and its economic viability.', stages: ['vgf_assessment'] },
    { term: 'PPP', definition: 'Public-Private Partnership — a long-term contract between government and private entity for delivering public infrastructure or services.', stages: ['vgf_assessment', 'dp_consultation'] },
    { term: 'DAP', definition: 'Development Assistance Policy — the framework governing how official development assistance is received and managed.', stages: ['vgf_assessment'] },
    { term: 'ODA', definition: 'Official Development Assistance — government aid that promotes economic development and welfare of developing countries.', stages: ['dp_consultation'] },
  ],
};

export function ContextualHelpButton({ stage }: ContextualHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get relevant definitions for the current stage
  const allDefs = Object.values(GLOSSARY).flat();
  const relevantDefs = allDefs.filter(d => d.stages.includes(stage));
  const otherDefs = allDefs.filter(d => !d.stages.includes(stage));

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-gray-800 text-white shadow-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
        title="Glossary & Help"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {/* Slide-in panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 bottom-0 z-50 w-[360px] max-w-[90vw] bg-background border-l shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Glossary</h3>
                <p className="text-xs text-muted-foreground">Key terms and definitions</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="px-5 py-4 space-y-6">
              {/* Relevant to current stage */}
              {relevantDefs.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Relevant to this stage</h4>
                  <div className="space-y-3">
                    {relevantDefs.map(d => (
                      <div key={d.term} className="p-3 rounded-lg bg-muted/30 border">
                        <div className="text-sm font-semibold">{d.term}</div>
                        <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.definition}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other terms */}
              {otherDefs.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">All terms</h4>
                  <div className="space-y-3">
                    {otherDefs.map(d => (
                      <div key={d.term} className="p-3 rounded-lg">
                        <div className="text-sm font-semibold">{d.term}</div>
                        <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.definition}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
