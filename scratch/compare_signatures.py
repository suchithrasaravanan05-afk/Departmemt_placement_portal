import os, base64, re

with open('frontend/certificate_assets.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

sig_dir = 'frontend/signature'
sig_files = {
    'jeyasundari': 'jeyasundari.png',
    'rekha': 'rekha.png',
    'ramakrishnan': 'ramakrishnan.png',
    'kesavaraja': 'kesavaraja.png',
    'rajakumaran': 'rajakumaran.png',
    'ganesan': 'ganesan.png'
}

for key, filename in sig_files.items():
    filepath = os.path.join(sig_dir, filename)
    with open(filepath, 'rb') as f:
        file_bytes = f.read()
    
    # Extract from JS
    pattern = rf'"{key}":\s*"data:image/png;base64,([^"]+)"'
    m = re.search(pattern, js_content)
    if m:
        js_b64 = m.group(1)
        js_bytes = base64.b64decode(js_b64)
        match = (file_bytes == js_bytes)
        print(f"Key '{key}': file={len(file_bytes)} bytes, js_b64={len(js_bytes)} bytes, MATCH={match}")
        # Save both to scratch to compare
        with open(f'scratch/file_{key}.png', 'wb') as out:
            out.write(file_bytes)
        with open(f'scratch/js_{key}.png', 'wb') as out:
            out.write(js_bytes)
    else:
        print(f"Key '{key}' NOT FOUND in JS!")
