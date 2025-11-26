const express = require('express');
const axios = require('axios');
const cors = require('cors');
const y2mate = require('y2mate-dl');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

function validateYouTubeURL(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  return youtubeRegex.test(url);
}

function getVideoId(url) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API YouTube - Recherche et Téléchargement Direct',
    description: 'Téléchargez des vidéos et de la musique YouTube en MP3 et MP4 avec différentes qualités',
    endpoints: {
      recherche: '/recherche?titre=votre_recherche',
      download: '/download?urlytb=URL_YOUTUBE&type=MP3|MP4&quality=720|480|360 (retourne les infos JSON)',
      stream: '/stream?urlytb=URL_YOUTUBE&type=MP3|MP4&quality=720|480|360 (téléchargement DIRECT)'
    },
    examples: {
      recherche: '/recherche?titre=metamorphosis',
      downloadMP3: '/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP3',
      downloadMP4: '/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP4&quality=720',
      streamMP3: '/stream?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP3',
      streamMP4: '/stream?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP4&quality=720'
    },
    availableQualities: {
      MP4: ['1080', '720', '480', '360', '240', '144'],
      MP3: ['128kbps (audio uniquement)']
    },
    features: [
      'Téléchargement direct YouTube',
      'Support MP3 et MP4',
      'Choix de qualité flexible',
      'Recherche par titre',
      'Endpoint /stream pour téléchargement direct!'
    ]
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

app.get('/stream', async (req, res) => {
  try {
    const { urlytb, type, quality } = req.query;
    
    if (!urlytb) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre "urlytb" manquant'
      });
    }

    if (!type || !['MP3', 'MP4', 'mp3', 'mp4'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre "type" invalide. Utilisez: MP3 ou MP4'
      });
    }

    if (!validateYouTubeURL(urlytb)) {
      return res.status(400).json({
        success: false,
        error: 'URL YouTube invalide'
      });
    }

    const isAudio = type.toUpperCase() === 'MP3';
    let result;

    try {
      if (isAudio) {
        result = await y2mate.ytmp3(urlytb);
      } else {
        const qualityNum = quality || '720';
        if (qualityNum === '720' || qualityNum === 'highest') {
          result = await y2mate.yt720(urlytb);
        } else if (qualityNum === '480') {
          result = await y2mate.yt480(urlytb);
        } else if (qualityNum === '360') {
          result = await y2mate.yt360(urlytb);
        } else {
          result = await y2mate.yt720(urlytb);
        }
      }
    } catch (y2mateError) {
      console.error('Y2mate error:', y2mateError);
      return res.status(500).json({
        success: false,
        error: 'Service de téléchargement temporairement indisponible'
      });
    }

    if (!result || !result.dl_link) {
      return res.status(500).json({
        success: false,
        error: 'Impossible de récupérer le lien de téléchargement'
      });
    }

    const extension = isAudio ? 'mp3' : 'mp4';
    const filename = `${result.title || 'download'}.${extension}`.replace(/[^\w\s.-]/g, '_');

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');

    const response = await axios({
      method: 'get',
      url: result.dl_link,
      responseType: 'stream',
      timeout: 300000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    response.data.pipe(res);

  } catch (error) {
    console.error('Erreur stream:', error.message);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Erreur lors du streaming'
      });
    }
  }
});

app.get('/download', async (req, res) => {
  try {
    const { urlytb, type, quality } = req.query;
    
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

    if (!validateYouTubeURL(urlytb)) {
      return res.status(400).json({
        success: false,
        error: 'URL YouTube invalide'
      });
    }

    const isAudio = type.toUpperCase() === 'MP3';
    let result;

    try {
      if (isAudio) {
        result = await y2mate.ytmp3(urlytb);
      } else {
        const qualityNum = quality || '720';
        if (qualityNum === '720' || qualityNum === 'highest') {
          result = await y2mate.yt720(urlytb);
        } else if (qualityNum === '480') {
          result = await y2mate.yt480(urlytb);
        } else if (qualityNum === '360') {
          result = await y2mate.yt360(urlytb);
        } else {
          result = await y2mate.yt720(urlytb);
        }
      }
    } catch (y2mateError) {
      console.error('Y2mate error:', y2mateError);
      return res.status(500).json({
        success: false,
        error: 'Service de téléchargement temporairement indisponible',
        details: y2mateError.message
      });
    }

    if (!result || !result.dl_link) {
      return res.status(500).json({
        success: false,
        error: 'Impossible de récupérer le lien de téléchargement'
      });
    }

    res.json({
      success: true,
      title: result.title,
      url: result.dl_link,
      type: type.toUpperCase(),
      quality: isAudio ? '128kbps' : `${quality || '720'}p`,
      filesize: result.fsize || 'N/A',
      streamUrl: `/stream?urlytb=${encodeURIComponent(urlytb)}&type=${type}${quality ? '&quality=' + quality : ''}`,
      service: 'Y2mate',
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
  console.log(`   - GET /stream?urlytb=...&type=MP3|MP4`);
  console.log(`🔧 Powered by Y2mate`);
});
