const express = require('express');
const axios = require('axios');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API YouTube - Recherche et Téléchargement',
    endpoints: {
      recherche: '/recherche?titre=votre_recherche',
      download: '/download?urlytb=URL_YOUTUBE&type=MP3|MP4'
    },
    examples: {
      recherche: '/recherche?titre=metamorphosis',
      download: '/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP3'
    }
  });
});

app.get('/recherche', async (req, res) => {
  try {
    const { titre } = req.query;
    
    if (!titre) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre "titre" manquant. Utilisez: /recherche?titre=votre_recherche'
      });
    }

    const { data } = await axios.get(`https://apiv3-2l3o.onrender.com/yts?title=${encodeURIComponent(titre)}`);
    
    const videos = data.videos.slice(0, 6).map((vid, i) => ({
      index: i + 1,
      title: vid.title,
      duration: vid.duration,
      url: vid.url,
      thumb: vid.thumb,
      channel: vid.channel || 'N/A'
    }));

    res.json({
      success: true,
      query: titre,
      count: videos.length,
      videos: videos
    });

  } catch (error) {
    console.error('Erreur recherche:', error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error || error.message || 'Erreur lors de la recherche'
    });
  }
});

app.get('/download', async (req, res) => {
  try {
    const { urlytb, type } = req.query;
    
    if (!urlytb) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre "urlytb" manquant. Utilisez: /download?urlytb=URL_YOUTUBE&type=MP3|MP4'
      });
    }

    if (!type || !['MP3', 'MP4', 'mp3', 'mp4'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre "type" invalide. Utilisez: MP3 ou MP4'
      });
    }

    if (!ytdl.validateURL(urlytb)) {
      return res.status(400).json({
        success: false,
        error: 'URL YouTube invalide'
      });
    }

    const info = await ytdl.getInfo(urlytb);
    const isAudioOnly = type.toUpperCase() === 'MP3';
    
    let format;
    if (isAudioOnly) {
      format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    } else {
      const muxedFormats = info.formats.filter(f => f.hasVideo && f.hasAudio);
      if (muxedFormats.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucun format MP4 avec audio et vidéo disponible pour cette vidéo. Essayez le type MP3 pour audio uniquement.'
        });
      }
      format = muxedFormats.reduce((best, current) => {
        const bestHeight = parseInt(best.qualityLabel) || 0;
        const currentHeight = parseInt(current.qualityLabel) || 0;
        return currentHeight > bestHeight ? current : best;
      });
    }

    res.json({
      success: true,
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: info.videoDetails.lengthSeconds,
      url: format.url,
      quality: format.qualityLabel || format.audioBitrate + 'kbps',
      type: type.toUpperCase(),
      container: format.container,
      hasAudio: format.hasAudio,
      hasVideo: format.hasVideo,
      service: 'ytdl-core',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur download:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du téléchargement',
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API démarrée sur http://0.0.0.0:${PORT}`);
  console.log(`📝 Endpoints disponibles:`);
  console.log(`   - GET /recherche?titre=...`);
  console.log(`   - GET /download?urlytb=...&type=MP3|MP4`);
});
