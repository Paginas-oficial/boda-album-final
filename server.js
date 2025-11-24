require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN ---
// Render leerá estas claves de las Variables de Entorno que configuraremos luego
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'album-boda', // Carpeta en la nube donde van las fotos
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
    }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// --- RUTAS ---

// 1. Subir Foto
app.post('/upload', upload.single('photo'), (req, res) => {
    if (req.file) {
        res.json({ success: true, message: '¡Foto guardada!', filePath: req.file.path });
    } else {
        res.status(400).json({ success: false, message: 'Error al subir.' });
    }
});

// 2. Ver Fotos
app.get('/photos', async (req, res) => {
    try {
        const { resources } = await cloudinary.search
            .expression('folder:album-boda')
            .sort_by('created_at', 'desc')
            .max_results(500)
            .execute();
        
        const photoUrls = resources.map(file => file.secure_url);
        res.json(photoUrls);
    } catch (error) {
        console.error(error);
        res.status(500).json([]);
    }
});

// 3. Eliminar Foto
const ADMIN_PASSWORD = "boda2025"; // <--- CONTRASEÑA PARA BORRAR

app.delete('/delete/:filename', async (req, res) => {
    const { filename } = req.params;
    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(403).json({ success: false, message: 'Contraseña incorrecta.' });
    }

    try {
        // Extraemos el nombre sin extensión para Cloudinary
        const public_id = `album-boda/${path.parse(filename).name}`;
        await cloudinary.uploader.destroy(public_id);
        res.json({ success: true, message: 'Foto eliminada.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al eliminar.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor listo en puerto ${PORT}`);
});
