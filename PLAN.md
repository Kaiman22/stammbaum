# Stammbaum – Implementation Plan

## Overview
Web-based family tree PWA for a large noble family. PCB/circuit-board aesthetic.
Firebase backend, Cytoscape.js visualization, QR-code proximity feature.

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (single-page app)
- **Visualization:** Cytoscape.js (interactive graph with dagre layout)
- **Backend:** Firebase (Auth + Firestore + Hosting)
- **QR:** qrcode.js (generate) + html5-qrcode (scan)
- **Font:** IBM Plex Mono (technical/PCB feel)

## Files Created
- `index.html` - Single-page app with all views
- `css/style.css` - PCB aesthetic design system
- `js/app.js` - Main controller, routing, Firebase init
- `js/auth.js` - Firebase Authentication
- `js/db.js` - Firestore CRUD + demo seed data
- `js/tree.js` - Cytoscape.js visualization
- `js/relationship.js` - BFS pathfinding, German terms, DNA %
- `js/qr.js` - QR code gen + scanning
- `js/profile.js` - Profile management
- `js/search.js` - Name search
- `manifest.json` - PWA manifest
- `sw.js` - Service worker for offline
- `firebase.json` - Firebase Hosting config
- `firestore.rules` - Firestore security rules

## Status: ✅ PROTOTYPE COMPLETE
Next step: Set up Firebase project and deploy.
