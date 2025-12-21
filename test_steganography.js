const fs = require("fs");

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("usage: node test_steganography.js <input_image> <output_image>");
  console.log("example: node test_steganography.js test.png stego_test.png");
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];

if (!fs.existsSync(inputFile)) {
  console.error(`error: input file "${inputFile}" not found`);
  process.exit(1);
}

try {
  console.log(`reading image: ${inputFile}`);
  const imageBuffer = fs.readFileSync(inputFile);

  const steganographicBuffer = Buffer.from(imageBuffer);

  const message = "HIDDEN_DATA_FOR_TESTING_12345";
  console.log(`embedding message: "${message}"`);

  let bitIndex = 0;
  const startOffset = 1000;

  for (
    let i = startOffset;
    i < steganographicBuffer.length && bitIndex < message.length * 8;
    i += 5
  ) {
    const charCode = message.charCodeAt(Math.floor(bitIndex / 8));
    const bit = (charCode >> (7 - (bitIndex % 8))) & 1;

    steganographicBuffer[i] = (steganographicBuffer[i] & 0xfe) | bit;
    bitIndex++;
  }

  fs.writeFileSync(outputFile, steganographicBuffer);

  console.log(`created steganographic image: ${outputFile}`);
  console.log(`original size: ${imageBuffer.length} bytes`);
  console.log(`steganographic size: ${steganographicBuffer.length} bytes`);
  console.log(
    `embedded ${bitIndex} bits (${Math.ceil(bitIndex / 8)} bytes) of data`
  );
  console.log(`next steps:`);
  console.log(`   1. upload ${outputFile} to your verification page`);
  console.log(`   2. check the api response for steganography detection`);
  console.log(`   3. look for "suspicious: true" in the response`);
} catch (error) {
  console.error("error:", error.message);
  process.exit(1);
}
