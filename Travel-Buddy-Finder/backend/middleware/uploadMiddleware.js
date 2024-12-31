const upload = require('../utils/uploadConfig');

// Create a wrapper middleware that adds logging
const uploadWithLogging = (fieldName) => {
    return (req, res, next) => {
        const middleware = upload.single(fieldName);
        
        middleware(req, res, (err) => {
            if (err) {
                console.error('File upload error:', err);
                return next(err);
            }

            // Log file details if a file was uploaded
            if (req.file) {
                console.log('File upload successful:', {
                    fieldname: req.file.fieldname,
                    originalname: req.file.originalname,
                    encoding: req.file.encoding,
                    mimetype: req.file.mimetype,
                    destination: req.file.destination,
                    filename: req.file.filename,
                    path: req.file.path,
                    size: req.file.size
                });
            } else {
                console.log('No file uploaded');
            }
            
            next();
        });
    };
};

module.exports = uploadWithLogging;
