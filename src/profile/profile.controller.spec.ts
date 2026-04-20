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
});
