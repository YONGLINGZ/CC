"""Build the offline single-file game with Python's standard library only."""
from pathlib import Path
import base64

root = Path(__file__).resolve().parent.parent

def build(images=True):
    page = (root / 'dev/shell.html').read_text(encoding='utf-8')
    for marker, name in [('ART', 'art.js'), ('ENGINE', 'engine.js'), ('UI', 'ui.js')]:
        content = (root / 'dev' / name).read_text(encoding='utf-8')
        for kind in ['CAT', 'FOX', 'SNAKE', 'PAPER', 'LANTERN', 'APE', 'BONE', 'YAKSHA']:
            path = root / 'assets' / (kind.lower() + '.png')
            image = 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode() if images and path.exists() else ''
            content = content.replace('__' + kind + '_IMAGE__', image)
        page = page.replace('/*__' + marker + '__*/', content)
    return page

if __name__ == '__main__':
    (root / 'index.html').write_text(build(), encoding='utf-8')
    print('index.html 已生成，图片、样式和脚本全部内联。')
