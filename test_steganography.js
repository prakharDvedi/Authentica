/**
 * Simple Steganography Test Script
 * Creates a test image with LSB steganography for testing detection
 * 
 * Usage: node test_steganography.js <input_image> <output_image>
 * Example: node test_steganography.js test.png stego_test.png
 */

const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node test_steganography.js <input_image> <output_image>');
  console.log('Example: node test_steganography.js test.png stego_test.png');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file "${inputFile}" not found`);
  process.exit(1);
}

try {
  // Read image
  console.log(`📖 Reading image: ${inputFile}`);
  const imageBuffer = fs.readFileSync(inputFile);
  
  // Create steganographic buffer
  const steganographicBuffer = Buffer.from(imageBuffer);
  
  // Embed hidden message in LSB
  const message = "HIDDEN_DATA_FOR_TESTING_12345";
  console.log(`🔒 Embedding message: "${message}"`);
  
  let bitIndex = 0;
  const startOffset = 1000; // Skip image headers
  
  for (let i = startOffset; i < steganographicBuffer.length && bitIndex < message.length * 8; i += 5) {
    const charCode = message.charCodeAt(Math.floor(bitIndex / 8));
    const bit = (charCode >> (7 - (bitIndex % 8))) & 1;
    
    // Set LSB of byte
    steganographicBuffer[i] = (steganographicBuffer[i] & 0xFE) | bit;
    bitIndex++;
  }
  
  // Save steganographic image
  fs.writeFileSync(outputFile, steganographicBuffer);
  
  console.log(`✅ Created steganographic image: ${outputFile}`);
  console.log(`📊 Original size: ${imageBuffer.length} bytes`);
  console.log(`📊 Steganographic size: ${steganographicBuffer.length} bytes`);
  console.log(`📝 Embedded ${bitIndex} bits (${Math.ceil(bitIndex / 8)} bytes) of data`);
  console.log(`\n🧪 Next steps:`);
  console.log(`   1. Upload ${outputFile} to your verification page`);
  console.log(`   2. Check the API response for steganography detection`);
  console.log(`   3. Look for "suspicious: true" in the response`);
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

