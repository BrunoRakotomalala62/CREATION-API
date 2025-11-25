# CREATION-API

API complète pour rechercher et télécharger des vidéos YouTube.

## 🚀 Endpoints

### 1. Recherche de vidéos
```
GET /recherche?titre=<votre_recherche>
```

**Exemple :**
```bash
curl "https://votre-domaine.repl.co/recherche?titre=metamorphosis"
```

**Réponse :**
```json
{
  "success": true,
  "query": "metamorphosis",
  "count": 6,
  "videos": [
    {
      "index": 1,
      "title": "INTERWORLD - METAMORPHOSIS",
      "duration": "2:23",
      "url": "https://youtube.com/watch?v=...",
      "thumb": "https://i.ytimg.com/vi/.../hq720.jpg",
      "channel": "..."
    }
  ]
}
```

### 2. Téléchargement de vidéos
```
GET /download?urlytb=<URL_YOUTUBE>&type=<MP3|MP4>
```

**Exemples :**
```bash
# Télécharger en MP3 (audio uniquement)
curl "https://votre-domaine.repl.co/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP3"

# Télécharger en MP4 (vidéo avec audio)
curl "https://votre-domaine.repl.co/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP4"
```

**Réponse :**
```json
{
  "success": true,
  "title": "Titre de la vidéo",
  "author": "Nom de l'auteur",
  "duration": "214",
  "url": "https://...",
  "quality": "360p",
  "type": "MP4",
  "container": "mp4",
  "hasAudio": true,
  "hasVideo": true,
  "service": "ytdl-core",
  "timestamp": "2025-11-25T04:52:09.630Z"
}
```

## 🛠️ Technologies

- **Backend:** Node.js avec Express
- **Port:** 5000
- **Services externes:**
  - API de recherche YouTube (apiv3-2l3o.onrender.com)
  - ytdl-core pour le téléchargement

## 📦 Installation

```bash
npm install
npm start
```

L'API sera accessible sur `http://localhost:5000`

## ⚠️ Notes importantes

- L'endpoint `/download` retourne uniquement des URLs de téléchargement direct
- Pour MP4, seuls les formats avec audio ET vidéo sont retournés
- Les URLs de téléchargement sont temporaires et expireront après quelques heures
- Respectez les droits d'auteur et les conditions d'utilisation de YouTube

## 📝 Licence

MIT
