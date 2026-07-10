import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

const uploadsDir = 'C:\\Users\\HASSAN\\Documents\\antigravity\\delightful-noether\\backend\\uploads';
const outputFilePath = 'C:\\Users\\HASSAN\\.gemini\\antigravity\\brain\\3304d069-56f1-4d6f-81f4-761cd0476848\\scratch\\extracted_knowledge.md';

const run = async () => {
  try {
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.docx')).sort();
    let combinedContent = '# Extracted NovaWear Brand Knowledge\n\n';

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      console.log(`Extracting text from: ${file}...`);
      
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      
      combinedContent += `## File: ${file}\n\n${text}\n\n---\n\n`;
    }

    fs.writeFileSync(outputFilePath, combinedContent, 'utf-8');
    console.log(`Done! Extracted text written to ${outputFilePath}`);
  } catch (err) {
    console.error('Extraction Error:', err);
  }
};

run();
