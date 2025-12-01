const { query } = require('../config/database');

/**
 * Add note to partner
 * @param {number} partnerId - Partner ID
 * @param {string} note - Note text
 * @param {string} createdBy - User who created the note
 * @returns {Promise<Object>} - Created note
 */
async function addNote(partnerId, note, createdBy = 'admin') {
    const result = await query(
        `INSERT INTO partner_notes (partner_id, note, created_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [partnerId, note, createdBy]
    );

    return result.rows[0];
}

/**
 * Get notes for partner
 * @param {number} partnerId - Partner ID
 * @returns {Promise<Array>} - Array of notes
 */
async function getPartnerNotes(partnerId) {
    const result = await query(
        `SELECT * FROM partner_notes 
     WHERE partner_id = $1 
     ORDER BY created_at DESC`,
        [partnerId]
    );

    return result.rows;
}

/**
 * Delete note
 * @param {number} noteId - Note ID
 * @returns {Promise<void>}
 */
async function deleteNote(noteId) {
    await query('DELETE FROM partner_notes WHERE id = $1', [noteId]);
}

/**
 * Get all notes (for activity feed)
 * @param {number} limit - Maximum number of notes
 * @returns {Promise<Array>} - Array of notes with partner info
 */
async function getAllNotes(limit = 50) {
    const result = await query(
        `SELECT pn.*, p.name as partner_name
     FROM partner_notes pn
     JOIN partners p ON pn.partner_id = p.id
     ORDER BY pn.created_at DESC
     LIMIT $1`,
        [limit]
    );

    return result.rows;
}

module.exports = {
    addNote,
    getPartnerNotes,
    deleteNote,
    getAllNotes,
};
