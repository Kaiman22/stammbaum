#!/usr/bin/env python3
"""
Complete family tree data import script.
Parses user-provided genealogical data and inserts into Supabase.
"""

import json
import requests
import uuid
import sys

APIKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZGN5b2l2dGFwZ2xsbG13dnV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE0NDAzNywiZXhwIjoyMDg2NzIwMDM3fQ.mN6gey2egKU16AXbLoBLyhFCuEczyT5GTxzbTR0Ojvs"
BASE = "https://ixdcyoivtapglllmwvut.supabase.co/rest/v1"
HEADERS = {
    "apikey": APIKEY,
    "Authorization": f"Bearer {APIKEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Generate stable UUIDs for each person code
def make_id(code):
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"stammbaum.{code}"))

# ============================================================
# MEMBER DATA
# Format: (code, first_name, last_name, birth_name, birth_date, death_date, is_blood_line)
# is_blood_line = True for v. Petersdorff-Campen by birth
# ============================================================

members = [
    # === STAMMVATER ===
    ("P001", "Hans Leo", "von Petersdorff-Campen", "", "1830-06-28", "1904-12-03", True),
    ("S001", "Thusnelda", "von Petersdorff-Campen", "v. Campen", "1836-12-13", "1897-02-06", False),

    # === GEN I ===
    ("P002", "Adolf Friedrich", "von Petersdorff-Campen", "", "1869-07-07", "1921-05-25", True),
    ("S002", "Gertrud", "von Petersdorff-Campen", "v. der Decken", "1881-05-25", "1956-12-29", False),
    ("P052", "Hans Karl", "von Petersdorff-Campen", "", "1871-03-13", "1932-05-18", True),
    ("S052", "Alexandra", "von Petersdorff-Campen", "Kraack", "1876-05-04", "1946-11-11", False),

    # === GEN II - Children of P002 (Adolf Friedrich) ===
    ("P003", "Eckhard", "von Petersdorff-Campen", "", "1905-03-09", "1994-11-24", True),
    ("S003a", "Olga", "von Petersdorff-Campen", "v. Hinüber", "1906-07-20", "1996-11-10", False),
    ("S003b", "Margarete", "von Petersdorff-Campen", "Bestian", "1919-12-19", "2010-04-26", False),
    ("P037", "Georg Hans Ludolf", "von Petersdorff-Campen", "", "1910-01-10", "1945-01-23", True),
    ("S037", "Madlene", "von Petersdorff-Campen", "v. Heynitz", "1915-02-08", "1966-02-26", False),
    ("P044", "Werner", "von Petersdorff-Campen", "", "1911-04-23", "1978-10-03", True),
    ("S044", "Marie-Liane", "von Petersdorff-Campen", "v. Schlick", "1916-09-20", "2004-10-21", False),

    # === GEN II - Children of P052 (Hans Karl) ===
    ("P053", "Hans Engel Ludolf Peter", "von Petersdorff-Campen", "", "1904-12-14", "1971-05-20", True),
    ("S053", "Annaliese", "von Petersdorff-Campen", "Heyme", "1904-02-03", "1989-02-26", False),
    ("P056", "Heyno", "von Petersdorff-Campen", "", "1907-12-30", "1970-09-26", True),
    ("S056", "Henny", "von Petersdorff-Campen", "v. Rutkowski", "1910-12-06", "1982-11-19", False),
    ("P064", "Friedo", "von Petersdorff-Campen", "", "1914-07-26", "1987-01-22", True),
    ("S064a", "Josi", "von Petersdorff-Campen", "Juß", "1918-01-07", None, False),
    ("S064b", "Elsa", "von Petersdorff-Campen", "Hafke", "1910-01-27", "1995-01-31", False),

    # === GEN III - Children of P003 (Eckhard) ===
    ("P004", "Georg", "von Petersdorff-Campen", "", "1931-12-05", None, True),
    ("S004a", "Karoline", "von Petersdorff-Campen", "Brand", "1933-06-02", "1974-08-25", False),
    ("S004b", "Roswitha", "von Petersdorff-Campen", "v. Keyserlingk", "1941-08-06", None, False),
    ("P018", "Christa", "von Petersdorff-Campen", "", "1932-11-26", "2001-07-20", True),
    ("S018", "Albrecht", "v. Gadenstedt", "", "1929-10-08", "2002-05-15", False),
    ("P019", "Peter Ernst Diedrich", "von Petersdorff-Campen", "", "1934-08-10", None, True),
    ("S019", "Martha", "von Petersdorff-Campen", "Hesse", "1940-01-08", None, False),
    ("P031", "Winand", "von Petersdorff-Campen", "", "1937-03-13", "1999-04-11", True),
    ("S031", "Christiane", "von Petersdorff-Campen", "v. Siebert", "1949-01-14", None, False),
    ("P035", "Elke", "von Petersdorff-Campen", "", "1939-07-01", None, True),
    ("S035", "Kurt", "Wittboldt-Müller", "", "1931-03-27", None, False),
    ("P036", "Jutta Gudrun", "von Petersdorff-Campen", "", "1943-09-02", "2006-09-17", True),
    ("S036a", "Heinfred", "Baxmann", "", "1943-05-11", None, False),
    ("S036b", "Ulrich", "Beyer", "", "1944-01-22", "1999-01-06", False),

    # === GEN III - Children of P037 (Georg Hans Ludolf) ===
    ("P038", "Friedrich Christian", "von Petersdorff-Campen", "", "1938-06-07", None, True),
    ("S038a", "Marilyn", "von Petersdorff-Campen", "Andulsky", "1941-09-13", "2003-12-21", False),
    ("S038b", "Nita", "von Petersdorff-Campen", "Kennedy", "1941-07-28", None, False),
    ("P042", "Maria-Madlene", "von Petersdorff-Campen", "", "1941-08-30", None, True),
    ("S042", "Ernst-Christof", "v. Heinemann", "", "1935-03-23", None, False),
    ("P043", "Jutta-Dorothee", "von Petersdorff-Campen", "", "1943-10-23", None, True),
    ("S043", "Henning", "v. Petersdorff", "", "1942-11-18", None, False),

    # === GEN III - Children of P044 (Werner) ===
    ("P045", "Stephan", "von Petersdorff-Campen", "", "1953-07-21", None, True),
    ("S045", "Beate", "von Petersdorff-Campen", "Krischer", "1954-02-02", None, False),
    ("P048", "Thomas", "von Petersdorff-Campen", "", "1954-12-14", None, True),
    ("S048", "Barbara", "von Petersdorff-Campen", "Stein", "1955-03-25", None, False),

    # === GEN III - Children of P053 (Hans Engel) ===
    ("P054", "Klaus", "von Petersdorff-Campen", "", "1940-09-01", None, True),
    ("S054", "Adelheid", "von Petersdorff-Campen", "Wollny", "1946-01-07", "1991-08-07", False),

    # === GEN III - Children of P056 (Heyno) ===
    ("P057", "Eberhard", "von Petersdorff-Campen", "", "1937-04-30", None, True),
    ("S057", "Marianne", "von Petersdorff-Campen", "Siewert", "1935-08-12", None, False),
    ("P060", "Axel", "von Petersdorff-Campen", "", "1939-01-01", None, True),
    ("S060", "Eva", "von Petersdorff-Campen", "Oppermann", "1943-11-25", None, False),
    ("P061", "Ralf", "von Petersdorff-Campen", "", "1943-03-18", None, True),
    ("S061", "Maria", "von Petersdorff-Campen", "Duggen", "1941-10-07", None, False),

    # === GEN III - Children of P064 (Friedo) ===
    ("P065", "Bernd", "von Petersdorff-Campen", "", "1941-05-16", None, True),
    ("P066", "Volker", "von Petersdorff-Campen", "", "1942-09-20", None, True),
    ("S066", "Kirsten", "von Petersdorff-Campen", "Siegmund", "1945-01-01", None, False),

    # === GEN IV - Children of P004 (Georg) ===
    ("P005", "Friedrich", "von Petersdorff-Campen", "", "1957-10-23", None, True),
    ("S005", "Heike", "von Petersdorff-Campen", "Hartjen", "1960-05-09", None, False),
    ("P011", "Renate", "von Petersdorff-Campen", "", "1959-04-06", None, True),
    ("S011", "Paul", "Millen", "", "1959-06-16", None, False),
    ("P012", "Katharina", "von Petersdorff-Campen", "", "1961-08-17", None, True),
    ("S012", "Robert", "Schaefer", "", "1961-07-13", None, False),
    ("P013", "Daniel", "von Petersdorff-Campen", "", "1963-06-29", None, True),
    ("S013", "Franziska", "von Petersdorff-Campen", "Friedrich", "1966-05-16", None, False),
    ("P017", "Joachim Kurt", "von Petersdorff-Campen", "", "1977-01-17", None, True),

    # === GEN IV - Children of P019 (Peter Ernst Diedrich) ===
    ("P020", "Griet", "von Petersdorff-Campen", "", "1962-07-19", None, True),
    ("P021", "Winand", "von Petersdorff-Campen", "", "1963-07-01", None, True),
    ("S021", "Antje", "von Petersdorff-Campen", "Grabenhorst", "1962-10-09", None, False),
    ("P026", "Hilmar", "von Petersdorff-Campen", "", "1967-01-17", None, True),
    ("S026", "Birgit", "von Petersdorff-Campen", "Harenberg", "1968-03-25", None, False),
    ("P030", "Henrik", "von Petersdorff-Campen", "", "1968-11-13", None, True),

    # === GEN IV - Children of P031 (Winand sr.) ===
    ("P032", "Christoph", "von Petersdorff-Campen", "", "1975-03-26", None, True),
    ("P033", "Marietta", "von Petersdorff-Campen", "", "1976-06-07", None, True),
    ("S033", "Hans", "v. Pfuhlstein", "", "1974-05-03", None, False),
    ("P034", "Tilman", "von Petersdorff-Campen", "", "1978-09-02", None, True),

    # === GEN IV - Children of P038 (Friedrich Christian) ===
    ("P039", "Michael", "von Petersdorff-Campen", "", "1960-12-06", None, True),
    ("P040", "Edward", "von Petersdorff-Campen", "", "1963-01-15", None, True),
    ("S040", "Kathryn", "von Petersdorff-Campen", "Bergeron", "1961-11-15", None, False),
    ("P041", "Pamela", "von Petersdorff-Campen", "", "1964-09-19", None, True),
    ("S041a", "Kenneth", "Grey", "", None, None, False),
    ("S041b", "Timothy", "Mueller", "", None, None, False),
    ("S041c", "David", "Mills", "", "1957-01-13", None, False),

    # === GEN IV - Children of P045 (Stephan) ===
    ("P046", "Tabea", "von Petersdorff-Campen", "", "1990-06-08", None, True),
    ("P047", "Kai", "von Petersdorff-Campen", "", "1992-02-02", None, True),

    # === GEN IV - Children of P048 (Thomas) ===
    ("P049", "Lukas", "von Petersdorff-Campen", "", "1988-05-05", None, True),
    ("P050", "Claudius", "von Petersdorff-Campen", "", "1990-04-26", None, True),
    ("P051", "Leonie", "von Petersdorff-Campen", "", "1990-04-26", None, True),

    # === GEN IV - Children of P054 (Klaus) ===
    ("P055", "Ralph", "von Petersdorff-Campen", "", "1975-05-03", None, True),

    # === GEN IV - Children of P057 (Eberhard) ===
    ("P058", "Iris", "von Petersdorff-Campen", "", "1959-03-17", None, True),
    ("S058", "Gerhard", "Schmitt", "", "1951-05-22", None, False),
    ("P059", "Eric", "von Petersdorff-Campen", "", "1965-02-23", None, True),

    # === GEN IV - Children of P061 (Ralf) ===
    ("P062", "Caroline", "von Petersdorff-Campen", "", "1974-09-03", None, True),
    ("S062", "Jens", "Fox", "", "1976-04-21", None, False),
    ("P063", "Constanze", "von Petersdorff-Campen", "", "1976-05-20", None, True),
    ("S063", "Stevan", "Kuhn", "", "1970-05-25", None, False),

    # === GEN IV - Children of P066 (Volker) ===
    ("P067", "Henrik", "von Petersdorff-Campen", "", "1966-12-23", None, True),
    ("S067", "Gabriele", "von Petersdorff-Campen", "Studt", "1967-03-10", None, False),

    # === GEN V - Children of P005 (Friedrich) ===
    ("P006", "Anne", "von Petersdorff-Campen", "", "1985-05-05", None, True),
    ("P007", "Moritz", "von Petersdorff-Campen", "", "1987-11-04", None, True),
    ("P008", "Jobst", "von Petersdorff-Campen", "", "1989-02-12", None, True),
    ("P009", "Johannes", "von Petersdorff-Campen", "", "1990-11-30", None, True),
    ("P010", "Lara", "von Petersdorff-Campen", "", "1995-03-13", None, True),

    # === GEN V - Children of P013 (Daniel) ===
    ("P014", "Sophia", "von Petersdorff-Campen", "", "1992-07-24", None, True),
    ("P015", "Johanna", "von Petersdorff-Campen", "", "1996-03-15", None, True),
    ("P016", "Jurek", "von Petersdorff-Campen", "", "1999-04-06", None, True),

    # === GEN V - Children of P021 (Winand jr.) ===
    ("P022", "Ella", "von Petersdorff-Campen", "", "1991-10-01", None, True),
    ("P023", "Jost", "von Petersdorff-Campen", "", "1993-06-29", None, True),
    ("P024", "Jasper", "von Petersdorff-Campen", "", "1995-10-17", None, True),
    ("P025", "Jakob", "von Petersdorff-Campen", "", "1998-01-25", None, True),

    # === GEN V - Children of P026 (Hilmar) ===
    ("P027", "Charlotte", "von Petersdorff-Campen", "", "1998-11-30", None, True),
    ("P028", "Freya", "von Petersdorff-Campen", "", "2000-06-03", None, True),
    ("P029", "Helena", "von Petersdorff-Campen", "", "2003-02-13", None, True),

    # === GEN V - Children of P067 (Henrik/Volker) ===
    ("P068", "Sophie", "von Petersdorff-Campen", "", "2002-11-22", None, True),
]

# ============================================================
# SPOUSE RELATIONSHIPS
# Format: (person_code, spouse_code, marriage_date, divorce_date)
# ============================================================

spouses = [
    ("P001", "S001", "1863-07-25", None),         # Hans Leo + Thusnelda
    ("P002", "S002", "1904-05-28", None),          # Adolf Friedrich + Gertrud
    ("P003", "S003a", "1931-05-16", "1957-02-15"), # Eckhard + Olga (div.)
    ("P003", "S003b", "1957-06-07", None),         # Eckhard + Margarete
    ("P052", "S052", "1904-01-15", None),          # Hans Karl + Alexandra
    ("P053", "S053", "1936-05-08", None),          # Hans Engel + Annaliese
    ("P056", "S056", "1936-11-07", None),          # Heyno + Henny
    ("P064", "S064a", "1939-10-16", "1956-02-10"), # Friedo + Josi (div.)
    ("P064", "S064b", "1957-04-18", None),         # Friedo + Elsa
    ("P004", "S004a", "1957-01-11", None),         # Georg + Karoline
    ("P004", "S004b", "1975-12-12", None),         # Georg + Roswitha
    ("P018", "S018", "1954-07-24", None),          # Christa + Albrecht
    ("P019", "S019", "1961-09-16", None),          # Peter Ernst Diedrich + Martha
    ("P031", "S031", "1972-05-19", None),          # Winand + Christiane
    ("P035", "S035", "1976-10-27", None),          # Elke + Kurt
    ("P036", "S036a", "1969-09-26", "1972-12-06"), # Jutta Gudrun + Heinfred (div.)
    ("P036", "S036b", "1975-03-21", None),         # Jutta Gudrun + Ulrich
    ("P037", "S037", "1937-08-03", None),          # Georg H.L. + Madlene
    ("P038", "S038a", "1959-09-16", "1979-01-01"), # Friedrich Christian + Marilyn (div.)
    ("P038", "S038b", "1981-04-11", None),         # Friedrich Christian + Nita
    ("P042", "S042", "1962-08-31", None),          # Maria-Madlene + Ernst-Christof
    ("P043", "S043", "1973-04-27", None),          # Jutta-Dorothee + Henning
    ("P044", "S044", "1950-09-16", None),          # Werner + Marie-Liane
    ("P045", "S045", "1990-04-20", None),          # Stephan + Beate
    ("P048", "S048", "1986-04-18", None),          # Thomas + Barbara
    ("P054", "S054", "1968-10-15", None),          # Klaus + Adelheid
    ("P057", "S057", "1958-11-07", None),          # Eberhard + Marianne
    ("P060", "S060", "1969-05-23", None),          # Axel + Eva
    ("P061", "S061", "1966-07-21", None),          # Ralf + Maria
    ("P066", "S066", "1966-06-02", None),          # Volker + Kirsten
    ("P005", "S005", "1984-10-27", None),          # Friedrich + Heike
    ("P011", "S011", "1986-09-30", "2001-06-20"),  # Renate + Paul (div.)
    ("P012", "S012", "1985-09-05", None),          # Katharina + Robert
    ("P013", "S013", "1996-09-27", None),          # Daniel + Franziska
    ("P021", "S021", "1991-04-20", "2008-05-14"),  # Winand jr. + Antje (div.)
    ("P026", "S026", "1997-10-02", None),          # Hilmar + Birgit
    ("P033", "S033", "2004-04-16", None),          # Marietta + Hans v. Pfuhlstein
    ("P040", "S040", "1992-09-26", "2005-06-15"),  # Edward + Kathryn (div.)
    ("P041", "S041a", "1984-02-29", None),         # Pamela + Kenneth Grey (div. date unknown)
    ("P041", "S041b", "1994-10-22", None),         # Pamela + Timothy Mueller (div. date unknown)
    ("P041", "S041c", "2000-09-03", None),         # Pamela + David Mills
    ("P058", "S058", "1991-12-23", None),          # Iris + Gerhard
    ("P062", "S062", "2005-05-28", None),          # Caroline + Jens
    ("P063", "S063", "2005-03-05", None),          # Constanze + Stevan
    ("P067", "S067", "2000-08-25", None),          # Henrik + Gabriele
]

# ============================================================
# PARENT-CHILD RELATIONSHIPS
# Format: (parent_code, child_code)
# Both blood-line parent AND spouse parent are listed
# ============================================================

parent_child = [
    # P001 + S001 -> P002, P052
    ("P001", "P002"), ("S001", "P002"),
    ("P001", "P052"), ("S001", "P052"),

    # P002 + S002 -> P003, P037, P044
    ("P002", "P003"), ("S002", "P003"),
    ("P002", "P037"), ("S002", "P037"),
    ("P002", "P044"), ("S002", "P044"),

    # P052 + S052 -> P053, P056, P064
    ("P052", "P053"), ("S052", "P053"),
    ("P052", "P056"), ("S052", "P056"),
    ("P052", "P064"), ("S052", "P064"),

    # P003 + S003a (Olga, 1st wife) -> P004, P018, P019, P031, P035, P036
    ("P003", "P004"), ("S003a", "P004"),
    ("P003", "P018"), ("S003a", "P018"),
    ("P003", "P019"), ("S003a", "P019"),
    ("P003", "P031"), ("S003a", "P031"),
    ("P003", "P035"), ("S003a", "P035"),
    ("P003", "P036"), ("S003a", "P036"),

    # P003 + S003b (Margarete, 2nd wife) -> P017 (Joachim Kurt)
    ("P003", "P017"), ("S003b", "P017"),
    # Also Roswitha is mother of P017 based on text saying "zweiter Ehe"
    # Wait - text says P017 is child of "zweiter Ehe" with Margarete, and P036 is from "second Ehe of P003"
    # Let me re-read: P036 Jutta Gudrun says "(second Ehe of P003)" but she was born 1943, before divorce 1957
    # The user text says "Children of P003 – b) zweiter Ehe (m2 Margarete): e. [P017]"
    # So P017 is the only child of P003+S003b (Margarete)

    # P004 + S004a (Karoline, 1st wife) -> P005, P011, P012, P013
    ("P004", "P005"), ("S004a", "P005"),
    ("P004", "P011"), ("S004a", "P011"),
    ("P004", "P012"), ("S004a", "P012"),
    ("P004", "P013"), ("S004a", "P013"),

    # P004 + S004b (Roswitha, 2nd wife) -> P017 (Joachim Kurt)
    # Wait no - the text says P017 is child of P003's 2nd marriage with Margarete
    # And under P004's children: "Children of P004 – b) zweiter Ehe (m2 Roswitha):" is empty in user text
    # Actually re-reading: P017 is listed under "Children of P003 – b) zweiter Ehe (m2 Margarete)"
    # So P017's parents are P003 + S003b

    # P037 + S037 -> P038, P042, P043
    ("P037", "P038"), ("S037", "P038"),
    ("P037", "P042"), ("S037", "P042"),
    ("P037", "P043"), ("S037", "P043"),

    # P044 + S044 -> P045, P048
    ("P044", "P045"), ("S044", "P045"),
    ("P044", "P048"), ("S044", "P048"),

    # P053 + S053 -> P054
    ("P053", "P054"), ("S053", "P054"),

    # P056 + S056 -> P057, P060, P061
    ("P056", "P057"), ("S056", "P057"),
    ("P056", "P060"), ("S056", "P060"),
    ("P056", "P061"), ("S056", "P061"),

    # P064 + S064a (Josi, 1st wife) -> P065, P066
    ("P064", "P065"), ("S064a", "P065"),
    ("P064", "P066"), ("S064a", "P066"),

    # P019 + S019 -> P020, P021, P026, P030
    ("P019", "P020"), ("S019", "P020"),
    ("P019", "P021"), ("S019", "P021"),
    ("P019", "P026"), ("S019", "P026"),
    ("P019", "P030"), ("S019", "P030"),

    # P031 + S031 -> P032, P033, P034
    ("P031", "P032"), ("S031", "P032"),
    ("P031", "P033"), ("S031", "P033"),
    ("P031", "P034"), ("S031", "P034"),

    # P038 + S038a (Marilyn, 1st wife) -> P039, P040, P041
    ("P038", "P039"), ("S038a", "P039"),
    ("P038", "P040"), ("S038a", "P040"),
    ("P038", "P041"), ("S038a", "P041"),

    # P045 + S045 -> P046, P047
    ("P045", "P046"), ("S045", "P046"),
    ("P045", "P047"), ("S045", "P047"),

    # P048 + S048 -> P049, P050, P051
    ("P048", "P049"), ("S048", "P049"),
    ("P048", "P050"), ("S048", "P050"),
    ("P048", "P051"), ("S048", "P051"),

    # P054 + S054 -> P055
    ("P054", "P055"), ("S054", "P055"),

    # P057 + S057 -> P058, P059
    ("P057", "P058"), ("S057", "P058"),
    ("P057", "P059"), ("S057", "P059"),

    # P061 + S061 -> P062, P063
    ("P061", "P062"), ("S061", "P062"),
    ("P061", "P063"), ("S061", "P063"),

    # P066 + S066 -> P067
    ("P066", "P067"), ("S066", "P067"),

    # P005 + S005 -> P006, P007, P008, P009, P010
    ("P005", "P006"), ("S005", "P006"),
    ("P005", "P007"), ("S005", "P007"),
    ("P005", "P008"), ("S005", "P008"),
    ("P005", "P009"), ("S005", "P009"),
    ("P005", "P010"), ("S005", "P010"),

    # P013 + S013 -> P014, P015, P016
    ("P013", "P014"), ("S013", "P014"),
    ("P013", "P015"), ("S013", "P015"),
    ("P013", "P016"), ("S013", "P016"),

    # P021 + S021 -> P022, P023, P024, P025
    ("P021", "P022"), ("S021", "P022"),
    ("P021", "P023"), ("S021", "P023"),
    ("P021", "P024"), ("S021", "P024"),
    ("P021", "P025"), ("S021", "P025"),

    # P026 + S026 -> P027, P028, P029
    ("P026", "P027"), ("S026", "P027"),
    ("P026", "P028"), ("S026", "P028"),
    ("P026", "P029"), ("S026", "P029"),

    # P067 + S067 -> P068
    ("P067", "P068"), ("S067", "P068"),
]


def main():
    # Build ID map
    id_map = {}
    for m in members:
        code = m[0]
        id_map[code] = make_id(code)

    # ============ INSERT MEMBERS ============
    print("=== Inserting members ===")
    member_records = []
    for code, first_name, last_name, birth_name, birth_date, death_date, is_blood in members:
        record = {
            "id": id_map[code],
            "first_name": first_name,
            "last_name": last_name,
            "birth_name": birth_name or "",
            "birth_date": birth_date,
            "death_date": death_date,
            "is_deceased": death_date is not None,
            "is_placeholder": not is_blood,
        }
        member_records.append(record)

    # Insert in batches of 50
    for i in range(0, len(member_records), 50):
        batch = member_records[i:i+50]
        resp = requests.post(f"{BASE}/members", headers=HEADERS, json=batch)
        if resp.status_code in (200, 201):
            result = resp.json()
            print(f"  Batch {i//50+1}: inserted {len(result)} members")
        else:
            print(f"  ERROR batch {i//50+1}: {resp.status_code} {resp.text}")
            sys.exit(1)

    print(f"Total members inserted: {len(member_records)}")

    # ============ INSERT SPOUSE RELATIONSHIPS ============
    print("\n=== Inserting spouse relationships ===")
    spouse_records = []
    for person_code, spouse_code, marriage_date, divorce_date in spouses:
        record = {
            "from_id": id_map[person_code],
            "to_id": id_map[spouse_code],
            "rel_type": "spouse",
            "marriage_date": marriage_date,
            "divorce_date": divorce_date,
        }
        spouse_records.append(record)

    resp = requests.post(f"{BASE}/relationships", headers=HEADERS, json=spouse_records)
    if resp.status_code in (200, 201):
        result = resp.json()
        print(f"  Inserted {len(result)} spouse relationships")
    else:
        print(f"  ERROR: {resp.status_code} {resp.text}")
        sys.exit(1)

    # ============ INSERT PARENT-CHILD RELATIONSHIPS ============
    print("\n=== Inserting parent-child relationships ===")
    pc_records = []
    for parent_code, child_code in parent_child:
        record = {
            "from_id": id_map[parent_code],
            "to_id": id_map[child_code],
            "rel_type": "parent_child",
        }
        pc_records.append(record)

    # Insert in batches of 50
    for i in range(0, len(pc_records), 50):
        batch = pc_records[i:i+50]
        resp = requests.post(f"{BASE}/relationships", headers=HEADERS, json=batch)
        if resp.status_code in (200, 201):
            result = resp.json()
            print(f"  Batch {i//50+1}: inserted {len(result)} parent-child relationships")
        else:
            print(f"  ERROR batch {i//50+1}: {resp.status_code} {resp.text}")
            sys.exit(1)

    print(f"Total parent-child relationships inserted: {len(pc_records)}")

    # ============ SUMMARY ============
    print("\n=== SUMMARY ===")
    print(f"Members: {len(member_records)}")
    print(f"Spouse relationships: {len(spouse_records)}")
    print(f"Parent-child relationships: {len(pc_records)}")
    print(f"Total relationships: {len(spouse_records) + len(pc_records)}")

    # Quick verification
    print("\n=== Verification ===")
    resp = requests.get(f"{BASE}/members?select=id&limit=1000", headers={"apikey": APIKEY, "Authorization": f"Bearer {APIKEY}"})
    print(f"Members in DB: {len(resp.json())}")
    resp = requests.get(f"{BASE}/relationships?select=id&limit=1000", headers={"apikey": APIKEY, "Authorization": f"Bearer {APIKEY}"})
    print(f"Relationships in DB: {len(resp.json())}")


if __name__ == "__main__":
    main()
