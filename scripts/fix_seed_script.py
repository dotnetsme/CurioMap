import pathlib

p = pathlib.Path("d:/dev/CurioMap/scripts/gen_seed_demo.py")
content = p.read_text(encoding="utf-8")

# Replace old password hash with constant reference
content = content.replace("'seed-demo-reader'", "'{_DEMO_PASSWORD_HASH}'")

# Fix enum casing to match C# conventions
content = content.replace("'pseudonymous'", "'Pseudonymous'")
content = content.replace("'region_city'", "'RegionCity'")
content = content.replace("'public'", "'Public'")

p.write_text(content, encoding="utf-8")
print("Done")
