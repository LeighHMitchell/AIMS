const fs = require('fs');
const path = require('path');

// Read the Activity Editor file
const filePath = path.join(__dirname, 'src/app/activities/new/page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Find the line where we need to insert the new useEffect
const lines = content.split('\n');
const insertIndex = lines.findIndex(line => line.includes('}, [searchParams]);')) + 1;

if (insertIndex === 0) {
  console.error('Could not find insertion point');
  process.exit(1);
}

// The new useEffect to add
const newUseEffect = `  
  // Set initial section from URL parameter
  useEffect(() => {
    const sectionParam = searchParams?.get('section');
    if (sectionParam) {
      setActiveSection(sectionParam);
    }
  }, [searchParams]);`;

// Insert the new useEffect
lines.splice(insertIndex, 0, newUseEffect);

// Write the updated content back
fs.writeFileSync(filePath, lines.join('\n'));

console.log('Successfully added section parameter support to Activity Editor');
