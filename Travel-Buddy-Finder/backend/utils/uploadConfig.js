const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define upload paths
const publicPath = path.join(__dirname, '..', 'public');
const uploadsPath = path.join(publicPath, 'uploads');
const profilePicsPath = path.join(uploadsPath, 'profile-pictures');

// Create necessary directories if they don't exist
[publicPath, uploadsPath, profilePicsPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Ensure proper permissions
try {
    fs.chmodSync(profilePicsPath, '755');
    console.log('Set permissions for profile pictures directory');
} catch (error) {
    console.error('Error setting directory permissions:', error);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('Upload destination:', profilePicsPath);
        cb(null, profilePicsPath);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        console.log('Generated filename:', uniqueName);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: function(req, file, cb) {
        console.log('Processing file upload:', {
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype
        });
        
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.error('Invalid file type:', file.mimetype);
            cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
        }
    }
});

module.exports = upload;
