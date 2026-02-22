/**
 * Gotha Data Entry Script
 * Run this in the browser console while logged into the Stammbaum app.
 * It uses the global DB module which is already authenticated via Supabase.
 *
 * Usage: Copy-paste this entire script into the browser console.
 * It will:
 *   1. Query all existing members
 *   2. Match existing members by name
 *   3. Update existing members with corrected Gotha data
 *   4. Create new members that don't exist yet
 *   5. Create all relationships (spouse, parent_child)
 *   6. Refresh the tree
 */

(async function gothaDataEntry() {
  'use strict';

  const log = (msg) => console.log(`[Gotha] ${msg}`);
  const warn = (msg) => console.warn(`[Gotha] ${msg}`);
  const err = (msg) => console.error(`[Gotha] ${msg}`);

  // ─── Step 1: Get all existing members ───
  log('Step 1: Fetching existing members...');
  const existingMembers = await DB.getAllMembers();
  log(`Found ${existingMembers.length} existing members`);

  // Build lookup by firstName+lastName for matching
  const membersByName = new Map();
  for (const m of existingMembers) {
    const key = `${m.firstName.trim().toLowerCase()}|${m.lastName.trim().toLowerCase()}`;
    if (!membersByName.has(key)) membersByName.set(key, []);
    membersByName.get(key).push(m);
  }

  function findExisting(firstName, lastName) {
    const key = `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
    const matches = membersByName.get(key) || [];
    return matches.length > 0 ? matches[0] : null;
  }

  function findExistingByFirst(firstName, lastName) {
    // More flexible: match by first name within the same last name
    const ln = lastName.trim().toLowerCase();
    const fn = firstName.trim().toLowerCase();
    for (const m of existingMembers) {
      if (m.lastName.trim().toLowerCase() === ln &&
          m.firstName.trim().toLowerCase().includes(fn)) {
        return m;
      }
    }
    return null;
  }

  // ─── Step 2: Define Gotha persons ───
  // Each entry: { firstName, lastName, birthName, birthDate, deathDate, isDeceased, gender, notes, location }
  // We'll track IDs after create/find

  const gothaPersons = {
    adolf: {
      firstName: 'Adolf', lastName: 'von Petersdorff-Campen',
      birthDate: '1878-10-24', deathDate: '1934-02-18',
      isDeceased: true, gender: 'male',
      notes: 'Rittergutsbesitzer auf Campen', location: 'Campen, Pommern',
    },
    elisabeth: {
      firstName: 'Elisabeth', lastName: 'von Petersdorff-Campen',
      birthName: 'von Behr', birthDate: '1885-09-02', deathDate: '1966-06-03',
      isDeceased: true, gender: 'female',
    },
    werner: {
      firstName: 'Werner', lastName: 'von Petersdorff-Campen',
      birthDate: '1911-12-14', deathDate: '1982-06-07',
      isDeceased: true, gender: 'male',
      location: 'Campen, Pommern',
    },
    marieLiane: {
      firstName: 'Marie Liane', lastName: 'von Petersdorff-Campen',
      birthName: 'Gräfin von Schlick', birthDate: '1916-10-04', deathDate: '2008-01-15',
      isDeceased: true, gender: 'female',
    },
    eckart: {
      firstName: 'Eckart', lastName: 'von Petersdorff-Campen',
      birthDate: '1914-03-28', deathDate: '1944',
      isDeceased: true, gender: 'male',
      notes: 'Gefallen im 2. Weltkrieg', location: 'Campen, Pommern',
    },
    irmgard: {
      firstName: 'Irmgard', lastName: 'von Petersdorff-Campen',
      birthName: 'von Gadow',
      isDeceased: false, gender: 'female',
    },
    stephan: {
      firstName: 'Stephan', lastName: 'von Petersdorff-Campen',
      birthDate: '1953-01-12',
      isDeceased: false, gender: 'male',
    },
    beate: {
      firstName: 'Beate', lastName: 'von Petersdorff-Campen',
      birthName: 'Krischer', birthDate: '1954-06-22',
      isDeceased: false, gender: 'female',
    },
    thomas: {
      firstName: 'Thomas', lastName: 'von Petersdorff-Campen',
      birthDate: '1955-08-17',
      isDeceased: false, gender: 'male',
    },
    anneBormann: {
      firstName: 'Anne', lastName: 'von Petersdorff-Campen',
      birthName: 'Bormann',
      isDeceased: false, gender: 'female',
    },
    kordula: {
      firstName: 'Kordula', lastName: 'von Petersdorff-Campen',
      isDeceased: false, gender: 'female',
      notes: 'Tochter von Werner und Marie Liane',
    },
    georg: {
      firstName: 'Georg', lastName: 'von Petersdorff-Campen',
      isDeceased: false, gender: 'male',
      notes: 'Sohn von Eckart und Irmgard',
    },
    tabea: {
      firstName: 'Tabea Liane Maria', lastName: 'von Petersdorff-Campen',
      birthDate: '1990',
      isDeceased: false, gender: 'female',
    },
    kai: {
      firstName: 'Kai', lastName: 'von Petersdorff-Campen',
      birthDate: '1992',
      isDeceased: false, gender: 'male',
    },
    johanna: {
      firstName: 'Johanna', lastName: 'Klar',
      birthDate: '1993',
      isDeceased: false, gender: 'female',
    },
    vanja: {
      firstName: 'Vanja', lastName: 'von Petersdorff-Campen',
      birthDate: '2024',
      isDeceased: false,
    },
    lukas: {
      firstName: 'Lukas', lastName: 'von Petersdorff-Campen',
      birthDate: '1989',
      isDeceased: false, gender: 'male',
    },
    leonie: {
      firstName: 'Leonie', lastName: 'von Petersdorff-Campen',
      isDeceased: false, gender: 'female',
    },
    claudius: {
      firstName: 'Claudius', lastName: 'von Petersdorff-Campen',
      isDeceased: false, gender: 'male',
    },
    friedrich: {
      firstName: 'Friedrich', lastName: 'von Petersdorff-Campen',
      isDeceased: false, gender: 'male',
    },
    heike: {
      firstName: 'Heike', lastName: 'von Petersdorff-Campen',
      isDeceased: false, gender: 'female',
    },
    daniel: {
      firstName: 'Daniel', lastName: 'von Petersdorff-Campen',
      isDeceased: false, gender: 'male',
    },
    jobst: {
      firstName: 'Jobst', lastName: 'von Petersdorff-Campen',
      isDeceased: false, gender: 'male',
    },
    lara: {
      firstName: 'Lara', lastName: 'von Petersdorff-Campen',
      isDeceased: false, gender: 'female',
    },
    anneFriedrich: {
      firstName: 'Anne', lastName: 'von Petersdorff-Campen',
      isDeceased: false, gender: 'female',
      notes: 'Tochter von Friedrich und Heike',
    },
    johannes: {
      firstName: 'Johannes', lastName: 'von Petersdorff-Campen',
      isDeceased: false, gender: 'male',
    },
  };

  // ─── Step 3: Find or create each person, collecting IDs ───
  log('Step 3: Finding/creating persons...');
  const ids = {};

  for (const [key, person] of Object.entries(gothaPersons)) {
    // Try to find existing member
    let existing = findExisting(person.firstName, person.lastName);

    // Special case: "Anne" appears twice with same last name
    // Distinguish by birthName or notes
    if (key === 'anneBormann' && existing) {
      // Check if the found Anne is the right one (Thomas's wife with birthName Bormann)
      if (existing.birthName && existing.birthName !== 'Bormann' && existing.birthName !== '') {
        existing = null; // Not the right Anne
      }
    }
    if (key === 'anneFriedrich') {
      // Friedrich's daughter Anne — look for one without birthName "Bormann"
      const allAnnes = (membersByName.get('anne|von petersdorff-campen') || []);
      existing = allAnnes.find(a =>
        a.notes && a.notes.includes('Friedrich')
      ) || null;
      // If anneBormann was already matched, skip duplicate
      if (existing && existing.id === ids.anneBormann) existing = null;
    }

    // Also try flexible match (e.g. "Marie Liane" might be stored as "Marie-Liane")
    if (!existing) {
      existing = findExistingByFirst(person.firstName.split(' ')[0], person.lastName);
      // Make sure we're not matching the wrong person
      if (existing && Object.values(ids).includes(existing.id)) {
        existing = null; // Already used for another Gotha person
      }
    }

    if (existing) {
      ids[key] = existing.id;
      log(`  FOUND: ${person.firstName} ${person.lastName} (id: ${existing.id.substring(0,8)}...)`);

      // Update with Gotha data
      const updates = {};
      if (person.birthDate && (!existing.birthDate || existing.birthDate.length < person.birthDate.length)) {
        updates.birthDate = person.birthDate;
      }
      if (person.deathDate && !existing.deathDate) {
        updates.deathDate = person.deathDate;
      }
      if (person.birthName && !existing.birthName) {
        updates.birthName = person.birthName;
      }
      if (person.isDeceased && !existing.isDeceased) {
        updates.isDeceased = true;
      }
      if (person.gender && !existing.gender) {
        updates.gender = person.gender;
      }
      if (person.notes && !existing.notes) {
        updates.notes = person.notes;
      }
      if (person.location && !existing.location) {
        updates.location = person.location;
      }

      if (Object.keys(updates).length > 0) {
        log(`    Updating: ${JSON.stringify(updates)}`);
        await DB.updateMember(existing.id, updates);
      }
    } else {
      // Create new member
      const newMember = {
        firstName: person.firstName,
        lastName: person.lastName,
        birthName: person.birthName || '',
        birthDate: person.birthDate || '',
        deathDate: person.deathDate || '',
        isDeceased: person.isDeceased || false,
        isPlaceholder: true,
        gender: person.gender || null,
        notes: person.notes || '',
        location: person.location || '',
      };

      try {
        const newId = await DB.createMember(newMember);
        ids[key] = newId;
        log(`  CREATED: ${person.firstName} ${person.lastName} (id: ${newId.substring(0,8)}...)`);
      } catch (e) {
        err(`  FAILED to create ${person.firstName} ${person.lastName}: ${e.message}`);
      }
    }
  }

  // ─── Step 4: Create relationships ───
  log('Step 4: Creating relationships...');

  // Spouse relationships
  const spousePairs = [
    ['adolf', 'elisabeth'],
    ['werner', 'marieLiane'],
    ['eckart', 'irmgard'],
    ['stephan', 'beate'],
    ['thomas', 'anneBormann'],
    ['kai', 'johanna'],
    ['friedrich', 'heike'],
  ];

  for (const [a, b] of spousePairs) {
    if (ids[a] && ids[b]) {
      try {
        await DB.addRelationship(ids[a], ids[b], 'spouse');
        log(`  Spouse: ${a} ↔ ${b}`);
      } catch (e) {
        warn(`  Spouse ${a} ↔ ${b} failed: ${e.message}`);
      }
    } else {
      warn(`  Spouse ${a} ↔ ${b} skipped (missing ID: ${a}=${ids[a]}, ${b}=${ids[b]})`);
    }
  }

  // Parent-child relationships (parent, child)
  const parentChildPairs = [
    // Adolf + Elisabeth → Werner, Eckart
    ['adolf', 'werner'], ['elisabeth', 'werner'],
    ['adolf', 'eckart'], ['elisabeth', 'eckart'],
    // Werner + Marie Liane → Stephan, Thomas, Kordula
    ['werner', 'stephan'], ['marieLiane', 'stephan'],
    ['werner', 'thomas'], ['marieLiane', 'thomas'],
    ['werner', 'kordula'], ['marieLiane', 'kordula'],
    // Eckart + Irmgard → Georg
    ['eckart', 'georg'], ['irmgard', 'georg'],
    // Stephan + Beate → Tabea, Kai
    ['stephan', 'tabea'], ['beate', 'tabea'],
    ['stephan', 'kai'], ['beate', 'kai'],
    // Thomas + Anne → Lukas, Leonie, Claudius
    ['thomas', 'lukas'], ['anneBormann', 'lukas'],
    ['thomas', 'leonie'], ['anneBormann', 'leonie'],
    ['thomas', 'claudius'], ['anneBormann', 'claudius'],
    // Georg → Friedrich, Daniel (mother unknown/not in Gotha for this line)
    ['georg', 'friedrich'],
    ['georg', 'daniel'],
    // Kai + Johanna → Vanja
    ['kai', 'vanja'], ['johanna', 'vanja'],
    // Friedrich + Heike → Jobst, Lara, Anne, Johannes
    ['friedrich', 'jobst'], ['heike', 'jobst'],
    ['friedrich', 'lara'], ['heike', 'lara'],
    ['friedrich', 'anneFriedrich'], ['heike', 'anneFriedrich'],
    ['friedrich', 'johannes'], ['heike', 'johannes'],
  ];

  for (const [parent, child] of parentChildPairs) {
    if (ids[parent] && ids[child]) {
      try {
        await DB.addRelationship(ids[parent], ids[child], 'parent_child');
        log(`  Parent→Child: ${parent} → ${child}`);
      } catch (e) {
        warn(`  Parent→Child ${parent} → ${child} failed: ${e.message}`);
      }
    } else {
      warn(`  Parent→Child ${parent} → ${child} skipped (missing ID: ${parent}=${ids[parent]}, ${child}=${ids[child]})`);
    }
  }

  // ─── Step 5: Refresh the tree ───
  log('Step 5: Refreshing tree...');
  await App.refreshTree();
  log('Done! Tree refreshed with Gotha data.');
  log(`Total IDs resolved: ${Object.keys(ids).length}`);
  console.table(Object.entries(ids).map(([key, id]) => ({
    person: key,
    id: id,
    name: gothaPersons[key].firstName + ' ' + gothaPersons[key].lastName,
  })));

  return ids;
})();
