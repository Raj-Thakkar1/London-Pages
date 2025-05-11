# Security Process Documentation

## Removal of Sensitive Artifacts
- Searched the repository for any committed `.env` files and `.git` directories in deployment folders. None were found.
- Confirmed that no sensitive files were present in version control.

## Preventing Future Leaks
- Added a `.gitignore` file to exclude `.env` files and `.git/` directories from being committed.

## Recommendations
- Always store secrets and environment variables in files excluded by `.gitignore`.
- Regularly audit the repository for accidental commits of sensitive files.

## Approved External Services and APIs
The following third-party services are approved for use in this project as part of the content policy:

- **Firebase**: Used for user authentication and Firestore database storage.
- **Google Drive API**: Used for uploading, storing, and sharing user files (videos, transcripts, etc.).
- **Razorpay**: Used for secure payment processing and subscription management.
- **Nodemailer (Gmail)**: Used for sending transactional and notification emails to users.
- **Google Analytics**: Used for website analytics and tracking user engagement.

All integrations are implemented with security best practices, and only the minimum required scopes and permissions are granted.
