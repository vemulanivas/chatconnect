import os

def sanitize_py_file(path):
    try:
        with open(path, 'rb') as f:
            raw = f.read()
        
        # Remove BOM if present
        if raw.startswith(b'\xef\xbb\xbf'):
            raw = raw[3:]
        
        # Check for null bytes
        if b'\x00' in raw:
            print(f"CLEANING NULL BYTES in {path}")
            raw = raw.replace(b'\x00', b'')
            
        # Write back clean
        with open(path, 'wb') as f:
            f.write(raw)
            
    except Exception as e:
        print(f"Error on {path}: {e}")

if __name__ == "__main__":
    base = 'd:\\chatconnect-fullstack-final\\chatconnect-fullstack\\backend'
    for root, dirs, files in os.walk(base):
        if 'venv' in root or '.git' in root or '__pycache__' in root:
            continue
        for file in files:
            if file.endswith('.py'):
                sanitize_py_file(os.path.join(root, file))
    print("Sanitization complete.")
