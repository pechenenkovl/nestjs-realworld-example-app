import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TagService } from './tag.service';
import { Tag } from './tag.schema';

const mockModel = () => ({
  find: jest.fn().mockReturnValue({ exec: jest.fn() }),
});

describe('TagService', () => {
  let service: TagService;
  let tagModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagService,
        { provide: getModelToken(Tag.name), useFactory: mockModel },
      ],
    }).compile();

    service = module.get<TagService>(TagService);
    tagModel = module.get(getModelToken(Tag.name));
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return an array of all tags', async () => {
      const tags = [
        { _id: '1', tag: 'nestjs' },
        { _id: '2', tag: 'typescript' },
        { _id: '3', tag: 'testing' },
      ];
      tagModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(tags) });

      const result = await service.findAll();

      expect(result).toEqual(tags);
      expect(result).toHaveLength(3);
      expect(tagModel.find).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no tags exist', async () => {
      tagModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle database error gracefully', async () => {
      tagModel.find.mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('DB connection lost')) });

      await expect(service.findAll()).rejects.toThrow('DB connection lost');
    });

    it('should return tags with correct structure', async () => {
      const tags = [{ _id: '1', tag: 'nestjs' }];
      tagModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(tags) });

      const result = await service.findAll();

      expect(result[0]).toHaveProperty('tag', 'nestjs');
      expect(result[0]).toHaveProperty('_id');
    });
  });
});
