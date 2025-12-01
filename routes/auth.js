const express = require('express');
const passport = require('passport');
const router = express.Router();

/**
 * GET /auth/google
 * Initiate Google OAuth flow
 */
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
}));

/**
 * GET /auth/google/callback
 * Google OAuth callback
 */
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

/**
 * GET /logout
 * Logout user
 */
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});

module.exports = router;
