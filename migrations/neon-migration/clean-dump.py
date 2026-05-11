# -*- coding: utf-8 -*-
# Nettoie le dump Supabase pour le rendre compatible Neon + Better Auth
import re

INPUT = "migrations/neon-migration/full-dump.sql"
OUTPUT = "migrations/neon-migration/neon-ready.sql"

with open(INPUT, "r", encoding="utf-8") as f:
    content = f.read()

original_size = len(content)
original_lines = content.count("\n")

# 1. Supprime \restrict et \unrestrict (directives psql Supabase)
content = re.sub(r"^\\restrict .*$", "", content, flags=re.MULTILINE)
content = re.sub(r"^\\unrestrict .*$", "", content, flags=re.MULTILINE)

# 2. Supprime CREATE SCHEMA public (existe deja sur Neon)
content = re.sub(
    r"--\n-- Name: public; Type: SCHEMA;.*?\n--\n\nCREATE SCHEMA public;\n",
    "",
    content,
    flags=re.DOTALL,
)

# 3. Supprime les FK vers auth.users
content = re.sub(
    r"^\s*ALTER TABLE[^\n]+REFERENCES auth\.users[^\n]+;\n",
    "",
    content,
    flags=re.MULTILINE,
)
content = re.sub(
    r"--\n-- Name: \w+ \w+_(user_id|id)_fkey;[^\n]*\n--\n\n(?=\n)",
    "",
    content,
    flags=re.MULTILINE,
)

# 4. Supprime toutes les CREATE POLICY
content = re.sub(
    r"^CREATE POLICY[^;]+;\n",
    "",
    content,
    flags=re.MULTILINE | re.DOTALL,
)
content = re.sub(
    r"--\n-- Name: \w+ \"[^\"]+\"; Type: POLICY;[^\n]*\n--\n\n(?=\n)",
    "",
    content,
)

# 5. Supprime ALTER TABLE ENABLE ROW LEVEL SECURITY
content = re.sub(
    r"^ALTER TABLE[^\n]+ENABLE ROW LEVEL SECURITY;\n",
    "",
    content,
    flags=re.MULTILINE,
)
content = re.sub(
    r"--\n-- Name: \w+; Type: ROW SECURITY;[^\n]*\n--\n\n(?=\n)",
    "",
    content,
)

# 6. Nettoie lignes vides multiples
content = re.sub(r"\n{4,}", "\n\n\n", content)

with open(OUTPUT, "w", encoding="utf-8") as f:
    f.write(content)

new_size = len(content)
new_lines = content.count("\n")

print("Original  : {:>12,} bytes  /  {:>10,} lines".format(original_size, original_lines))
print("Cleaned   : {:>12,} bytes  /  {:>10,} lines".format(new_size, new_lines))
print("Removed   : {:>12,} bytes  /  {:>10,} lines".format(original_size - new_size, original_lines - new_lines))
print("Output    : " + OUTPUT)
