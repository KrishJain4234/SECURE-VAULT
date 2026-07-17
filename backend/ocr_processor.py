import sys
import os
import json
import time
import base64
import requests
import cv2
import numpy as np
import fitz  # PyMuPDF

# Ensure stdout uses UTF-8 to prevent encoding errors on Windows
if hasattr(sys.stdout, "encoding") and sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

OCR_SPACE_API_URL = "https://api.ocr.space/parse/image"
OCR_SPACE_API_KEY = "K82674361888957"
OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen3:4b"

def preprocess_image(cv_img):
    """Applies grayscale and CLAHE for contrast enhancement to improve handwritten OCR"""
    if len(cv_img.shape) == 3:
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    else:
        gray = cv_img

    # Increase contrast using CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Optional: subtle sharpening
    kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
    sharpened = cv2.filter2D(enhanced, -1, kernel)

    return sharpened

def encode_image_for_ocr(cv_img):
    """Encode OpenCV image to JPEG, ensuring it's under 1MB"""
    quality = 95
    while quality > 10:
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        result, encimg = cv2.imencode('.jpg', cv_img, encode_param)
        if not result:
            break
        # Check size (< 1MB = 1000000 bytes)
        if encimg.nbytes < 950000:
            return base64.b64encode(encimg).decode('utf-8')
        quality -= 5
    
    # Fallback if somehow still too large
    result, encimg = cv2.imencode('.jpg', cv_img, [int(cv2.IMWRITE_JPEG_QUALITY), 10])
    return base64.b64encode(encimg).decode('utf-8')

def extract_text_from_ocr_space(base64_image):
    """Send Base64 image to OCR.space Engine 3"""
    payload = {
        'isOverlayRequired': False,
        'apikey': OCR_SPACE_API_KEY,
        'language': 'eng',
        'base64Image': 'data:image/jpeg;base64,' + base64_image,
        'OCREngine': 3
    }
    try:
        response = requests.post(OCR_SPACE_API_URL, data=payload)
        response.raise_for_status()
        data = response.json()
        if data.get('IsErroredOnProcessing'):
            error_msg = data.get('ErrorMessage', ['Unknown error'])[0]
            print(f"[Python-OCR] OCR Space Error: {error_msg}", file=sys.stderr)
            return ""
        
        parsed_text = ""
        for result in data.get('ParsedResults', []):
            parsed_text += result.get('ParsedText', "") + "\n"
        return parsed_text
    except Exception as e:
        print(f"[Python-OCR] Exception in OCR.space API: {e}", file=sys.stderr)
        return ""

def fix_typos_with_llm(raw_text):
    """Send text to local Ollama LLM to fix typos."""
    if not raw_text.strip():
        return ""
    
    prompt = f"""The following text is the output of an OCR scan from a handwritten document. 
It may contain typos, misread characters, or spacing issues.
Please correct ONLY the typos and return the cleaned text. Do NOT add any extra conversational filler, markdown formatting, or explanations. Just output the corrected text.

TEXT:
{raw_text}"""
    
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }
    
    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=3.0)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()
    except Exception as e:
        print(f"[Python-LLM] Exception in Ollama LLM call: {e}", file=sys.stderr)
        return raw_text  # Fallback to raw text if LLM fails

def process_file(file_path):
    is_pdf = file_path.lower().endswith('.pdf')
    images_to_process = []

    try:
        if is_pdf:
            doc = fitz.open(file_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                pix = page.get_pixmap(dpi=150) # Moderate DPI to keep size small
                img_data = pix.tobytes("png")
                nparr = np.frombuffer(img_data, np.uint8)
                cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                images_to_process.append(cv_img)
            doc.close()
        else:
            # Assume it's an image
            cv_img = cv2.imread(file_path)
            if cv_img is None:
                raise ValueError("Could not read image file with OpenCV")
            images_to_process.append(cv_img)
    except Exception as e:
        print(json.dumps({"error": f"Failed to load file: {str(e)}"}))
        sys.exit(1)

    raw_ocr_text = ""
    
    for idx, cv_img in enumerate(images_to_process):
        # 1. Preprocess
        enhanced_img = preprocess_image(cv_img)
        
        # 2. Encode to JPEG under 1MB
        base64_str = encode_image_for_ocr(enhanced_img)
        
        # 3. Call OCR API
        text = extract_text_from_ocr_space(base64_str)
        raw_ocr_text += text + "\n"
        
        # Rate limit compliance if more pages exist
        if idx < len(images_to_process) - 1:
            time.sleep(6.1) # 10 requests / min limit wait

    raw_ocr_text = raw_ocr_text.strip()
    
    # 4. LLM Correction
    final_text = fix_typos_with_llm(raw_ocr_text)
    
    # Final string output
    print(json.dumps({"text": final_text}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File does not exist: {file_path}"}))
        sys.exit(1)

    process_file(file_path)
