# CLIP Embedding Service

This Python service provides CLIP-based image embeddings for tamper detection and originality scoring.

## Setup

### 1. Install Dependencies

```bash
cd services
pip install -r requirements.txt
```

### 2. Run the Service

```bash
python clip_service.py
```

The service will start on `http://localhost:5000`

### 3. Configure Next.js

Add to your `.env.local` file:

```
CLIP_SERVICE_URL=http://localhost:5000
```

## API Endpoints

### POST `/embed`
Compute CLIP embedding for an image.

**Request:**
```json
{
  "image": "base64_encoded_image",
  "imageUrl": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "embedding": [0.123, 0.456, ...],
  "dimension": 512
}
```

### POST `/compare`
Compare two images and return similarity score.

**Request:**
```json
{
  "image1": {
    "base64": "base64_encoded_image1"
  },
  "image2": {
    "url": "https://example.com/image2.jpg"
  }
}
```

**Response:**
```json
{
  "similarity": 0.95,
  "percentage": 95.0
}
```

### GET `/health`
Health check endpoint.

## How It Works

1. **CLIP Model**: Uses OpenAI's CLIP (Contrastive Language-Image Pre-training) model
2. **Embeddings**: Converts images into 512-dimensional vectors
3. **Similarity**: Computes cosine similarity between embeddings
4. **Thresholds**:
   - ≥ 0.95: Authentic (same image)
   - 0.85-0.94: Minor edits (cropped, filtered)
   - 0.60-0.84: Modified (significant changes)
   - < 0.60: Different artwork

## Notes

- First run will download the CLIP model (~500MB)
- Service must be running for CLIP embeddings to work
- Falls back to hash comparison if service unavailable

