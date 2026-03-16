import os

def check_file(path):
    try:
        with open(path, 'rb') as f:
            content = f.read()
            if b'\x00' in content:
                print(f"!!! NULL BYTE FOUND: {path}")
                # We won't fix binary files, but let's fix text files
                ext = os.path.splitext(path)[1].lower()
                text_exts = ['.py', '.txt', '.json', '.js', '.css', '.html', '.md', '.env', '.example', '.toml']
                if ext in text_exts or 'Dockerfile' in path or 'requirements' in path:
                    clean = content.replace(b'\x00', b'')
                    with open(path, 'wb') as f_out:
                        f_out.write(clean)
                    print(f"FIXED: {path}")
    except Exception:
        pass

if __name__ == "__main__":
    base = 'd:\\chatconnect-fullstack-final\\chatconnect-fullstack'
    for root, dirs, files in os.walk(base):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if 'venv' in dirs:
            dirs.remove('venv')
        if '.git' in dirs:
            dirs.remove('.git')
        
        for file in files:
            check_file(os.path.join(root, file))
