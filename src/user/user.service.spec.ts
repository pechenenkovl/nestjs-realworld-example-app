import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { UserEntity } from './user.entity';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as argon2 from 'argon2';

// Mock argon2
jest.mock('argon2');

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
}));

const mockUserRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<UserEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(UserEntity), useFactory: mockUserRepository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(UserEntity));
  });

  afterEach(() => jest.clearAllMocks());

  const createUserEntity = (overrides: Partial<UserEntity> = {}): UserEntity => {
    const user = new UserEntity();
    user.id = 1;
    user.username = 'testuser';
    user.email = 'test@example.com';
    user.password = 'hashed-password';
    user.bio = 'A bio';
    user.image = 'http://image.url';
    user.articles = [];
    user.favorites = [];
    Object.assign(user, overrides);
    return user;
  };

  describe('findAll', () => {
    it('should return an array of all users', async () => {
      const users = [createUserEntity(), createUserEntity({ id: 2, username: 'user2' })];
      userRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(userRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no users exist', async () => {
      userRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne (login lookup)', () => {
    it('should return user when email and password match', async () => {
      const user = createUserEntity();
      userRepository.findOne.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.findOne({ email: 'test@example.com', password: 'password123' });

      expect(result).toEqual(user);
      expect(userRepository.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(argon2.verify).toHaveBeenCalledWith('hashed-password', 'password123');
    });

    it('should return null when user is not found by email', async () => {
      userRepository.findOne.mockResolvedValue(undefined);

      const result = await service.findOne({ email: 'nonexistent@example.com', password: 'password123' });

      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      const user = createUserEntity();
      userRepository.findOne.mockResolvedValue(user);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const result = await service.findOne({ email: 'test@example.com', password: 'wrongpassword' });

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return a new user with token', async () => {
      // Mock getRepository to return no existing user (uniqueness check passes)
      const { getRepository } = require('typeorm');
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      jest.spyOn(require('typeorm'), 'getRepository').mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      });

      const savedUser = createUserEntity();
      userRepository.save.mockResolvedValue(savedUser);

      const dto = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      const result = await service.create(dto);

      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('username', 'testuser');
      expect(result.user).toHaveProperty('email', 'test@example.com');
      expect(result.user).toHaveProperty('token');
    });

    it('should throw HttpException when username/email already exists', async () => {
      const existingUser = createUserEntity();
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existingUser),
      };
      jest.spyOn(require('typeorm'), 'getRepository').mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      });

      const dto = { username: 'testuser', email: 'test@example.com', password: 'password123' };

      await expect(service.create(dto)).rejects.toThrow(HttpException);
      await expect(service.create(dto)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });
  });

  describe('update', () => {
    it('should update and return the updated user', async () => {
      const existingUser = createUserEntity();
      const updatedUser = createUserEntity({ username: 'updateduser', bio: 'New bio' });
      userRepository.findOne.mockResolvedValue(existingUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const dto = { username: 'updateduser', email: 'test@example.com', bio: 'New bio', image: '' };
      const result = await service.update(1, dto);

      expect(result).toEqual(updatedUser);
      expect(userRepository.findOne).toHaveBeenCalledWith(1);
      expect(userRepository.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete user by email', async () => {
      const deleteResult = { affected: 1, raw: {} };
      userRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.delete('test@example.com');

      expect(result).toEqual(deleteResult);
      expect(userRepository.delete).toHaveBeenCalledWith({ email: 'test@example.com' });
    });
  });

  describe('findById', () => {
    it('should return user RO when user exists', async () => {
      const user = createUserEntity();
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.findById(1);

      expect(result).toHaveProperty('user');
      expect(result.user.username).toBe('testuser');
      expect(result.user).toHaveProperty('token');
    });

    it('should throw HttpException when user is not found', async () => {
      userRepository.findOne.mockResolvedValue(undefined);

      await expect(service.findById(999)).rejects.toThrow(HttpException);
    });
  });

  describe('findByEmail', () => {
    it('should return user RO when found by email', async () => {
      const user = createUserEntity();
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('generateJWT', () => {
    it('should return a JWT token string', () => {
      const user = createUserEntity();
      const token = service.generateJWT(user);

      expect(token).toBe('mock-jwt-token');
    });

    it('should call jwt.sign with user data and secret', () => {
      const jwt = require('jsonwebtoken');
      const user = createUserEntity();
      service.generateJWT(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: user.id,
          username: user.username,
          email: user.email,
        }),
        expect.any(String),
      );
    });
  });
});
