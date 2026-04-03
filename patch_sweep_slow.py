#!/usr/bin/env python3
from pathlib import Path
f = Path('src/components/features/portfolio/Holdings.tsx')
s = f.read_text('utf-8')

# Sweep 1: 3s -> 6s
s = s.replace("animation:'masterSweep 3s ease-in-out infinite'", "animation:'masterSweep 6s ease-in-out infinite'")

# Sweep 2: 3s 1.5s -> 6s 3s
s = s.replace("animation:'masterSweep 3s 1.5s ease-in-out infinite'", "animation:'masterSweep 6s 3s ease-in-out infinite'")

f.write_text(s, 'utf-8')
print('OK — sweeps 6s, harmonise avec badge goldSlow 6s')
