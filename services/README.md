# CLIP Embedding Service Setup Guide

## Overview
The CLIP embedding service provides AI-powered image similarity detection using CLIP (Contrastive Language-Image Pre-training) embeddings. This service is optional but provides the most accurate tamper detection.

## Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

## Installation Steps

### 1. Navigate to the services directory
```bash
cd services
```

### 2. Create a virtual environment (recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

**Note**: The first time you run this, it will download the CLIP model (~400MB), which may take a few minutes.

## Running the Service

### Start the service
```bash
python clip_service.py
```

The service will:
- Load the CLIP model (first run downloads it)
- Start Flask server on `http://localhost:5000`
- Print: "Starting CLIP embedding service on http://localhost:5000"

### Verify it's running
Open a browser or use curl:
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "model": "clip-ViT-B-32"
}
```

## Configuration

### Add to .env.local
Add this line to your `.env.local` file in the project root:
```bash
CLIP_SERVICE_URL=http://localhost:5000
```

### Restart Next.js server
After adding the environment variable, restart your Next.js development server:
```bash
npm run dev
```

## API Endpoints

### POST /embed
Compute CLIP embedding for an image.

**Request:**
```json
{
  "image": "base64_encoded_image_string"
}
```
or
```json
{
  "imageUrl": "https://example.com/image.png"
}
```

**Response:**
```json
{
  "embedding": [0.123, -0.456, ...],  // 512-dimensional vector
  "dimension": 512
}
```

### POST /compare
Compare two images and return similarity score.

**Request:**
```json
{
  "image1": {
    "base64": "base64_string"
  },
  "image2": {
    "url": "https://example.com/image.png"
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

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model": "clip-ViT-B-32"
}
```

## Troubleshooting

### Port already in use
If port 5000 is already in use, you can change it in `clip_service.py`:
```python
app.run(host='0.0.0.0', port=5001, debug=True)  # Change port
```
Then update `.env.local`:
```bash
CLIP_SERVICE_URL=http://localhost:5001
```

### Model download issues
If the model download fails:
1. Check your internet connection
2. The model is downloaded from Hugging Face (may require authentication)
3. Try running with verbose logging:
```bash
python clip_service.py
```

### Memory issues
The CLIP model requires ~2GB RAM. If you encounter memory errors:
- Close other applications
- Use a machine with more RAM
- Consider using a smaller model (modify `clip_service.py`)

### CORS errors
CORS is enabled by default. If you still see CORS errors:
- Make sure `flask-cors` is installed
- Check that the service is running on the correct port

## Performance Notes

- **First request**: May take 5-10 seconds (model loading)
- **Subsequent requests**: ~1-2 seconds per image
- **Model size**: ~400MB (downloaded once)
- **Memory usage**: ~2GB RAM

## Stopping the Service

Press `Ctrl+C` in the terminal where the service is running.

## Production Deployment

For production, consider:
- Using a process manager (PM2, supervisor)
- Running behind a reverse proxy (nginx)
- Using a production WSGI server (gunicorn)
- Setting up proper logging
- Adding authentication/rate limiting

Example with gunicorn:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 clip_service:app
```



