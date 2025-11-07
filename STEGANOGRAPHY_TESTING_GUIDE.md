# Steganography Detection Testing Guide

## 🎯 Overview

This guide explains how to test the steganography detection system to ensure it properly detects hidden data embedded in images.

---

## 🧪 Testing Methods

### **Method 1: Using Steganography Tools (Recommended)**

#### **Step 1: Install Steganography Tool**

**Option A: OpenStego (Free, Cross-platform)**
```bash
# Download from: https://www.openstego.com/
# Or use command line:
wget https://github.com/syvaidya/openstego/releases/download/openstego-0.9.0/openstego-0.9.0.zip
unzip openstego-0.9.0.zip
```

**Option B: Steghide (Linux/Mac)**
```bash
# Install steghide
sudo apt-get install steghide  # Ubuntu/Debian
brew install steghide          # macOS
```

**Option C: Online Tools**
- https://stylesuxx.github.io/steganography/ (Browser-based)
- https://incoherency.co.uk/image-steganography/ (Browser-based)

#### **Step 2: Create Test Images**

1. **Get a test image** (PNG or JPEG)
   - Use any image from your project
   - Or download a sample: https://picsum.photos/1024/1024

2. **Embed hidden data using tool:**
   ```bash
   # Using steghide (command line)
   steghide embed -cf original_image.png -ef hidden_data.txt -p password123
   
   # This creates: original_image.png with hidden data embedded
   ```

3. **Or use OpenStego GUI:**
   - Open OpenStego
   - Select "Data Hiding"
   - Choose original image
   - Choose file to hide (text file, image, etc.)
   - Set password (optional)
   - Click "Hide Data"
   - Save as `steganographic_image.png`

#### **Step 3: Test Detection**

1. **Upload the steganographic image** to your verification page
2. **Check the response** - should show:
   ```json
   {
     "steganography": {
       "suspicious": true,
       "confidence": 75,
       "method": "LSB Pattern Analysis",
       "details": "⚠️ STEGANOGRAPHY DETECTED: ..."
     }
   }
   ```

---

### **Method 2: Manual LSB Manipulation (Advanced)**

#### **Create Test Script**

Create `test_steganography.js`:

```javascript
const fs = require('fs');

// Read image
const imageBuffer = fs.readFileSync('test_image.png');

// Embed simple pattern in LSB (simulates steganography)
const steganographicBuffer = Buffer.from(imageBuffer);
const message = "HIDDEN DATA";

// Embed message in LSBs
let bitIndex = 0;
for (let i = 1000; i < steganographicBuffer.length && bitIndex < message.length * 8; i += 10) {
  const charCode = message.charCodeAt(Math.floor(bitIndex / 8));
  const bit = (charCode >> (7 - (bitIndex % 8))) & 1;
  
  // Set LSB
  steganographicBuffer[i] = (steganographicBuffer[i] & 0xFE) | bit;
  bitIndex++;
}

// Save steganographic image
fs.writeFileSync('steganographic_test.png', steganographicBuffer);
console.log('✅ Created steganographic image: steganographic_test.png');
```

Run it:
```bash
node test_steganography.js
```

Then upload `steganographic_test.png` to test detection.

---

### **Method 3: Using Python Script**

Create `create_stego_image.py`:

```python
from PIL import Image
import numpy as np

# Load image
img = Image.open('test_image.png')
pixels = np.array(img)

# Embed hidden data in LSB
message = "HIDDEN"
message_bits = ''.join(format(ord(c), '08b') for c in message)

bit_index = 0
for i in range(pixels.shape[0]):
    for j in range(pixels.shape[1]):
        if bit_index < len(message_bits):
            # Embed bit in red channel LSB
            pixels[i, j, 0] = (pixels[i, j, 0] & 0xFE) | int(message_bits[bit_index])
            bit_index += 1
        else:
            break
    if bit_index >= len(message_bits):
        break

# Save
stego_img = Image.fromarray(pixels)
stego_img.save('steganographic_python.png')
print('✅ Created steganographic image: steganographic_python.png')
```

Run:
```bash
pip install Pillow numpy
python create_stego_image.py
```

---

## 🧪 Test Cases

### **Test Case 1: Clean Image (No Steganography)**
- **Expected**: `suspicious: false`
- **Action**: Upload a normal, unmodified image
- **Result**: Should pass detection

### **Test Case 2: LSB Steganography**
- **Expected**: `suspicious: true`, `confidence > 50`
- **Action**: Embed data using LSB method
- **Result**: Should be detected

### **Test Case 3: Heavy Compression**
- **Expected**: May show false positive
- **Action**: Upload heavily compressed JPEG (quality < 50)
- **Result**: May flag as suspicious (this is expected)

### **Test Case 4: Re-saved Image**
- **Expected**: `suspicious: false`
- **Action**: Save image, then re-save (no steganography)
- **Result**: Should not be flagged

### **Test Case 5: Small Hidden Data**
- **Expected**: `suspicious: true` (if enough data)
- **Action**: Embed small text file (< 1KB)
- **Result**: May or may not be detected (depends on image size)

### **Test Case 6: Large Hidden Data**
- **Expected**: `suspicious: true`, `confidence > 70`
- **Action**: Embed large file (> 10KB)
- **Result**: Should definitely be detected

---

## 🔍 Verification Steps

### **1. Check API Response**

After uploading image, check the response:

```bash
# Using curl
curl -X POST http://localhost:3000/api/compare \
  -F "image=@steganographic_image.png" \
  -F "originalImageUrl=https://your-original-image-url.png"
```

Look for:
```json
{
  "steganography": {
    "suspicious": true,
    "confidence": 75,
    "method": "LSB Pattern Analysis",
    "details": "⚠️ STEGANOGRAPHY DETECTED: ..."
  }
}
```

### **2. Check Browser Console**

Open browser DevTools → Console, look for:
```
🔍 Running steganography detection...
⚠️ STEGANOGRAPHY DETECTED: { ... }
```

### **3. Check Server Logs**

In your terminal running `npm run dev`, you should see:
```
🔍 Running steganography detection...
⚠️ STEGANOGRAPHY DETECTED: LSB Pattern Analysis found suspicious patterns (75% confidence)
```

---

## 📊 Expected Detection Rates

| Steganography Type | Detection Rate | Confidence |
|-------------------|----------------|------------|
| **Basic LSB** | 70-85% | Medium-High |
| **LSB with encryption** | 50-70% | Medium |
| **Adaptive steganography** | 30-50% | Low-Medium |
| **Advanced (F5, OutGuess)** | 20-40% | Low |

**Note**: Detection rates depend on:
- Amount of hidden data (more data = easier to detect)
- Image size (larger images = harder to detect small amounts)
- Image type (photos vs. illustrations)
- Compression level

---

## 🐛 Troubleshooting

### **Problem: False Positives (Clean images flagged)**

**Solution**: 
- Heavily compressed images may trigger false positives
- This is expected behavior
- Adjust thresholds in `lib/steganography.ts` if needed

### **Problem: False Negatives (Steganography not detected)**

**Possible Causes**:
1. **Too little hidden data** - Detection needs sufficient data
2. **Advanced steganography** - Some methods evade detection
3. **Image too large** - Small amounts in large images are hard to detect

**Solution**:
- Try embedding larger files
- Use basic LSB steganography for testing
- Check that detection is actually running (check logs)

### **Problem: Detection not running**

**Check**:
1. Is `lib/steganography.ts` in the correct location?
2. Is it imported correctly in `app/api/compare/route.ts`?
3. Check server logs for errors

---

## 🎯 Quick Test Checklist

- [ ] Install steganography tool (OpenStego or steghide)
- [ ] Create test image with hidden data
- [ ] Upload to verification page
- [ ] Check API response for `steganography` field
- [ ] Verify `suspicious: true` for steganographic images
- [ ] Verify `suspicious: false` for clean images
- [ ] Check browser console for detection logs
- [ ] Check server logs for detection details

---

## 📝 Test Results Template

```
Test Date: ___________
Image: ___________
Steganography Tool: ___________
Hidden Data Size: ___________

Results:
- Suspicious: [ ] Yes [ ] No
- Confidence: _____%
- Method: ___________
- Details: ___________

Notes:
___________
```

---

## 🔗 Useful Resources

- **OpenStego**: https://www.openstego.com/
- **Steghide**: http://steghide.sourceforge.net/
- **Steganography Tools List**: https://github.com/DominicBreuker/stego-toolkit
- **LSB Steganography Explanation**: https://en.wikipedia.org/wiki/Steganography

---

## ⚠️ Important Notes

1. **False Positives**: Heavily compressed images may be flagged (this is normal)
2. **False Negatives**: Advanced steganography may evade detection
3. **Performance**: Detection adds ~50-100ms per image
4. **Not 100% Accurate**: No steganography detection is perfect

---

## 🚀 Next Steps

After testing:
1. Adjust thresholds if too many false positives/negatives
2. Add more detection methods if needed
3. Consider machine learning for better accuracy
4. Document any edge cases found

