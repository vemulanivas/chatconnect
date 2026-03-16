path = 'd:\\chatconnect-fullstack-final\\chatconnect-fullstack\\backend\\main.py'
with open(path, 'rb') as f:
    content = f.read()
    print(f"Length: {len(content)}")
    print(f"First 100 bytes: {content[:100]}")
    if b'\x00' in content:
        print("!!! NULL BYTE FOUND !!!")
        indices = [i for i, b in enumerate(content) if b == 0]
        print(f"At indices: {indices[:20]}")
    else:
        print("Pure clean file.")
