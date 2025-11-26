const express = require('express');
const axios = require('axios');
const cors = require('cors');
const TiktokDL = require('@tobyg74/tiktok-api-dl');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

function detectPlatform(url) {
  const platforms = {
    tiktok: /tiktok\.com|vm\.tiktok/i,
    instagram: /instagram\.com|instagr\.am/i,
    twitter: /twitter\.com|x\.com/i,
    facebook: /facebook\.com|fb\.watch/i,
    reddit: /reddit\.com|redd\.it/i
  };

  for (const [platform, regex] of Object.entries(platforms)) {
    if (regex.test(url)) {
      return platform;
    }
  }
  return 'unknown';
}

async function downloadTikTok(url) {
  try {
    console.log('Downloading TikTok:', url);
    const result = await TiktokDL.Downloader(url, { version: 'v2' });
    console.log('TikTok result:', JSON.stringify(result).substring(0, 500));
    
    if (result.status === 'success' && result.result) {
      const data = result.result;
      
      if (data.type === 'video') {
        let videoUrl = data.video;
        if (typeof videoUrl === 'object' && videoUrl.playAddr) {
          videoUrl = Array.isArray(videoUrl.playAddr) ? videoUrl.playAddr[0] : videoUrl.playAddr;
        }
        
        let audioUrl = data.music;
        if (typeof audioUrl === 'object' && audioUrl.playUrl) {
          audioUrl = Array.isArray(audioUrl.playUrl) ? audioUrl.playUrl[0] : audioUrl.playUrl;
        }
        
        return {
          success: true,
          platform: 'tiktok',
          type: 'video',
          title: data.desc || 'TikTok Video',
          author: data.author?.nickname || data.author?.unique_id || 'Unknown',
          videoUrl: videoUrl,
          audioUrl: audioUrl,
          thumbnail: data.cover,
          duration: data.duration,
          stats: {
            plays: data.play_count,
            likes: data.digg_count,
            comments: data.comment_count,
            shares: data.share_count
          }
        };
      } else if (data.type === 'image') {
        let audioUrl = data.music;
        if (typeof audioUrl === 'object' && audioUrl.playUrl) {
          audioUrl = Array.isArray(audioUrl.playUrl) ? audioUrl.playUrl[0] : audioUrl.playUrl;
        }
        
        return {
          success: true,
          platform: 'tiktok',
          type: 'images',
          title: data.desc || 'TikTok Slideshow',
          author: data.author?.nickname || data.author?.unique_id || 'Unknown',
          images: data.images,
          audioUrl: audioUrl,
          thumbnail: data.cover
        };
      }
    }
    
    console.log('TikTok failed result:', result);
    throw new Error(result.message || 'Format de réponse invalide');
  } catch (error) {
    console.error('TikTok download error:', error);
    throw new Error(`Erreur TikTok: ${error.message}`);
  }
}

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Téléchargement Vidéo Multi-Plateformes',
    description: 'Téléchargez des vidéos depuis TikTok, Instagram, Twitter, et plus!',
    endpoints: {
      download: '/download?url=URL_VIDEO (retourne les infos JSON avec liens)',
      stream: '/stream?url=URL_VIDEO&type=video|audio (téléchargement DIRECT)'
    },
    examples: {
      tiktokDownload: '/download?url=https://www.tiktok.com/@user/video/123456',
      tiktokStream: '/stream?url=https://www.tiktok.com/@user/video/123456',
      tiktokAudio: '/stream?url=https://www.tiktok.com/@user/video/123456&type=audio'
    },
    supportedPlatforms: {
      working: ['TikTok (vidéos et slideshows)'],
      comingSoon: ['Instagram', 'Twitter', 'Facebook', 'Reddit']
    },
    note: 'TikTok fonctionne parfaitement! Autres plateformes en développement.'
  });
});

app.get('/download', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre "url" manquant. Utilisez: /download?url=URL_VIDEO'
      });
    }

    const platform = detectPlatform(url);
    console.log(`Detected platform: ${platform} for URL: ${url}`);

    if (platform === 'unknown') {
      return res.status(400).json({
        success: false,
        error: 'Plateforme non reconnue. Plateformes supportées: TikTok'
      });
    }

    let result;

    if (platform === 'tiktok') {
      result = await downloadTikTok(url);
    } else {
      return res.status(400).json({
        success: false,
        error: `Plateforme "${platform}" pas encore supportée. Seul TikTok fonctionne actuellement.`
      });
    }

    result.streamUrl = `/stream?url=${encodeURIComponent(url)}`;
    result.streamAudioUrl = `/stream?url=${encodeURIComponent(url)}&type=audio`;
    result.timestamp = new Date().toISOString();

    res.json(result);

  } catch (error) {
    console.error('Erreur download:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du téléchargement',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/stream', async (req, res) => {
  try {
    const { url, type } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Paramètre "url" manquant'
      });
    }

    const platform = detectPlatform(url);
    
    if (platform !== 'tiktok') {
      return res.status(400).json({
        success: false,
        error: 'Seul TikTok est supporté pour le streaming direct'
      });
    }

    const result = await downloadTikTok(url);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Impossible de récupérer le lien de téléchargement'
      });
    }

    const isAudio = type === 'audio';
    let downloadUrl;
    let filename;
    let contentType;

    if (isAudio) {
      downloadUrl = result.audioUrl;
      filename = `${result.title || 'tiktok_audio'}.mp3`.replace(/[^\w\s.-]/g, '_').substring(0, 100);
      contentType = 'audio/mpeg';
    } else {
      downloadUrl = result.videoUrl;
      filename = `${result.title || 'tiktok_video'}.mp4`.replace(/[^\w\s.-]/g, '_').substring(0, 100);
      contentType = 'video/mp4';
    }

    if (!downloadUrl) {
      return res.status(500).json({
        success: false,
        error: isAudio ? 'Aucun audio disponible' : 'Aucune vidéo disponible'
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);

    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream',
      timeout: 300000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tiktok.com/'
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API démarrée sur http://0.0.0.0:${PORT}`);
  console.log(`📝 Endpoints disponibles:`);
  console.log(`   - GET /download?url=...`);
  console.log(`   - GET /stream?url=...`);
  console.log(`🎬 Plateforme supportée: TikTok`);
});
