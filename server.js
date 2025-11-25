const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { YtdlCore } = require('@ybd-project/ytdl-core');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const ytdl = new YtdlCore();

function validateYouTubeURL(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  return youtubeRegex.test(url);
}

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API YouTube - Recherche et Téléchargement Direct',
    description: 'Téléchargez des vidéos et de la musique YouTube en MP3 et MP4 avec différentes qualités',
    endpoints: {
      recherche: '/recherche?titre=votre_recherche',
      download: '/download?urlytb=URL_YOUTUBE&type=MP3|MP4&quality=highest|lowest|720p|480p|360p'
    },
    examples: {
      recherche: '/recherche?titre=metamorphosis',
      downloadMP3: '/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP3',
      downloadMP4_highest: '/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP4&quality=highest',
      downloadMP4_720p: '/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP4&quality=720p',
      downloadMP4_360p: '/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP4&quality=360p'
    },
    availableQualities: {
      MP4: ['highest (meilleure qualité)', 'lowest (plus petite taille)', '720p', '480p', '360p', '240p', '144p'],
      MP3: ['128kbps (audio uniquement)']
    },
    features: [
      'Téléchargement direct YouTube',
      'Support MP3 et MP4',
      'Choix de qualité flexible',
      'Informations détaillées sur la vidéo',
      'Recherche par titre'
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

app.get('/download', async (req, res) => {
  try {
    const { urlytb, type, quality } = req.query;
    
    if (!urlytb) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre "urlytb" manquant. Utilisez: /download?urlytb=URL_YOUTUBE&type=MP3|MP4&quality=highest|lowest|720p|480p|360p'
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
        error: 'URL YouTube invalide. Utilisez un format valide: https://www.youtube.com/watch?v=VIDEO_ID ou https://youtu.be/VIDEO_ID'
      });
    }

    const info = await ytdl.getFullInfo(urlytb);
    const isAudioOnly = type.toUpperCase() === 'MP3';
    
    let format;
    let downloadUrl;

    if (isAudioOnly) {
      const formatsWithAudio = info.formats.filter(f => f.hasAudio && f.url);
      if (formatsWithAudio.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Aucun format audio disponible avec URL directe pour cette vidéo.'
        });
      }
      
      const audioOnlyFormats = formatsWithAudio.filter(f => !f.hasVideo);
      if (audioOnlyFormats.length > 0) {
        format = audioOnlyFormats.reduce((best, current) => {
          const bestBitrate = parseInt(best.audioBitrate) || 0;
          const currentBitrate = parseInt(current.audioBitrate) || 0;
          return currentBitrate > bestBitrate ? current : best;
        });
      } else {
        const lowQualityFormats = formatsWithAudio.filter(f => f.hasVideo && f.hasAudio);
        format = lowQualityFormats.reduce((best, current) => {
          const bestBitrate = parseInt(best.audioBitrate) || 0;
          const currentBitrate = parseInt(current.audioBitrate) || 0;
          const bestHeight = parseInt(best.height) || 9999;
          const currentHeight = parseInt(current.height) || 9999;
          
          if (currentBitrate > bestBitrate) return current;
          if (currentBitrate === bestBitrate && currentHeight < bestHeight) return current;
          return best;
        });
      }
      downloadUrl = format.url;
    } else {
      const requestedQuality = quality || 'highest';
      
      if (requestedQuality === 'highest' || requestedQuality === 'lowest') {
        const videoFormats = info.formats.filter(f => f.hasVideo && f.hasAudio);
        if (videoFormats.length > 0) {
          format = videoFormats.reduce((best, current) => {
            const bestHeight = parseInt(best.height) || 0;
            const currentHeight = parseInt(current.height) || 0;
            if (requestedQuality === 'highest') {
              return currentHeight > bestHeight ? current : best;
            } else {
              return currentHeight < bestHeight && currentHeight > 0 ? current : best;
            }
          });
        } else {
          return res.status(400).json({
            success: false,
            error: 'Aucun format MP4 avec vidéo et audio disponible. Essayez MP3 pour audio uniquement.'
          });
        }
      } else {
        const targetHeight = parseInt(requestedQuality);
        const videoFormats = info.formats.filter(f => 
          f.hasVideo && 
          f.hasAudio && 
          parseInt(f.height) === targetHeight
        );
        
        if (videoFormats.length > 0) {
          format = videoFormats[0];
        } else {
          const allVideoFormats = info.formats.filter(f => f.hasVideo && f.hasAudio);
          if (allVideoFormats.length > 0) {
            format = allVideoFormats.reduce((best, current) => {
              const bestDiff = Math.abs(parseInt(best.height) - targetHeight);
              const currentDiff = Math.abs(parseInt(current.height) - targetHeight);
              return currentDiff < bestDiff ? current : best;
            });
          } else {
            return res.status(400).json({
              success: false,
              error: `Qualité ${requestedQuality} non disponible. Essayez: highest, lowest, 720p, 480p, ou 360p`
            });
          }
        }
      }
      downloadUrl = format.url;
    }

    if (!downloadUrl) {
      return res.status(500).json({
        success: false,
        error: 'Impossible de générer l\'URL de téléchargement. Le format sélectionné n\'est pas disponible.',
        details: 'YouTube peut avoir des restrictions sur cette vidéo. Essayez une autre vidéo ou un autre format.',
        timestamp: new Date().toISOString()
      });
    }

    const availableQualities = info.formats
      .filter(f => f.hasVideo && f.hasAudio && f.height)
      .map(f => `${f.height}p`)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => parseInt(b) - parseInt(a));

    res.json({
      success: true,
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: `${Math.floor(info.videoDetails.lengthSeconds / 60)}:${(info.videoDetails.lengthSeconds % 60).toString().padStart(2, '0')}`,
      thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url,
      url: downloadUrl,
      quality: format.qualityLabel || `${format.audioBitrate}kbps`,
      type: type.toUpperCase(),
      container: format.container,
      hasAudio: format.hasAudio,
      hasVideo: format.hasVideo,
      filesize: format.contentLength ? `${(format.contentLength / 1024 / 1024).toFixed(2)} MB` : 'N/A',
      availableQualities: availableQualities,
      service: 'YouTube Direct (ytdl-core)',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur download:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du téléchargement',
      details: 'Assurez-vous que l\'URL YouTube est valide et accessible.',
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
