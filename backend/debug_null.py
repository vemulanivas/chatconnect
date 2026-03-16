import os

def debug_file(path):
    print(f"Checking {path}...")
    try:
        with open(path, 'rb') as f:
            content = f.read()
            if b'\x00' in content:
                print(f"!!! NULL BYTE FOUND at index {content.find(b'\x00')}")
                clean = content.replace(b'\x00', b'')
                with open(path, 'wb') as f_out:
                    f_out.write(clean)
                print("FIXED.")
            else:
                print("No null bytes found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    base = 'd:\\chatconnect-fullstack-final\\chatconnect-fullstack\\backend'
    debug_file(os.path.join(base, 'main.py'))
    for root, dirs, files in os.walk(base):
        for file in files:
            if file.endswith('.py'):
                debug_file(os.path.join(root, file))
