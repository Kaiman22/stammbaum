/**
 * Gotha Data Entry Script — COMPLETE (63 persons, 18 marriages, ~50 parent-child)
 * Run this in the browser console while logged into the Stammbaum app.
 * It uses the global DB module which is already authenticated via Supabase.
 *
 * Usage: Copy-paste this entire script into the browser console.
 */

(async function gothaDataEntry() {
  'use strict';

  const log = (msg) => console.log(`[Gotha] ${msg}`);
  const warn = (msg) => console.warn(`[Gotha] ${msg}`);

  // ─── Step 1: Get existing members ───
  log('Step 1: Fetching existing members...');
  const existingMembers = await DB.getAllMembers();
  log(`Found ${existingMembers.length} existing members`);

  // Build lookup maps
  const membersByName = new Map();
  for (const m of existingMembers) {
    const key = `${m.firstName.trim().toLowerCase()}|${m.lastName.trim().toLowerCase()}`;
    if (!membersByName.has(key)) membersByName.set(key, []);
    membersByName.get(key).push(m);
  }

  const usedIds = new Set(); // track IDs already matched to avoid double-matching

  function findExisting(firstName, lastName, disambiguator) {
    const key = `${firstName.trim().toLowerCase()}|${lastName.trim().toLowerCase()}`;
    const matches = (membersByName.get(key) || []).filter(m => !usedIds.has(m.id));
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];
    // Multiple matches — use disambiguator if provided
    if (disambiguator) {
      const d = matches.find(disambiguator);
      if (d) return d;
    }
    return matches[0];
  }

  function findFlexible(firstName, lastName) {
    const fn = firstName.trim().toLowerCase().split(' ')[0];
    const ln = lastName.trim().toLowerCase();
    for (const m of existingMembers) {
      if (usedIds.has(m.id)) continue;
      if (m.lastName.trim().toLowerCase() === ln &&
          m.firstName.trim().toLowerCase().includes(fn)) {
        return m;
      }
    }
    return null;
  }

  // ─── Step 2: Define ALL Gotha persons (63 total) ───
  const P = {
    // === Generation 0: Stammeltern ===
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

    // === Generation 1: Werner + Eckart ===
    werner: {
      firstName: 'Werner', lastName: 'von Petersdorff-Campen',
      birthDate: '1911-12-14', deathDate: '1982-06-07',
      isDeceased: true, gender: 'male', location: 'Campen',
    },
    marieLiane: {
      firstName: 'Marie Liane', lastName: 'von Petersdorff-Campen',
      birthName: 'Gräfin von Schlick', birthDate: '1916-10-04', deathDate: '2008-01-15',
      isDeceased: true, gender: 'female',
    },
    eckart: {
      firstName: 'Eckart', lastName: 'von Petersdorff-Campen',
      birthDate: '1914-03-28', deathDate: '1945-01-21',
      isDeceased: true, gender: 'male',
      notes: 'Gefallen im 2. Weltkrieg', location: 'Campen',
    },
    irmgard: {
      firstName: 'Irmgard', lastName: 'von Petersdorff-Campen',
      birthName: 'von Gadow', birthDate: '1921-12-08', deathDate: '2015-05-10',
      isDeceased: true, gender: 'female',
    },

    // === Generation 2: Werner's children ===
    kordula: {
      firstName: 'Kordula', lastName: 'von Lüttwitz',
      birthName: 'von Petersdorff-Campen', birthDate: '1949-07-12',
      isDeceased: false, gender: 'female',
    },
    wolfDietrich: {
      firstName: 'Wolf-Dietrich', lastName: 'von Lüttwitz',
      birthDate: '1942-05-24', deathDate: '2011-03-26',
      isDeceased: true, gender: 'male', notes: 'Oberst a.D.',
    },
    stephan: {
      firstName: 'Stephan', lastName: 'von Petersdorff-Campen',
      birthDate: '1953-01-12', isDeceased: false, gender: 'male',
    },
    beate: {
      firstName: 'Beate', lastName: 'von Petersdorff-Campen',
      birthName: 'Krischer', birthDate: '1954-06-22',
      isDeceased: false, gender: 'female',
    },
    thomas: {
      firstName: 'Thomas', lastName: 'von Petersdorff-Campen',
      birthDate: '1955-08-17', isDeceased: false, gender: 'male',
    },
    anneBormann: {
      firstName: 'Anne', lastName: 'von Petersdorff-Campen',
      birthName: 'Bormann', birthDate: '1959-03-23',
      isDeceased: false, gender: 'female',
    },

    // === Generation 2: Eckart's children ===
    helmut: {
      firstName: 'Helmut', lastName: 'von Petersdorff-Campen',
      birthDate: '1940-04-26', deathDate: '2023-07-26',
      isDeceased: true, gender: 'male', location: 'Greifswald',
    },
    sigrid: {
      firstName: 'Sigrid', lastName: 'von Petersdorff-Campen',
      birthName: 'Teegen', birthDate: '1940-05-31', deathDate: '2006-12-15',
      isDeceased: true, gender: 'female',
      notes: '1. Ehefrau von Helmut (geschieden)',
    },
    karin: {
      firstName: 'Karin', lastName: 'von Petersdorff-Campen',
      birthName: 'Eggert', birthDate: '1945-05-07',
      isDeceased: false, gender: 'female',
      notes: '2. Ehefrau von Helmut',
    },
    klaus: {
      firstName: 'Klaus', lastName: 'von Petersdorff-Campen',
      birthDate: '1943-12-07', isDeceased: false, gender: 'male',
      location: 'Stralsund',
    },
    edelgard: {
      firstName: 'Edelgard', lastName: 'von Petersdorff-Campen',
      birthName: 'Wilkens', birthDate: '1945-09-26',
      isDeceased: false, gender: 'female',
    },

    // === Generation 3: Kordula's children ===
    alexa: {
      firstName: 'Alexa', lastName: 'von Boeselager',
      birthName: 'von Lüttwitz', birthDate: '1976-05-03',
      isDeceased: false, gender: 'female',
    },
    philipp: {
      firstName: 'Philipp', lastName: 'von Boeselager',
      birthDate: '1971-12-22', isDeceased: false, gender: 'male',
    },
    annina: {
      firstName: 'Annina', lastName: 'von Petersdorff-Campen',
      birthName: 'von Lüttwitz', birthDate: '1978-06-20',
      isDeceased: false, gender: 'female',
    },
    camilla: {
      firstName: 'Camilla', lastName: 'Groß von Trockau',
      birthName: 'von Lüttwitz', birthDate: '1982-06-29',
      isDeceased: false, gender: 'female',
    },
    clemens: {
      firstName: 'Clemens', lastName: 'Groß von Trockau',
      birthDate: '1974-03-30', isDeceased: false, gender: 'male',
    },

    // === Generation 3: Stephan's children ===
    tabea: {
      firstName: 'Tabea Liane Maria', lastName: 'von Petersdorff-Campen',
      birthDate: '1987-07-15', isDeceased: false, gender: 'female',
      location: 'Hildesheim',
    },
    kai: {
      firstName: 'Kai', lastName: 'von Petersdorff-Campen',
      birthDate: '1992-03-27', isDeceased: false, gender: 'male',
      location: 'Seesen',
    },
    johanna: {
      firstName: 'Johanna', lastName: 'Klar',
      birthDate: '1993-05-02', isDeceased: false, gender: 'female',
    },

    // === Generation 3: Thomas's children ===
    lukas: {
      firstName: 'Lukas', lastName: 'von Petersdorff-Campen',
      birthDate: '1989-05-10', isDeceased: false, gender: 'male',
      location: 'Braunschweig',
    },
    leonie: {
      firstName: 'Leonie', lastName: 'von Petersdorff-Campen',
      birthDate: '1991-02-13', isDeceased: false, gender: 'female',
      location: 'Braunschweig',
    },
    claudius: {
      firstName: 'Claudius', lastName: 'von Petersdorff-Campen',
      birthDate: '1994-09-20', isDeceased: false, gender: 'male',
      location: 'Braunschweig',
    },

    // === Generation 3: Helmut's children (all from 1st wife Sigrid) ===
    thorsten: {
      firstName: 'Thorsten', lastName: 'von Petersdorff-Campen',
      birthDate: '1965-08-03', isDeceased: false, gender: 'male',
      location: 'Hildesheim',
    },
    andrea: {
      firstName: 'Andrea', lastName: 'von Petersdorff-Campen',
      birthName: 'Knigge', birthDate: '1966-05-23',
      isDeceased: false, gender: 'female',
    },
    dirk: {
      firstName: 'Dirk', lastName: 'von Petersdorff-Campen',
      birthDate: '1967-03-11', isDeceased: false, gender: 'male',
      location: 'Seesen',
    },
    kathrin: {
      firstName: 'Kathrin', lastName: 'von Petersdorff-Campen',
      birthName: 'Gantert', birthDate: '1968-03-14',
      isDeceased: false, gender: 'female',
    },
    georg: {
      firstName: 'Georg', lastName: 'von Petersdorff-Campen',
      birthDate: '1971-07-14', isDeceased: false, gender: 'male',
      location: 'Seesen',
    },

    // === Generation 3: Klaus's children ===
    susanne: {
      firstName: 'Susanne', lastName: 'Decker',
      birthName: 'von Petersdorff-Campen', birthDate: '1971-03-10',
      isDeceased: false, gender: 'female',
    },
    matthias: {
      firstName: 'Matthias', lastName: 'Decker',
      birthDate: '1962-09-03', isDeceased: false, gender: 'male',
    },
    julia: {
      firstName: 'Julia', lastName: 'Wollenweber',
      birthName: 'von Petersdorff-Campen', birthDate: '1974-05-05',
      isDeceased: false, gender: 'female', location: 'Hildesheim',
    },
    bernhard: {
      firstName: 'Bernhard', lastName: 'Wollenweber',
      birthDate: '1965-07-06', isDeceased: false, gender: 'male',
    },
    daniel: {
      firstName: 'Daniel', lastName: 'von Petersdorff-Campen',
      birthDate: '1976-09-08', isDeceased: false, gender: 'male',
      location: 'Hildesheim',
    },
    nicola: {
      firstName: 'Nicola', lastName: 'von Petersdorff-Campen',
      birthName: 'Kanitz', birthDate: '1980-06-01',
      isDeceased: false, gender: 'female',
    },

    // === Generation 4: Alexa + Philipp's children ===
    maximilian: {
      firstName: 'Maximilian', lastName: 'von Boeselager',
      birthDate: '2005-06-16', isDeceased: false, gender: 'male',
    },
    anton: {
      firstName: 'Anton', lastName: 'von Boeselager',
      birthDate: '2007-07-25', isDeceased: false, gender: 'male',
    },
    cosima: {
      firstName: 'Cosima', lastName: 'von Boeselager',
      birthDate: '2011-05-03', isDeceased: false, gender: 'female',
    },

    // === Generation 4: Georg + Annina's children ===
    friedrichGeorg: {
      firstName: 'Friedrich', lastName: 'von Petersdorff-Campen',
      birthDate: '2009-01-06', isDeceased: false, gender: 'male',
      location: 'München', notes: 'Sohn von Georg und Annina',
    },
    carl: {
      firstName: 'Carl', lastName: 'von Petersdorff-Campen',
      birthDate: '2011-03-23', isDeceased: false, gender: 'male',
      location: 'München',
    },
    elisabethGeorg: {
      firstName: 'Elisabeth', lastName: 'von Petersdorff-Campen',
      birthDate: '2014-03-20', isDeceased: false, gender: 'female',
      location: 'München', notes: 'Tochter von Georg und Annina',
    },

    // === Generation 4: Camilla + Clemens's children ===
    friedrichTrockau: {
      firstName: 'Friedrich', lastName: 'Groß von Trockau',
      birthDate: '2012-10-03', isDeceased: false, gender: 'male',
    },
    felicitas: {
      firstName: 'Felicitas', lastName: 'Groß von Trockau',
      birthDate: '2013-12-30', isDeceased: false, gender: 'female',
    },
    charlotte: {
      firstName: 'Charlotte', lastName: 'Groß von Trockau',
      birthDate: '2016-03-16', isDeceased: false, gender: 'female',
    },

    // === Generation 4: Kai + Johanna's children ===
    vanja: {
      firstName: 'Vanja', lastName: 'von Petersdorff-Campen',
      birthDate: '2024-06-24', isDeceased: false,
    },

    // === Generation 4: Thorsten + Andrea's children ===
    pia: {
      firstName: 'Pia', lastName: 'von Petersdorff-Campen',
      birthDate: '1997-02-02', isDeceased: false, gender: 'female',
      location: 'Hildesheim',
    },
    morten: {
      firstName: 'Morten', lastName: 'von Petersdorff-Campen',
      birthDate: '1999-07-09', isDeceased: false, gender: 'male',
      location: 'Hildesheim',
    },

    // === Generation 4: Dirk + Kathrin's children ===
    lena: {
      firstName: 'Lena', lastName: 'von Petersdorff-Campen',
      birthDate: '1999-02-28', isDeceased: false, gender: 'female',
      location: 'Hildesheim',
    },
    paul: {
      firstName: 'Paul', lastName: 'von Petersdorff-Campen',
      birthDate: '2001-04-01', isDeceased: false, gender: 'male',
      location: 'Hildesheim',
    },
    ida: {
      firstName: 'Ida', lastName: 'von Petersdorff-Campen',
      birthDate: '2003-12-03', isDeceased: false, gender: 'female',
      location: 'Hildesheim',
    },
    eva: {
      firstName: 'Eva', lastName: 'von Petersdorff-Campen',
      birthDate: '2009-05-15', isDeceased: false, gender: 'female',
      location: 'Hildesheim',
    },

    // === Generation 4: Susanne + Matthias's children ===
    jakob: {
      firstName: 'Jakob', lastName: 'Decker',
      birthDate: '2001-03-03', isDeceased: false, gender: 'male',
    },
    luisa: {
      firstName: 'Luisa', lastName: 'Decker',
      birthDate: '2004-08-18', isDeceased: false, gender: 'female',
    },

    // === Generation 4: Julia + Bernhard's children ===
    clara: {
      firstName: 'Clara', lastName: 'Wollenweber',
      birthDate: '2004-11-04', isDeceased: false, gender: 'female',
    },
    johannaW: {
      firstName: 'Johanna', lastName: 'Wollenweber',
      birthDate: '2007-01-18', isDeceased: false, gender: 'female',
    },

    // === Generation 4: Daniel + Nicola's children ===
    jonathan: {
      firstName: 'Jonathan', lastName: 'von Petersdorff-Campen',
      birthDate: '2006-10-03', isDeceased: false, gender: 'male',
    },
    david: {
      firstName: 'David', lastName: 'von Petersdorff-Campen',
      birthDate: '2009-07-03', isDeceased: false, gender: 'male',
    },
    elisa: {
      firstName: 'Elisa', lastName: 'von Petersdorff-Campen',
      birthDate: '2011-05-07', isDeceased: false, gender: 'female',
    },
    friedrichDaniel: {
      firstName: 'Friedrich', lastName: 'von Petersdorff-Campen',
      birthDate: '2015-03-16', isDeceased: false, gender: 'male',
      notes: 'Sohn von Daniel und Nicola',
    },
  };

  log(`Defined ${Object.keys(P).length} persons from Gotha`);

  // ─── Step 3: Find or create each person ───
  log('Step 3: Finding/creating persons...');
  const ids = {};
  let created = 0, updated = 0, found = 0;

  for (const [key, person] of Object.entries(P)) {
    let existing = findExisting(person.firstName, person.lastName);

    // If not found by exact name, try flexible match
    if (!existing) {
      existing = findFlexible(person.firstName, person.lastName);
    }

    if (existing) {
      ids[key] = existing.id;
      usedIds.add(existing.id);
      found++;

      // Update with Gotha data (only fill in missing fields or improve precision)
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
        log(`  UPDATE ${person.firstName} ${person.lastName}: ${JSON.stringify(updates)}`);
        await DB.updateMember(existing.id, updates);
        updated++;
      } else {
        log(`  FOUND  ${person.firstName} ${person.lastName} (no updates needed)`);
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
        usedIds.add(newId);
        created++;
        log(`  CREATE ${person.firstName} ${person.lastName}`);
      } catch (e) {
        console.error(`  FAILED ${person.firstName} ${person.lastName}: ${e.message}`);
      }
    }
  }

  log(`Summary: ${found} found, ${updated} updated, ${created} created`);

  // ─── Step 4: Create relationships ───
  log('Step 4: Creating relationships...');

  // --- Spouse pairs ---
  const spouses = [
    ['adolf', 'elisabeth'],
    ['werner', 'marieLiane'],
    ['eckart', 'irmgard'],
    ['kordula', 'wolfDietrich'],
    ['stephan', 'beate'],
    ['thomas', 'anneBormann'],
    ['helmut', 'sigrid'],       // 1st marriage
    ['helmut', 'karin'],        // 2nd marriage
    ['klaus', 'edelgard'],
    ['alexa', 'philipp'],
    ['georg', 'annina'],        // cross-branch!
    ['camilla', 'clemens'],
    ['kai', 'johanna'],
    ['thorsten', 'andrea'],
    ['dirk', 'kathrin'],
    ['susanne', 'matthias'],
    ['julia', 'bernhard'],
    ['daniel', 'nicola'],
  ];

  for (const [a, b] of spouses) {
    if (ids[a] && ids[b]) {
      try {
        await DB.addRelationship(ids[a], ids[b], 'spouse');
        log(`  Spouse: ${a} ↔ ${b}`);
      } catch (e) { warn(`  Spouse ${a}↔${b} failed: ${e.message}`); }
    } else {
      warn(`  Spouse ${a}↔${b} SKIPPED (missing id)`);
    }
  }

  // --- Parent-child pairs [parent, child] ---
  const pc = [
    // Adolf + Elisabeth → Werner, Eckart
    ['adolf', 'werner'], ['elisabeth', 'werner'],
    ['adolf', 'eckart'], ['elisabeth', 'eckart'],

    // Werner + Marie Liane → Kordula, Stephan, Thomas
    ['werner', 'kordula'], ['marieLiane', 'kordula'],
    ['werner', 'stephan'], ['marieLiane', 'stephan'],
    ['werner', 'thomas'], ['marieLiane', 'thomas'],

    // Eckart + Irmgard → Helmut, Klaus
    ['eckart', 'helmut'], ['irmgard', 'helmut'],
    ['eckart', 'klaus'], ['irmgard', 'klaus'],

    // Kordula + Wolf-Dietrich → Alexa, Annina, Camilla
    ['kordula', 'alexa'], ['wolfDietrich', 'alexa'],
    ['kordula', 'annina'], ['wolfDietrich', 'annina'],
    ['kordula', 'camilla'], ['wolfDietrich', 'camilla'],

    // Stephan + Beate → Tabea, Kai
    ['stephan', 'tabea'], ['beate', 'tabea'],
    ['stephan', 'kai'], ['beate', 'kai'],

    // Thomas + Anne → Lukas, Leonie, Claudius
    ['thomas', 'lukas'], ['anneBormann', 'lukas'],
    ['thomas', 'leonie'], ['anneBormann', 'leonie'],
    ['thomas', 'claudius'], ['anneBormann', 'claudius'],

    // Helmut + Sigrid → Thorsten, Dirk, Georg (children from 1st marriage)
    ['helmut', 'thorsten'], ['sigrid', 'thorsten'],
    ['helmut', 'dirk'], ['sigrid', 'dirk'],
    ['helmut', 'georg'], ['sigrid', 'georg'],

    // Klaus + Edelgard → Susanne, Julia, Daniel
    ['klaus', 'susanne'], ['edelgard', 'susanne'],
    ['klaus', 'julia'], ['edelgard', 'julia'],
    ['klaus', 'daniel'], ['edelgard', 'daniel'],

    // Alexa + Philipp → Maximilian, Anton, Cosima
    ['alexa', 'maximilian'], ['philipp', 'maximilian'],
    ['alexa', 'anton'], ['philipp', 'anton'],
    ['alexa', 'cosima'], ['philipp', 'cosima'],

    // Georg + Annina → Friedrich, Carl, Elisabeth
    ['georg', 'friedrichGeorg'], ['annina', 'friedrichGeorg'],
    ['georg', 'carl'], ['annina', 'carl'],
    ['georg', 'elisabethGeorg'], ['annina', 'elisabethGeorg'],

    // Camilla + Clemens → Friedrich, Felicitas, Charlotte
    ['camilla', 'friedrichTrockau'], ['clemens', 'friedrichTrockau'],
    ['camilla', 'felicitas'], ['clemens', 'felicitas'],
    ['camilla', 'charlotte'], ['clemens', 'charlotte'],

    // Kai + Johanna → Vanja
    ['kai', 'vanja'], ['johanna', 'vanja'],

    // Thorsten + Andrea → Pia, Morten
    ['thorsten', 'pia'], ['andrea', 'pia'],
    ['thorsten', 'morten'], ['andrea', 'morten'],

    // Dirk + Kathrin → Lena, Paul, Ida, Eva
    ['dirk', 'lena'], ['kathrin', 'lena'],
    ['dirk', 'paul'], ['kathrin', 'paul'],
    ['dirk', 'ida'], ['kathrin', 'ida'],
    ['dirk', 'eva'], ['kathrin', 'eva'],

    // Susanne + Matthias → Jakob, Luisa
    ['susanne', 'jakob'], ['matthias', 'jakob'],
    ['susanne', 'luisa'], ['matthias', 'luisa'],

    // Julia + Bernhard → Clara, Johanna
    ['julia', 'clara'], ['bernhard', 'clara'],
    ['julia', 'johannaW'], ['bernhard', 'johannaW'],

    // Daniel + Nicola → Jonathan, David, Elisa, Friedrich
    ['daniel', 'jonathan'], ['nicola', 'jonathan'],
    ['daniel', 'david'], ['nicola', 'david'],
    ['daniel', 'elisa'], ['nicola', 'elisa'],
    ['daniel', 'friedrichDaniel'], ['nicola', 'friedrichDaniel'],
  ];

  for (const [parent, child] of pc) {
    if (ids[parent] && ids[child]) {
      try {
        await DB.addRelationship(ids[parent], ids[child], 'parent_child');
        log(`  Parent→Child: ${parent} → ${child}`);
      } catch (e) { warn(`  PC ${parent}→${child} failed: ${e.message}`); }
    } else {
      warn(`  PC ${parent}→${child} SKIPPED (missing id)`);
    }
  }

  // ─── Step 5: Refresh ───
  log('Step 5: Refreshing tree...');
  await App.refreshTree();

  log('═══════════════════════════════════════');
  log(`DONE! ${Object.keys(ids).length} persons processed.`);
  log(`  Found: ${found}, Updated: ${updated}, Created: ${created}`);
  log(`  Spouse relationships: ${spouses.length}`);
  log(`  Parent-child relationships: ${pc.length}`);
  log('═══════════════════════════════════════');

  console.table(Object.entries(ids).map(([key, id]) => ({
    key, id: id.substring(0, 8) + '...',
    name: P[key].firstName + ' ' + P[key].lastName,
  })));

  return ids;
})();
