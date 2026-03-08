#!/usr/bin/env python3
"""Generate common_names_best3.csv with improved relevance scoring."""
import csv
import re
from collections import defaultdict

INPUT = "/var/www/eliot/data/common_names_marine_fish.csv"
OUTPUT = "/var/www/eliot/data/common_names_best3.csv"

# Manual overrides for well-known species
MANUAL_OVERRIDES = {
    "Gadus morhua": ["Atlantic cod", "Cod", "Codfish"],
    "Thunnus thynnus": ["Atlantic bluefin tuna", "Bluefin tuna", "Tuna"],
    "Thunnus albacares": ["Yellowfin tuna", "Ahi", "Tuna"],
    "Salmo salar": ["Atlantic salmon", "Salmon", ""],
    "Clupea harengus": ["Atlantic herring", "Herring", ""],
    "Hippocampus hippocampus": ["Short-snouted seahorse", "Seahorse", ""],
    "Scomber scombrus": ["Atlantic mackerel", "Mackerel", ""],
    "Pleuronectes platessa": ["European plaice", "Plaice", ""],
    "Solea solea": ["Common sole", "Dover sole", "Sole"],
    "Merluccius merluccius": ["European hake", "Hake", ""],
    "Xiphias gladius": ["Swordfish", "Broadbill", ""],
    "Epinephelus marginatus": ["Dusky grouper", "Grouper", ""],
    "Dicentrarchus labrax": ["European seabass", "Sea bass", "Bass"],
    "Sparus aurata": ["Gilthead seabream", "Sea bream", "Dorade"],
    "Coryphaena hippurus": ["Common dolphinfish", "Mahi-mahi", "Dorado"],
    "Katsuwonus pelamis": ["Skipjack tuna", "Bonito", ""],
    "Rachycentron canadum": ["Cobia", "Ling", ""],
    "Mugil cephalus": ["Flathead grey mullet", "Striped mullet", "Mullet"],
    "Pomatomus saltatrix": ["Bluefish", "Tailor", ""],
    "Seriola dumerili": ["Greater amberjack", "Amberjack", ""],
}

# Common family-level terms that indicate good names
FAMILY_TERMS = {
    "cod", "herring", "tuna", "salmon", "mackerel", "sole", "plaice",
    "bass", "grouper", "snapper", "flounder", "wrasse", "goby", "blenny",
    "eel", "shark", "ray", "anchovy", "sardine", "mullet", "perch",
    "bream", "pike", "carp", "trout", "catfish", "puffer", "trigger",
    "angel", "parrot", "butterfly", "surgeon", "scorpion", "lion",
    "seahorse", "pipefish", "rockfish", "swordfish", "barracuda",
}


def score_name(name, valid_name, family):
    """Score a common name for relevance. Lower = better."""
    s = 100  # base score

    name_lower = name.lower().strip()

    # Shorter names are generally better (more widely used)
    word_count = len(name_lower.split())
    s += word_count * 3

    # Character length penalty
    s += max(0, len(name_lower) - 15)

    # Bonus for names containing family-level common terms
    for term in FAMILY_TERMS:
        if term in name_lower:
            s -= 10
            break

    # Bonus for simple, clean names (no special chars)
    if re.match(r"^[A-Za-z\s-]+$", name):
        s -= 5

    # Parenthetical qualifiers penalty
    if re.search(r"\(.*\)", name):
        s += 20

    # 4+ word names penalty
    if word_count >= 4:
        s += 15

    # Names ending in 'fish' are often good
    if name_lower.endswith("fish"):
        s -= 5

    # Simple one-word names bonus
    if word_count == 1 and name[0].isupper():
        s -= 3

    # Penalty for names that look like scientific names (Latin-like)
    if re.match(r"^[A-Z][a-z]+\s[a-z]+$", name):
        s += 30

    # Penalty for all-caps
    if name.isupper():
        s += 20

    # Bonus for common geographic/descriptive adjectives
    common_adj = [
        "atlantic", "pacific", "european", "common", "great", "giant",
        "blue", "red", "yellow", "black", "white", "green", "spotted",
        "striped", "banded", "long", "short", "big", "small",
    ]
    first_word = name_lower.split()[0] if name_lower.split() else ""
    if first_word in common_adj:
        s -= 5

    # Penalty for obscure markers
    obscure_markers = ["unspecified", "other", "various", "sp.", "spp.", "cf."]
    for marker in obscure_markers:
        if marker in name_lower:
            s += 30

    # Penalty for "Bank" prefix (obscure regional names)
    if name_lower.startswith("bank "):
        s += 15

    return s


def main():
    # Read all common names grouped by VALID_NAME
    species_names = defaultdict(list)

    with open(INPUT, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.strip().split("\n")
    header = lines[0].split("@")
    header = [h.strip().strip('"').upper() for h in header]

    valid_idx = header.index("VALID_NAME")
    name_idx = header.index("COMMON_NAME")
    lang_idx = header.index("LANGUAGE")
    family_idx = header.index("FAMILY")

    for line in lines[1:]:
        if not line.strip():
            continue
        cols = line.split("@")
        cols = [c.strip().strip('"') for c in cols]
        if len(cols) <= max(valid_idx, name_idx, lang_idx, family_idx):
            continue

        valid_name = cols[valid_idx]
        common_name = cols[name_idx]
        language = cols[lang_idx]
        family = cols[family_idx]

        if not valid_name or not common_name or language != "English":
            continue

        if common_name.lower() in ("", "na", "n/a", "-"):
            continue

        s = score_name(common_name, valid_name, family)
        species_names[valid_name].append((common_name, language, family, s))

    # Select best 3 per species
    with open(OUTPUT, "w", newline="", encoding="utf-8") as out:
        writer = csv.writer(out)
        writer.writerow(["VALID_NAME", "LANGUAGE", "COMMON_NAME_1", "COMMON_NAME_2", "COMMON_NAME_3"])

        for valid_name in sorted(species_names.keys()):
            if valid_name in MANUAL_OVERRIDES:
                names = MANUAL_OVERRIDES[valid_name]
                row = [valid_name, "English"] + names[:3]
                while len(row) < 5:
                    row.append("")
                writer.writerow(row)
                continue

            entries = species_names[valid_name]
            entries.sort(key=lambda x: x[3])
            seen = set()
            best = []
            for name, lang, fam, score in entries:
                name_lower = name.lower()
                if name_lower not in seen:
                    seen.add(name_lower)
                    best.append(name)
                    if len(best) == 3:
                        break

            while len(best) < 3:
                best.append("")

            writer.writerow([valid_name, "English"] + best)

    print(f"Generated {OUTPUT} with {len(species_names)} species")


if __name__ == "__main__":
    main()
