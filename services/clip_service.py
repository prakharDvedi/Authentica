"""
CLIP Embedding Service for Image Similarity Comparison
Run this service separately: python services/clip_service.py
Then set CLIP_SERVICE_URL=http://localhost:5000 in your .env
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
from PIL import Image
import io
import base64
import requests
import numpy as np

app = Flask(__name__)
CORS(app)

# Load CLIP model (downloads on first run)
print("Loading CLIP model...")
model = SentenceTransformer('clip-ViT-B-32')
print("CLIP model loaded!")

def get_image_from_url(url: str) -> Image.Image:
    """Download image from URL"""
    response = requests.get(url, timeout=10)
    return Image.open(io.BytesIO(response.content))

def get_image_from_base64(base64_str: str) -> Image.Image:
    """Decode base64 image"""
    image_data = base64.b64decode(base64_str)
    return Image.open(io.BytesIO(image_data))

@app.route('/embed', methods=['POST'])
def embed_image():
    """Compute CLIP embedding for an image"""
    try:
        data = request.json
        
        if 'image' in data:
            # Base64 encoded image
            image = get_image_from_base64(data['image'])
        elif 'imageUrl' in data:
            # URL to image
            image = get_image_from_url(data['imageUrl'])
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        # Compute embedding
        embedding = model.encode(image, convert_to_numpy=True)
        
        # Convert to list for JSON serialization
        embedding_list = embedding.tolist()
        
        return jsonify({
            'embedding': embedding_list,
            'dimension': len(embedding_list)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/compare', methods=['POST'])
def compare_images():
    """Compare two images and return similarity score"""
    try:
        data = request.json
        
        if 'image1' not in data or 'image2' not in data:
            return jsonify({'error': 'Both images required'}), 400
        
        # Get images
        if 'base64' in data['image1']:
            img1 = get_image_from_base64(data['image1']['base64'])
        else:
            img1 = get_image_from_url(data['image1']['url'])
            
        if 'base64' in data['image2']:
            img2 = get_image_from_base64(data['image2']['base64'])
        else:
            img2 = get_image_from_url(data['image2']['url'])
        
        # Compute embeddings
        emb1 = model.encode(img1, convert_to_numpy=True)
        emb2 = model.encode(img2, convert_to_numpy=True)
        
        # Compute cosine similarity
        similarity = float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))
        
        return jsonify({
            'similarity': similarity,
            'percentage': round(similarity * 100, 2)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'model': 'clip-ViT-B-32'})

if __name__ == '__main__':
    print("Starting CLIP embedding service on http://localhost:5000")
    print("Make sure to install dependencies: pip install flask flask-cors sentence-transformers pillow requests")
    app.run(host='0.0.0.0', port=5000, debug=True)

