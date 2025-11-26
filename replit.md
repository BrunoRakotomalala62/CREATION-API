# CREATION-API

## Vue d'ensemble
API multi-plateforme pour télécharger des vidéos depuis TikTok (et bientôt d'autres plateformes).

## Endpoints

### 1. Page d'accueil
- **URL**: `GET /`
- **Description**: Informations sur l'API et exemples d'utilisation

### 2. Téléchargement (infos JSON)
- **URL**: `GET /download?url=<URL_VIDEO>`
- **Description**: Obtenir les informations et liens de téléchargement
- **Paramètres**:
  - `url` (requis): URL de la vidéo TikTok
- **Exemple**: `/download?url=https://www.tiktok.com/@user/video/123456`
- **Réponse**:
  ```json
  {
    "success": true,
    "platform": "tiktok",
    "type": "video",
    "title": "Titre de la vidéo",
    "author": "Nom de l'auteur",
    "videoUrl": "https://...",
    "audioUrl": "https://...",
    "streamUrl": "/stream?url=...",
    "streamAudioUrl": "/stream?url=...&type=audio"
  }
  ```

### 3. Stream (téléchargement direct)
- **URL**: `GET /stream?url=<URL_VIDEO>&type=<video|audio>`
- **Description**: Téléchargement direct du fichier
- **Paramètres**:
  - `url` (requis): URL de la vidéo TikTok
  - `type` (optionnel): `video` (défaut) ou `audio`
- **Exemples**:
  - Vidéo: `/stream?url=https://www.tiktok.com/@user/video/123456`
  - Audio: `/stream?url=https://www.tiktok.com/@user/video/123456&type=audio`

## Architecture

### Backend
- **Framework**: Node.js avec Express
- **Port**: 5000 (bind sur 0.0.0.0)
- **Librairie principale**: @tobyg74/tiktok-api-dl

## Plateformes supportées
- ✅ TikTok (vidéos et slideshows)
- ⏳ Instagram (en développement)
- ⏳ Twitter/X (en développement)
- ⏳ Facebook (en développement)
- ❌ YouTube (bloqué par protection anti-bot)

## Fonctionnalités
- ✅ Téléchargement de vidéos TikTok
- ✅ Téléchargement audio TikTok
- ✅ Support des slideshows TikTok
- ✅ Informations détaillées (titre, auteur, statistiques)
- ✅ Streaming direct vers le client

## Modifications récentes
- 2025-11-26: Migration vers TikTok API (YouTube bloqué)
- 2025-11-26: Ajout du support TikTok avec @tobyg74/tiktok-api-dl
- 2025-11-25: Tentatives avec YouTube (ytdl-core, yt-dlp, Cobalt) - toutes bloquées
