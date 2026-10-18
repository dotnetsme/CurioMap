-- Topic (map category) for the curated catalog. Names match the discovery UI's categories; the
-- filter compares them case-insensitively. Only fills gaps (topic IS NULL), so curated or imported
-- values are never overwritten, and it is safe to run more than once.
UPDATE books AS b
SET topic = t.topic
FROM (VALUES
    ('9780140449334', 'Philosophy'),          -- Meditations
    ('9789401758284', 'Philosophy'),          -- Cartesian Meditations
    ('9780812979686', 'Philosophy'),          -- Antifragile
    ('9780060959470', 'Philosophy'),          -- All About Love
    ('9780807014295', 'Psychology'),          -- Man's Search for Meaning
    ('9780374533557', 'Psychology'),          -- Thinking, Fast and Slow
    ('9780735211292', 'Psychology'),          -- Atomic Habits
    ('9781455586691', 'Psychology'),          -- Deep Work
    ('9780465026562', 'Science & Nature'),    -- Godel, Escher, Bach
    ('9780062316097', 'History & Society'),   -- Sapiens
    ('9780399590504', 'History & Society'),   -- Educated
    ('9780135957059', 'Technology'),          -- The Pragmatic Programmer
    ('9780804139298', 'Technology'),          -- Zero to One
    ('9780441013593', 'Sci-Fi'),              -- Dune
    ('9780441569595', 'Sci-Fi'),              -- Neuromancer
    ('9780593135204', 'Sci-Fi'),              -- Project Hail Mary
    ('9780765382030', 'Sci-Fi'),              -- The Three-Body Problem
    ('9780575079038', 'Sci-Fi'),              -- The Dispossessed
    ('9780060850524', 'Sci-Fi'),              -- Brave New World
    ('9780451524935', 'Sci-Fi'),              -- Nineteen Eighty-Four
    ('9780385490818', 'Sci-Fi'),              -- The Handmaid's Tale
    ('9780593318171', 'Sci-Fi'),              -- Klara and the Sun
    ('9789722331562', 'Sci-Fi'),              -- The Lathe of Heaven
    ('9780547928227', 'Speculative & Magical'), -- The Hobbit
    ('9780756404741', 'Speculative & Magical'), -- The Name of the Wind
    ('9780007448036', 'Speculative & Magical'), -- The Night Circus
    ('9781635575637', 'Speculative & Magical'), -- Piranesi
    ('9781635570298', 'Speculative & Magical'), -- The Priory of the Orange Tree
    ('9780061478789', 'Speculative & Magical'), -- Howl's Moving Castle
    ('9780316556347', 'Speculative & Magical'), -- Circe
    ('9780062060624', 'Speculative & Magical'), -- The Song of Achilles
    ('9781649374042', 'Speculative & Magical'), -- Fourth Wing
    ('9780143108276', 'Speculative & Magical'), -- The Master and Margarita
    ('9781400079278', 'Speculative & Magical'), -- Kafka on the Shore
    ('9780679775430', 'Speculative & Magical'), -- The Wind-Up Bird Chronicle
    ('9780525559474', 'Speculative & Magical'), -- The Midnight Library
    ('9780060883287', 'Literary Fiction'),    -- One Hundred Years of Solitude
    ('9780060977498', 'Literary Fiction'),    -- The God of Small Things
    ('9780307455925', 'Literary Fiction'),    -- Americanah
    ('9781101947135', 'Literary Fiction'),    -- Homegoing
    ('9781455563937', 'Literary Fiction'),    -- Pachinko
    ('9780385474542', 'Literary Fiction'),    -- Things Fall Apart
    ('9780553448184', 'Literary Fiction'),    -- The Vegetarian
    ('9780375704024', 'Literary Fiction'),    -- Norwegian Wood
    ('9780375842207', 'Literary Fiction'),    -- The Book Thief
    ('9780140449266', 'Literary Fiction'),    -- The Count of Monte Cristo
    ('9789573258216', 'Literary Fiction'),    -- To Kill a Mockingbird
    ('9780735219090', 'Literary Fiction'),    -- Where the Crawdads Sing
    ('9780593321201', 'Literary Fiction'),    -- Tomorrow, and Tomorrow, and Tomorrow
    ('9780062963673', 'Literary Fiction'),    -- The Dutch House
    ('9780062315007', 'Literary Fiction'),    -- The Alchemist
    ('9780156012195', 'Literary Fiction'),    -- The Little Prince
    ('9780060932138', 'Literary Fiction'),    -- The Unbearable Lightness of Being
    ('9783492204019', 'Literary Fiction')     -- Crime and Punishment (Russian edition)
) AS t(isbn, topic)
WHERE lower(b.isbn) = lower(t.isbn) AND b.topic IS NULL;
