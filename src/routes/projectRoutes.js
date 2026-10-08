import express from 'express';
import {
  getProjects,
  getProjectById,
  seedProjects,
} from '../controllers/projectController.js';

const router = express.Router();

router.get('/', getProjects);
router.post('/seed', seedProjects);
router.get('/:id', getProjectById);

export default router;
