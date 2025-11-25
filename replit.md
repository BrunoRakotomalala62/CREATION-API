# CREATION-API

## Vue d'ensemble
API complète pour rechercher et télécharger des vidéos YouTube avec support MP3 et MP4 en différentes qualités.

## Endpoints

### 1. Page d'accueil
- **URL**: `GET /`
- **Description**: Informations sur l'API et exemples d'utilisation

### 2. Recherche de vidéos
- **URL**: `GET /recherche?titre=<votre_recherche>`
- **Description**: Recherche de vidéos YouTube par titre
- **Paramètres**:
  - `titre` (requis): Mots-clés de recherche
- **Exemple**: `/recherche?titre=metamorphosis`

### 3. Téléchargement de vidéos/audio
- **URL**: `GET /download?urlytb=<URL_YOUTUBE>&type=<MP3|MP4>&quality=<qualité>`
- **Description**: Obtenir le lien de téléchargement direct pour une vidéo YouTube
- **Paramètres**:
  - `urlytb` (requis): URL complète de la vidéo YouTube
  - `type` (requis): Format souhaité (MP3 pour audio, MP4 pour vidéo)
  - `quality` (optionnel): Qualité souhaitée
    - Pour MP4: `highest`, `lowest`, `720p`, `480p`, `360p`, `240p`, `144p`
    - Pour MP3: qualité audio automatique (meilleur bitrate disponible)
- **Exemples**:
  - `/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP3`
  - `/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP4&quality=720p`

## Architecture

### Backend
- **Framework**: Node.js avec Express
- **Port**: 5000 (bind sur 0.0.0.0)
- **Librairie principale**: @ybd-project/ytdl-core (v6.0.8)

### Services externes
- API de recherche YouTube: apiv3-2l3o.onrender.com
- Téléchargement direct: YouTube via ytdl-core

## Fonctionnalités
- ✅ Recherche de vidéos par titre
- ✅ Téléchargement MP3 (audio uniquement)
- ✅ Téléchargement MP4 (vidéo avec audio)
- ✅ Sélection de qualité flexible
- ✅ Informations détaillées sur les vidéos (titre, auteur, durée, miniature)
- ✅ URLs de téléchargement direct
- ✅ Validation des URLs YouTube

## Modifications récentes
- 2025-11-25: Migration vers @ybd-project/ytdl-core pour le téléchargement direct YouTube
- 2025-11-25: Ajout du support de sélection de qualité pour MP4
- 2025-11-25: Amélioration de la sélection automatique des formats audio et vidéo
- 2025-11-25: Initialisation du projet avec endpoints de recherche et téléchargement
