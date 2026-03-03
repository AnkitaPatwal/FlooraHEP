import express from 'express';
import { supabase } from '../supabase/config/client';
import { sendApprovalEmail, sendDenialEmail } from '../services/email/emailService';
import { requireAdmin } from '../lib/adminGuard';
import { getAllModulesWithExercises } from '../services/moduleService';
import { supabaseServer } from '../lib/supabaseServer';
import multer from 'multer';
import path from 'path';
import { uploadExerciseVideo, linkVideoToExercise } from '../services/videoService';

const router = express.Router();

// Protect everything below
router.use(requireAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['video/mp4', 'video/quicktime'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = ['.mp4', '.mov'];

    if (!allowedMime.includes(file.mimetype) || !allowedExt.includes(ext)) {
      return cb(new Error('Only .mp4 and .mov video files are allowed.'));
    }
    cb(null, true);
  },
});
router.post('/exercises/:exerciseId/video', upload.single('file'), async (req, res) => {
  try {
    const exerciseId = Number(req.params.exerciseId);
    if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
      return res.status(400).json({ message: 'Invalid exerciseId' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ message: 'Missing file' });

    // ✅ take uploader id from header for local testing
    const uploaderHeader = req.header('x-uploader-user-id');
    const uploaderUserId = Number(uploaderHeader ?? 0);
    if (!Number.isInteger(uploaderUserId) || uploaderUserId <= 0) {
      return res.status(400).json({
        message: 'Missing/invalid x-uploader-user-id header (must be an existing bigint user_id)',
      });
    }

    const { video_id, publicUrl } = await uploadExerciseVideo(
      supabaseServer,
      file.buffer,
      file.originalname,
      file.mimetype,
      file.size,
      uploaderUserId // ✅ NEW PARAM
    );

    await linkVideoToExercise(supabaseServer, exerciseId, video_id);

    return res.status(200).json({ ok: true, video_id, publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    const msg = err instanceof Error ? err.message : 'Upload failed';
    return res.status(500).json({ message: msg });
  }
});

/**
 * Fetch all modules/plans with exercises (admin-only)
 */
router.get('/modules', async (_req, res) => {
  try {
    const modules = await getAllModulesWithExercises(supabaseServer);
    return res.status(200).json(modules);
  } catch (error) {
    console.error('Failed to fetch modules:', error);
    return res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

/**
 * Approve a client (admin-only)
 */
router.post('/clients/:id/approve', async (req, res) => {
  const clientId = req.params.id;

  try {
    const response = await supabase
      .from('clients')
      .update({ status: 'approved' })
      .eq('id', clientId)
      .select();

    if (response.error) {
      console.error('Supabase error (approve):', response.error);
      throw response.error;
    }

    const client = response.data?.[0];
    if (!client) {
      console.warn(`No client found with ID ${clientId}`);
      return res.status(404).json({ message: 'Client not found' });
    }

    await sendApprovalEmail(client.email, client.name);
    res.status(200).json({ message: 'Client approved and email sent' });
  } catch (err) {
    console.error('Error approving client:', err);
    res.status(500).json({ message: 'Error approving client' });
  }
});

/**
 * Deny a client (admin-only)
 */
router.post('/clients/:id/deny', async (req, res) => {
  const clientId = req.params.id;

  try {
    const response = await supabase
      .from('clients')
      .update({ status: 'denied' })
      .eq('id', clientId)
      .select();

    if (response.error) {
      console.error('Supabase error (deny):', response.error);
      throw response.error;
    }

    const client = response.data?.[0];
    if (!client) {
      console.warn(`No client found with ID ${clientId}`);
      return res.status(404).json({ message: 'Client not found' });
    }

    await sendDenialEmail(client.email, client.name);
    res.status(200).json({ message: 'Client denied and email sent' });
  } catch (err) {
    console.error('Error denying client:', err);
    res.status(500).json({ message: 'Error denying client' });
  }
});

export default router;