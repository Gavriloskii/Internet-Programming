const fs = require('fs');
const path = require('path');

// Function to ensure upload directories exist
function setupUploadDirectories() {
    const uploadsPath = path.join(__dirname, '..', 'public', 'uploads');
    const profilePicsPath = path.join(uploadsPath, 'profile-pictures');

    // Create directories if they don't exist
    [uploadsPath, profilePicsPath].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        }
    });
}

// Export the function
module.exports = setupUploadDirectories;
