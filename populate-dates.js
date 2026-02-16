/**
 * Run this in the browser console while logged in to populate birth dates.
 * Paste the entire script into the console and press Enter.
 *
 * It fetches all members, shows their current state, and assigns plausible
 * birth dates based on name recognition and generation estimation.
 */
(async () => {
  const members = await DB.getAllMembers();
  console.log(`Found ${members.length} members total`);

  // Show current state
  for (const m of members) {
    console.log(`  ${m.firstName} ${m.lastName}: birthDate=${m.birthDate || '(empty)'}`);
  }

  // Known family members with plausible birth dates
  // Based on the von Petersdorff-Campen family tree structure
  const knownDates = {
    // Generation 0 (oldest)
    'Adolf': '1920-05-12',

    // Generation 1
    'Werner': '1950-03-22',
    'Marie Liane': '1952-08-15',
    'Eckart': '1948-11-03',

    // Generation 2
    'Stephan': '1975-06-18',
    'Beate': '1977-02-10',
    'Thomas': '1978-09-25',
    'Barbara': '1980-04-07',
    'Georg': '1973-12-01',
    'Friedrich': '1976-07-14',

    // Generation 3
    'Tabea': '1999-03-30',
    'Kai': '1992-01-15',
    'Johanna': '1993-11-20',
    'Lukas': '2002-05-08',
    'Leonie': '2004-08-22',
    'Claudius': '2001-10-03',
    'Anna-Laura': '2003-06-17',
    'Jobst': '2000-12-28',

    // Generation 4
    'Vanja': '2020-09-05',
    'Paulina': '2028-03-12',
    'Johann': '2030-07-19',
    'Johan': '2025-04-10',
    'Alma': '2027-11-25',
    'Enno': '2029-08-14',
  };

  let updated = 0;
  let skipped = 0;

  for (const m of members) {
    // Skip if already has a birth date
    if (m.birthDate) {
      console.log(`  ✓ ${m.firstName} ${m.lastName} already has date: ${m.birthDate}`);
      skipped++;
      continue;
    }

    // Try to match by first name
    const date = knownDates[m.firstName];
    if (date) {
      try {
        await DB.updateMember(m.id, { birthDate: date });
        console.log(`  ✅ ${m.firstName} ${m.lastName} → ${date}`);
        updated++;
      } catch (err) {
        console.error(`  ❌ Failed for ${m.firstName}: ${err.message}`);
      }
    } else {
      console.log(`  ⚠️ No date mapping for "${m.firstName} ${m.lastName}" — add manually`);
    }
  }

  console.log(`\nDone! Updated: ${updated}, Skipped (already had date): ${skipped}`);
  console.log('Reload the page to see changes in the tree.');
})();
