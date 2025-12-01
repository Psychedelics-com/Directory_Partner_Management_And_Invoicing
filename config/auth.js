const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const config = require('../config/config');

/**
 * Configure Passport with Google OAuth strategy
 */
function configurePassport() {
    passport.use(
        new GoogleStrategy(
            {
                clientID: config.googleOAuth.clientId,
                clientSecret: config.googleOAuth.clientSecret,
                callbackURL: config.googleOAuth.callbackURL,
            },
            (accessToken, refreshToken, profile, done) => {
                // Verify user is admin
                const userEmail = profile.emails[0].value;

                if (userEmail === config.googleOAuth.adminEmail) {
                    return done(null, profile);
                } else {
                    return done(null, false, { message: 'Unauthorized email address' });
                }
            }
        )
    );

    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((user, done) => {
        done(null, user);
    });
}

/**
 * Middleware to check if user is authenticated
 */
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

module.exports = {
    configurePassport,
    ensureAuthenticated,
};
