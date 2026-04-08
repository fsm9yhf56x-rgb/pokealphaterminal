#!/usr/bin/env python3
"""Verifier si TCGDex retourne la rarete dans le detail set"""
import json

d = json.load(open('public/data/cards-FR.json'))
# Checker quelques sets recents
for sid in ['sv3pt5', 'sv4', 'sv1', 'swsh12pt5']:
    if sid in d:
        for c in d[sid][:3]:
            print(sid, c.get('lid'), c.get('n'), 'r=', c.get('r'))
        print()
