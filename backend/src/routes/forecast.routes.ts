// BLOCK 1: Imports and Dependencies
import { Router } from 'express';
import multer from 'multer';
import Joi from 'joi';
import { 
  getForecasts, 
  uploadForecasts, 
  getRawForecasts,
  deleteAllForecasts
} from '../controllers/forecast.controller';
import { asyncHandler } from '../utils/asyncHandler';

// BLOCK 2: Multer Configuration for File Upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// BLOCK 3: Validation Schemas (NEW)
const forecastQuerySchema = Joi.object({
  months: Joi.string().valid('4', '6', '9', 'all').optional().default('4'),
  search: Joi.string().allow('').optional()
});

// BLOCK 4: Router Definition and Routes (MODIFIED)
const router = Router();

// Route for the UI table (pivoted data)
router.get('/', asyncHandler(getForecasts));

// ADD THIS NEW ROUTE for the MRP engine (raw, grouped data)
router.get('/raw', asyncHandler(getRawForecasts));

// Route for uploading the Excel file
router.post('/upload', 
  upload.single('forecastFile'), 
  asyncHandler(uploadForecasts)
);
router.delete('/delete-all', asyncHandler(deleteAllForecasts));
// BLOCK 5: Export Router
export default router;