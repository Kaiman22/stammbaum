# Stammbaum – Setup-Anleitung

## 1. Firebase-Projekt erstellen (5 Minuten)

1. Gehe zu https://console.firebase.google.com
2. Klicke "Projekt hinzufügen" → Name: `stammbaum` (oder ähnlich)
3. Google Analytics kannst du abwählen (nicht nötig)
4. Warte bis das Projekt erstellt ist

## 2. Firebase-Dienste aktivieren

### Authentication:
1. Im Firebase-Dashboard → "Authentication" → "Erste Schritte"
2. Aktiviere **E-Mail/Passwort** als Anmeldemethode
3. Aktiviere **Google** als Anmeldemethode

### Firestore Database:
1. Im Dashboard → "Firestore Database" → "Datenbank erstellen"
2. Wähle **Testmodus** (für den Prototyp)
3. Wähle Region: `europe-west3` (Frankfurt)

## 3. Web-App registrieren

1. Im Dashboard → Zahnrad → "Projekteinstellungen"
2. Unter "Ihre Apps" → Klicke das Web-Icon `</>`
3. App-Name: `Stammbaum`
4. Firebase Hosting: ✓ aktivieren
5. Du bekommst eine `firebaseConfig` – kopiere die Werte

## 4. Config in die App eintragen

Öffne `js/app.js` und ersetze die Platzhalter:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",           // ← dein API Key
  authDomain: "stammbaum-xxxxx.firebaseapp.com",
  projectId: "stammbaum-xxxxx",
  storageBucket: "stammbaum-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

## 5. Firebase CLI installieren & deployen

```bash
npm install -g firebase-tools
firebase login
cd stammbaum/
firebase init hosting
# Wähle dein Projekt
# Public directory: . (aktuelles Verzeichnis)
# Single-page app: Yes
# Overwrite index.html: No

firebase deploy
```

## 6. Testen

Nach dem Deploy bekommst du eine URL wie:
`https://stammbaum-xxxxx.web.app`

Diese URL kannst du auf beiden iPhones öffnen!

### Erster Test:
1. Öffne die URL auf iPhone 1 → Registriere dich
2. Die App lädt automatisch Demo-Daten (fiktive Familie "von Stammberg")
3. Verknüpfe dein Profil mit einem Eintrag oder erstelle ein neues
4. Öffne die URL auf iPhone 2 → Registriere als deine Frau
5. iPhone 1: Tippe auf "Mein QR-Code" (unten rechts)
6. iPhone 2: Tippe auf den QR-Scanner (oben rechts)
7. Halte die Kamera auf den QR-Code → Die Verbindung wird angezeigt!

## Lokaler Test (ohne Deploy)

Für schnelles lokales Testen:

```bash
# Python-Server (schon auf macOS vorhanden)
cd stammbaum/
python3 -m http.server 8080

# Dann im Browser: http://localhost:8080
```

Hinweis: QR-Scanner braucht HTTPS für Kamera-Zugriff.
Für lokale HTTPS-Tests kannst du ngrok nutzen:
```bash
brew install ngrok
ngrok http 8080
# → Gibt dir eine https://xxx.ngrok.io URL
```
