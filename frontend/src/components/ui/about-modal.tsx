"use client"

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Heart, Code2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] p-0">
        <DialogHeader className="mx-0 mt-0 px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Info className="h-5 w-5" />
            About DFMIS
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="about" className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3 max-w-[500px]">
              <TabsTrigger value="about" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                About
              </TabsTrigger>
              <TabsTrigger value="acknowledgements" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Acknowledgements
              </TabsTrigger>
              <TabsTrigger value="opensource" className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Open Source
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

          <TabsContent value="opensource" className="mt-0 border-0 p-0">
            <ScrollArea className="h-[60vh] px-6 pb-6">
              <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mt-4 mb-3">
                    Open Source Software
                  </h2>
                  <p className="leading-relaxed">
                    DFMIS is built with open source software. We are grateful to the developers and communities
                    behind these projects for making their work freely available.
                  </p>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Core Frameworks</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">React</span> &ndash; User interface library by Meta (MIT License)</li>
                    <li><span className="font-medium">Next.js</span> &ndash; React framework by Vercel (MIT License)</li>
                    <li><span className="font-medium">TypeScript</span> &ndash; Typed JavaScript by Microsoft (Apache 2.0)</li>
                    <li><span className="font-medium">Node.js</span> &ndash; JavaScript runtime (MIT License)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">UI Components & Styling</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">Radix UI</span> &ndash; Accessible component primitives (MIT License)</li>
                    <li><span className="font-medium">shadcn/ui</span> &ndash; Component library built on Radix UI</li>
                    <li><span className="font-medium">Tailwind CSS</span> &ndash; Utility-first CSS framework (MIT License)</li>
                    <li><span className="font-medium">Framer Motion</span> &ndash; Animation library for React (MIT License)</li>
                    <li><span className="font-medium">class-variance-authority</span> &ndash; UI variant management (Apache 2.0)</li>
                    <li><span className="font-medium">Sonner</span> &ndash; Toast notification system (MIT License)</li>
                    <li><span className="font-medium">NProgress</span> &ndash; Page loading progress bar (MIT License)</li>
                    <li><span className="font-medium">react-window</span> &ndash; Virtual scrolling for large lists (MIT License)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Icons & Graphics</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">Lucide React</span> &ndash; Open source icon library (ISC License)</li>
                    <li><span className="font-medium">Radix UI Icons</span> &ndash; Icon set by Radix (MIT License)</li>
                    <li><span className="font-medium">react-world-flags</span> &ndash; Country flag components (MIT License)</li>
                    <li><span className="font-medium">UN SDG Icons</span> &ndash; Sustainable Development Goals graphics</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Data Visualisation</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">Recharts</span> &ndash; React charting library (MIT License)</li>
                    <li><span className="font-medium">D3.js</span> &ndash; Data-driven documents library (ISC License)</li>
                    <li><span className="font-medium">d3-sankey</span> &ndash; Sankey diagram generator (ISC License)</li>
                    <li><span className="font-medium">react-pivottable</span> &ndash; Pivot table component (MIT License)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Maps & Geospatial</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">MapLibre GL</span> &ndash; Vector map rendering (ISC License)</li>
                    <li><span className="font-medium">Leaflet</span> &ndash; Interactive mapping library (BSD-2-Clause)</li>
                    <li><span className="font-medium">react-leaflet</span> &ndash; React components for Leaflet (MIT License)</li>
                    <li><span className="font-medium">Google Maps API</span> &ndash; Mapping services by Google (Apache 2.0)</li>
                    <li><span className="font-medium">OpenStreetMap</span> &ndash; Map data and tiles (ODbL License)</li>
                    <li><span className="font-medium">Nominatim</span> &ndash; Geocoding service by OpenStreetMap (ODbL License)</li>
                    <li><span className="font-medium">CartoDB</span> &ndash; Vector basemap tiles</li>
                    <li><span className="font-medium">OpenFreeMap</span> &ndash; Free map tile service</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Forms & Validation</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">React Hook Form</span> &ndash; Performant form library (MIT License)</li>
                    <li><span className="font-medium">Zod</span> &ndash; TypeScript-first schema validation (MIT License)</li>
                    <li><span className="font-medium">react-select</span> &ndash; Advanced select/dropdown component (MIT License)</li>
                    <li><span className="font-medium">react-dropzone</span> &ndash; File upload drag and drop zone (MIT License)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Calendar & Date Handling</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">FullCalendar</span> &ndash; Calendar component framework (MIT License)</li>
                    <li><span className="font-medium">date-fns</span> &ndash; Modern date utility library (MIT License)</li>
                    <li><span className="font-medium">react-datepicker</span> &ndash; Date picker component (MIT License)</li>
                    <li><span className="font-medium">react-day-picker</span> &ndash; Day selection component (MIT License)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Rich Text & Documents</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">Tiptap</span> &ndash; Headless rich text editor (MIT License)</li>
                    <li><span className="font-medium">jsPDF</span> &ndash; PDF generation library (MIT License)</li>
                    <li><span className="font-medium">pdf.js</span> &ndash; PDF rendering by Mozilla (Apache 2.0)</li>
                    <li><span className="font-medium">html2canvas</span> &ndash; HTML to canvas conversion (MIT License)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Data Processing</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">SheetJS (XLSX)</span> &ndash; Spreadsheet toolkit (Apache 2.0)</li>
                    <li><span className="font-medium">fast-xml-parser</span> &ndash; XML parsing library (MIT License)</li>
                    <li><span className="font-medium">DOMPurify</span> &ndash; HTML sanitisation (MPL-2.0)</li>
                    <li><span className="font-medium">Lodash</span> &ndash; Utility functions library (MIT License)</li>
                    <li><span className="font-medium">sharp</span> &ndash; High-performance image processing (Apache 2.0)</li>
                    <li><span className="font-medium">uuid</span> &ndash; Unique identifier generation (MIT License)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Menus & Interaction</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">Bloom Menu</span> &ndash; Animated radial action menu component (ISC License)</li>
                    <li><span className="font-medium">dnd-kit</span> &ndash; Modern drag and drop toolkit (MIT License)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Backend & Services</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">Supabase</span> &ndash; Open source backend platform (Apache 2.0)</li>
                    <li><span className="font-medium">Resend</span> &ndash; Email delivery service</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Standards & Data</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">IATI Standard</span> &ndash; International Aid Transparency Initiative data specification (CC-BY)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Testing</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
                    <li><span className="font-medium">Playwright</span> &ndash; End-to-end testing framework (Apache 2.0)</li>
                    <li><span className="font-medium">Jest</span> &ndash; JavaScript testing framework (MIT License)</li>
                    <li><span className="font-medium">Testing Library</span> &ndash; Testing utilities for React (MIT License)</li>
                  </ul>
                </section>

                <section className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    This list includes the major dependencies used in DFMIS. For a complete list of all packages
                    and their versions, please refer to the project's package.json file. We extend our thanks to
                    the entire open source community whose work makes projects like this possible.
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
