import express from 'express';
import { UserController } from './user.controller';



const router = express.Router();

router
    .post('/', UserController.createUser)
    .get('/', UserController.getAllUsers)
    .get('/:id', UserController.getUserByID)
    .delete('/:id', UserController.deleteUserByID)
    .patch('/:id', UserController.updateUser);

export const userRoute = router;
