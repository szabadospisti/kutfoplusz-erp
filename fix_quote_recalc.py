from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
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
marker='// PROJECT_SELECTION_RECALC_FIX'
if marker not in body:
    s=s[:end]+'\n '+marker+'\n recalculateQuoteMainItem(false);'+s[end:]
    p.write_text(s,encoding='utf-8')
    print('patched')
else:
    print('already patched')
