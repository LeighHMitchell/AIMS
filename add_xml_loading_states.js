const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/activities/XmlImportTab.tsx');

console.log('Reading file...');
let content = fs.readFileSync(filePath, 'utf8');

// Add loading state variable after the existing state variables
const oldStateVars = `  const [showDebugConsole, setShowDebugConsole] = useState(false);
  
  // Debug console capture`;

const newStateVars = `  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  // Debug console capture`;

console.log('Adding loading state variable...');
if (content.includes(oldStateVars)) {
  content = content.replace(oldStateVars, newStateVars);
  console.log('✓ Added loading state variable');
} else {
  console.log('✗ Could not find state variables pattern');
}

// Update parseXmlFile function to set loading state
const oldParseFunction = `  // Parse XML file or URL
  const parseXmlFile = async () => {
    console.log('[XML Import Debug] parseXmlFile called, method:', importMethod);
    
    if (importMethod === 'file' && !selectedFile) {
      console.log('[XML Import Debug] No selected file, returning');
      return;
    }
    
    if (importMethod === 'url' && !xmlUrl.trim()) {
      console.log('[XML Import Debug] No URL provided, returning');
      toast.error('Please enter a valid XML URL');
      return;
    }`;

const newParseFunction = `  // Parse XML file or URL
  const parseXmlFile = async () => {
    console.log('[XML Import Debug] parseXmlFile called, method:', importMethod);
    
    if (importMethod === 'file' && !selectedFile) {
      console.log('[XML Import Debug] No selected file, returning');
      return;
    }
    
    if (importMethod === 'url' && !xmlUrl.trim()) {
      console.log('[XML Import Debug] No URL provided, returning');
      toast.error('Please enter a valid XML URL');
      return;
    }

    // Set loading state
    setIsParsing(true);
    setImportStatus({ stage: 'parsing', progress: 0 });`;

console.log('Updating parseXmlFile function...');
if (content.includes(oldParseFunction)) {
  content = content.replace(oldParseFunction, newParseFunction);
  console.log('✓ Updated parseXmlFile function start');
} else {
  console.log('✗ Could not find parseXmlFile function start');
}

// Add loading state reset at the end of parseXmlFile function
const oldCatchBlock = `    } catch (error) {
      console.error('[XML Import Debug] Error parsing XML:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse XML');
      setImportStatus({ stage: 'idle' });
    }
  };`;

const newCatchBlock = `    } catch (error) {
      console.error('[XML Import Debug] Error parsing XML:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to parse XML');
      setImportStatus({ stage: 'idle' });
    } finally {
      setIsParsing(false);
    }
  };`;

console.log('Adding loading state reset...');
if (content.includes(oldCatchBlock)) {
  content = content.replace(oldCatchBlock, newCatchBlock);
  console.log('✓ Added loading state reset');
} else {
  console.log('✗ Could not find catch block pattern');
}

// Update the URL parse button to show loading state
const oldUrlButton = `                    <Button 
                      onClick={parseXmlFile}
                      disabled={!xmlUrl.trim()}
                      className="w-full"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Fetch and Parse XML
                    </Button>`;

const newUrlButton = `                    <Button 
                      onClick={parseXmlFile}
                      disabled={!xmlUrl.trim() || isParsing}
                      className="w-full"
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Parsing XML...
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Fetch and Parse XML
                        </>
                      )}
                    </Button>`;

console.log('Updating URL parse button...');
if (content.includes(oldUrlButton)) {
  content = content.replace(oldUrlButton, newUrlButton);
  console.log('✓ Updated URL parse button');
} else {
  console.log('✗ Could not find URL parse button pattern');
}

// Add parse button for file uploads (after file selection)
const oldFileSection = `              </div>
            )}

            {/* URL Input Section */}`;

const newFileSection = `              </div>
              
              {/* Parse Button for File Upload */}
              {selectedFile && (
                <div className="mt-4">
                  <Button 
                    onClick={parseXmlFile}
                    disabled={isParsing}
                    className="w-full"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Parsing XML...
                      </>
                    ) : (
                      <>
                        <FileCode className="h-4 w-4 mr-2" />
                        Parse XML File
                      </>
                    )}
                  </Button>
                </div>
              )}
            )}

            {/* URL Input Section */}`;

console.log('Adding file parse button...');
if (content.includes(oldFileSection)) {
  content = content.replace(oldFileSection, newFileSection);
  console.log('✓ Added file parse button');
} else {
  console.log('✗ Could not find file section pattern');
}

console.log('Writing updated file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ XML parsing loading states added successfully!');
console.log('\nSummary:');
console.log('- Added isParsing state variable');
console.log('- Updated parseXmlFile function to set loading state');
console.log('- Added loading indicators to URL parse button');
console.log('- Added parse button for file uploads with loading state');

