import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { ProfileRO } from './profile.interface';

const mockProfileService = () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  findProfile: jest.fn(),
  follow: jest.fn(),
  unFollow: jest.fn(),
});

describe('ProfileController', () => {
  let controller: ProfileController;
  let profileService: jest.Mocked<ProfileService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useFactory: mockProfileService }],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    profileService = module.get(ProfileService);
  });

  afterEach(() => jest.clearAllMocks());

  const mockProfileRO: ProfileRO = {
    profile: {
      username: 'targetuser',
      bio: 'A bio',
      image: 'http://img.url',
      following: false,
    },
  };

  // ------- GET /profiles/:username -------

  describe('getProfile', () => {
    it('should return a user profile', async () => {
      profileService.findProfile.mockResolvedValue(mockProfileRO);

      const result = await controller.getProfile(1, 'targetuser');

      expect(result.profile.username).toBe('targetuser');
      expect(profileService.findProfile).toHaveBeenCalledWith(1, 'targetuser');
    });
  });

  // ------- POST /profiles/:username/follow -------

  describe('follow', () => {
    it('should follow a user and return profile with following=true', async () => {
      const followedProfile: ProfileRO = {
        profile: { ...mockProfileRO.profile, following: true },
      };
      profileService.follow.mockResolvedValue(followedProfile);

      const result = await controller.follow('test@example.com', 'targetuser');

      expect(result.profile.following).toBe(true);
      expect(profileService.follow).toHaveBeenCalledWith('test@example.com', 'targetuser');
    });
  });

  // ------- DELETE /profiles/:username/follow -------

  describe('unFollow', () => {
    it('should unfollow a user and return profile with following=false', async () => {
      profileService.unFollow.mockResolvedValue(mockProfileRO);

      const result = await controller.unFollow(1, 'targetuser');

      expect(result.profile.following).toBe(false);
      expect(profileService.unFollow).toHaveBeenCalledWith(1, 'targetuser');
    });
  });

  // ------- Edge Cases -------

  describe('edge cases', () => {
    it('getProfile should return undefined when profile does not exist', async () => {
      profileService.findProfile.mockResolvedValue(undefined as any);

      const result = await controller.getProfile(1, 'nonexistent');

      expect(result).toBeUndefined();
    });

    it('follow should propagate service errors', async () => {
      profileService.follow.mockRejectedValue(
        new Error('FollowerEmail and FollowingId cannot be equal.')
      );

      await expect(controller.follow('self@test.com', 'selfuser')).rejects.toThrow();
    });

    it('unFollow should propagate service errors', async () => {
      profileService.unFollow.mockRejectedValue(
        new Error('FollowerId and FollowingId cannot be equal.')
      );

      await expect(controller.unFollow(1, 'selfuser')).rejects.toThrow();
    });

    it('getProfile should pass userId and username to service', async () => {
      profileService.findProfile.mockResolvedValue(mockProfileRO);

      await controller.getProfile(42, 'someuser');

      expect(profileService.findProfile).toHaveBeenCalledWith(42, 'someuser');
    });
  });
});
