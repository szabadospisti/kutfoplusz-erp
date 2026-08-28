from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
start=s.index('function quoteProjectChanged(){')
depth=0
in_str=None
esc=False
end=None
for i in range(start,len(s)):
    c=s[i]
    if in_str:
        if esc: esc=False
        elif c=='\\': esc=True
        elif c==in_str: in_str=None
        continue
    if c in '"\'`': in_str=c; continue
    if c=='{': depth+=1
    elif c=='}':
        depth-=1
        if depth==0:
            end=i; break
if end is None: raise SystemExit('function end not found')
body=s[start:end]
if 'recalculateQuoteMainItem(false);' not in body:
    s=s[:end]+'\n recalculateQuoteMainItem(false);'+s[end:]
    Path('index.html').write_text(s,encoding='utf-8')
    print('patched')
else:
    print('already patched')
