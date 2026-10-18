#!/usr/bin/env python3
"""
gen_seed_demo.py — generates idempotent demo-seed SQL migrations:

  0012_seed_books_3.sql        realistic books (upsert by ISBN)
  0013_seed_demo_readers.sql   readers + locations + "reading" shelves worldwide

Run:  python scripts/gen_seed_demo.py
Output: backend/src/CurioMap.Api/Data/Migrations/
"""
from __future__ import annotations

import base64
import hashlib
import os
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MIG_DIR = ROOT / "backend" / "src" / "CurioMap.Api" / "Data" / "Migrations"

# Pre-computed PBKDF2 hash for the demo password 'seed-demo-reader'.
# Format: pbkdf2.v1.{iterations}.{base64salt}.{base64key}  (SHA-256, 100k iterations)
_DEMO_PASSWORD_HASH = "pbkdf2.v1.100000.V3jsWctKwPG0TbICiwGhVg==.6VToNSpWS6ekb8GOR3EuTYwMcrca0GE4+Moyvz1DnjU="

# isbn -> (title, author). Covers come from Open Library by ISBN at read time.
BOOKS = {
    "9780593135204": ("Project Hail Mary", "Andy Weir"),
    "9780525559474": ("The Midnight Library", "Matt Haig"),
    "9780765382030": ("The Three-Body Problem", "Liu Cixin"),
    "9780593318171": ("Klara and the Sun", "Kazuo Ishiguro"),
    "9780593321201": ("Tomorrow, and Tomorrow, and Tomorrow", "Gabrielle Zevin"),
    "9781635575637": ("Piranesi", "Susanna Clarke"),
    "9780735219090": ("Where the Crawdads Sing", "Delia Owens"),
    "9780062060624": ("The Song of Achilles", "Madeline Miller"),
    "9780316556347": ("Circe", "Madeline Miller"),
    "9781455563937": ("Pachinko", "Min Jin Lee"),
    "9780553448184": ("The Vegetarian", "Han Kang"),
    "9780375704024": ("Norwegian Wood", "Haruki Murakami"),
    "9781400079278": ("Kafka on the Shore", "Haruki Murakami"),
    "9780060883287": ("One Hundred Years of Solitude", "Gabriel García Márquez"),
    "9780143108276": ("The Master and Margarita", "Mikhail Bulgakov"),
    "9780140449266": ("The Count of Monte Cristo", "Alexandre Dumas"),
    "9780156012195": ("The Little Prince", "Antoine de Saint-Exupéry"),
    "9780061478789": ("Howl's Moving Castle", "Diana Wynne Jones"),
    "9780756404741": ("The Name of the Wind", "Patrick Rothfuss"),
    "9781649374042": ("Fourth Wing", "Rebecca Yarros"),
    "9780060959470": ("All About Love", "bell hooks"),
    "9780060932138": ("The Unbearable Lightness of Being", "Milan Kundera"),
    "9781101947135": ("Homegoing", "Yaa Gyasi"),
    "9780062963673": ("The Dutch House", "Ann Patchett"),
    "9780375842207": ("The Book Thief", "Markus Zusak"),
    "9780385490818": ("The Handmaid's Tale", "Margaret Atwood"),
    "9781635570298": ("The Priory of the Orange Tree", "Samantha Shannon"),
    "9780679775430": ("The Wind-Up Bird Chronicle", "Haruki Murakami"),
    "9780441569595": ("Neuromancer", "William Gibson"),
    "9780385474542": ("Things Fall Apart", "Chinua Achebe"),
    "9780307455925": ("Americanah", "Chimamanda Ngozi Adichie"),
    "9780060977498": ("The God of Small Things", "Arundhati Roy"),
    "9780007448036": ("The Night Circus", "Erin Morgenstern"),
}
# (country, region, city, lat, lng, readers) — readers live in/near that city.
# Coordinates are approximate city centers; fuzzed in SQL like the API does.
LOCATIONS = [
    ("United Kingdom", "England", "London", 51.5074, -0.1278, 9),
    ("United Kingdom", "England", "Manchester", 53.4808, -2.2426, 4),
    ("United Kingdom", "Scotland", "Edinburgh", 55.9533, -3.1883, 3),
    ("France", "Île-de-France", "Paris", 48.8566, 2.3522, 7),
    ("France", "Nouvelle-Aquitaine", "Bordeaux", 44.8378, -0.5792, 2),
    ("France", "Provence-Alpes-Côte d'Azur", "Marseille", 43.2965, 5.3698, 2),
    ("Germany", "Berlin", "Berlin", 52.52, 13.405, 8),
    ("Germany", "Bayern", "Munich", 48.1351, 11.582, 4),
    ("Germany", "Hamburg", "Hamburg", 53.5511, 9.9937, 3),
    ("Netherlands", "North Holland", "Amsterdam", 52.3676, 4.9041, 5),
    ("Belgium", "Brussels-Capital", "Brussels", 50.8503, 4.3517, 2),
    ("Switzerland", "Zürich", "Zurich", 47.3769, 8.5417, 3),
    ("Austria", "Vienna", "Vienna", 48.2082, 16.3738, 3),
    ("Italy", "Lombardy", "Milan", 45.4642, 9.19, 4),
    ("Italy", "Lazio", "Rome", 41.9028, 12.4964, 4),
    ("Spain", "Catalonia", "Barcelona", 41.3874, 2.1686, 4),
    ("Spain", "Madrid", "Madrid", 40.4168, -3.7038, 4),
    ("Portugal", "Lisbon", "Lisbon", 38.7223, -9.1393, 3),
    ("Ireland", "Leinster", "Dublin", 53.3498, -6.2603, 2),
    ("Sweden", "Stockholm", "Stockholm", 59.3293, 18.0686, 3),
    ("Norway", "Oslo", "Oslo", 59.9139, 10.7522, 2),
    ("Denmark", "Capital Region", "Copenhagen", 55.6761, 12.5683, 2),
    ("Finland", "Uusimaa", "Helsinki", 60.1699, 24.9384, 2),
    ("Iceland", "Capital Region", "Reykjavík", 64.1466, -21.9426, 1),
    ("Poland", "Mazovia", "Warsaw", 52.2297, 21.0122, 4),
    ("Czechia", "Prague", "Prague", 50.0755, 14.4378, 2),
    ("Hungary", "Budapest", "Budapest", 47.4979, 19.0402, 2),
    ("Ukraine", "Kyiv", "Kyiv", 50.4501, 30.5234, 3),
    ("Greece", "Attica", "Athens", 37.9838, 23.7275, 2),
    ("Croatia", "Zagreb County", "Zagreb", 45.815, 15.9819, 2),
    ("United States", "New York", "New York City", 40.7128, -74.006, 10),
    ("United States", "California", "Los Angeles", 34.0522, -118.2437, 6),
    ("United States", "California", "San Francisco", 37.7749, -122.4194, 5),
    ("United States", "Illinois", "Chicago", 41.8781, -87.6298, 5),
    ("United States", "Texas", "Austin", 30.2672, -97.7431, 3),
    ("United States", "Massachusetts", "Boston", 42.3601, -71.0589, 3),
    ("United States", "Washington", "Seattle", 47.6062, -122.3321, 4),
    ("United States", "Colorado", "Denver", 39.7392, -104.9903, 2),
    ("Canada", "Ontario", "Toronto", 43.6532, -79.3832, 5),
    ("Canada", "British Columbia", "Vancouver", 49.2827, -123.1207, 4),
    ("Canada", "Quebec", "Montreal", 45.5017, -73.5673, 3),
    ("Mexico", "Ciudad de México", "Mexico City", 19.4326, -99.1332, 4),
    ("Mexico", "Jalisco", "Guadalajara", 20.6668, -103.3918, 2),
    ("Brazil", "São Paulo", "São Paulo", -23.5505, -46.6333, 6),
    ("Brazil", "Rio de Janeiro", "Rio de Janeiro", -22.9068, -43.1729, 4),
    ("Brazil", "Minas Gerais", "Belo Horizonte", -19.9167, -43.9345, 2),
    ("Argentina", "Buenos Aires", "Buenos Aires", -34.6037, -58.3816, 4),
    ("Chile", "Santiago", "Santiago", -33.4479, -70.6693, 2),
    ("Colombia", "Bogotá", "Bogotá", 4.711, -74.0721, 3),
    ("Peru", "Lima", "Lima", -12.0464, -77.0428, 2),
    ("Venezuela", "Distrito Capital", "Caracas", 10.4806, -66.9036, 2),
    ("Uruguay", "Montevideo", "Montevideo", -34.9011, -56.1645, 1),
    ("Nigeria", "Lagos", "Lagos", 6.5244, 3.3792, 4),
    ("Nigeria", "Federal Capital Territory", "Abuja", 9.0579, 7.4951, 2),
    ("Kenya", "Nairobi", "Nairobi", -1.2921, 36.8219, 3),
    ("South Africa", "Gauteng", "Johannesburg", -26.2041, 28.0473, 4),
    ("South Africa", "Western Cape", "Cape Town", -33.9249, 18.4241, 2),
    ("Egypt", "Cairo", "Cairo", 30.0444, 31.2357, 3),
    ("Morocco", "Casablanca-Settat", "Casablanca", 33.5731, -7.5898, 2),
    ("Ghana", "Accra", "Accra", 5.6037, -0.187, 2),
    ("Ethiopia", "Addis Ababa", "Addis Ababa", 9.0054, 38.7636, 1),
    ("India", "Maharashtra", "Mumbai", 19.076, 72.8777, 7),
    ("India", "Delhi", "New Delhi", 28.6139, 77.209, 6),
    ("India", "Karnataka", "Bengaluru", 12.9716, 77.5946, 5),
    ("India", "Tamil Nadu", "Chennai", 13.0827, 80.2707, 3),
    ("China", "Beijing", "Beijing", 39.9042, 116.4074, 6),
    ("China", "Shanghai", "Shanghai", 31.2304, 121.4737, 5),
    ("China", "Guangdong", "Shenzhen", 22.5431, 114.0579, 3),
    ("Japan", "Tokyo", "Tokyo", 35.6762, 139.6503, 8),
    ("Japan", "Osaka Prefecture", "Osaka", 34.6937, 135.5023, 3),
    ("Japan", "Hyōgo", "Kobe", 34.6901, 135.1955, 2),
    ("South Korea", "Seoul", "Seoul", 37.5665, 126.978, 5),
    ("Singapore", "Singapore", "Singapore", 1.3521, 103.8198, 4),
    ("Malaysia", "Kuala Lumpur", "Kuala Lumpur", 3.139, 101.6869, 2),
    ("Indonesia", "Jakarta", "Jakarta", -6.2088, 106.8456, 4),
    ("Thailand", "Bangkok", "Bangkok", 13.7563, 100.5018, 2),
    ("Vietnam", "Hanoi", "Hanoi", 21.0278, 105.8342, 2),
    ("Philippines", "Metro Manila", "Manila", 14.5995, 120.9842, 3),
    ("Turkey", "İstanbul", "İstanbul", 41.0082, 28.9784, 4),
    ("United Arab Emirates", "Dubai", "Dubai", 25.2048, 55.2708, 2),
    ("Israel", "Tel Aviv District", "Tel Aviv", 32.0853, 34.7818, 2),
    ("Pakistan", "Sindh", "Karachi", 24.8607, 67.0011, 3),
    ("Bangladesh", "Dhaka", "Dhaka", 23.8103, 90.4125, 2),
    ("Australia", "New South Wales", "Sydney", -33.8688, 151.2093, 5),
    ("Australia", "Victoria", "Melbourne", -37.8136, 144.9631, 4),
    ("Australia", "Queensland", "Brisbane", -27.4698, 153.0251, 2),
    ("New Zealand", "Auckland", "Auckland", -36.8509, 174.7645, 2),
    ("New Zealand", "Wellington", "Wellington", -41.2865, 174.7762, 1),
]

# Which books are global hits (higher weight = shown on more shelves).
BOOK_WEIGHTS = {
    "9780593135204": 7,  # Project Hail Mary
    "9780525559474": 6,  # The Midnight Library
    "9780593318171": 4,  # Klara and the Sun
    "9780593321201": 4,  # Tomorrow x3
    "9780735219090": 5,  # Crawdads
    "9781635575637": 3,  # Piranesi
    "9780062060624": 3,  # Song of Achilles
    "9780316556347": 3,  # Circe
    "9780061478789": 3,  # Howl's Moving Castle
    "9780156012195": 4,  # The Little Prince
    "9781649374042": 3,  # Fourth Wing
    "9780756404741": 2,  # Name of the Wind
    "9780375842207": 3,  # Book Thief
    "9780385490818": 3,  # Handmaid's Tale
    "9781635570298": 2,  # Priory
    "9780007448036": 3,  # Night Circus
    "9780765382030": 3,  # Three-Body
    "9781455563937": 2,  # Pachinko
    "9780553448184": 2,  # The Vegetarian
    "9780375704024": 2,
    "9781400079278": 2,
    "9780060883287": 2,
    "9780143108276": 2,
    "9780140449266": 2,
    "9780060959470": 2,  # All About Love
    "9780060932138": 2,
    "9781101947135": 2,
    "9780062963673": 2,
    "9780679775430": 2,
    "9780441569595": 3,  # Neuromancer
    "9780385474542": 2,
    "9780307455925": 2,
    "9780060977498": 2,
}

# Regional flavour: extra books that "belong" to certain places.
BOOK_BOOSTS = {
    "9780060883287": {"Brazil", "Argentina", "Colombia", "Peru", "Mexico", "Chile", "Uruguay", "Spain", "Portugal"},
    "9780307455925": {"Nigeria", "Ghana", "Kenya", "South Africa", "Egypt", "Morocco", "Ethiopia", "United States"},
    "9781101947135": {"Nigeria", "Ghana", "Kenya", "South Africa", "Egypt", "Morocco", "Ethiopia"},
    "9780060977498": {"India", "United Kingdom", "United States"},
    "9780765382030": {"China", "Singapore", "United States", "Germany"},
    "9780553448184": {"South Korea", "Japan", "China"},
    "9780375704024": {"Japan", "South Korea", "Philippines", "Vietnam"},
    "9781400079278": {"Japan", "South Korea", "Philippines", "Vietnam"},
}

ANIMALS = [
    "otter", "fox", "owl", "wren", "lynx", "mole", "raven", "dolphin", "kiwi", "mongoose",
    "cormorant", "axolotl", "godwit", "tadpole", "lemur", "narwhal", "plover", "quokka",
]

BIOS = [
    "Night owl. Sci-fi and slow espressos.",
    "Three books on the nightstand, zero patience.",
    "Rereading my old love until it feels new.",
    "All my opinions live between two covers.",
    "Fiction over facts, always room for both.",
    "Book clubs are my cardio; margins are my diary.",
    "Reading to remember how to think.",
    "I collect dog-eared pages, not pedestals.",
    "Shelf-struck since 2019.",
    "Curiosity is the only network I join.",
    "Dark romanticist with a soft spot for essays.",
    "Finished a book, started a new one, forgot sleep.",
    "My TBR has a waiting list of its own.",
    "Reading is eavesdropping on better minds.",
    "I speak fluent 'just one more chapter'.",
    "Annotate the pages like fieldwork: carefully.",
    "Soft finalist, but polite about it.",
    "Poetry in the morning, scandals at night.",
    "My bookmarks are breadcrumbs home.",
    "New city, old covers, fresh pages.",
    "Some people vlog; I dog-ear.",
    "Quote in the margin: read faster.",
    "Continuously curious, occasionally sleeping.",
    "I underline the sentences that feel like maps.",
]

AVATAR_IDS = [f"curio-{i:02d}" for i in range(1, 25)]
def _fuzz(v: float) -> float:
    """Mirror the API's GeoFuzz grid (~15 km)."""
    return round(round(v / 0.15) * 0.15, 2)


def _sq(s: str | None) -> str:
    """Single-quoted SQL literal (or NULL)."""
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"


def main() -> None:
    rng = random.Random(2026)

    # ---- 0012 books
    book_lines = [
        "-- Curated starter catalog, part 3 (0012). Upsert by ISBN so re-runs are idempotent.",
        "-- Generated by scripts/gen_seed_demo.py — do not edit by hand.",
        "-- affiliate_links stays empty: links are computed at read time from ISBN + configured tags.",
        "",
        "INSERT INTO books (title, author, isbn, cover_url, description, affiliate_links, metadata) VALUES",
    ]
    total = len(BOOKS)
    for i, (isbn, (title, author)) in enumerate(BOOKS.items(), 1):
        cover = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
        desc = "A title curious minds keep returning to this season."
        comma = "," if i < total else ""
        book_lines.append(
            f"({_sq(title)}, {_sq(author)}, {_sq(isbn)}, {_sq(cover)}, {_sq(desc)}, '{{}}', '{{\"source\":\"seed\"}}'){comma}"
        )
    book_lines += [
        "ON CONFLICT (lower(isbn)) DO UPDATE",
        "SET cover_url = EXCLUDED.cover_url, description = EXCLUDED.description;",
        "",
    ]

    # ---- 0013 readers
    readers: list[tuple[str, str, str, str, str, str | None, str, float, float]] = []
    shelves: list[tuple[str, str, int]] = []
    seq = 0
    for country, region, city, lat, lng, count in LOCATIONS:
        latf, lngf = _fuzz(lat), _fuzz(lng)
        for _ in range(count):
            seq += 1
            email = f"seed.demo.{seq:04d}@curiomap.demo"
            handle = f"curious_{ANIMALS[seq % len(ANIMALS)]}_{seq:03d}"
            avatar = AVATAR_IDS[seq % len(AVATAR_IDS)]
            bio = rng.choice(BIOS)
            readers.append((email, handle, avatar, bio, country, region, city, latf, lngf))

            pool = list(BOOKS)
            weights = [BOOK_WEIGHTS.get(b, 2) for b in pool]
            for idx, isbn in enumerate(pool):
                if country in BOOK_BOOSTS.get(isbn, set()):
                    weights[idx] += 6
            picks = set(rng.choices(pool, weights=weights, k=3))
            for isbn in picks:
                shelves.append((email, isbn, rng.randint(0, 40)))

    # Locations (idempotent, one row per city).
    loc_lines = [
        "-- Demo readers across the globe (0013). Coordinates are fuzzed like the API's GeoFuzz grid.",
        "-- Generated by scripts/gen_seed_demo.py — do not edit by hand.",
        "-- Idempotent: locations/users/shelves upsert; re-running is safe.",
        "",
        "INSERT INTO locations (country, region, city, lat_fuzzed, lng_fuzzed) VALUES",
    ]
    for i, (c, region, city, lat, lng, _) in enumerate(LOCATIONS):
        comma = "," if i < len(LOCATIONS) - 1 else ""
        loc_lines.append(
            f"({_sq(c)}, {_sq(region)}, {_sq(city)}, {_fuzz(lat)}, {_fuzz(lng)}){comma}"
        )
    loc_lines += [
        "ON CONFLICT (lower(coalesce(country, '')), lower(coalesce(region, '')), lower(coalesce(city, ''))) DO NOTHING;",
        "",
    ]

    # Users.
    user_val_lines = []
    for email, handle, avatar, bio, country, region, city, _lat, _lng in readers:
        user_val_lines.append(
            f"({_sq(email)}, 'seed-demo-reader', {_sq(handle)}, {_sq(avatar)}, 'pseudonymous', {_sq(bio)}, {_sq(country)}, {_sq(region)}, {_sq(city)})"
        )
    users_sql = "\n".join([
        "-- Readers (anonymous-first: pseudonymous handles + curated avatars).",
        "WITH loc AS (SELECT id, country, region, city FROM locations)",
        "INSERT INTO users (email, password_hash, handle, avatar_id, display_name_mode, bio, location_id, location_visibility, bookshelf_visibility)",
        "SELECT v.email, 'seed-demo-reader', v.handle, v.avatar_id, 'pseudonymous', v.bio, loc.id, 'region_city', 'public'",
        "FROM (VALUES",
        ",\n".join(user_val_lines),
        ") AS v(email, password_hash, handle, avatar_id, display_name_mode, bio, country, region, city)",
        "JOIN loc",
        "  ON lower(coalesce(loc.country, '')) = lower(coalesce(v.country, ''))",
        "  AND lower(coalesce(loc.region, '')) = lower(coalesce(v.region, ''))",
        "  AND lower(coalesce(loc.city, '')) = lower(coalesce(v.city, ''))",
        "ON CONFLICT (lower(email)) DO UPDATE SET",
        "  handle = EXCLUDED.handle, avatar_id = EXCLUDED.avatar_id,",
        "  bio = EXCLUDED.bio, location_id = EXCLUDED.location_id, updated_at = now();",
        "",
    ])

    # Shelves ("reading now").
    shelf_val_lines = [
        f"({_sq(email)}, {_sq(isbn)}, {days})" for email, isbn, days in shelves
    ]
    shelves_sql = "\n".join([
        "-- Currently reading (shelf entries).",
        "INSERT INTO bookshelf_entries (user_id, book_id, status, visibility, started_at)",
        "SELECT u.id, b.id, 'reading', 'public', now() - make_interval(days => v.days)",
        "FROM (VALUES",
        ",\n".join(shelf_val_lines),
        ") AS v(email, isbn, days)",
        "JOIN users u ON lower(u.email) = lower(v.email)",
        "JOIN books b ON lower(b.isbn) = lower(v.isbn)",
        "ON CONFLICT (user_id, book_id) DO NOTHING;",
        "",
    ])

    (MIG_DIR / "0012_seed_books_3.sql").write_text("\n".join(book_lines), encoding="utf-8")
    (MIG_DIR / "0013_seed_demo_readers.sql").write_text(
        "\n\n".join(["\n".join(loc_lines), users_sql, shelves_sql]), encoding="utf-8"
    )
    print(f"wrote {len(BOOKS)} books, {len(readers)} readers, {len(shelves)} shelf rows "
          f"across {len(LOCATIONS)} locations")


if __name__ == "__main__":
    main()