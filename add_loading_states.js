const fs = require('fs');

// Read the file
const filePath = 'frontend/src/components/activities/XmlImportTab.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Loader2 to imports
content = content.replace(
  /  ClipboardPaste,\n} from 'lucide-react';/,
  `  ClipboardPaste,\n  Loader2,\n} from 'lucide-react';`
);

// 2. Add isParsing state
content = content.replace(
  /  const \[xmlContent, setXmlContent\] = useState<string>\(cachedData\?\.xmlContent \|\| ''\);/,
  `  const [xmlContent, setXmlContent] = useState<string>(cachedData?.xmlContent || '');
  const [isParsing, setIsParsing] = useState(false);`
);

// 3. Add setIsParsing(true) before the main try block
content = content.replace(
  /    console\.log\('\[XML Import Debug\] Setting status to uploading'\);\n    setImportStatus\(\{ stage: 'uploading', progress: 20 \}\);\n\n    try \{/,
  `    console.log('[XML Import Debug] Setting status to uploading');
    setImportStatus({ stage: 'uploading', progress: 20 });

    setIsParsing(true);
    try {`
);

// 4. Add setIsParsing(false) in finally block
content = content.replace(
  /    \} catch \(error\) \{\n      console\.error\('\[XML Import Debug\] Parsing error:', error\);\n      setImportStatus\(\{ \n        stage: 'error', \n        message: error instanceof Error \? error\.message : 'Failed to parse XML file\. Please ensure it\\'s a valid IATI XML document\.' \n      \}\);\n      toast\.error\('Failed to parse XML file', \{\n        description: error instanceof Error \? error\.message : 'Unknown error occurred'\n      \}\);\n    \}/,
  `    } catch (error) {
      console.error('[XML Import Debug] Parsing error:', error);
      setImportStatus({ 
        stage: 'error', 
        message: error instanceof Error ? error.message : 'Failed to parse XML file. Please ensure it\\'s a valid IATI XML document.' 
      });
      toast.error('Failed to parse XML file', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsParsing(false);
    }`
);

// 5. Update the URL parse button
content = content.replace(
  /                    <Button \n                      onClick=\{parseXmlFile\}\n                      disabled=\{!xmlUrl\.trim\(\)\}\n                      className="w-full"\n                    \>\n                      <Globe className="h-4 w-4 mr-2" \/>\n                      Fetch and Parse XML\n                    <\/Button>/,
  `                    <Button 
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
                    </Button>`
);

// 6. Add parse button for file upload
content = content.replace(
  /              <\/div>\n            \}\)\n\n            \{\/\* URL Input Section \*\/\}/,
  `              </div>
              
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

            {/* URL Input Section */}`
);

// Write the updated content
fs.writeFileSync(filePath, content);

console.log('Loading states added successfully!');
