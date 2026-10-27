import { 
  validatePatternImageFile, 
  formatFileSize, 
  MAX_IMAGE_FILE_SIZE_BYTES 
} from './imageUploadValidator.js';

function runImageUploadTests() {
  console.log('🧪 Starting Pattern Image Upload Validation Tests...\n');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failedCount++;
    }
  }

  // 1. Valid PNG
  console.log('--- Test 1: Valid PNG File ---');
  const validPng = {
    name: 'dress_pattern_bodice.png',
    type: 'image/png',
    size: 2.4 * 1024 * 1024 // 2.4 MB
  };
  const pngResult = validatePatternImageFile(validPng);
  assert(pngResult.isValid === true, 'Valid PNG file is accepted');
  assert(pngResult.fileInfo.type === 'PNG', 'Correctly identifies PNG type');
  assert(pngResult.fileInfo.formattedSize === '2.4 MB', 'Correctly formats 2.4 MB size');

  // 2. Valid JPG / JPEG
  console.log('\n--- Test 2: Valid JPG / JPEG File ---');
  const validJpg = {
    name: 'sleeve_cut_guide.jpg',
    type: 'image/jpeg',
    size: 850 * 1024 // 850 KB
  };
  const jpgResult = validatePatternImageFile(validJpg);
  assert(jpgResult.isValid === true, 'Valid JPG file is accepted');
  assert(jpgResult.fileInfo.type === 'JPG', 'Correctly identifies JPG type');
  assert(jpgResult.fileInfo.formattedSize === '850 KB', 'Correctly formats 850 KB size');

  // 3. Valid SVG
  console.log('\n--- Test 3: Valid SVG File ---');
  const validSvg = {
    name: 'vector_collar_cad.svg',
    type: 'image/svg+xml',
    size: 45 * 1024 // 45 KB
  };
  const svgResult = validatePatternImageFile(validSvg);
  assert(svgResult.isValid === true, 'Valid SVG file is accepted');
  assert(svgResult.fileInfo.type === 'SVG', 'Correctly identifies SVG type');

  // 4. Unsupported file formats (PDF, GIF, EXE, TXT)
  console.log('\n--- Test 4: Reject Unsupported File Types ---');
  const pdfFile = { name: 'pattern_specs.pdf', type: 'application/pdf', size: 1024 * 1024 };
  const gifFile = { name: 'animated_pattern.gif', type: 'image/gif', size: 500 * 1024 };
  const exeFile = { name: 'setup.exe', type: 'application/x-msdownload', size: 1024 };

  const pdfRes = validatePatternImageFile(pdfFile);
  const gifRes = validatePatternImageFile(gifFile);
  const exeRes = validatePatternImageFile(exeFile);

  assert(pdfRes.isValid === false, 'Rejects PDF document');
  assert(Boolean(pdfRes.error), 'Provides clear rejection error for PDF');
  assert(gifRes.isValid === false, 'Rejects GIF format');
  assert(exeRes.isValid === false, 'Rejects executable files');

  // 5. File larger than 10 MB
  console.log('\n--- Test 5: Reject Oversized Files (> 10 MB) ---');
  const oversizedFile = {
    name: 'huge_raw_scan.png',
    type: 'image/png',
    size: 14.5 * 1024 * 1024 // 14.5 MB
  };
  const overResult = validatePatternImageFile(oversizedFile);
  assert(overResult.isValid === false, 'Rejects file larger than 10 MB');
  assert(overResult.error.includes('10 MB'), 'Error mentions 10 MB limit');

  // 6. Boundary size test (exact 10MB vs 10MB + 1 byte)
  console.log('\n--- Test 6: Boundary Size Limit Checks ---');
  const exactMax = { name: 'exact_10mb.jpg', type: 'image/jpeg', size: MAX_IMAGE_FILE_SIZE_BYTES };
  const justOver = { name: 'just_over_10mb.jpg', type: 'image/jpeg', size: MAX_IMAGE_FILE_SIZE_BYTES + 1 };
  
  assert(validatePatternImageFile(exactMax).isValid === true, 'Accepts exact 10 MB file');
  assert(validatePatternImageFile(justOver).isValid === false, 'Rejects 10 MB + 1 byte file');

  // 7. Format File Size Helper
  console.log('\n--- Test 7: Size Formatting Utility ---');
  assert(formatFileSize(0) === '0 B', '0 bytes formats as 0 B');
  assert(formatFileSize(1024) === '1 KB', '1024 bytes formats as 1 KB');
  assert(formatFileSize(1048576) === '1 MB', '1048576 bytes formats as 1 MB');
  assert(formatFileSize(5242880) === '5 MB', '5242880 bytes formats as 5 MB');

  console.log(`\n==========================================`);
  console.log(`Image Upload Tests: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`==========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runImageUploadTests();
