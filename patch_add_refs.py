#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

old = "const [scannerOpen,  setScannerOpen]  = useState(false)"
new = """const uploadRef = useRef<HTMLInputElement|null>(null)
  const uploadTargetId = useRef<string|null>(null)
  const [uploadModal, setUploadModal] = useState<{
    open:boolean; preview:string|null;
    checks:{label:string;status:'pending'|'checking'|'pass'|'fail';detail?:string}[];
    done:boolean; success:boolean
  }>({ open:false, preview:null, checks:[], done:false, success:false })
  const [scannerOpen,  setScannerOpen]  = useState(false)"""
assert old in s, "CIBLE"
s = s.replace(old, new, 1)

f.write_text(s, 'utf-8')
print('OK — refs + uploadModal state ajoutes')
