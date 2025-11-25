# CREATION-API

## Vue d'ensemble
API complète pour rechercher et télécharger des vidéos YouTube.

## Endpoints
- `GET /recherche?titre=...` - Recherche de vidéos YouTube par titre
- `GET /download?urlytb=...&type=MP3|MP4` - Téléchargement de vidéos YouTube

## Architecture
- Backend: Node.js avec Express
- Port: 5000
- Services externes: 
  - API de recherche YouTube (apiv3-2l3o.onrender.com)
  - Cobalt Tools API pour le téléchargement

## Modifications récentes
- 2025-11-25: Initialisation du projet avec endpoints de recherche et téléchargement
