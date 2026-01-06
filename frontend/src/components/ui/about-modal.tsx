"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Heart } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Info className="h-5 w-5" />
            About DFMIS
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="about" className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="about" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                About
              </TabsTrigger>
              <TabsTrigger value="acknowledgements" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Acknowledgements
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="about" className="mt-0 border-0 p-0">
            <ScrollArea className="h-[60vh] px-6 pb-6">
              <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mt-4 mb-3">
                    About the Development Finance Management Information System (DFMIS)
                  </h2>
                  <p className="leading-relaxed">
                    The Development Finance Management Information System (DFMIS) is a comprehensive digital platform 
                    designed to help governments, development partners, and implementing organisations manage, track, 
                    and analyse development finance in a transparent, coordinated, and policy-relevant way.
                  </p>
                  <p className="leading-relaxed">
                    DFMIS builds on the foundations of modern Aid Information Management Systems (AIMS) but goes further. 
                    It is designed not only to track Official Development Assistance (ODA), but also to support a broader 
                    view of development finance, including non-ODA flows, vertical funds, climate finance, humanitarian 
                    assistance, and other public and publicly backed resources that contribute to national development outcomes.
                  </p>
                  <p className="leading-relaxed font-medium text-gray-800">
                    At its core, DFMIS is about making development finance intelligible, comparable, and actionable for decision-makers.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Purpose and scope</h2>
                  <p className="leading-relaxed">
                    DFMIS exists to address a persistent gap in development finance management: while large volumes of data 
                    are reported internationally, governments and partners often lack an integrated, usable system that reflects 
                    how funds are planned, approved, disbursed, and spent in practice.
                  </p>
                  <p className="leading-relaxed mb-2">The system supports:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li>National ownership and oversight of external finance</li>
                    <li>Alignment of development finance with national plans, budgets, and sector priorities</li>
                    <li>Reduced reporting burden through standards-based data reuse</li>
                    <li>Evidence-based policy dialogue grounded in real financial and programme data</li>
                  </ul>
                  <p className="leading-relaxed mt-3">
                    DFMIS is suitable for low-, middle-, and fragile-context settings, where financing arrangements are 
                    complex and data completeness varies over time.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">What DFMIS enables</h2>
                  
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Integrated development finance tracking</h3>
                  <p className="leading-relaxed">
                    DFMIS captures development finance across its full lifecycle, from pipeline and approval to implementation 
                    and closure. It supports detailed tracking of:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li>Projects, programmes, and activities</li>
                    <li>Commitments, planned disbursements, disbursements, and expenditure</li>
                    <li>Grants, loans, technical assistance, and other finance instruments</li>
                    <li>On-budget and off-budget flows</li>
                  </ul>
                  <p className="leading-relaxed mt-3">
                    This allows users to see not just what has been promised, but what is actually flowing and where gaps or delays occur.
                  </p>

                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Standards-aligned by design</h3>
                  <p className="leading-relaxed">
                    The system is built around the International Aid Transparency Initiative (IATI) Standard, ensuring that activity 
                    and transaction data can be validated, exchanged, and published without rework. Key classifications such as sector, 
                    flow type, finance type, aid modality, and policy markers are embedded directly in the data model.
                  </p>
                  <p className="leading-relaxed mt-2">
                    At the same time, DFMIS allows countries to layer in national classifications, including charts of accounts, 
                    programme structures, and administrative codes, enabling meaningful alignment with domestic public financial 
                    management systems.
                  </p>

                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Government-centred workflows</h3>
                  <p className="leading-relaxed">
                    DFMIS places recipient governments at the centre of development finance oversight. Government users can:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li>Review and validate reported activities</li>
                    <li>Request clarification or revisions from reporting organisations</li>
                    <li>Monitor alignment with national priorities and budget cycles</li>
                    <li>Maintain audit trails of approvals and changes</li>
                  </ul>
                  <p className="leading-relaxed mt-3">
                    This supports stronger coordination, transparency, and accountability without disrupting partner reporting practices.
                  </p>

                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Analytics for planning and policy</h3>
                  <p className="leading-relaxed">
                    Built-in analytics transform raw finance data into practical insight. Users can explore:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li>Sectoral and geographic distribution of development finance</li>
                    <li>Trends over time across commitments and disbursements</li>
                    <li>Portfolio composition by donor, modality, or implementing partner</li>
                    <li>Gaps between planned and actual financing</li>
                  </ul>
                  <p className="leading-relaxed mt-3">
                    Visualisations, tables, and filters are designed for policy teams and planners, not only data specialists.
                  </p>

                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Role-based collaboration</h3>
                  <p className="leading-relaxed">
                    DFMIS supports multiple user roles, including government officials, donors, implementing partners, and system 
                    administrators. Permissions are managed to balance transparency with appropriate access control, enabling 
                    collaboration while safeguarding data integrity.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Design principles</h2>
                  <p className="leading-relaxed mb-2">DFMIS is guided by a clear set of principles:</p>
                  <ul className="space-y-2 ml-2">
                    <li className="text-gray-600">
                      <span className="font-medium text-gray-800">Country ownership first:</span> Development finance data 
                      should serve national planning and accountability needs.
                    </li>
                    <li className="text-gray-600">
                      <span className="font-medium text-gray-800">Standards, not silos:</span> International standards are 
                      used to reduce duplication and increase interoperability.
                    </li>
                    <li className="text-gray-600">
                      <span className="font-medium text-gray-800">Practical realism:</span> The system accommodates partial 
                      data, revisions, and evolving project information.
                    </li>
                    <li className="text-gray-600">
                      <span className="font-medium text-gray-800">Scalable architecture:</span> DFMIS can grow from an 
                      aid-focused system into a full development finance platform over time.
                    </li>
                    <li className="text-gray-600">
                      <span className="font-medium text-gray-800">Usability and clarity:</span> Complex finance concepts 
                      are presented in clear, structured, and navigable ways.
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Who DFMIS is for</h2>
                  <p className="leading-relaxed mb-2">DFMIS is designed for:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li>Government ministries responsible for planning, finance, or aid coordination</li>
                    <li>Bilateral and multilateral development partners</li>
                    <li>International and local implementing organisations</li>
                    <li>Analysts and policymakers working on development finance effectiveness</li>
                  </ul>
                  <p className="leading-relaxed mt-3">
                    Depending on configuration, parts of the system may also support public transparency and open data access.
                  </p>
                </section>

                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Looking ahead</h2>
                  <p className="leading-relaxed">
                    DFMIS is not just a database. It is a digital public good that strengthens how development finance is governed, 
                    coordinated, and understood. By bringing together international standards and national systems in one platform, 
                    it helps ensure that development finance is not only tracked, but actively used to support better decisions and 
                    better outcomes.
                  </p>
                </section>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="acknowledgements" className="mt-0 border-0 p-0">
            <ScrollArea className="h-[60vh] px-6 pb-6">
              <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mt-4 mb-3">
                    Acknowledgements
                  </h2>
                  <p className="leading-relaxed">
                    The development of DFMIS would not have been possible without the support, guidance, and encouragement 
                    of many individuals and organisations.
                  </p>
                  <p className="leading-relaxed">
                    I would like to express my deepest gratitude to <span className="font-medium">Dr. Yadanar</span>, my wife, 
                    for her unwavering support, patience, and encouragement throughout this journey. Her understanding and 
                    belief in this work have been invaluable.
                  </p>
                  <p className="leading-relaxed">
                    To my son and family, thank you for your patience and for providing the foundation of support that 
                    made this work possible.
                  </p>
                  <p className="leading-relaxed">
                    I am grateful to the many <span className="font-medium">technical experts</span> who generously shared 
                    their knowledge and insights, helping to shape the design and functionality of this system.
                  </p>
                  <p className="leading-relaxed">
                    Special thanks to the <span className="font-medium">IATI Secretariat</span> for their guidance on 
                    international standards and for their continued efforts to promote transparency in development finance.
                  </p>
                  <p className="leading-relaxed">
                    Finally, I wish to acknowledge all those who provided advice, feedback, and encouragement along the way. 
                    Your contributions, both large and small, have helped bring this vision to life.
                  </p>
                </section>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
