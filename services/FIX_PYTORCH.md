# Fix PyTorch Compatibility Issue

## Problem
```
AttributeError: module 'torch.utils._pytree' has no attribute 'register_pytree_node'
```

This is a version compatibility issue between PyTorch and transformers.

## Solution

### Option 1: Reinstall with Fixed Versions (Recommended)

```bash
cd services
pip uninstall torch transformers sentence-transformers -y
pip install torch==2.0.1 transformers==4.35.0 sentence-transformers==2.2.2
```

### Option 2: Use Virtual Environment (Best Practice)

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Option 3: Use CPU-only PyTorch (Lighter)

If you don't have CUDA GPU:

```bash
pip install torch==2.0.1+cpu --index-url https://download.pytorch.org/whl/cpu
pip install transformers==4.35.0 sentence-transformers==2.2.2
```

## After Fixing

Run the service:
```bash
python clip_service.py
```

You should see:
```
Loading CLIP model...
CLIP model loaded!
Starting CLIP embedding service on http://localhost:5000
```

## Alternative: Skip Python Service

If you continue having issues, the system works without the Python service using basic comparison. Just use the verify page - it will show a warning but still work.

