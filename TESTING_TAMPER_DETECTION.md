# 🧪 Testing Tamper Detection Feature

## Step-by-Step Guide to Test Image Tampering Detection

### Step 1: Create an Artwork
1. Go to `/create` page
2. Connect your wallet
3. Enter a prompt (e.g., "A cyberpunk cityscape at sunset")
4. Click "Generate & Create Proof"
5. Wait for the artwork to be generated
6. **Save the certificate** - note down the hash or save the certificate

### Step 2: Download the Original Image

**Option A: From Certificate**
- After generation, the certificate shows an IPFS link
- Click on the IPFS link: `https://gateway.pinata.cloud/ipfs/[CID]`
- Right-click the image → "Save image as..."
- Save it as `original.png` or `original.jpg`

**Option B: From Verify Page**
1. Go to `/verify` page
2. Enter the combined hash from your certificate
3. Click "Verify"
4. Once verified, you'll see the original image
5. Right-click the image → "Save image as..."

### Step 3: Tamper/Edit the Image

You can use any image editor. Here are easy options:

#### **Option 1: Online Editors (Easiest)**
1. **Photopea** (Free, browser-based, like Photoshop)
   - Go to https://www.photopea.com
   - File → Open → Select your downloaded image
   - Make edits:
     - **Crop**: Select crop tool, resize the image
     - **Recolor**: Image → Adjustments → Hue/Saturation
     - **Filter**: Filter → Blur → Gaussian Blur
     - **Brightness**: Image → Adjustments → Brightness/Contrast
   - File → Export As → PNG or JPG
   - Save as `tampered.png`

2. **Canva** (Free)
   - Go to https://www.canva.com
   - Upload your image
   - Use filters, crop, adjust colors
   - Download as PNG

3. **Pixlr** (Free)
   - Go to https://pixlr.com
   - Open your image
   - Apply filters, crop, adjust colors
   - Save

#### **Option 2: Desktop Software**
- **Paint** (Windows) - Basic edits
- **GIMP** (Free, powerful) - Advanced edits
- **Photoshop** (Paid) - Professional

#### **Option 3: Mobile Apps**
- **Snapseed** (Free, Google)
- **VSCO** (Free)
- **Instagram** (Filters)

### Step 4: Test Different Types of Tampering

Try these edits to see how the system detects them:

#### **Minor Edits (Should show 85-94% similarity)**
1. **Crop**: Remove edges of the image
2. **Color Adjust**: Change brightness, contrast, saturation
3. **Light Filter**: Apply a subtle filter
4. **Resize**: Make it slightly smaller/larger

#### **Moderate Edits (Should show 60-84% similarity)**
1. **Heavy Filter**: Apply strong filters
2. **Multiple Edits**: Combine crop + filter + color change
3. **Partial Edit**: Edit only part of the image

#### **Major Changes (Should show <60% similarity)**
1. **Completely Different Image**: Upload a different artwork
2. **Heavily Modified**: Major color changes + filters + crop

### Step 5: Test on Verify Page

1. Go to `/verify` page
2. Enter your original hash from the certificate
3. Click "Verify"
4. Once verified, you'll see the "Tamper Detection" section
5. Click "Upload Image to Compare"
6. Select your **tampered image** (the edited one)
7. You'll see both images side-by-side
8. Click "🔍 Compare Images"
9. Wait for the similarity score

### Step 6: Interpret Results

**✅ Authentic (95-100%)**
- Original image or very minor changes
- Green color, "Authentic" verdict

**⚠️ Minor Edits (85-94%)**
- Cropped, filtered, or color-adjusted
- Yellow color, "Minor Edits" verdict

**🔴 Modified (60-84%)**
- Significant changes detected
- Red color, "Modified" verdict

**❌ Different (<60%)**
- Different artwork entirely
- Gray color, "Different Artwork" verdict

## Quick Test Scenarios

### Scenario 1: Test with Original (Should be 100%)
1. Download original image
2. Upload the same original image
3. Should show: **100% - Authentic**

### Scenario 2: Test with Cropped Image (Should be 85-95%)
1. Crop 10-20% from edges
2. Upload cropped version
3. Should show: **85-95% - Minor Edits**

### Scenario 3: Test with Filtered Image (Should be 80-90%)
1. Apply Instagram-style filter
2. Upload filtered version
3. Should show: **80-90% - Minor Edits**

### Scenario 4: Test with Different Image (Should be <60%)
1. Upload a completely different artwork
2. Should show: **<60% - Different Artwork**

## Troubleshooting

### If similarity is always 0% or 100%
- Check if Python CLIP service is running
- Without CLIP service, it uses hash comparison (exact match only)
- Start the Python service for better accuracy

### If images don't load
- Check IPFS gateway is accessible
- Try different gateway: `https://ipfs.io/ipfs/[CID]`

### If comparison fails
- Check browser console for errors
- Ensure image format is supported (PNG, JPG, WEBP)
- Try smaller image file size

## Pro Tips

1. **Save multiple versions**: Keep original, cropped, filtered versions
2. **Test incrementally**: Start with minor edits, then increase
3. **Compare results**: See how different edits affect similarity score
4. **Document results**: Note which edits give which scores

## Example Workflow

```
1. Create artwork → Get hash: "abc123..."
2. Download original from IPFS link
3. Open in Photopea → Crop 15% → Save as "cropped.png"
4. Open in Photopea → Apply filter → Save as "filtered.png"
5. Go to /verify → Enter hash → Upload "cropped.png" → See 88% similarity
6. Upload "filtered.png" → See 92% similarity
7. Upload completely different image → See 35% similarity
```

Happy Testing! 🎨🔍

