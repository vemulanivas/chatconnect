import os

def check_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'rb') as f:
                        content = f.read()
                        if b'\x00' in content:
                            print(f"NULL BYTE FOUND: {path}")
                            # Fix it
                            clean_content = content.replace(b'\x00', b'')
                            with open(path, 'wb') as f_out:
                                f_out.write(clean_content)
                            print(f"FIXED: {path}")
                except Exception as e:
                    print(f"Error checking {path}: {e}")

if __name__ == "__main__":
    check_files('d:\\chatconnect-fullstack-final\\chatconnect-fullstack\\backend')
