import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRO } from './user.interface';
import { HttpException } from '@nestjs/common';

const mockUserService = () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  generateJWT: jest.fn(),
});

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useFactory: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  afterEach(() => jest.clearAllMocks());

  const mockUserRO: UserRO = {
    user: {
      username: 'testuser',
      email: 'test@example.com',
      token: 'jwt-token',
      bio: 'A bio',
      image: 'http://img.url',
    },
  };

  // ------- GET /user (findMe) -------

  describe('findMe', () => {
    it('should return the current authenticated user', async () => {
      userService.findByEmail.mockResolvedValue(mockUserRO);

      const result = await controller.findMe('test@example.com');

      expect(result).toEqual(mockUserRO);
      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  // ------- PUT /user (update) -------

  describe('update', () => {
    it('should update and return the user', async () => {
      const updatedUser = { id: 1, username: 'updated', email: 'test@example.com', bio: 'New bio', image: '', password: 'x', articles: [], favorites: [] };
      userService.update.mockResolvedValue(updatedUser as any);

      const dto = { username: 'updated', email: 'test@example.com', bio: 'New bio', image: '' };
      const result = await controller.update(1, dto);

      expect(result).toEqual(updatedUser);
      expect(userService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  // ------- POST /users (create / register) -------

  describe('create', () => {
    it('should create and return a new user', async () => {
      userService.create.mockResolvedValue(mockUserRO);

      const dto = { username: 'testuser', email: 'test@example.com', password: 'password123' };
      const result = await controller.create(dto);

      expect(result).toEqual(mockUserRO);
      expect(userService.create).toHaveBeenCalledWith(dto);
    });
  });

  // ------- DELETE /users/:slug -------

  describe('delete', () => {
    it('should delete a user by slug', async () => {
      const deleteResult = { affected: 1, raw: {} };
      userService.delete.mockResolvedValue(deleteResult as any);

      const result = await controller.delete({ slug: 'test@example.com' });

      expect(result).toEqual(deleteResult);
      expect(userService.delete).toHaveBeenCalledWith('test@example.com');
    });
  });

  // ------- POST /users/login -------

  describe('login', () => {
    it('should return user with token on successful login', async () => {
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        bio: 'A bio',
        image: 'http://img.url',
        password: 'hashed',
      };
      userService.findOne.mockResolvedValue(user as any);
      userService.generateJWT.mockReturnValue('jwt-token');

      const dto = { email: 'test@example.com', password: 'password123' };
      const result = await controller.login(dto);

      expect(result.user).toHaveProperty('token', 'jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(userService.findOne).toHaveBeenCalledWith(dto);
    });

    it('should throw HttpException 401 when user is not found', async () => {
      userService.findOne.mockResolvedValue(null as any);

      const dto = { email: 'wrong@example.com', password: 'password123' };

      await expect(controller.login(dto)).rejects.toThrow(HttpException);
    });

    it('should throw HttpException with 401 status code specifically', async () => {
      userService.findOne.mockResolvedValue(null as any);

      const dto = { email: 'wrong@example.com', password: 'password123' };

      try {
        await controller.login(dto);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(401);
      }
    });
  });

  // ------- Edge Cases -------

  describe('edge cases', () => {
    it('findMe should propagate service error', async () => {
      userService.findByEmail.mockRejectedValue(new HttpException('Not found', 404));

      await expect(controller.findMe('notfound@example.com')).rejects.toThrow(HttpException);
    });

    it('create should propagate validation error from service', async () => {
      userService.create.mockRejectedValue(
        new HttpException({ errors: { username: 'already exists' } }, 422)
      );

      const dto = { username: 'taken', email: 'taken@example.com', password: 'pass123' };
      await expect(controller.create(dto)).rejects.toThrow(HttpException);
    });

    it('update should pass userId and dto correctly to service', async () => {
      userService.update.mockResolvedValue({} as any);

      const dto = { username: 'newname', email: 'new@example.com', bio: '', image: '' };
      await controller.update(42, dto);

      expect(userService.update).toHaveBeenCalledWith(42, dto);
    });

    it('delete should pass slug param to service', async () => {
      userService.delete.mockResolvedValue({ acknowledged: true, deletedCount: 1 } as any);

      await controller.delete({ slug: 'user-email@example.com' });

      expect(userService.delete).toHaveBeenCalledWith('user-email@example.com');
    });

    it('login should include all user fields in response', async () => {
      const user = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        bio: 'bio text',
        image: 'http://img.url',
        password: 'hashed',
      };
      userService.findOne.mockResolvedValue(user as any);
      userService.generateJWT.mockReturnValue('new-jwt-token');

      const result = await controller.login({ email: 'test@example.com', password: 'pass' });

      expect(result.user.username).toBe('testuser');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.bio).toBe('bio text');
      expect(result.user.image).toBe('http://img.url');
      expect(result.user.token).toBe('new-jwt-token');
    });
  });
});
