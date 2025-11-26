const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

function validateYouTubeURL(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  return youtubeRegex.test(url);
}

async function getVideoInfo(url) {
  try {
    const { stdout } = await execAsync(`yt-dlp -j "${url}"`, { maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Erreur lors de la récupération des informations: ${error.message}`);
  }
}

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API YouTube - Recherche et Téléchargement Direct',
    description: 'Téléchargez des vidéos et de la musique YouTube en MP3 et MP4 avec différentes qualités',
    endpoints: {
      recherche: '/recherche?titre=votre_recherche',
      download: '/download?urlytb=URL_YOUTUBE&type=MP3|MP4&quality=highest|lowest|720p|480p|360p (retourne les infos JSON)',
      stream: '/stream?urlytb=URL_YOUTUBE&type=MP3|MP4&quality=highest|lowest|720p|480p|360p (téléchargement DIRECT)'
    },
    examples: {
      recherche: '/recherche?titre=metamorphosis',
      downloadMP3: '/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP3',
      downloadMP4_highest: '/download?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP4&quality=highest',
      streamMP3: '/stream?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP3 (TÉLÉCHARGEMENT DIRECT)',
      streamMP4_720p: '/stream?urlytb=https://www.youtube.com/watch?v=dQw4w9WgXcQ&type=MP4&quality=720p (TÉLÉCHARGEMENT DIRECT)'
    },
    availableQualities: {
      MP4: ['highest (meilleure qualité)', 'lowest (plus petite taille)', '720p', '480p', '360p', '240p', '144p'],
      MP3: ['128kbps (audio uniquement)']
    },
    features: [
      'Téléchargement direct YouTube via yt-dlp',
      'Support MP3 et MP4',
      'Choix de qualité flexible',
      'Informations détaillées sur la vidéo',
      'Recherche par titre',
      'Endpoint /stream pour téléchargement direct!'
    ],
    notes: {
      download: 'Retourne les informations et l\'URL de téléchargement en JSON',
      stream: 'RECOMMANDÉ pour mobile: Télécharge directement le fichier dans votre répertoire de téléchargements!'
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

    const info = await getVideoInfo(urlytb);
    const isAudioOnly = type.toUpperCase() === 'MP3';
    
    const sanitizedTitle = info.title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
    
    const extension = isAudioOnly ? 'mp3' : 'mp4';
    const filename = `${sanitizedTitle}.${extension}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', isAudioOnly ? 'audio/mpeg' : 'video/mp4');

    let formatArg;
    if (isAudioOnly) {
      formatArg = '-f bestaudio -x --audio-format mp3';
    } else {
      const requestedQuality = quality || 'highest';
      if (requestedQuality === 'highest') {
        formatArg = '-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"';
      } else if (requestedQuality === 'lowest') {
        formatArg = '-f "worstvideo[ext=mp4]+worstaudio[ext=m4a]/worst[ext=mp4]/worst"';
      } else {
        const height = parseInt(requestedQuality);
        formatArg = `-f "bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best"`;
      }
    }

    const ytdlp = spawn('yt-dlp', [
      ...formatArg.split(' '),
      '-o', '-',
      urlytb
    ], { shell: true });

    ytdlp.stdout.pipe(res);

    ytdlp.stderr.on('data', (data) => {
      console.error('yt-dlp stderr:', data.toString());
    });

    ytdlp.on('error', (error) => {
      console.error('yt-dlp error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Erreur lors du téléchargement'
        });
      }
    });

    ytdlp.on('close', (code) => {
      if (code !== 0 && !res.headersSent) {
        res.status(500).json({
          success: false,
          error: `yt-dlp exited with code ${code}`
        });
      }
    });

  } catch (error) {
    console.error('Erreur stream:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors du streaming'
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

    const info = await getVideoInfo(urlytb);
    const isAudioOnly = type.toUpperCase() === 'MP3';
    
    const formats = info.formats || [];
    let selectedFormat;
    let downloadUrl;

    if (isAudioOnly) {
      const audioFormats = formats.filter(f => f.acodec !== 'none' && f.vcodec === 'none' && f.url);
      if (audioFormats.length > 0) {
        selectedFormat = audioFormats.reduce((best, current) => {
          const bestBitrate = best.abr || 0;
          const currentBitrate = current.abr || 0;
          return currentBitrate > bestBitrate ? current : best;
        });
      } else {
        const anyAudio = formats.filter(f => f.acodec !== 'none' && f.url);
        if (anyAudio.length > 0) {
          selectedFormat = anyAudio[0];
        }
      }
    } else {
      const requestedQuality = quality || 'highest';
      const videoFormats = formats.filter(f => 
        f.vcodec !== 'none' && 
        f.acodec !== 'none' && 
        f.url &&
        f.height
      );

      if (videoFormats.length > 0) {
        if (requestedQuality === 'highest') {
          selectedFormat = videoFormats.reduce((best, current) => {
            return (current.height || 0) > (best.height || 0) ? current : best;
          });
        } else if (requestedQuality === 'lowest') {
          selectedFormat = videoFormats.reduce((best, current) => {
            return (current.height || 9999) < (best.height || 9999) ? current : best;
          });
        } else {
          const targetHeight = parseInt(requestedQuality);
          selectedFormat = videoFormats.reduce((best, current) => {
            const bestDiff = Math.abs((best.height || 0) - targetHeight);
            const currentDiff = Math.abs((current.height || 0) - targetHeight);
            return currentDiff < bestDiff ? current : best;
          });
        }
      }
    }

    if (!selectedFormat || !selectedFormat.url) {
      return res.status(400).json({
        success: false,
        error: 'Aucun format disponible pour cette vidéo. Utilisez /stream pour un téléchargement direct.',
        suggestion: 'Essayez: /stream?urlytb=' + encodeURIComponent(urlytb) + '&type=' + type
      });
    }

    downloadUrl = selectedFormat.url;

    const availableQualities = formats
      .filter(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.height)
      .map(f => `${f.height}p`)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => parseInt(b) - parseInt(a));

    const durationSeconds = info.duration || 0;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;

    res.json({
      success: true,
      title: info.title,
      author: info.uploader || info.channel,
      duration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      thumbnail: info.thumbnail,
      url: downloadUrl,
      quality: selectedFormat.format_note || `${selectedFormat.height}p` || `${selectedFormat.abr}kbps`,
      type: type.toUpperCase(),
      container: selectedFormat.ext,
      hasAudio: selectedFormat.acodec !== 'none',
      hasVideo: selectedFormat.vcodec !== 'none',
      filesize: selectedFormat.filesize ? `${(selectedFormat.filesize / 1024 / 1024).toFixed(2)} MB` : 'N/A',
      availableQualities: availableQualities,
      service: 'YouTube Direct (yt-dlp)',
      timestamp: new Date().toISOString(),
      streamUrl: `/stream?urlytb=${encodeURIComponent(urlytb)}&type=${type}${quality ? '&quality=' + quality : ''}`
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
  console.log(`   - GET /stream?urlytb=...&type=MP3|MP4`);
  console.log(`🔧 Powered by yt-dlp`);
});
