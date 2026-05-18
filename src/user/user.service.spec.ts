import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { User } from './user.schema';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as argon2 from 'argon2';

// Mock argon2
jest.mock('argon2');

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
}));

// Mock class-validator
jest.mock('class-validator', () => ({
  validate: jest.fn().mockResolvedValue([]),
  IsEmail: () => () => {},
}));

const createMockUser = (overrides = {}) => {
  const user = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashed-password',
    bio: 'A bio',
    image: 'http://image.url',
    articles: [],
    favorites: [],
    save: jest.fn(),
    toObject: jest.fn(),
    isModified: jest.fn().mockReturnValue(false),
    ...overrides,
  };
  user.save.mockResolvedValue(user);
  return user;
};

const mockUserModel: any = jest.fn().mockImplementation((data) => {
  const instance = createMockUser(data);
  return instance;
});
mockUserModel.find = jest.fn().mockReturnValue({ exec: jest.fn() });
mockUserModel.findOne = jest.fn().mockReturnValue({ exec: jest.fn() });
mockUserModel.findById = jest.fn().mockReturnValue({ exec: jest.fn() });
mockUserModel.deleteOne = jest.fn().mockReturnValue({ exec: jest.fn() });

describe('UserService', () => {
  let service: UserService;
  let userModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get(getModelToken(User.name));
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return an array of all users', async () => {
      const users = [createMockUser(), createMockUser({ _id: '2', username: 'user2' })];
      userModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(users) });

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(userModel.find).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no users exist', async () => {
      userModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne (login lookup)', () => {
    it('should return user when email and password match', async () => {
      const user = createMockUser();
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.findOne({ email: 'test@example.com', password: 'password123' });

      expect(result).toEqual(user);
      expect(argon2.verify).toHaveBeenCalledWith('hashed-password', 'password123');
    });

    it('should return null when user is not found by email', async () => {
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.findOne({ email: 'nonexistent@example.com', password: 'password123' });

      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      const user = createMockUser();
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const result = await service.findOne({ email: 'test@example.com', password: 'wrongpassword' });

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return a new user with token', async () => {
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const dto = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      const result = await service.create(dto);

      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('username', 'testuser');
      expect(result.user).toHaveProperty('email', 'test@example.com');
      expect(result.user).toHaveProperty('token');
    });

    it('should throw HttpException when username/email already exists', async () => {
      const existingUser = createMockUser();
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(existingUser) });

      const dto = { username: 'testuser', email: 'test@example.com', password: 'password123' };

      await expect(service.create(dto)).rejects.toThrow(HttpException);
    });
  });

  describe('update', () => {
    it('should update and return the updated user', async () => {
      const existingUser = createMockUser();
      existingUser.save.mockResolvedValue({ ...existingUser, username: 'updateduser', bio: 'New bio' });
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(existingUser) });

      const dto = { username: 'updateduser', email: 'test@example.com', bio: 'New bio', image: '' };
      const result = await service.update(1, dto);

      expect(existingUser.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete user by email', async () => {
      const deleteResult = { acknowledged: true, deletedCount: 1 };
      userModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(deleteResult) });

      const result = await service.delete('test@example.com');

      expect(result).toEqual(deleteResult);
      expect(userModel.deleteOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });

  describe('findById', () => {
    it('should return user RO when user exists', async () => {
      const user = createMockUser();
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      const result = await service.findById(1);

      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe('testuser');
      expect(result.user).toHaveProperty('token');
    });

    it('should throw HttpException when user is not found', async () => {
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findById(999)).rejects.toThrow(HttpException);
    });
  });

  describe('findByEmail', () => {
    it('should return user RO when found by email', async () => {
      const user = createMockUser();
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      const result = await service.findByEmail('test@example.com');

      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('generateJWT', () => {
    it('should return a JWT token string', () => {
      const user = createMockUser();
      const token = service.generateJWT(user);

      expect(token).toBe('mock-jwt-token');
    });

    it('should call jwt.sign with user data and secret', () => {
      const jwt = require('jsonwebtoken');
      const user = createMockUser();
      service.generateJWT(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          username: user.username,
          email: user.email,
        }),
        expect.any(String),
      );
    });
  });

  // ------- Edge Cases -------

  describe('edge cases', () => {
    it('findOne should handle argon2.verify throwing an error', async () => {
      const user = createMockUser();
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });
      (argon2.verify as jest.Mock).mockRejectedValue(new Error('argon2 internal error'));

      await expect(service.findOne({ email: 'test@example.com', password: 'pass' }))
        .rejects.toThrow('argon2 internal error');
    });

    it('create should handle save failure', async () => {
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      // Override the mock to make save throw
      const failingUser = createMockUser();
      failingUser.save.mockRejectedValue(new Error('MongoServerError: duplicate key'));
      mockUserModel.mockImplementationOnce(() => failingUser);

      const dto = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      await expect(service.create(dto)).rejects.toThrow('MongoServerError: duplicate key');
    });

    it('update should handle non-existent user id gracefully', async () => {
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const dto = { username: 'newname', email: 'new@test.com', bio: '', image: '' };
      await expect(service.update(999, dto)).rejects.toThrow();
    });

    it('delete should return deletedCount=0 when user does not exist', async () => {
      const deleteResult = { acknowledged: true, deletedCount: 0 };
      userModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(deleteResult) });

      const result = await service.delete('nonexistent@example.com');

      expect(result.deletedCount).toBe(0);
    });

    it('findById should throw with status 401 when user not found', async () => {
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      try {
        await service.findById(999);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(401);
      }
    });

    it('generateJWT should include exp field in payload', () => {
      const jwt = require('jsonwebtoken');
      const user = createMockUser();
      service.generateJWT(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ exp: expect.any(Number) }),
        expect.any(String),
      );
    });

    it('buildUserRO should include token in response', async () => {
      const user = createMockUser();
      userModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      const result = await service.findById(1);

      expect(result.user.token).toBe('mock-jwt-token');
    });
  });
});
