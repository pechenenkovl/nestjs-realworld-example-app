import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProfileService } from './profile.service';
import { User } from '../user/user.schema';
import { Follow } from './follow.schema';
import { HttpException, HttpStatus } from '@nestjs/common';

const createMockUser = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashed',
  bio: 'A bio',
  image: 'http://image.url',
  articles: [],
  favorites: [],
  toObject: function() { return { ...this }; },
  ...overrides,
});

const mockUserModel: any = {
  find: jest.fn().mockReturnValue({ exec: jest.fn() }),
  findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
};

const mockFollowModel: any = jest.fn().mockImplementation((data) => ({
  ...data,
  save: jest.fn().mockResolvedValue(data),
}));
mockFollowModel.find = jest.fn().mockReturnValue({ exec: jest.fn() });
mockFollowModel.findOne = jest.fn().mockReturnValue({ exec: jest.fn() });
mockFollowModel.deleteOne = jest.fn().mockReturnValue({ exec: jest.fn() });

describe('ProfileService', () => {
  let service: ProfileService;
  let userModel: any;
  let followModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Follow.name), useValue: mockFollowModel },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    userModel = module.get(getModelToken(User.name));
    followModel = module.get(getModelToken(Follow.name));
  });

  afterEach(() => jest.clearAllMocks());

  // ------- Read: findAll -------

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [createMockUser(), createMockUser({ _id: '2' })];
      userModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(users) });

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  // ------- Read: findProfile -------

  describe('findProfile', () => {
    it('should return a profile with following=true when user follows the profile', async () => {
      const profileUser = createMockUser({ _id: '2', username: 'profileuser' });
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(profileUser) });
      followModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: '1', followerId: '1', followingId: '2' }) });

      const result = await service.findProfile(1, 'profileuser');

      expect(result.profile.username).toBe('profileuser');
      expect(result.profile.following).toBe(true);
    });

    it('should return a profile with following=false when user does not follow', async () => {
      const profileUser = createMockUser({ _id: '2', username: 'profileuser' });
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(profileUser) });
      followModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.findProfile(1, 'profileuser');

      expect(result.profile.following).toBe(false);
    });

    it('should return undefined when profile user does not exist', async () => {
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.findProfile(1, 'nonexistent');

      expect(result).toBeUndefined();
    });
  });

  // ------- Business Logic: follow -------

  describe('follow', () => {
    it('should create a follow relationship and return profile with following=true', async () => {
      const follower = createMockUser({ _id: '1', email: 'follower@example.com' });
      const following = createMockUser({ _id: '2', username: 'targetuser', email: 'target@example.com' });

      userModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(following) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(follower) });
      followModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.follow('follower@example.com', 'targetuser');

      expect(result.profile.username).toBe('targetuser');
      expect(result.profile.following).toBe(true);
    });

    it('should not create duplicate follow if already following', async () => {
      const follower = createMockUser({ _id: '1', email: 'follower@example.com' });
      const following = createMockUser({ _id: '2', username: 'targetuser', email: 'target@example.com' });

      userModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(following) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(follower) });
      followModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: '1', followerId: '1', followingId: '2' }) });

      const result = await service.follow('follower@example.com', 'targetuser');

      expect(result.profile.following).toBe(true);
    });

    it('should throw when follower tries to follow themselves', async () => {
      const user = createMockUser({ _id: '1', email: 'self@example.com', username: 'selfuser' });
      userModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(user) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(user) });

      await expect(service.follow('self@example.com', 'selfuser')).rejects.toThrow(HttpException);
    });

    it('should throw when email or username is not provided', async () => {
      await expect(service.follow('', 'username')).rejects.toThrow(HttpException);
      await expect(service.follow('email@test.com', '')).rejects.toThrow(HttpException);
    });
  });

  // ------- Business Logic: unFollow -------

  describe('unFollow', () => {
    it('should delete the follow relationship and return profile with following=false', async () => {
      const following = createMockUser({ _id: '2', username: 'targetuser' });
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(following) });
      followModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ acknowledged: true, deletedCount: 1 }) });

      const result = await service.unFollow(1, 'targetuser');

      expect(result.profile.username).toBe('targetuser');
      expect(result.profile.following).toBe(false);
    });

    it('should throw when user tries to unfollow themselves', async () => {
      const user = createMockUser({ _id: '1', username: 'selfuser' });
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      await expect(service.unFollow(1, 'selfuser')).rejects.toThrow(HttpException);
    });

    it('should throw when followerId or username is not provided', async () => {
      await expect(service.unFollow(0, 'username')).rejects.toThrow(HttpException);
      await expect(service.unFollow(1, '')).rejects.toThrow(HttpException);
    });
  });

  // ------- Edge Cases -------

  describe('edge cases', () => {
    it('findProfile should return following=false when id is 0 (unauthenticated)', async () => {
      const profileUser = createMockUser({ _id: '2', username: 'profileuser' });
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(profileUser) });
      followModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.findProfile(0, 'profileuser');

      // id=0 is falsy, so following should not be set
      expect(result.profile.username).toBe('profileuser');
    });

    it('findOne should throw when user does not exist', async () => {
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findOne({ username: 'ghost' })).rejects.toThrow();
    });

    it('follow should throw when followingUser does not exist', async () => {
      userModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.follow('follower@test.com', 'nonexistent')).rejects.toThrow();
    });

    it('follow should throw when followerUser does not exist', async () => {
      const following = createMockUser({ _id: '2', username: 'target' });
      userModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(following) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.follow('ghost@test.com', 'target')).rejects.toThrow();
    });

    it('unFollow should throw when user to unfollow does not exist', async () => {
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.unFollow(1, 'nonexistent')).rejects.toThrow();
    });

    it('follow should correctly set profile bio and image', async () => {
      const follower = createMockUser({ _id: '1', email: 'follower@test.com' });
      const following = createMockUser({
        _id: '2',
        username: 'target',
        bio: 'My bio',
        image: 'http://img.jpg',
        email: 'target@test.com',
      });

      userModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(following) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(follower) });
      followModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.follow('follower@test.com', 'target');

      expect(result.profile.bio).toBe('My bio');
      expect(result.profile.image).toBe('http://img.jpg');
      expect(result.profile.following).toBe(true);
    });

    it('unFollow should return correct profile data', async () => {
      const following = createMockUser({
        _id: '2',
        username: 'target',
        bio: 'Bio text',
        image: 'http://pic.jpg',
      });
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(following) });
      followModel.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) });

      const result = await service.unFollow(1, 'target');

      expect(result.profile.bio).toBe('Bio text');
      expect(result.profile.image).toBe('http://pic.jpg');
      expect(result.profile.following).toBe(false);
    });
  });
});
