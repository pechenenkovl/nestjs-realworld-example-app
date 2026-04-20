import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileService } from './profile.service';
import { UserEntity } from '../user/user.entity';
import { FollowsEntity } from './follows.entity';
import { HttpException, HttpStatus } from '@nestjs/common';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
});

describe('ProfileService', () => {
  let service: ProfileService;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let followsRepository: jest.Mocked<Repository<FollowsEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getRepositoryToken(UserEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(FollowsEntity), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    followsRepository = module.get(getRepositoryToken(FollowsEntity));
  });

  afterEach(() => jest.clearAllMocks());

  const createUser = (overrides: Partial<UserEntity> = {}): UserEntity => {
    const user = new UserEntity();
    user.id = 1;
    user.username = 'testuser';
    user.email = 'test@example.com';
    user.password = 'hashed';
    user.bio = 'A bio';
    user.image = 'http://image.url';
    user.articles = [];
    user.favorites = [];
    Object.assign(user, overrides);
    return user;
  };

  // ------- Read: findAll -------

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [createUser(), createUser({ id: 2 })];
      userRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  // ------- Read: findProfile -------

  describe('findProfile', () => {
    it('should return a profile with following=true when user follows the profile', async () => {
      const profileUser = createUser({ id: 2, username: 'profileuser' });
      userRepository.findOne.mockResolvedValue(profileUser);
      followsRepository.findOne.mockResolvedValue({ id: 1, followerId: 1, followingId: 2 } as FollowsEntity);

      const result = await service.findProfile(1, 'profileuser');

      expect(result.profile.username).toBe('profileuser');
      expect(result.profile.following).toBe(true);
    });

    it('should return a profile with following=false when user does not follow', async () => {
      const profileUser = createUser({ id: 2, username: 'profileuser' });
      userRepository.findOne.mockResolvedValue(profileUser);
      followsRepository.findOne.mockResolvedValue(undefined);

      const result = await service.findProfile(1, 'profileuser');

      expect(result.profile.following).toBe(false);
    });

    it('should return undefined when profile user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(undefined);

      const result = await service.findProfile(1, 'nonexistent');

      expect(result).toBeUndefined();
    });
  });

  // ------- Business Logic: follow -------

  describe('follow', () => {
    it('should create a follow relationship and return profile with following=true', async () => {
      const follower = createUser({ id: 1, email: 'follower@example.com' });
      const following = createUser({ id: 2, username: 'targetuser', email: 'target@example.com' });

      userRepository.findOne
        .mockResolvedValueOnce(following)  // findOne({ username })
        .mockResolvedValueOnce(follower);  // findOne({ email })
      followsRepository.findOne.mockResolvedValue(undefined); // no existing follow
      followsRepository.save.mockResolvedValue({} as FollowsEntity);

      const result = await service.follow('follower@example.com', 'targetuser');

      expect(result.profile.username).toBe('targetuser');
      expect(result.profile.following).toBe(true);
      expect(followsRepository.save).toHaveBeenCalled();
    });

    it('should not create duplicate follow if already following', async () => {
      const follower = createUser({ id: 1, email: 'follower@example.com' });
      const following = createUser({ id: 2, username: 'targetuser', email: 'target@example.com' });

      userRepository.findOne
        .mockResolvedValueOnce(following)
        .mockResolvedValueOnce(follower);
      followsRepository.findOne.mockResolvedValue({ id: 1, followerId: 1, followingId: 2 } as FollowsEntity);

      const result = await service.follow('follower@example.com', 'targetuser');

      expect(result.profile.following).toBe(true);
      expect(followsRepository.save).not.toHaveBeenCalled();
    });

    it('should throw when follower tries to follow themselves', async () => {
      const user = createUser({ id: 1, email: 'self@example.com', username: 'selfuser' });
      userRepository.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(user);

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
      const following = createUser({ id: 2, username: 'targetuser' });
      userRepository.findOne.mockResolvedValue(following);
      followsRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      const result = await service.unFollow(1, 'targetuser');

      expect(result.profile.username).toBe('targetuser');
      expect(result.profile.following).toBe(false);
      expect(followsRepository.delete).toHaveBeenCalledWith({ followerId: 1, followingId: 2 });
    });

    it('should throw when user tries to unfollow themselves', async () => {
      const user = createUser({ id: 1, username: 'selfuser' });
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.unFollow(1, 'selfuser')).rejects.toThrow(HttpException);
    });

    it('should throw when followerId or username is not provided', async () => {
      await expect(service.unFollow(0, 'username')).rejects.toThrow(HttpException);
      await expect(service.unFollow(1, '')).rejects.toThrow(HttpException);
    });
  });
});
