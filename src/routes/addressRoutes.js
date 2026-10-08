import express from 'express';
import {
  getUserAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/addressController.js';
import { validateAddress } from '../middleware/validator.js';

const router = express.Router();

router.get('/user/:userId', getUserAddresses);
router.post('/', validateAddress, addAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

export default router;
